import MarkdownIt from "markdown-it";

// Server-side Markdown → HTML. `html: true` lets raw HTML in the .md through to
// the parser output — that is FINE here because every output of this function is
// passed through sanitizeHtml() before it is ever stored or served. Never serve
// this raw.
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
});

export function renderMarkdown(source: string): string {
  return md.render(source);
}
