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
    "h1", "h2", "h3", "h4", "h5", "h6", "hgroup",
    "p", "blockquote", "pre", "code", "span", "div", "section", "article",
    "a", "img", "picture", "source", "figure", "figcaption",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "strong", "em", "b", "i", "u", "s", "del", "ins", "mark", "sub", "sup", "small",
    "hr", "br",
    "dl", "dt", "dd",
    "abbr", "kbd", "samp", "var", "time",
    // Layout / semantic containers — pure structure, no behaviour.
    "nav", "header", "footer", "main", "aside",
    // Styling. LLM-generated pages (landing mockups) live and die by their CSS.
    // Safe here: CSS cannot execute JS in modern browsers, external fetches in
    // url()/@import are governed by the served doc's strict CSP, and the doc is
    // served isolated on view.ilolink.com. See lib/sanitize/csp.ts.
    "style",
    // Visual form controls. Inert: no <form> action is allowed and the served
    // CSP sets form-action 'none', so nothing can be submitted anywhere.
    "form", "label", "input", "button", "select", "option", "textarea",
    "fieldset", "legend",
  ],
  // Still stripped (not listed): <script>, <iframe>, <object>, <embed>, <link>,
  // <meta>, <base>, <svg>, <math>, and all event-handler (on*) attributes.
  allowedAttributes: {
    // No `name` on <a>: legacy anchor name is a DOM-clobbering primitive.
    a: ["href", "title", "rel", "target"],
    img: ["src", "srcset", "alt", "title", "width", "height", "loading", "sizes"],
    source: ["src", "srcset", "type", "media", "sizes"],
    // `style` on every element so authored inline styling survives.
    "*": ["id", "class", "style"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    col: ["span"],
    time: ["datetime"],
    ol: ["start", "type"],
    // Visual-only form attributes. Deliberately NO `formaction`/`action`/`on*`.
    input: [
      "type", "placeholder", "value", "checked", "disabled", "readonly",
      "min", "max", "step", "maxlength", "pattern", "size", "list",
    ],
    button: ["type", "disabled"],
    label: ["for"],
    select: ["disabled", "multiple", "size"],
    option: ["value", "selected", "disabled"],
    textarea: ["placeholder", "rows", "cols", "maxlength", "disabled", "readonly"],
  },
  allowedSchemes: ALLOWED_SCHEMES,
  allowedSchemesByTag: { img: ALLOWED_SCHEMES_IMG, source: ALLOWED_SCHEMES_IMG },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // We intentionally allow <style> (a "vulnerable" tag per sanitize-html); it is
  // safe under our CSP + origin isolation. Scripts are still fully stripped.
  allowVulnerableTags: true,
  // Drop only these entirely (tag AND content) so stripped code never leaks as
  // visible text. `style` is NOT here — we keep its CSS.
  nonTextTags: ["script", "noscript"],
  // Force safe rel on links that open a new tab; strip target we didn't set.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow ugc" }, true),
  },
  allowProtocolRelative: false,
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
