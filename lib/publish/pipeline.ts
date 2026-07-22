// Shared publish pipeline (spec §5.1, §6): render → sanitize → store in R2 →
// append a version → point the document at it. Documents are immutable, so each
// has exactly one version; the pipeline still routes through the sanitize boundary.

import { env } from "@/lib/cf";
import { storeVersionWith, storeBinaryVersionWith } from "@/lib/publish/store-core";
import { renderContent } from "@/lib/publish/formats";
import type { DocumentVersion, SourceType, Visibility } from "@/lib/types";

// The app's bindings, from OpenNext env(). The MCP worker calls store-core's
// *With functions with its own bindings instead.
const appBindings = () => ({ DB: env().DB, DOCS: env().DOCS, KV: env().KV });

// Upload ceiling for both raw bodies and file uploads.
export const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

// Isolated content origin where the untrusted doc HTML is actually rendered.
export const VIEW_ORIGIN = "https://view.ilolink.com";
// Branded share origin. ilolink.com/<slug> 302-redirects to VIEW_ORIGIN/<slug>
// (app/[slug]/route.ts) so links look clean while rendering stays isolated.
export const SHARE_ORIGIN = "https://ilolink.com";

const VISIBILITIES: ReadonlySet<Visibility> = new Set<Visibility>([
  "public",
  "unlisted",
  "password",
  "expiring",
]);

export function isVisibility(v: unknown): v is Visibility {
  return typeof v === "string" && VISIBILITIES.has(v as Visibility);
}

export function isSourceType(v: unknown): v is SourceType {
  return v === "md" || v === "html" || v === "pdf";
}

// Binary uploads (pdf, docx) are far larger than text; base64 in a data URL
// also inflates ~33%. Cap the DECODED byte size here.
export const MAX_BINARY_BYTES = 15 * 1024 * 1024; // 15 MB

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

// Convert docx bytes to HTML (headings, bold/italic, lists, tables, inline
// images as data URLs). The HTML still passes through sanitizeDocument upstream.
export async function docxToHtml(bytes: Uint8Array): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.convertToHtml({
    buffer: Buffer.from(bytes),
  });
  return result.value;
}

// Byte length of a UTF-8 string (matches what R2 stores, not JS char count).
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export interface RenderResult {
  html: string;
  title: string | null;
}

// Auto-detect the format (markdown / html / JSON / CSV / image) from the content
// and render it to sanitized HTML. Every path ends at sanitizeDocument(), the
// single security boundary. Never store `raw` rendered directly.
export function renderAndSanitize(raw: string, sourceType: SourceType): RenderResult {
  return renderContent(raw, sourceType);
}


// Append a new version: store raw + rendered bodies in R2, then set the
// document's current_version_id (history is preserved — old versions stay).
export function storeVersion(
  docId: string,
  raw: string,
  html: string,
  sourceType: SourceType,
): Promise<DocumentVersion> {
  return storeVersionWith(appBindings(), docId, raw, html, sourceType);
}

// Store a binary version (pdf): raw key holds the bytes, served by the worker's
// /raw/<slug> route. The rendered key holds a marker only — the worker builds the
// <iframe> viewer shell at serve time, so no rendered HTML is needed.
export function storeBinaryVersion(
  docId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<DocumentVersion> {
  return storeBinaryVersionWith(appBindings(), docId, bytes, contentType);
}

// The shareable link is on the branded apex; it redirects to the render origin.
export const viewUrl = (slug: string): string => `${SHARE_ORIGIN}/${slug}`;
