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

// Zen reading shell. Tokens are inlined (this origin has no app CSS) and kept in
// step with app/globals.css: warm off-white canvas, near-black ink, one accent,
// ~68ch measure, optional reading serif, light + dark.
function readerShell(opts: {
  title: string;
  body: string;
  nonce: string;
  noindex: boolean;
}): string {
  const robots = opts.noindex
    ? '<meta name="robots" content="noindex" />'
    : "";
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
  --hairline: #eae8e1; --accent: #3b5bdb;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --canvas: #17171a; --surface: #1f1f23;
    --ink: #edece7; --ink-soft: #a8a79f; --ink-faint: #6f6e67;
    --hairline: #2c2c31; --accent: #7c93f0;
  }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--canvas);
  color: var(--ink);
  font-family: "Newsreader", ui-serif, Georgia, serif;
  font-size: 1.125rem;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.doc {
  max-width: 68ch;
  margin: 0 auto;
  padding: 5rem 1.5rem 8rem;
}
.doc h1, .doc h2, .doc h3, .doc h4 {
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  line-height: 1.25;
  margin: 2.25em 0 0.6em;
  font-weight: 620;
}
.doc h1 { font-size: 2rem; margin-top: 0; }
.doc h2 { font-size: 1.45rem; }
.doc h3 { font-size: 1.2rem; }
.doc p, .doc ul, .doc ol, .doc blockquote, .doc pre, .doc table { margin: 1.15em 0; }
.doc a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
.doc img { max-width: 100%; height: auto; border-radius: 4px; }
.doc blockquote {
  margin-left: 0; padding-left: 1.1em;
  border-left: 2px solid var(--hairline); color: var(--ink-soft);
}
.doc pre {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 6px;
  padding: 1em 1.1em;
  overflow-x: auto;
  font-size: 0.9em;
}
.doc code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
}
.doc :not(pre) > code {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 4px;
  padding: 0.1em 0.35em;
}
.doc hr { border: none; border-top: 1px solid var(--hairline); margin: 2.5em 0; }
.doc table { border-collapse: collapse; width: 100%; font-size: 0.95em; }
.doc th, .doc td { border: 1px solid var(--hairline); padding: 0.5em 0.7em; text-align: left; }
.doc figure { margin: 1.5em 0; }
.doc figcaption { color: var(--ink-faint); font-size: 0.9em; margin-top: 0.5em; }
</style>
</head>
<body>
<main class="doc">
${opts.body}
</main>
<!-- Phase 2 tracker; served no-op today so a page never breaks on it. -->
<script nonce="${opts.nonce}" src="/tracker.js"></script>
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Phase-2 tracker endpoint. Served as a harmless no-op today so the injected
    // <script src="/tracker.js"> never 404s or breaks a page.
    if (pathname === "/tracker.js") {
      return new Response("/* ilolink tracker: phase 2 */\n", {
        headers: {
          "content-type": "text/javascript; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
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

    // Fetch the sanitized, rendered body from R2.
    const object = await env.DOCS.get(rec.rendered_r2_key);
    if (!object) return notFoundPage();
    const body = await object.text();

    // Per-response CSP + nonce. Tracker is same-origin (/tracker.js), so the
    // nonce alone admits it; default-src 'none' blocks everything else.
    const csp = buildDocCsp();
    const html = readerShell({
      title: titleFromBody(body),
      body,
      nonce: csp.nonce,
      noindex: rec.visibility === "unlisted",
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
