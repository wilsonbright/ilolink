// Theming for a document rendered inside a srcdoc iframe, shared by the two
// places the app previews a doc: the dashboard's Preview overlay and the
// heatmap's underlay.
//
// It exists because a srcdoc iframe is a SEPARATE DOCUMENT. None of the app's
// CSS reaches it — not the tokens, and not next/font's @font-face rules — so a
// markdown rendering arrived as black serif on white, which in a dark app is a
// glaring white rectangle in the middle of the page.
//
// Everything below is read from the live computed styles at call time, so a
// dark scheme hands over its dark values and no colour literal appears here.

// Should this payload get the app theme? True only for the pipeline's own
// unstyled renderings; anything the author styled stays untouched.
//   - A full document shell means trusted/exported HTML: hands off.
//   - The pipeline's JSON/CSV tables (lib/publish/formats.ts renderJson /
//     renderCsv) DO carry inline styles, but only ours — recognized by their
//     generated prefixes. Their var(--surface,…)/var(--hairline,…) fallbacks
//     are what the injected :root block feeds.
//   - Any other <style> tag or style= attribute is authored styling: hands off.
//   - What remains is a bare fragment — markdown-it output — which themes.
export function isThemeable(html: string): boolean {
  const head = html.trimStart().slice(0, 200).toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) return false;
  if (head.startsWith('<pre style="white-space:pre-wrap')) return true;
  if (head.startsWith('<div style="overflow-x:auto;"><table')) return true;
  // Sniff a COPY with code-block contents emptied out first: a markdown doc
  // whose fenced code merely QUOTES a <style> tag or a style= attribute is
  // still the pipeline's own unstyled rendering, and matching on the raw
  // payload misclassified it as author-styled. The tags themselves stay, so
  // a real style= on a <pre>/<code> element still reads as authored.
  const stripped = html
    .replace(/(<pre\b[^>]*>)[\s\S]*?(<\/pre>)/gi, "$1$2")
    .replace(/(<code\b[^>]*>)[\s\S]*?(<\/code>)/gi, "$1$2");
  if (/<style[\s>]/i.test(stripped)) return false;
  if (/\sstyle\s*=/i.test(stripped)) return false;
  return true;
}

// The app's font, restated for the srcdoc document. @font-face rules never
// cross a document boundary, so without this the iframe fell back to system
// fonts. The primary family name is read from the body's computed stack (a
// next/font hashed name, never spelled here), then every matching
// CSSFontFaceRule is copied out of the app's stylesheets verbatim — they are
// same-origin, so cssRules is readable, and the try/catch only skips a sheet
// an extension injected cross-origin. The font URLs those rules carry are
// same-origin /_next/static/media/ paths, and a srcdoc document under
// sandbox="allow-same-origin" resolves them against this page's base URL, so
// they load. Zero matching rules still sets the family stack — the system
// fallback renders, exactly as before. The h1–h4 rule mirrors globals.css
// (Archivo 800, tight) so markdown headings preview true.
function appFontCss(): string {
  if (typeof document === "undefined") return "";
  const stack = getComputedStyle(document.body).fontFamily;
  if (!stack) return "";
  const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, "");
  const primary = unquote(stack.split(",")[0]);
  const faces: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      if (unquote(rule.style.getPropertyValue("font-family")) !== primary) {
        continue;
      }
      faces.push(rule.cssText);
    }
  }
  return `${faces.join("\n  ")}
  body { font-family: ${stack}; }
  h1, h2, h3, h4 { font-weight: 800; letter-spacing: -0.015em; }`;
}

// The app tokens, restated for the srcdoc document. The :root block feeds the
// fallback vars the pipeline's JSON/CSV markup already references.
export function appThemeStyle(): string {
  if (typeof document === "undefined") return "";
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const canvas = v("--color-canvas");
  const ink = v("--color-ink");
  const inkSoft = v("--color-ink-soft");
  const hairline = v("--color-hairline");
  const accentStrong = v("--color-accent-strong");
  const fontCss = appFontCss();
  if (!canvas || !ink) return fontCss ? `<style>\n  ${fontCss}\n</style>` : "";
  return `<style>
  ${fontCss}
  :root { --surface: ${canvas}; --hairline: ${hairline}; }
  body { background: ${canvas}; color: ${ink}; }
  a { color: ${accentStrong}; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid ${hairline}; padding: 0.3rem 0.6rem; text-align: left; }
  blockquote { color: ${inkSoft}; border-left: 2px solid ${hairline}; margin-left: 0; padding-left: 1rem; }
  hr { border: 0; border-top: 1px solid ${hairline}; }
</style>`;
}

// The srcdoc to hand an iframe: themed when the payload is one of the
// pipeline's own unstyled renderings, untouched otherwise.
export function themedSrcDoc(html: string): string {
  return isThemeable(html) ? `${appThemeStyle()}${html}` : html;
}
