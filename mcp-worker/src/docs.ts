// Workspace-scoped document queries + mutations for the MCP read/write tools.
// Everything is filtered by workspace_id — a workspace can only see and touch its
// own documents. Reuses the shared pure store-core; no OpenNext env().

import {
  createVersionWith,
  setCurrentVersionWith,
  writeSlugRecordWith,
  readSlugRecordWith,
  putBodyWith,
  type PublishBindings,
} from "@/lib/publish/store-core";
import {
  renderContent,
  detectUpload,
  decodeDataUrl,
  docxToHtml,
  MAX_BINARY_BYTES,
} from "@/lib/publish/formats";
import type { SourceType } from "@/lib/types";
import { PublishError } from "./publish-core";

export interface DocRow {
  id: string;
  slug: string;
  title: string | null;
  source_type: SourceType;
  visibility: string;
  published_at: number;
  workspace_id: string | null;
  unpublished_at: number | null;
}

const SHARE_ORIGIN = "https://ilolink.com";
export const shareUrl = (slug: string): string => `${SHARE_ORIGIN}/${slug}`;

// Live docs for a workspace, newest first.
export async function listDocuments(
  DB: D1Database,
  workspaceId: string,
  limit: number,
): Promise<DocRow[]> {
  const res = await DB.prepare(
    `SELECT id, slug, title, source_type, visibility, published_at, workspace_id, unpublished_at
       FROM documents
      WHERE workspace_id = ? AND unpublished_at IS NULL
      ORDER BY published_at DESC
      LIMIT ?`,
  )
    .bind(workspaceId, Math.max(1, Math.min(limit, 100)))
    .all<DocRow>();
  return res.results;
}

// Title/slug search within a workspace (we don't index bodies).
export async function searchDocuments(
  DB: D1Database,
  workspaceId: string,
  query: string,
): Promise<DocRow[]> {
  const like = `%${query.replace(/[%_]/g, (m) => "\\" + m)}%`;
  const res = await DB.prepare(
    `SELECT id, slug, title, source_type, visibility, published_at, workspace_id, unpublished_at
       FROM documents
      WHERE workspace_id = ? AND unpublished_at IS NULL
        AND (title LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')
      ORDER BY published_at DESC
      LIMIT 25`,
  )
    .bind(workspaceId, like, like)
    .all<DocRow>();
  return res.results;
}

// One doc, only if it belongs to this workspace. Throws a friendly error otherwise.
export async function getOwnedDoc(
  DB: D1Database,
  workspaceId: string,
  docId: string,
): Promise<DocRow> {
  const row = await DB.prepare(
    `SELECT id, slug, title, source_type, visibility, published_at, workspace_id, unpublished_at
       FROM documents WHERE id = ?`,
  )
    .bind(docId)
    .first<DocRow>();
  if (!row || row.workspace_id !== workspaceId) {
    throw new PublishError("No document with that id in your workspace.");
  }
  return row;
}

interface ViewCounterStub {
  get(): Promise<number>;
}

// Exact per-doc views from the cross-script ViewCounter DO (0 if unavailable).
export async function docViews(
  ns: DurableObjectNamespace | undefined,
  docId: string,
): Promise<number> {
  try {
    if (!ns) return 0;
    const stub = ns.get(ns.idFromName(docId)) as unknown as ViewCounterStub;
    return await stub.get();
  } catch {
    return 0;
  }
}

