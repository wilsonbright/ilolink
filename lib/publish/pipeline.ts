// Shared publish pipeline (spec §5.1, §6): render → sanitize → store in R2 →
// append a version → point the document at it. Documents are immutable, so each
// has exactly one version; the pipeline still routes through the sanitize boundary.

import { env } from "@/lib/cf";
import { storeVersionWith, storeBinaryVersionWith } from "@/lib/publish/store-core";
import { renderContent } from "@/lib/publish/formats";
import { renderTrustedDocument } from "@/lib/sanitize/html";
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

// Binary/format helpers moved to the pure formats module (shared with the MCP
// worker). Re-exported here so existing app imports from @/lib/publish/pipeline
// keep working.
export {
  MAX_BINARY_BYTES,
  detectUpload,
  decodeDataUrl,
  docxToHtml,
  byteLength,
} from "@/lib/publish/formats";

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

// Opt-in trusted HTML: bypass the sanitizer and keep the raw markup verbatim
// (title still extracted safely). Only reachable when the publisher explicitly
// vouches for the content; the doc is then served under the trusted CSP.
export function renderTrusted(raw: string): RenderResult {
  return renderTrustedDocument(raw);
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
