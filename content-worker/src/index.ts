// ─────────────────────────────────────────────────────────────────────────
// ilolink content origin (spec §3, §6).
//
// A SEPARATE Cloudflare Worker on view.ilolink.com, isolated from the app. It
// serves already-sanitized document HTML under a strict, per-response CSP. Two
// independent walls stand between hostile document markup and anything valuable:
//   1. Origin isolation — this hostname carries no app session/cookies and has
//      no same-origin reach into the dashboard.
//   2. CSP default-src 'none' — even a sanitizer miss can fetch/run nothing;
//      the only script admitted is the nonce'd first-party tracker.
//
// These modules are shared with the app and are deliberately dependency-free
// (Web Crypto only), so they bundle into a plain Worker without Node shims.
// ─────────────────────────────────────────────────────────────────────────
import { verifyPassword } from "../../lib/crypto/password";
import {
  buildDocCsp,
  buildChromeCsp,
  docSecurityHeaders,
} from "../../lib/sanitize/csp";
import {
  visitorHash,
  deviceClass,
  refHost,
} from "../../lib/analytics/collect";
import { TRACKER_JS } from "./tracker-script";
import { WIDGET_JS } from "./widget-script";
import { ViewCounter } from "./view-counter";

// Re-export the Durable Object class so wrangler can bind it from this Worker.
export { ViewCounter };

// Constant-time compare of two equal-length ASCII strings (the unlock token is
// a fixed 64-hex digest). Avoids a timing oracle on the per-doc unlock cookie.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
import type { SlugRecord } from "../../lib/types";

interface Env {
  KV: KVNamespace;
  DOCS: R2Bucket;
  DB: D1Database;
  EVENTS: AnalyticsEngineDataset;
  VIEW_COUNTER: DurableObjectNamespace<ViewCounter>;
}

// ─── interaction plumbing (analytics / feedback / comments) ────────────────
// This Worker is standalone (NOT OpenNext), so it cannot import @/lib/cf or
// @/lib/ratelimit — those reach for getCloudflareContext, which exists only in
// the Next app. Everything below talks to env.KV / env.DB / env.EVENTS directly.

// Best-effort client IP from Cloudflare headers (mirrors lib/ratelimit.clientIp).
function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// Inline fixed-window KV rate limiter (same pattern as lib/ratelimit.rateLimit).
// Returns true when ALLOWED, false when the window is exhausted.
async function rateLimitKV(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const k = `rl:${key}`;
  const current = Number((await env.KV.get(k)) ?? "0");
  if (current >= limit) return false;
  await env.KV.put(k, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}

// SALT_SECRET is a Worker secret, read via env cast (as in lib/turnstile.ts).
function saltSecret(env: Env): string {
  return (env as Env & { SALT_SECRET?: string }).SALT_SECRET ?? "";
}

// Do-Not-Track: honour the DNT / Sec-GPC request headers and an optional body
// flag. When set, analytics is dropped silently (still a 202 to the beacon).
function isDnt(request: Request, bodyFlag?: unknown): boolean {
  if (request.headers.get("dnt") === "1") return true;
  if (request.headers.get("sec-gpc") === "1") return true;
  return bodyFlag === true || bodyFlag === 1 || bodyFlag === "1";
}

// Two-decimal UTC day for the reaction daily-dedupe key.
function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// The app dashboard (https://ilolink.com) reads these JSON endpoints —
// /_comments and /_feedback — cross-origin from the content origin. Without an
// Access-Control-Allow-Origin header the browser blocks the response (the fetch
// rejects even though the worker returns 200), so the dashboard shows "Couldn't
// load comments / reactions" despite the data existing. These are simple GETs
// (no custom headers, no credentials), so a response ACAO is sufficient — no
// preflight. Scoped to the app origin, not '*'. Harmless on the POST responses.
const APP_ORIGIN = "https://ilolink.com";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": APP_ORIGIN,
      vary: "Origin",
    },
  });
}

