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

// A deliberately small, inert subset of SVG.
//
// WHY SVG IS ALLOWED AT ALL: AI-generated pages are built out of inline SVG —
// icons, logos, chart axes. Stripping <svg> removed them silently, and a tester
// reported it as "some components are missing from the published file". Nothing
// told them anything had been dropped.
//
// WHY THIS IS SAFE: SVG is only dangerous through script, and every route to it
// is excluded below rather than filtered:
//   - <script> is in nonTextTags, so it is dropped tag AND content.
//   - <foreignObject> is NOT listed: it re-enters HTML parsing inside SVG and
//     would smuggle arbitrary markup past the tag allowlist above.
//   - <animate>/<set>/<animateTransform> are NOT listed: SMIL can retarget an
//     attribute (classically `href`) at runtime, which is script execution by
//     another name.
//   - <a> inside SVG is NOT listed; SVG links carry their own xlink surface.
//   - Every on* handler is dropped, because sanitize-html removes any attribute
//     not explicitly allowed.
//   - <use> is allowed but its href is restricted to same-document fragments
//     (see transformTags below) — an external reference could otherwise pull in
//     a remote document.
//
// Names are lowercase because the parser lowercases tags and attributes. That
// is correct for SVG-in-HTML specifically: the HTML parser's foreign-content
// rules map `viewbox` back to `viewBox`, `lineargradient` to `linearGradient`
// and so on, so casing is restored by the browser at parse time.
const SVG_TAGS = [
  "svg", "g", "defs", "symbol", "use", "title", "desc",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "text", "tspan", "textpath",
  "lineargradient", "radialgradient", "stop",
  "clippath", "mask", "pattern", "marker", "image",
];

// Presentation attributes only — geometry, paint and text metrics. No event
// handlers, no xlink:*, no `href` except on <use> (fragment-only, below).
const SVG_ATTRS = [
  "viewbox", "preserveaspectratio", "xmlns", "width", "height",
  "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
  "d", "points", "transform", "gradienttransform", "gradientunits",
  "patternunits", "patterncontentunits", "clippathunits", "maskunits",
  "markerwidth", "markerheight", "refx", "refy", "orient",
  "fill", "fill-opacity", "fill-rule", "clip-rule", "clip-path", "mask",
  "stroke", "stroke-width", "stroke-opacity", "stroke-linecap",
  "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit",
  "opacity", "offset", "stop-color", "stop-opacity",
  "font-family", "font-size", "font-weight", "font-style",
  "text-anchor", "dominant-baseline", "letter-spacing", "vector-effect",
  "aria-hidden", "aria-label", "role", "focusable", "shape-rendering",
];

// Named separately from OPTIONS so summarizeRemovals can read it as a plain
// string[]. IOptions types allowedTags as `string[] | false`, which is not
// directly iterable.
const ALLOWED_TAGS: string[] = [
    ...SVG_TAGS,
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
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  // Still stripped (not listed): <script>, <iframe>, <object>, <embed>, <link>,
  // <meta>, <base>, <math>, <foreignObject>, SMIL animation, and all
  // event-handler (on*) attributes. <svg> IS allowed now, as a closed inert
  // subset — see SVG_TAGS above for what that excludes and why.
  allowedAttributes: {
    // No `name` on <a>: legacy anchor name is a DOM-clobbering primitive.
    a: ["href", "title", "rel", "target"],
    img: ["src", "srcset", "alt", "title", "width", "height", "loading", "sizes"],
    source: ["src", "srcset", "type", "media", "sizes"],
    // Only reachable with a "#fragment" value: the transformTags entry for
    // <use> below deletes any href that is not same-document before this
    // allowlist is applied.
    use: ["href"],
    // `style` on every element so authored inline styling survives. The SVG
    // presentation attributes ride here too: they are inert paint/geometry and
    // appear on many different SVG elements, so listing them per tag would be
    // noise. None of them can reference a URL except via CSS url(), which the
    // served document's CSP already governs.
    "*": ["id", "class", "style", ...SVG_ATTRS],
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
    // <use> may only point INSIDE this document. `href="#icon-check"` is the
    // whole legitimate use (sprite sheets); anything else is a reference to a
    // remote document, which is why allowedSchemes cannot be relied on here —
    // "https" is a scheme we allow generally but must not allow for this.
    use: (tagName, attribs) => {
      const ref = attribs.href ?? attribs["xlink:href"] ?? "";
      const safe: Record<string, string> = { ...attribs };
      delete safe["xlink:href"];
      if (ref.startsWith("#")) safe.href = ref;
      else delete safe.href;
      return { tagName, attribs: safe };
    },
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

// Everything the allowlist above will drop, so the publisher can be told.
//
// WHY: sanitizeDocument used to return only {html, title}. Content was removed
// correctly and reported nowhere — a tester published a page, watched pieces of
// it vanish, and had no way to learn what had happened or that a trusted-HTML
// option existed. Silent removal is the actual defect; the stripping itself is
// working as designed.
//
// This is a REPORT, not a security boundary — sanitizeHtml above is the
// boundary. So a tag-name regex is fine: being approximate inside a comment or
// a CDATA block costs an inaccurate count, never an unsafe document.
const ALLOWED_TAG_SET = new Set(ALLOWED_TAGS);

export function summarizeRemovals(dirtyHtml: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of dirtyHtml.matchAll(/<\s*([a-zA-Z][a-zA-Z0-9:-]*)[\s>/]/g)) {
    const tag = m[1].toLowerCase();
    // <html>, <head> and <body> are structural: sanitize-html unwraps them and
    // keeps their contents, so reporting them as "removed" would be a lie.
    if (tag === "html" || tag === "head" || tag === "body") continue;
    if (ALLOWED_TAG_SET.has(tag)) continue;
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

export function sanitizeDocument(dirtyHtml: string): SanitizeResult {
  const title = extractTitle(dirtyHtml);
  const html = sanitizeHtml(dirtyHtml, OPTIONS);
  const removed = summarizeRemovals(dirtyHtml);
  return {
    html,
    title,
    ...(Object.keys(removed).length ? { removed } : {}),
  };
}

// Opt-in trusted path (migration 0006): the publisher vouched for this HTML, so
// it is stored and served RAW — the sole deliberate bypass of the sanitize
// boundary above. It is served under the permissive-but-origin-isolated trusted
// CSP (lib/sanitize/csp.ts buildDocCsp({trusted})). The title is still extracted
// through the same text-only sanitize pass, so no attribute markup is trusted.
// Callers MUST gate this behind an explicit publisher opt-in.
export function renderTrustedDocument(rawHtml: string): SanitizeResult {
  return { html: rawHtml, title: extractTitle(rawHtml) };
}