// Visible comment count for a doc.
export async function docComments(DB: D1Database, docId: string): Promise<number> {
  const row = await DB.prepare(
    "SELECT COUNT(*) AS n FROM comments WHERE document_id = ? AND status = 'visible'",
  )
    .bind(docId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// Soft-unpublish: stamp unpublished_at + drop the KV slug record (link 404s).
// Reversible from the dashboard; D1 row + R2 bodies are kept.
export async function unpublishDoc(
  DB: D1Database,
  KV: KVNamespace,
  workspaceId: string,
  docId: string,
): Promise<string> {
  const doc = await getOwnedDoc(DB, workspaceId, docId);
  await DB.prepare("UPDATE documents SET unpublished_at = ? WHERE id = ?")
    .bind(Date.now(), docId)
    .run();
  await KV.delete(`slug:${doc.slug}`);
  return doc.slug;
}

// Append a new version to an existing doc (stable slug/URL). Text or binary.
export async function updateDoc(
  b: PublishBindings,
  workspaceId: string,
  docId: string,
  input: { content?: string; file_base64?: string; filename?: string },
): Promise<{ slug: string; share_url: string }> {
  const doc = await getOwnedDoc(b.DB, workspaceId, docId);

  let raw = input.content;
  if (input.file_base64) {
    const ext = (input.filename ?? "").toLowerCase().split(".").pop() ?? "";
    const mime =
      ext === "pdf"
        ? "application/pdf"
        : ext === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/octet-stream";
    raw = input.file_base64.startsWith("data:")
      ? input.file_base64
      : `data:${mime};base64,${input.file_base64}`;
  }
  if (!raw || !raw.trim()) {
    throw new PublishError("Provide new `content` or `file_base64` to update.");
  }

  const upload = detectUpload(raw);
  const version = await createVersionWith(b.DB, docId);
  let sourceType: SourceType;

  if (upload) {
    const bytes = decodeDataUrl(raw);
    if (!bytes) throw new PublishError("Malformed upload — expected a base64 data URL.");
    if (bytes.byteLength > MAX_BINARY_BYTES) {
      throw new PublishError("File exceeds the 15 MB limit.");
    }
    if (upload === "pdf") {
      sourceType = "pdf";
      await putBodyWith(b.DOCS, version.raw_r2_key, bytes, "application/pdf");
      await putBodyWith(b.DOCS, version.rendered_r2_key, "<!-- binary -->", "text/html; charset=utf-8");
    } else {
      sourceType = "html";
      const html = await docxToHtml(bytes).catch(() => {
        throw new PublishError("Could not read that .docx file.");
      });
      const r = renderContent(html, "html");
      await putBodyWith(b.DOCS, version.raw_r2_key, html, "text/html; charset=utf-8");
      await putBodyWith(b.DOCS, version.rendered_r2_key, r.html, "text/html; charset=utf-8");
    }
  } else {
    // Keep the original interpretation (md vs html) from the doc.
    sourceType = doc.source_type === "html" ? "html" : "md";
    const r = renderContent(raw, sourceType);
    const rawCt = sourceType === "md" ? "text/markdown; charset=utf-8" : "text/html; charset=utf-8";
    await putBodyWith(b.DOCS, version.raw_r2_key, raw, rawCt);
    await putBodyWith(b.DOCS, version.rendered_r2_key, r.html, "text/html; charset=utf-8");
  }

  await setCurrentVersionWith(b.DB, docId, version.id);
  await DB_setSourceType(b.DB, docId, sourceType);
  // Point the KV slug record at the new version, PRESERVING the doc's existing
  // visibility / password_hash / expires_at (never downgrade protection).
  const prev = await readSlugRecordWith(b.KV, doc.slug);
  await writeSlugRecordWith(b.KV, doc.slug, {
    doc_id: docId,
    visibility: prev?.visibility ?? (doc.visibility as never),
    current_version_id: version.id,
    rendered_r2_key: version.rendered_r2_key,
    raw_r2_key: version.raw_r2_key,
    password_hash: prev?.password_hash ?? null,
    expires_at: prev?.expires_at ?? null,
    source_type: sourceType,
  });
  return { slug: doc.slug, share_url: shareUrl(doc.slug) };
}

async function DB_setSourceType(
  DB: D1Database,
  docId: string,
  sourceType: SourceType,
): Promise<void> {
  await DB.prepare("UPDATE documents SET source_type = ?, updated_at = ? WHERE id = ?")
    .bind(sourceType, Date.now(), docId)
    .run();
}
