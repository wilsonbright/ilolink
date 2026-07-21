// Shared publish pipeline (spec §5.1, §6): render → sanitize → store in R2 →
// append a version → point the document at it. Documents are immutable, so each
// has exactly one version; the pipeline still routes through the sanitize boundary.

import { renderMarkdown } from "@/lib/sanitize/markdown";
import { sanitizeDocument } from "@/lib/sanitize/html";
import { putBody } from "@/lib/r2/store";
import { createVersion, setCurrentVersion } from "@/lib/db/documents";
import type { DocumentVersion, SourceType, Visibility } from "@/lib/types";

// Upload ceiling for both raw bodies and file uploads.
export const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

// Public content origin (isolated) where published docs are served.
export const VIEW_ORIGIN = "https://view.ilolink.com";

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

// md → HTML via markdown-it then sanitize; html → sanitize directly. Every path
// ends at sanitizeDocument(), the single security boundary. Never store `raw`
// rendered directly — only the returned `html` is safe to serve.
export function renderAndSanitize(raw: string, sourceType: SourceType): RenderResult {
  const dirty = sourceType === "md" ? renderMarkdown(raw) : raw;
  const { html, title } = sanitizeDocument(dirty);
  return { html, title };
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

export const viewUrl = (slug: string): string => `${VIEW_ORIGIN}/${slug}`;
