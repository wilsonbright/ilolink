// Format auto-detection + renderers. AI chatbots emit many shapes of text —
// Markdown, HTML, JSON, CSV, code, and (as uploads) images. We detect the format
// from the CONTENT (never asking the user to choose) and render each to HTML that
// still passes through the sanitize boundary before it is stored/served.

import { renderMarkdown } from "@/lib/sanitize/markdown";
import { sanitizeDocument } from "@/lib/sanitize/html";
import type { SanitizeResult, SourceType } from "@/lib/types";

export type DocFormat = "html" | "markdown" | "json" | "csv" | "image";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksHtml(s: string): boolean {
  const h = s.trimStart().slice(0, 800).toLowerCase();
  if (h.startsWith("<!doctype") || h.startsWith("<html")) return true;
  return /<(p|div|h[1-6]|body|article|section|span|table|ul|ol|main|header|footer|nav|img|a|style)[\s>/]/.test(
    h,
  );
}

function isJson(s: string): boolean {
  const t = s.trim();
  if (!(t.startsWith("{") || t.startsWith("["))) return false;
  try {
    const v: unknown = JSON.parse(t);
    return typeof v === "object" && v !== null;
  } catch {
    return false;
  }
}

// Consistent delimiter count across the first several non-empty lines.
function isDelimited(s: string): "," | "\t" | null {
  const lines = s.trim().split(/\r?\n/).filter((l) => l.length);
  if (lines.length < 2) return null;
  const sample = lines.slice(0, Math.min(8, lines.length));
  for (const delim of [",", "\t"] as const) {
    const counts = sample.map((l) => l.split(delim).length - 1);
    if (counts[0] >= 1 && counts.every((n) => n === counts[0])) return delim;
  }
  return null;
}

// --- Binary uploads (pdf, docx) — pure helpers shared by the app route and the
// MCP worker. No env(); safe to import into a standalone Worker bundle. ---

// Binary uploads are far larger than text; base64 in a data URL inflates ~33%.
export const MAX_BINARY_BYTES = 15 * 1024 * 1024; // 15 MB (decoded)

// Detect a binary upload from its data-URL MIME. The server re-derives this from
// the content itself — it never trusts the client's declared sourceType.
export function detectUpload(content: string): "pdf" | "docx" | null {
  const head = content.slice(0, 120).toLowerCase();
  if (head.startsWith("data:application/pdf")) return "pdf";
  if (
    head.startsWith(
      "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
  ) {
    return "docx";
  }
  return null;
}

// Decode a base64 data URL to bytes. Returns null if it isn't a base64 data URL.
export function decodeDataUrl(content: string): Uint8Array | null {
  const comma = content.indexOf(",");
  if (comma < 0 || !/^data:[^,]*;base64$/i.test(content.slice(0, comma))) {
    return null;
  }
  try {
    return new Uint8Array(Buffer.from(content.slice(comma + 1), "base64"));
  } catch {
    return null;
  }
}

// Convert docx bytes to HTML. The HTML still passes through sanitizeDocument.
export async function docxToHtml(bytes: Uint8Array): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
  return result.value;
}

// Byte length of a UTF-8 string (matches what R2 stores, not JS char count).
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function detectFormat(raw: string, sourceType: SourceType): DocFormat {
  if (/^data:image\//i.test(raw.trim())) return "image";
  if (sourceType === "html" || looksHtml(raw)) return "html";
  if (isJson(raw)) return "json";
  if (isDelimited(raw)) return "csv";
  return "markdown";
}

// Minimal delimited parser (handles quoted fields with embedded delimiters/quotes).
function parseDelimited(s: string, delim: string): string[][] {
  const src = s.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

const TD = "border:1px solid var(--hairline,#e2ddd3);padding:.4rem .65rem;";

function renderJson(raw: string): string {
  const pretty = JSON.stringify(JSON.parse(raw.trim()), null, 2);
  return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9rem;line-height:1.55;background:var(--surface,#fff);border:1px solid var(--hairline,#e2ddd3);border-radius:8px;padding:1rem 1.1rem;overflow-x:auto;">${esc(
    pretty,
  )}</pre>`;
}

function renderCsv(raw: string, delim: string): string {
  const rows = parseDelimited(raw, delim).slice(0, 2000);
  if (!rows.length) return "<p>Empty table.</p>";
  const cols = Math.min(Math.max(...rows.map((r) => r.length)), 60);
  const cell = (v: string, head: boolean): string =>
    `<${head ? "th" : "td"} style="${TD}text-align:left;${head ? "background:var(--surface,#fff);font-weight:600;" : ""}">${esc(
      v,
    )}</${head ? "th" : "td"}>`;
  const head = rows[0]
    .slice(0, cols)
    .map((c) => cell(c, true))
    .join("");
  const body = rows
    .slice(1)
    .map(
      (r) =>
        `<tr>${Array.from({ length: cols }, (_, i) => cell(r[i] ?? "", false)).join("")}</tr>`,
    )
    .join("");
  return `<div style="overflow-x:auto;"><table style="border-collapse:collapse;font-size:.9rem;width:100%;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderImage(raw: string): string {
  // detectFormat guaranteed a data:image/ URL. In an <img>, even SVG data URLs
  // cannot execute script; the src is escaped for the attribute context.
  return `<div style="text-align:center;padding:1rem 0;"><img src="${esc(
    raw.trim(),
  )}" alt="" loading="lazy" style="max-width:100%;height:auto;border-radius:8px;"/></div>`;
}

// Render any supported content to sanitized HTML. Every path terminates at
// sanitizeDocument(): markdown/html because they are user markup, and
// json/csv/image because a second pass over our generated markup costs nothing
// and guarantees the strict allowlist is the last word.
export function renderContent(raw: string, sourceType: SourceType): SanitizeResult {
  const fmt = detectFormat(raw, sourceType);
  if (fmt === "html") return sanitizeDocument(raw);
  if (fmt === "markdown") return sanitizeDocument(renderMarkdown(raw));

  let html: string;
  let fallbackTitle: string;
  if (fmt === "json") {
    html = renderJson(raw);
    fallbackTitle = "JSON";
  } else if (fmt === "csv") {
    html = renderCsv(raw, isDelimited(raw) ?? ",");
    fallbackTitle = "Table";
  } else {
    html = renderImage(raw);
    fallbackTitle = "Image";
  }
  const s = sanitizeDocument(html);
  return { html: s.html, title: s.title ?? fallbackTitle };
}
