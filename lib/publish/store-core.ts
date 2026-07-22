// Pure storage core for the publish pipeline — parameterized by explicit
// Cloudflare bindings and containing NO import of `@/lib/cf` (OpenNext's env()).
//
// Why this exists: the Next app reaches bindings through OpenNext's
// getCloudflareContext(), which only works inside the app. A standalone Worker
// (content-worker, and now the MCP worker) has no access to it. Keeping the SQL
// / R2 / KV logic here, taking `PublishBindings`, lets BOTH the app and any
// standalone worker share ONE implementation — the app wrappers pass env(); the
// MCP worker passes its own env. Do not import env() into this file.

import { nanoid } from "nanoid";
import type {
  DocumentRow,
  DocumentVersion,
  SlugRecord,
  SourceType,
  Visibility,
} from "@/lib/types";

// The three bindings every publish path needs.
export interface PublishBindings {
  DB: D1Database;
  DOCS: R2Bucket;
  KV: KVNamespace;
}

// R2 key layout: docs/<docId>/<versionId>/{raw,rendered}.
export function rawKey(docId: string, versionId: string): string {
  return `docs/${docId}/${versionId}/raw`;
}
export function renderedKey(docId: string, versionId: string): string {
  return `docs/${docId}/${versionId}/rendered`;
}

// --- R2 ---

export async function putBodyWith(
  DOCS: R2Bucket,
  key: string,
  body: string | ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await DOCS.put(key, body, { httpMetadata: { contentType } });
}

export async function getBodyWith(
  DOCS: R2Bucket,
  key: string,
): Promise<string | null> {
  const obj = await DOCS.get(key);
  return obj ? obj.text() : null;
}

// --- D1: documents + versions ---

export interface CreateDocumentInput {
  slug: string;
  source_type: SourceType;
  title?: string | null;
  visibility?: Visibility;
  password_hash?: string | null;
  manage_token_hash?: string | null;
  expires_at?: number | null;
  // Set on the MCP path so the doc is owned by a workspace. Optional/null on the
  // web path. The column is added by migration 0003.
  workspace_id?: string | null;
  // Opt-in: store + serve this HTML raw (unsanitized) under the permissive CSP.
  // Default false. The column is added by migration 0006.
  trusted?: boolean;
}

export async function createDocumentWith(
  DB: D1Database,
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
    trusted: input.trusted ?? false,
  };
  await DB.prepare(
    `INSERT INTO documents
      (id, slug, title, source_type, visibility, password_hash,
       manage_token_hash, current_version_id, expires_at, published_at,
       created_at, updated_at, workspace_id, trusted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
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
      input.workspace_id ?? null,
      row.trusted ? 1 : 0,
    )
    .run();
  return row;
}

export function getDocumentBySlugWith(
  DB: D1Database,
  slug: string,
): Promise<DocumentRow | null> {
  return DB.prepare("SELECT * FROM documents WHERE slug = ?")
    .bind(slug)
    .first<DocumentRow>();
}

export async function createVersionWith(
  DB: D1Database,
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
  await DB.prepare(
    `INSERT INTO document_versions
      (id, document_id, raw_r2_key, rendered_r2_key, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      version.id,
      version.document_id,
      version.raw_r2_key,
      version.rendered_r2_key,
      version.created_at,
    )
    .run();
  return version;
}

export async function setCurrentVersionWith(
  DB: D1Database,
  docId: string,
  versionId: string,
): Promise<void> {
  await DB.prepare(
    "UPDATE documents SET current_version_id = ?, updated_at = ? WHERE id = ?",
  )
    .bind(versionId, Date.now(), docId)
    .run();
}

// --- KV slug record ---

export async function writeSlugRecordWith(
  KV: KVNamespace,
  slug: string,
  record: SlugRecord,
): Promise<void> {
  await KV.put(`slug:${slug}`, JSON.stringify(record));
}

export function readSlugRecordWith(
  KV: KVNamespace,
  slug: string,
): Promise<SlugRecord | null> {
  return KV.get<SlugRecord>(`slug:${slug}`, "json");
}

// --- Composite: append a version (text or binary) ---

const rawContentType = (t: SourceType): string =>
  t === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";

export async function storeVersionWith(
  b: PublishBindings,
  docId: string,
  raw: string,
  html: string,
  sourceType: SourceType,
): Promise<DocumentVersion> {
  const version = await createVersionWith(b.DB, docId);
  await putBodyWith(b.DOCS, version.raw_r2_key, raw, rawContentType(sourceType));
  await putBodyWith(
    b.DOCS,
    version.rendered_r2_key,
    html,
    "text/html; charset=utf-8",
  );
  await setCurrentVersionWith(b.DB, docId, version.id);
  return version;
}

export async function storeBinaryVersionWith(
  b: PublishBindings,
  docId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<DocumentVersion> {
  const version = await createVersionWith(b.DB, docId);
  await putBodyWith(b.DOCS, version.raw_r2_key, bytes, contentType);
  await putBodyWith(
    b.DOCS,
    version.rendered_r2_key,
    "<!-- binary -->",
    "text/html; charset=utf-8",
  );
  await setCurrentVersionWith(b.DB, docId, version.id);
  return version;
}
