import sanitizeHtml from "sanitize-html";
import type { SanitizeResult } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// The core security boundary (spec §6). Every uploaded document is hostile.
// This runs on ingest; the output is what gets stored in R2 and served on the
// isolated content origin under a strict CSP. Defense in depth: even if a
// sanitizer gap exists, the CSP (default-src 'none') and the separate origin
// stop it from doing damage.
// ─────────────────────────────────────────────────────────────────────────

// Only http(s), mailto, and tel survive on links. Everything else — javascript:,
// data:, vbscript:, file: — is dropped by sanitize-html's allowedSchemes.
const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];

// Images: allow http(s) and data: (inline images are common in LLM output and
// cannot execute). No other schemes.
const ALLOWED_SCHEMES_IMG = ["http", "https", "data"];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "blockquote", "pre", "code", "span", "div", "section", "article",
    "a", "img", "figure", "figcaption",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "strong", "em", "b", "i", "u", "s", "del", "ins", "mark", "sub", "sup", "small",
    "hr", "br",
    "dl", "dt", "dd",
    "abbr", "kbd", "samp", "var", "time",
  ],
  // No <script>, <style>, <iframe>, <object>, <embed>, <form>, <input>, <button>,
  // <link>, <meta>, <base>, <svg>, <math>, event-handler attrs — none are listed,
  // so all are stripped.
  allowedAttributes: {
    // No `name`: legacy anchor `name` is a DOM-clobbering primitive and is
    // redundant with `id` (kept for in-document anchor navigation).
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    "*": ["id", "class"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    col: ["span"],
    time: ["datetime"],
    ol: ["start", "type"],
  },
  allowedSchemes: ALLOWED_SCHEMES,
  allowedSchemesByTag: { img: ALLOWED_SCHEMES_IMG },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // Drop the content of these entirely (not just the tags) so stripped script
  // text never leaks into the output as visible text.
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
  // Force safe rel on links that open a new tab; strip target we didn't set.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow ugc" }, true),
  },
  // Enforce protocol-relative resolution and disallow relative URLs becoming
  // ambiguous; keep it strict.
  allowProtocolRelative: false,
  // Explicitly disallow all CSS: no style attributes survive (not in allowlist),
  // and any style tags are dropped above.
  parser: {
    lowerCaseTags: true,
    lowerCaseAttributeNames: true,
  },
};

// Extract a title before/after sanitizing: prefer the document's first <h1>,
// then <title>, else null. Uses a sanitize pass restricted to text so we never
// trust attribute-embedded markup.
function extractTitle(rawHtml: string): string | null {
  const h1 = rawHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const t = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pick = h1?.[1] ?? t?.[1] ?? null;
  if (!pick) return null;
  // Strip any tags inside the captured title and collapse whitespace.
  const text = sanitizeHtml(pick, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  return text.length ? text.slice(0, 200) : null;
}

export function sanitizeDocument(dirtyHtml: string): SanitizeResult {
  const title = extractTitle(dirtyHtml);
  const html = sanitizeHtml(dirtyHtml, OPTIONS);
  return { html, title };
}
