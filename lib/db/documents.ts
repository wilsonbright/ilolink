import { nanoid } from "nanoid";
import { env } from "@/lib/cf";
import { queryFirst, execute } from "@/lib/db/client";
import { rawKey, renderedKey } from "@/lib/r2/store";
import type {
  DocumentRow,
  DocumentVersion,
  SlugRecord,
  SourceType,
  Visibility,
} from "@/lib/types";

// Fields a caller supplies at publish time; the rest (id, timestamps, current
// version) are derived here. No owner — ownership is the manage token hash.
export interface CreateDocumentInput {
  slug: string;
  source_type: SourceType;
  title?: string | null;
  visibility?: Visibility;
  password_hash?: string | null;
  manage_token_hash?: string | null;
  expires_at?: number | null;
}

// Insert a document shell (no version yet) and return the row.
export async function createDocument(
  input: CreateDocumentInput,
): Promise<DocumentRow> {
  const now = Date.now();
  const row: DocumentRow = {
    id: nanoid(),
    slug: input.slug,
    title: input.title ?? null,
    source_type: input.source_type,
    visibility: input.visibility ?? "public",
    password_hash: input.password_hash ?? null,
    manage_token_hash: input.manage_token_hash ?? null,
    current_version_id: null,
    expires_at: input.expires_at ?? null,
    published_at: now,
    created_at: now,
    updated_at: now,
  };
  await execute(
    `INSERT INTO documents
      (id, slug, title, source_type, visibility, password_hash,
       manage_token_hash, current_version_id, expires_at, published_at,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.slug,
    row.title,
    row.source_type,
    row.visibility,
    row.password_hash,
    row.manage_token_hash,
    row.current_version_id,
    row.expires_at,
    row.published_at,
    row.created_at,
    row.updated_at,
  );
  return row;
}

// Fetch by public slug; null if not found.
export function getDocumentBySlug(slug: string): Promise<DocumentRow | null> {
  return queryFirst<DocumentRow>(
    "SELECT * FROM documents WHERE slug = ?",
    slug,
  );
}

// Fetch by primary key; null if not found.
export function getDocumentById(id: string): Promise<DocumentRow | null> {
  return queryFirst<DocumentRow>("SELECT * FROM documents WHERE id = ?", id);
}

// Append a version row. R2 keys default to the docs/<docId>/<versionId>/…
// convention when the caller does not pass explicit keys.
export async function createVersion(
  docId: string,
  rawR2Key?: string,
  renderedR2Key?: string,
): Promise<DocumentVersion> {
  const version: DocumentVersion = {
    id: nanoid(),
    document_id: docId,
    raw_r2_key: rawR2Key ?? "",
    rendered_r2_key: renderedR2Key ?? "",
    created_at: Date.now(),
  };
  if (!version.raw_r2_key) version.raw_r2_key = rawKey(docId, version.id);
  if (!version.rendered_r2_key) {
    version.rendered_r2_key = renderedKey(docId, version.id);
  }
  await execute(
    `INSERT INTO document_versions
      (id, document_id, raw_r2_key, rendered_r2_key, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    version.id,
    version.document_id,
    version.raw_r2_key,
    version.rendered_r2_key,
    version.created_at,
  );
  return version;
}

// Point a document at a given version and bump updated_at.
export async function setCurrentVersion(
  docId: string,
  versionId: string,
): Promise<void> {
  await execute(
    "UPDATE documents SET current_version_id = ?, updated_at = ? WHERE id = ?",
    versionId,
    Date.now(),
    docId,
  );
}

// Change visibility and its dependent fields (password hash, expiry).
export async function updateVisibility(
  docId: string,
  visibility: Visibility,
  opts?: { password_hash?: string | null; expires_at?: number | null },
): Promise<void> {
  await execute(
    `UPDATE documents
       SET visibility = ?, password_hash = ?, expires_at = ?, updated_at = ?
     WHERE id = ?`,
    visibility,
    opts?.password_hash ?? null,
    opts?.expires_at ?? null,
    Date.now(),
    docId,
  );
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
export async function writeSlugRecord(
  slug: string,
  record: SlugRecord,
): Promise<void> {
  await env().KV.put(`slug:${slug}`, JSON.stringify(record));
}

// Read the slug lookup record; null if absent.
export async function readSlugRecord(
  slug: string,
): Promise<SlugRecord | null> {
  return env().KV.get<SlugRecord>(`slug:${slug}`, "json");
}