function scriptResponse(js: string): Response {
  return new Response(js, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

// Cookie that proves a viewer cleared the password gate for one specific doc.
// Value is a digest of (slug + password_hash): verifiable statelessly, never
// exposes the stored hash, invalidated automatically if the password changes.
const UNLOCK_MAX_AGE = 60 * 60 * 6; // 6 hours

function unlockCookieName(slug: string): string {
  return `ilo_unlock_${slug}`;
}

async function unlockToken(slug: string, passwordHash: string): Promise<string> {
  const data = new TextEncoder().encode(`${slug}:${passwordHash}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Cheap <title> for the browser tab: first <h1> text from the rendered body,
// else a plain fallback. Avoids a D1 round-trip on the hot serving path.
function titleFromBody(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return "Document — ilolink";
  const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text ? `${text.slice(0, 120)} — ilolink` : "Document — ilolink";
}

// A short plain-text excerpt for the OG/Twitter description (tags stripped).
// Start after the first <h1> so the title (already the og:title) isn't repeated.
function descriptionFromBody(html: string): string {
  const h1End = html.search(/<\/h1>/i);
  const src = h1End >= 0 ? html.slice(h1End + 5) : html;
  const text = src
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

// Design tokens shared by both shells (and the injected feedback/comments widget).
const SHELL_TOKENS = `:root {
  color-scheme: light;
  --canvas: #fafaf8; --surface: #ffffff;
  --ink: #1a1a17; --ink-soft: #56564f; --ink-faint: #8a8a80;
  --hairline: #eae8e1; --accent: #3b5bdb; --accent-soft: #dfe5fb;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --canvas: #17171a; --surface: #1f1f23;
    --ink: #edece7; --ink-soft: #a8a79f; --ink-faint: #6f6e67;
    --hairline: #2c2c31; --accent: #7c93f0; --accent-soft: #262a40;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }`;

// The zen reading shell — for Markdown docs, which carry no styling of their own:
// warm canvas, ~68ch measure, reading serif. Content wraps in <main class="doc">.
const READING_CSS = `body {
  margin: 0;
  background: var(--canvas);
  color: var(--ink);
  font-family: "Newsreader", ui-serif, Georgia, serif;
  font-size: 1.125rem;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.doc { max-width: 68ch; margin: 0 auto; padding: 5rem 1.5rem 8rem; }
.doc h1, .doc h2, .doc h3, .doc h4 {
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  line-height: 1.25; margin: 2.25em 0 0.6em; font-weight: 620;
}
.doc h1 { font-size: 2rem; margin-top: 0; }
.doc h2 { font-size: 1.45rem; }
.doc h3 { font-size: 1.2rem; }
.doc p, .doc ul, .doc ol, .doc blockquote, .doc pre, .doc table { margin: 1.15em 0; }
.doc a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
.doc img { max-width: 100%; height: auto; border-radius: 4px; }
.doc blockquote { margin-left: 0; padding-left: 1.1em; border-left: 2px solid var(--hairline); color: var(--ink-soft); }
.doc pre { background: var(--surface); border: 1px solid var(--hairline); border-radius: 6px; padding: 1em 1.1em; overflow-x: auto; font-size: 0.9em; }
.doc code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
.doc :not(pre) > code { background: var(--surface); border: 1px solid var(--hairline); border-radius: 4px; padding: 0.1em 0.35em; }
.doc hr { border: none; border-top: 1px solid var(--hairline); margin: 2.5em 0; }
.doc table { border-collapse: collapse; width: 100%; font-size: 0.95em; }
.doc th, .doc td { border: 1px solid var(--hairline); padding: 0.5em 0.7em; text-align: left; }
.doc figure { margin: 1.5em 0; }
.doc figcaption { color: var(--ink-faint); font-size: 0.9em; margin-top: 0.5em; }`;

// Full-bleed shell — for HTML docs (landing mockups etc.), which bring their own
// complete CSS. We only reset the body and define the tokens (so the injected
// widget still looks right); the author's own <style> controls everything else.
const FULLBLEED_CSS = `body { margin: 0; background: var(--canvas); color: var(--ink); font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
img { max-width: 100%; }`;

// pdf documents render as a full-bleed <iframe> pointing at the same-origin
// /raw/<slug> byte stream — the browser's native PDF viewer. Slug is already
// validated upstream; re-filtered here as defence in depth.
function pdfIframe(slug: string): string {
  const s = slug.replace(/[^a-z0-9-]/g, "");
  return `<iframe src="/raw/${s}" title="PDF document" style="border:0;width:100%;height:100vh;display:block"></iframe>`;
}

// Trusted (raw, unsanitized) docs run their own scripts, but must NOT do so with
// view.ilolink.com's authority — otherwise a trusted doc's JS could make
// credentialed same-origin requests to /raw, /_unlock, /_collect, etc. and read
// or forge OTHER docs on the shared origin (confused deputy). We contain it in a
// sandboxed iframe WITHOUT allow-same-origin, so the frame gets a fresh opaque
// origin: scripts run (allow-scripts), forms/popups/modals work, but it cannot
// touch this origin's cookies, storage, or endpoints. The srcdoc document
// inherits this page's (permissive) CSP, which is what lets its inline scripts
// execute. Escape for the double-quoted srcdoc attribute.
function trustedFrame(rawHtml: string): string {
  const srcdoc = rawHtml.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<iframe title="Published page" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" srcdoc="${srcdoc}" style="border:0;position:fixed;inset:0;width:100vw;height:100vh"></iframe>`;
}

// Access gate shared by the doc page and the /raw byte stream: enforces expiry
// and the password cookie. Returns a blocking Response, or null when access is
// allowed. (The doc page renders the gate UI itself; /raw just refuses.)
async function gateDoc(
  env: Env,
  rec: SlugRecord,
  slug: string,
  request: Request,
): Promise<Response | null> {
  if (
    rec.visibility === "expiring" &&
    typeof rec.expires_at === "number" &&
    Date.now() > rec.expires_at
  ) {
    return gonePage();
  }
  if (rec.visibility === "password" && rec.password_hash) {
    const cookies = parseCookies(request.headers.get("cookie"));
    const presented = cookies[unlockCookieName(slug)];
    const expected = await unlockToken(slug, rec.password_hash);
    if (!presented || !constantTimeEqual(presented, expected)) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  return null;
}

// Zen reading shell (md) or full-bleed shell (html). Tokens are inlined (this
// origin has no app CSS). Both inject the same nonce'd first-party scripts.
function readerShell(opts: {
  title: string;
  body: string;
  nonce: string;
  noindex: boolean;
  docId: string;
  slug: string;
  format?: string; // source_type, drives the OG-card badge
  description?: string;
  html?: boolean; // true => full-bleed (author controls styling)
}): string {
  const robots = opts.noindex
    ? '<meta name="robots" content="noindex" />'
    : "";
  const css = opts.html ? FULLBLEED_CSS : READING_CSS;
  // md wraps in the reading column; html renders the author's markup full-bleed.
  const bodyInner = opts.html
    ? opts.body
    : `<main class="doc">\n${opts.body}\n</main>`;

  // Open Graph / Twitter cards so shared links preview everywhere. The image is
  // a branded per-doc card rendered by the app at /api/og.
  const ogTitle = opts.title.replace(/\s+—\s+ilolink$/, "").slice(0, 140) || "ilolink";
  const shareUrl = `https://ilolink.com/${opts.slug}`;
  const ogDesc =
    (opts.description && opts.description.trim()) ||
    "Shared on ilolink — see how people read it: views, scroll depth, and comments.";
  const ogImg = `https://ilolink.com/api/og?t=${encodeURIComponent(ogTitle)}&f=${encodeURIComponent(opts.format ?? "")}`;
  const og = `<meta property="og:type" content="article" />
<meta property="og:site_name" content="ilolink" />
<meta property="og:title" content="${escapeHtml(ogTitle)}" />
<meta property="og:description" content="${escapeHtml(ogDesc)}" />
<meta property="og:url" content="${escapeHtml(shareUrl)}" />
<meta property="og:image" content="${escapeHtml(ogImg)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
<meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
<meta name="twitter:image" content="${escapeHtml(ogImg)}" />
<link rel="canonical" href="${escapeHtml(shareUrl)}" />`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${robots}
<meta name="ilo:doc" content="${escapeHtml(opts.docId)}" />
<title>${escapeHtml(opts.title)}</title>
${og}
<style>
${SHELL_TOKENS}
${css}
</style>
</head>
<body>
${bodyInner}
<!-- Abuse report affordance (spec §7): subtle, on every published page. -->
<a id="ilo-report" href="#" style="position:fixed;left:10px;bottom:10px;font:12px/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--ink-faint,#8a8a80);text-decoration:none;opacity:.55;z-index:2147483000">⚑ Report</a>
<script nonce="${opts.nonce}">
(function(){var m=document.querySelector('meta[name="ilo:doc"]');var doc=m&&m.getAttribute('content');var a=document.getElementById('ilo-report');if(!a||!doc)return;a.addEventListener('click',function(e){e.preventDefault();var r=window.prompt('Report this page. What is wrong? (phishing, spam, malware, abuse…)');if(!r)return;fetch('/_report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({doc:doc,reason:r})}).then(function(){a.textContent='⚑ Reported';a.style.pointerEvents='none';},function(){a.textContent='⚑ Report failed';});});})();
</script>
<!-- First-party, same-origin interaction scripts; admitted only by this nonce. -->
<script nonce="${opts.nonce}" src="/tracker.js"></script>
<script nonce="${opts.nonce}" src="/widget.js"></script>
</body>
</html>`;
}

// Small standalone page shell (gate, 404, 410) — same tokens, centered, calm.
function noticeShell(opts: {
  title: string;
  inner: string;
  noindex?: boolean;
}): string {
  const robots =
    opts.noindex === false ? "" : '<meta name="robots" content="noindex" />';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${robots}
<title>${escapeHtml(opts.title)}</title>
<style>
:root {
  color-scheme: light;
  --canvas: #fafaf8; --surface: #ffffff;
  --ink: #1a1a17; --ink-soft: #56564f; --ink-faint: #8a8a80;
  --hairline: #eae8e1; --accent: #3b5bdb; --accent-soft: #edf0fd;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --canvas: #17171a; --surface: #1f1f23;
    --ink: #edece7; --ink-soft: #a8a79f; --ink-faint: #6f6e67;
    --hairline: #2c2c31; --accent: #7c93f0; --accent-soft: #23263a;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: var(--canvas); color: var(--ink);
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.card { width: 100%; max-width: 30rem; padding: 2rem 1.5rem; text-align: center; }
h1 { font-size: 1.35rem; font-weight: 620; margin: 0 0 0.5rem; }
p { color: var(--ink-soft); line-height: 1.6; margin: 0 0 1.5rem; }
form { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; text-align: left; }
label { font-size: 0.85rem; color: var(--ink-soft); }
input {
  width: 100%; padding: 0.7rem 0.8rem; font-size: 1rem;
  color: var(--ink); background: var(--surface);
  border: 1px solid var(--hairline); border-radius: 8px;
  transition: border-color 180ms ease;
}
input:focus { outline: none; border-color: var(--accent); }
button {
  padding: 0.7rem 0.9rem; font-size: 0.95rem; font-weight: 560;
  color: #fff; background: var(--accent); border: none; border-radius: 8px;
  cursor: pointer; transition: opacity 180ms ease;
}
button:hover { opacity: 0.92; }
.err { color: var(--accent); font-size: 0.85rem; margin: 0.25rem 0 0; }
</style>
</head>
<body>
<div class="card">
${opts.inner}
</div>
</body>
</html>`;
}

function passwordGate(slug: string, error: boolean): string {
  const inner = `
<h1>This document is protected</h1>
<p>Enter the password you were given to read it.</p>
<form method="POST" action="/_unlock/${encodeURIComponent(slug)}">
  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" autofocus required />
  ${error ? '<p class="err">That password didn’t match. Try again.</p>' : ""}
  <button type="submit">Unlock</button>
</form>`;
  return noticeShell({ title: "Protected document — ilolink", inner });
}

// Chrome pages (gate/404/410) get the same anti-framing + hardening headers as
// documents, under a chrome CSP that still permits the gate form to POST.
function chromeHeaders(): Headers {
  const headers = new Headers(docSecurityHeaders(buildChromeCsp()));
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  return headers;
}

function gonePage(): Response {
  const inner = `<h1>This link has expired</h1><p>The owner set it to stop working after a date that has now passed.</p>`;
  return new Response(noticeShell({ title: "Link expired — ilolink", inner }), {
    status: 410,
    headers: chromeHeaders(),
  });
}

function notFoundPage(): Response {
  const inner = `<h1>Nothing here</h1><p>This link is wrong, or the document was removed.</p>`;
  return new Response(noticeShell({ title: "Not found — ilolink", inner }), {
    status: 404,
    headers: chromeHeaders(),
  });
}

// Extract the first non-empty path segment as the slug.
function slugFromPath(pathname: string): string | null {
  const seg = pathname.split("/").filter(Boolean);
  return seg.length ? seg[0] : null;
}

async function loadSlugRecord(
  env: Env,
  slug: string,
): Promise<SlugRecord | null> {
  return env.KV.get<SlugRecord>(`slug:${slug}`, "json");
}

// Does a document with this id exist? Guards FK inserts from spam to dead ids.
async function docExists(env: Env, docId: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT 1 AS x FROM documents WHERE id = ?")
    .bind(docId)
    .first<{ x: number }>();
  return row !== null;
}

const REACTION_KEYS = ["👍", "🤔", "👀"] as const;

// GET /_feedback?doc= -> aggregated reaction counts ONLY. Reactions are public
// (the doc's reaction bar needs them). Reader NOTES are private to the publisher
// and are NOT returned here — they are served token-gated from the app origin
// (/api/feedback), since anyone can read a doc id from the served page.
async function feedbackSummary(env: Env, docId: string): Promise<Response> {
  const reactions: Record<string, number> = { "👍": 0, "🤔": 0, "👀": 0 };
  const rx = await env.DB.prepare(
    "SELECT value, COUNT(*) AS n FROM feedback WHERE document_id = ? AND kind = 'reaction' GROUP BY value",
  )
    .bind(docId)
    .all<{ value: string; n: number }>();
  for (const r of rx.results) {
    if (r.value in reactions) reactions[r.value] = Number(r.n);
  }
  return jsonResponse({ reactions });
}

// POST /_feedback — reaction or note. Honeypot + IP rate-limit; reactions are
// de-duped per (doc, visitor, UTC day) via KV so counts reflect people, not taps.
async function postFeedback(request: Request, env: Env): Promise<Response> {
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "bad json" }, 400);
  }
  if (!data || typeof data !== "object") {
    return jsonResponse({ error: "bad request" }, 400);
  }
  // Honeypot: a filled hp field means a bot — accept silently, store nothing.
  if (String(data.hp ?? "") !== "") return jsonResponse({ ok: true });

  const docId = typeof data.doc === "string" ? data.doc : "";
  const kind =
    data.kind === "note" ? "note" : data.kind === "reaction" ? "reaction" : "";
  let value = typeof data.value === "string" ? data.value : "";
  if (!docId || !kind || !value) {
    return jsonResponse({ error: "missing fields" }, 400);
  }
  if (kind === "reaction" && !REACTION_KEYS.includes(value as never)) {
    return jsonResponse({ error: "bad reaction" }, 400);
  }
  if (kind === "note") {
    value = value.slice(0, 2000).trim();
    if (!value) return jsonResponse({ error: "empty note" }, 400);
  }

  const ip = clientIp(request);
  if (!(await rateLimitKV(env, `fb:${ip}`, 30, 60))) {
    return jsonResponse({ error: "rate limited" }, 429);
  }
  if (!(await docExists(env, docId))) {
    return jsonResponse({ error: "not found" }, 404);
  }

  const ua = request.headers.get("user-agent") ?? "";
  const vh = await visitorHash(ip, ua, docId, saltSecret(env));

  if (kind === "reaction") {
    const dedupeKey = `fb:${docId}:${vh}:${utcDay()}`;
    if (await env.KV.get(dedupeKey)) {
      return jsonResponse({ ok: true, deduped: true });
    }
    await env.KV.put(dedupeKey, "1", { expirationTtl: 60 * 60 * 30 });
  }

  await env.DB.prepare(
    "INSERT INTO feedback (id, document_id, kind, value, visitor_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), docId, kind, value, vh, Date.now())
    .run();
  return jsonResponse({ ok: true });
}

// A resolved anchor: character offsets into the ".doc" container's textContent
// plus display context. Docs are immutable, so offsets are stable resolvers.
// Anchor kinds: a text-quote anchor (char offsets), a point anchor (Figma pin,
// fractional x/y), or a region anchor (fractional x/y/w/h box on the document).
type CommentAnchor =
  | {
      type: "text";
      quote: string;
      prefix: string;
      suffix: string;
      start: number;
      end: number;
    }
  | { type: "point"; x: number; y: number; label: string }
  | { type: "region"; x: number; y: number; w: number; h: number; label: string };

// --- Abuse reports (spec §7) ---
const REPORT_LIMIT = 3; // distinct reporters before a doc is auto-unpublished
const WS_REPORT_FLAG_LIMIT = 5; // workspace flags before auto-suspension

// POST /_report — a viewer flags a published page. Honeypot + IP rate-limit +
// per-reporter dedupe. At REPORT_LIMIT distinct reporters the doc is taken
// offline; repeated hits suspend the owning workspace.
async function postReport(request: Request, env: Env): Promise<Response> {
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "bad json" }, 400);
  }
  if (String(data.hp ?? "") !== "") return jsonResponse({ ok: true }); // honeypot

  const docId = typeof data.doc === "string" ? data.doc : "";
  let reason = typeof data.reason === "string" ? data.reason.slice(0, 500).trim() : "";
  if (!docId) return jsonResponse({ error: "missing doc" }, 400);
  if (!reason) reason = "unspecified";

  const ip = clientIp(request);
  if (!(await rateLimitKV(env, `rep:${ip}`, 10, 3600))) {
    return jsonResponse({ error: "rate limited" }, 429);
  }
  if (!(await docExists(env, docId))) {
    return jsonResponse({ error: "not found" }, 404);
  }

  const ua = request.headers.get("user-agent") ?? "";
  const rh = await visitorHash(ip, ua, docId, saltSecret(env));

  const existing = await env.DB.prepare(
    "SELECT id FROM reports WHERE document_id = ? AND reporter_hash = ?",
  )
    .bind(docId, rh)
    .first();
  if (!existing) {
    await env.DB.prepare(
      "INSERT INTO reports (id, document_id, reason, reporter_hash, created_at, status) VALUES (?, ?, ?, ?, ?, 'open')",
    )
      .bind(crypto.randomUUID(), docId, reason, rh, Date.now())
      .run();
  }

  const cnt = await env.DB.prepare(
    "SELECT COUNT(DISTINCT reporter_hash) AS n FROM reports WHERE document_id = ?",
  )
    .bind(docId)
    .first<{ n: number }>();
  if ((cnt?.n ?? 0) >= REPORT_LIMIT) {
    await autoActionDoc(env, docId);
  }
  return jsonResponse({ ok: true });
}

// Take a reported doc offline and flag/suspend its workspace. Reversible: the
// D1 row + R2 bodies stay; only the KV slug records are dropped so links 404.
async function autoActionDoc(env: Env, docId: string): Promise<void> {
  const doc = await env.DB.prepare(
    "SELECT slug, workspace_id, unpublished_at FROM documents WHERE id = ?",
  )
    .bind(docId)
    .first<{ slug: string; workspace_id: string | null; unpublished_at: number | null }>();
  if (!doc || doc.unpublished_at) return;

  await env.DB.prepare("UPDATE documents SET unpublished_at = ? WHERE id = ?")
    .bind(Date.now(), docId)
    .run();
  await env.KV.delete(`slug:${doc.slug}`);
  await env.DB.prepare("UPDATE reports SET status = 'actioned' WHERE document_id = ?")
    .bind(docId)
    .run();

  if (!doc.workspace_id) return;
  await env.DB.prepare("UPDATE workspaces SET abuse_flags = abuse_flags + 1 WHERE id = ?")
    .bind(doc.workspace_id)
    .run();
  const w = await env.DB.prepare("SELECT abuse_flags FROM workspaces WHERE id = ?")
    .bind(doc.workspace_id)
    .first<{ abuse_flags: number }>();
  if ((w?.abuse_flags ?? 0) >= WS_REPORT_FLAG_LIMIT) {
    const others = await env.DB.prepare(
      "SELECT slug FROM documents WHERE workspace_id = ? AND unpublished_at IS NULL",
    )
      .bind(doc.workspace_id)
      .all<{ slug: string }>();
    await env.DB.prepare("UPDATE workspaces SET status = 'suspended' WHERE id = ?")
      .bind(doc.workspace_id)
      .run();
    await env.DB.prepare(
      "UPDATE documents SET unpublished_at = ? WHERE workspace_id = ? AND unpublished_at IS NULL",
    )
      .bind(Date.now(), doc.workspace_id)
      .run();
    await Promise.all(others.results.map((d) => env.KV.delete(`slug:${d.slug}`)));
  }
}

function frac(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Validate an untrusted anchor against the ANCHOR CONTRACT (shape + caps).
// Returns a clean anchor object on success, or null on any violation — callers
// store null so a malformed anchor degrades to a general comment.
function validateAnchor(input: unknown): CommentAnchor | null {
  if (!input || typeof input !== "object") return null;
  const a = input as Record<string, unknown>;

  // Point anchor (pin): { type:"point", x, y in [0,1], label }.
  if (a.type === "point") {
    const x = frac(a.x);
    const y = frac(a.y);
    if (x === null || y === null) return null;
    const label = typeof a.label === "string" ? a.label.slice(0, 120) : "";
    return { type: "point", x, y, label };
  }

  // Region anchor (area box): { type:"region", x, y, w, h in [0,1], label }.
  if (a.type === "region") {
    const x = frac(a.x);
    const y = frac(a.y);
    const w = frac(a.w);
    const h = frac(a.h);
    if (x === null || y === null || w === null || h === null) return null;
    const label = typeof a.label === "string" ? a.label.slice(0, 120) : "";
    return { type: "region", x, y, w, h, label };
  }

  // Text-quote anchor (default; older stored anchors have no `type`).
  if (
    typeof a.quote !== "string" ||
    typeof a.prefix !== "string" ||
    typeof a.suffix !== "string"
  ) {
    return null;
  }
  const start = a.start;
  const end = a.end;
  if (typeof start !== "number" || typeof end !== "number") return null;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || end < 0 || end <= start) return null;
  if (a.quote.length < 1 || a.quote.length > 400) return null;
  if (a.prefix.length > 48 || a.suffix.length > 48) return null;
  return {
    type: "text",
    quote: a.quote,
    prefix: a.prefix,
    suffix: a.suffix,
    start,
    end,
  };
}

// Parse a stored anchor JSON column back into a validated anchor (or null).
function parseStoredAnchor(raw: string | null): CommentAnchor | null {
  if (!raw) return null;
  try {
    return validateAnchor(JSON.parse(raw));
  } catch {
    return null;
  }
}

// GET /_comments?doc= -> visible comments (flat; the client nests one level).
// Each comment carries its parsed `anchor` (or null for a general comment).
async function commentsList(env: Env, docId: string): Promise<Response> {
  const rows = await env.DB.prepare(
    "SELECT id, parent_id, author_name, body, anchor, created_at FROM comments WHERE document_id = ? AND status = 'visible' ORDER BY created_at ASC LIMIT 500",
  )
    .bind(docId)
    .all<{
      id: string;
      parent_id: string | null;
      author_name: string | null;
      body: string;
      anchor: string | null;
      created_at: number;
    }>();
  const comments = rows.results.map((c) => ({
    id: c.id,
    parent_id: c.parent_id,
    author_name: c.author_name,
    body: c.body,
    created_at: c.created_at,
    anchor: parseStoredAnchor(c.anchor),
  }));
  return jsonResponse({ comments });
}

// POST /_comments — add a visible comment. Honeypot + IP rate-limit + 4 KB body
// cap. One reply level only: a reply's parent must exist, belong to this doc, and
// itself be top-level (reject a parent that already has a parent). An optional
// selection `anchor` (ANCHOR CONTRACT) may be attached to TOP-LEVEL comments only
// — replies inherit their parent's anchor, so an anchor on a reply is rejected.
async function postComment(request: Request, env: Env): Promise<Response> {
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "bad json" }, 400);
  }
  if (!data || typeof data !== "object") {
    return jsonResponse({ error: "bad request" }, 400);
  }
  if (String(data.hp ?? "") !== "") return jsonResponse({ ok: true });

  const docId = typeof data.doc === "string" ? data.doc : "";
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const name =
    typeof data.name === "string" ? data.name.trim().slice(0, 80) : "";
  const parentId =
    typeof data.parentId === "string" && data.parentId ? data.parentId : null;
  if (!docId || !body) return jsonResponse({ error: "missing fields" }, 400);
  if (body.length > 4000) return jsonResponse({ error: "too long" }, 400);

  // Optional selection anchor. Anchored comments are top-level only — a reply
  // inherits its parent's anchor, so reject any anchor carried on a reply.
  if (parentId && data.anchor != null) {
    return jsonResponse({ error: "anchor on reply" }, 400);
  }
  const anchor = parentId ? null : validateAnchor(data.anchor);

  const ip = clientIp(request);
  if (!(await rateLimitKV(env, `cm:${ip}`, 15, 60))) {
    return jsonResponse({ error: "rate limited" }, 429);
  }
  if (!(await docExists(env, docId))) {
    return jsonResponse({ error: "not found" }, 404);
  }

  if (parentId) {
    const parent = await env.DB.prepare(
      "SELECT parent_id, document_id FROM comments WHERE id = ? AND status = 'visible'",
    )
      .bind(parentId)
      .first<{ parent_id: string | null; document_id: string }>();
    // Parent must exist, be on this doc, and be top-level (one reply level).
    if (!parent || parent.document_id !== docId || parent.parent_id) {
      return jsonResponse({ error: "bad parent" }, 400);
    }
  }

  await env.DB.prepare(
    "INSERT INTO comments (id, document_id, parent_id, author_name, anchor, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'visible', ?)",
  )
    .bind(
      crypto.randomUUID(),
      docId,
      parentId,
      name || null,
      anchor ? JSON.stringify(anchor) : null,
      body,
      Date.now(),
    )
    .run();
  return jsonResponse({ ok: true });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // First-party interaction scripts, served same-origin so the doc's strict
    // CSP nonce is all that's needed to run them.
    if (pathname === "/tracker.js") return scriptResponse(TRACKER_JS);
    if (pathname === "/widget.js") return scriptResponse(WIDGET_JS);

    // ─── analytics beacon ────────────────────────────────────────────────
    // POST /_collect — one Analytics Engine data point per event. Drops on DNT,
    // rate-limited per IP. Always 202 (fire-and-forget; never leak state).
    if (pathname === "/_collect") {
      if (request.method !== "POST") return notFoundPage();
      let data: Record<string, unknown>;
      try {
        data = (await request.json()) as Record<string, unknown>;
      } catch {
        return new Response(null, { status: 202 });
      }
      if (!data || typeof data !== "object") {
        return new Response(null, { status: 202 });
      }
      if (isDnt(request, data.dnt)) return new Response(null, { status: 202 });
      const docId = typeof data.doc === "string" ? data.doc : "";
      if (!docId) return new Response(null, { status: 202 });

      const ip = clientIp(request);
      if (!(await rateLimitKV(env, `collect:${ip}`, 240, 60))) {
        return new Response(null, { status: 202 });
      }

      const ua = request.headers.get("user-agent") ?? "";
      const vh = await visitorHash(ip, ua, docId, saltSecret(env));
      const cf = request.cf as { country?: string } | undefined;
      const country = typeof cf?.country === "string" ? cf.country : "";
      // Event type must be one of the known kinds — an arbitrary blob2 would let a
      // caller poison a doc's stream / write junk analytics. Drop anything else.
      const ALLOWED_TYPES = new Set(["pageview", "scroll", "time", "click"]);
      const type = typeof data.type === "string" ? data.type : "pageview";
      if (!ALLOWED_TYPES.has(type)) return new Response(null, { status: 202 });
      const w = Number(data.w) || 0;
      const h = Number(data.h) || 0;
      // Cap free-text blobs so a huge payload can't exceed AE's per-row budget.
      const path = (typeof data.path === "string" ? data.path : "").slice(0, 256);
      const ref = (typeof data.ref === "string" ? data.ref : "").slice(0, 256);
      const scrollPct = Number(data.scrollPct) || 0;
      const timeS = Number(data.timeS) || 0;
      // Click heatmap: fractional coords clamped to [0,1]; 0 for non-click events.
      const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
      const clickX =
        type === "click" && Number.isFinite(Number(data.x))
          ? clamp01(Number(data.x))
          : 0;
      const clickY =
        type === "click" && Number.isFinite(Number(data.y))
          ? clamp01(Number(data.y))
          : 0;

      // Best-effort: never let a write error surface (fire-and-forget beacon).
      try {
        env.EVENTS.writeDataPoint({
          blobs: [docId, type, refHost(ref), country, deviceClass(w), path, vh],
          doubles: [scrollPct, timeS, w, h, clickX, clickY],
          indexes: [docId],
        });
      } catch {
        // swallow — analytics is best-effort
      }

      // Exact headline view count: atomic increment in the per-doc Durable
      // Object on each real pageview. Fire-and-forget so the beacon stays fast.
      if (type === "pageview") {
        try {
          const stub = env.VIEW_COUNTER.get(env.VIEW_COUNTER.idFromName(docId));
          ctx.waitUntil(stub.increment().then(() => undefined));
        } catch {
          // best-effort
        }
      }
      return new Response(null, { status: 202 });
    }

    // ─── feedback (reactions + notes) ────────────────────────────────────
    if (pathname === "/_feedback") {
      if (request.method === "GET") {
        const docId = url.searchParams.get("doc") ?? "";
        if (!docId) return jsonResponse({ reactions: {}, notes: [] });
        return feedbackSummary(env, docId);
      }
      if (request.method === "POST") return postFeedback(request, env);
      return notFoundPage();
    }

    // ─── comments ────────────────────────────────────────────────────────
    if (pathname === "/_comments") {
      if (request.method === "GET") {
        const docId = url.searchParams.get("doc") ?? "";
        if (!docId) return jsonResponse({ comments: [] });
        return commentsList(env, docId);
      }
      if (request.method === "POST") return postComment(request, env);
      return notFoundPage();
    }

    // ─── abuse report ────────────────────────────────────────────────────
    if (pathname === "/_report") {
      if (request.method === "POST") return postReport(request, env);
      return notFoundPage();
    }

    // Password unlock: POST /_unlock/<slug>
    if (pathname.startsWith("/_unlock/")) {
      if (request.method !== "POST") return notFoundPage();
      const slug = pathname.slice("/_unlock/".length).split("/")[0];
      if (!slug) return notFoundPage();

      const rec = await loadSlugRecord(env, slug);
      if (!rec) return notFoundPage();
      // Nothing to unlock — bounce to the doc.
      if (rec.visibility !== "password" || !rec.password_hash) {
        return Response.redirect(`${url.origin}/${slug}`, 303);
      }

      const form = await request.formData();
      const pw = String(form.get("password") ?? "");
      const ok = pw.length > 0 && (await verifyPassword(pw, rec.password_hash));
      if (!ok) {
        return new Response(passwordGate(slug, true), {
          status: 401,
          headers: chromeHeaders(),
        });
      }

      const token = await unlockToken(slug, rec.password_hash);
      const cookie = [
        `${unlockCookieName(slug)}=${token}`,
        "Path=/",
        `Max-Age=${UNLOCK_MAX_AGE}`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
      ].join("; ");
      return new Response(null, {
        status: 303,
        headers: { location: `${url.origin}/${slug}`, "set-cookie": cookie },
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return notFoundPage();
    }

    // Raw byte stream for pdf documents: GET /raw/<slug> → the stored PDF, shown
    // by the browser's native viewer inside the doc page's same-origin <iframe>.
    if (pathname.startsWith("/raw/")) {
      const rawSlug = pathname.slice("/raw/".length).split("/")[0];
      if (!rawSlug) return notFoundPage();
      const rec = await loadSlugRecord(env, rawSlug);
      if (!rec || rec.source_type !== "pdf" || !rec.raw_r2_key) {
        return notFoundPage();
      }
      const blocked = await gateDoc(env, rec, rawSlug, request);
      if (blocked) return blocked;

      const object = await env.DOCS.get(rec.raw_r2_key);
      if (!object) return notFoundPage();

      const headers = new Headers();
      headers.set("content-type", "application/pdf");
      headers.set("content-disposition", `inline; filename="${rawSlug}.pdf"`);
      headers.set("x-content-type-options", "nosniff");
      // Only our own doc page (same origin) may frame this asset.
      headers.set(
        "content-security-policy",
        "default-src 'none'; frame-ancestors 'self'",
      );
      headers.set("x-frame-options", "SAMEORIGIN");
      headers.set(
        "cache-control",
        rec.visibility === "public"
          ? "public, max-age=3600"
          : "private, no-store",
      );
      return new Response(request.method === "HEAD" ? null : object.body, {
        status: 200,
        headers,
      });
    }

    const slug = slugFromPath(pathname);
    if (!slug) return notFoundPage();

    const rec = await loadSlugRecord(env, slug);
    if (!rec) return notFoundPage();

    // Expiring links: past the deadline -> 410 Gone.
    if (
      rec.visibility === "expiring" &&
      typeof rec.expires_at === "number" &&
      Date.now() > rec.expires_at
    ) {
      return gonePage();
    }

    // Password gate: require a valid per-doc unlock cookie, else show the form.
    if (rec.visibility === "password" && rec.password_hash) {
      const cookies = parseCookies(request.headers.get("cookie"));
      const presented = cookies[unlockCookieName(slug)];
      const expected = await unlockToken(slug, rec.password_hash);
      if (!presented || !constantTimeEqual(presented, expected)) {
        return new Response(passwordGate(slug, false), {
          status: 401,
          headers: chromeHeaders(),
        });
      }
    }

    // pdf documents skip the R2 rendered body: their bytes live at raw_r2_key and
    // are shown via a same-origin <iframe> (needs frame-src 'self'). Everything
    // else fetches its sanitized rendered HTML.
    const isPdf = rec.source_type === "pdf";
    // Trusted docs run their own scripts; contain them in an opaque-origin sandbox
    // so they cannot act with this shared origin's authority (see trustedFrame).
    const trusted = rec.trusted === true && !isPdf;
    let body: string;
    let textForMeta = ""; // real doc text (for title + OG description), even when trusted/wrapped
    if (isPdf) {
      body = pdfIframe(slug);
    } else {
      const object = await env.DOCS.get(rec.rendered_r2_key);
      if (!object) return notFoundPage();
      const raw = await object.text();
      textForMeta = raw;
      body = trusted ? trustedFrame(raw) : raw;
    }

    // Per-response CSP + nonce. Tracker is same-origin (/tracker.js), so the
    // nonce alone admits it; default-src 'none' blocks everything else. Trusted
    // docs (publisher opt-in) instead get the permissive CSP so their own
    // scripts run; origin isolation + frame-ancestors 'none' still contain them.
    const csp = buildDocCsp({ allowFrame: isPdf || trusted, trusted });
    const html = readerShell({
      title: isPdf ? "PDF document — ilolink" : titleFromBody(textForMeta),
      body,
      nonce: csp.nonce,
      noindex: rec.visibility === "unlisted",
      docId: rec.doc_id,
      slug,
      format: rec.source_type,
      description: isPdf
        ? "A PDF shared on ilolink."
        : descriptionFromBody(textForMeta),
      html: rec.source_type === "html" || isPdf, // full-bleed
    });

    const headers = new Headers(docSecurityHeaders(csp.header));
    headers.set("content-type", "text/html; charset=utf-8");
    // Private content must not be cached by shared proxies.
    headers.set("cache-control", "private, no-store");

    return new Response(request.method === "HEAD" ? null : html, {
      status: 200,
      headers,
    });
  },
} satisfies ExportedHandler<Env>;
