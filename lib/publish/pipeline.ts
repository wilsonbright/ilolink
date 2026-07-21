// Shared publish pipeline (spec §5.1, §6): render → sanitize → store in R2 →
// append a version → point the document at it. Documents are immutable, so each
// has exactly one version; the pipeline still routes through the sanitize boundary.

import { putBody } from "@/lib/r2/store";
import { createVersion, setCurrentVersion } from "@/lib/db/documents";
import { renderContent } from "@/lib/publish/formats";
import type { DocumentVersion, SourceType, Visibility } from "@/lib/types";

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
  return v === "md" || v === "html";
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

const rawContentType = (t: SourceType): string =>
  t === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";

// Append a new version: store raw + rendered bodies in R2, then set the
// document's current_version_id (history is preserved — old versions stay).
export async function storeVersion(
  docId: string,
  raw: string,
  html: string,
  sourceType: SourceType,
): Promise<DocumentVersion> {
  const version = await createVersion(docId);
  await putBody(version.raw_r2_key, raw, rawContentType(sourceType));
  await putBody(version.rendered_r2_key, html, "text/html; charset=utf-8");
  await setCurrentVersion(docId, version.id);
  return version;
}

// The shareable link is on the branded apex; it redirects to the render origin.
export const viewUrl = (slug: string): string => `${SHARE_ORIGIN}/${slug}`;
