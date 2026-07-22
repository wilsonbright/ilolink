import { env } from "@/lib/cf";
import { queryFirst } from "@/lib/db/client";
import {
  createDocumentWith,
  createVersionWith,
  setCurrentVersionWith,
  writeSlugRecordWith,
  readSlugRecordWith,
  getDocumentBySlugWith,
} from "@/lib/publish/store-core";
import type { DocumentRow, DocumentVersion, SlugRecord } from "@/lib/types";

// CreateDocumentInput now lives with the pure core (shared by app + MCP worker).
export type { CreateDocumentInput } from "@/lib/publish/store-core";
import type { CreateDocumentInput } from "@/lib/publish/store-core";

// App-side wrappers: bind the current OpenNext env() and delegate to the pure
// store-core. The MCP worker calls the *With functions directly with its own
// bindings — one implementation, two front doors. See lib/publish/store-core.ts.

export function createDocument(input: CreateDocumentInput): Promise<DocumentRow> {
  return createDocumentWith(env().DB, input);
}

export function getDocumentBySlug(slug: string): Promise<DocumentRow | null> {
  return getDocumentBySlugWith(env().DB, slug);
}

// Fetch by primary key; null if not found.
export function getDocumentById(id: string): Promise<DocumentRow | null> {
  return queryFirst<DocumentRow>("SELECT * FROM documents WHERE id = ?", id);
}

export function createVersion(
  docId: string,
  rawR2Key?: string,
  renderedR2Key?: string,
): Promise<DocumentVersion> {
  return createVersionWith(env().DB, docId, rawR2Key, renderedR2Key);
}

export function setCurrentVersion(
  docId: string,
  versionId: string,
): Promise<void> {
  return setCurrentVersionWith(env().DB, docId, versionId);
}

// Hard-delete a document and everything hanging off it (comments, feedback,
// versions, then the row). Callers also purge the KV slug record and R2 bodies.
// Batched into a single D1 round-trip so the row teardown is atomic.
export async function deleteDocumentCascade(docId: string): Promise<void> {
  const db = env().DB;
  await db.batch([
    db.prepare("DELETE FROM comments WHERE document_id = ?").bind(docId),
    db.prepare("DELETE FROM feedback WHERE document_id = ?").bind(docId),
    db.prepare("DELETE FROM document_versions WHERE document_id = ?").bind(docId),
    db.prepare("DELETE FROM documents WHERE id = ?").bind(docId),
  ]);
}

// --- KV slug lookup (hot content-origin path) ---

// Write the slug -> doc lookup record at key `slug:<slug>`.
export function writeSlugRecord(
  slug: string,
  record: SlugRecord,
): Promise<void> {
  return writeSlugRecordWith(env().KV, slug, record);
}

// Read the slug lookup record; null if absent.
export function readSlugRecord(slug: string): Promise<SlugRecord | null> {
  return readSlugRecordWith(env().KV, slug);
}
