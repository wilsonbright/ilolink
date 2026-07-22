// POST /api/admin/action — moderation actions. Gated by the ADMIN_SECRET in the
// x-admin-key header. Ops: unpublish/restore a doc, dismiss its reports,
// suspend/unsuspend a workspace.

import { NextResponse } from "next/server";
import { env } from "@/lib/cf";
import { verifyAdmin } from "@/lib/admin/gate";
import type { SlugRecord } from "@/lib/types";

export const runtime = "nodejs";

function bad(msg: string, status = 400): NextResponse {
  return NextResponse.json({ error: msg }, { status });
}

async function unpublishDoc(docId: string): Promise<void> {
  const db = env().DB;
  const doc = await db
    .prepare("SELECT slug, unpublished_at FROM documents WHERE id = ?")
    .bind(docId)
    .first<{ slug: string; unpublished_at: number | null }>();
  if (!doc) return;
  await db.prepare("UPDATE documents SET unpublished_at = ? WHERE id = ?").bind(Date.now(), docId).run();
  await env().KV.delete(`slug:${doc.slug}`);
}

async function restoreDoc(docId: string): Promise<void> {
  const db = env().DB;
  const doc = await db
    .prepare(
      "SELECT slug, visibility, password_hash, expires_at, source_type, current_version_id FROM documents WHERE id = ?",
    )
    .bind(docId)
    .first<{
      slug: string;
      visibility: string;
      password_hash: string | null;
      expires_at: number | null;
      source_type: string;
      current_version_id: string | null;
    }>();
  if (!doc || !doc.current_version_id) return;
  const ver = await db
    .prepare("SELECT rendered_r2_key, raw_r2_key FROM document_versions WHERE id = ?")
    .bind(doc.current_version_id)
    .first<{ rendered_r2_key: string; raw_r2_key: string }>();
  if (!ver) return;
  const record: SlugRecord = {
    doc_id: docId,
    visibility: doc.visibility as SlugRecord["visibility"],
    current_version_id: doc.current_version_id,
    rendered_r2_key: ver.rendered_r2_key,
    raw_r2_key: ver.raw_r2_key,
    password_hash: doc.password_hash,
    expires_at: doc.expires_at,
    source_type: doc.source_type as SlugRecord["source_type"],
  };
  await env().KV.put(`slug:${doc.slug}`, JSON.stringify(record));
  await db.prepare("UPDATE documents SET unpublished_at = NULL WHERE id = ?").bind(docId).run();
}

async function suspendWorkspace(wsId: string): Promise<void> {
  const db = env().DB;
  const docs = await db
    .prepare("SELECT slug FROM documents WHERE workspace_id = ? AND unpublished_at IS NULL")
    .bind(wsId)
    .all<{ slug: string }>();
  await db.prepare("UPDATE workspaces SET status = 'suspended' WHERE id = ?").bind(wsId).run();
  await db
    .prepare("UPDATE documents SET unpublished_at = ? WHERE workspace_id = ? AND unpublished_at IS NULL")
    .bind(Date.now(), wsId)
    .run();
  await Promise.all(docs.results.map((d) => env().KV.delete(`slug:${d.slug}`)));
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!verifyAdmin(req.headers.get("x-admin-key"))) return bad("Unauthorized.", 401);

  let body: { op?: unknown; target?: unknown };
  try {
    body = (await req.json()) as { op?: unknown; target?: unknown };
  } catch {
    return bad("Invalid JSON.");
  }
  const op = typeof body.op === "string" ? body.op : "";
  const target = typeof body.target === "string" ? body.target : "";
  if (!op || !target) return bad("Missing op or target.");

  const db = env().DB;
  switch (op) {
    case "unpublish":
      await unpublishDoc(target);
      break;
    case "restore":
      await restoreDoc(target);
      break;
    case "dismiss":
      await db
        .prepare("UPDATE reports SET status = 'dismissed' WHERE document_id = ? AND status = 'open'")
        .bind(target)
        .run();
      break;
    case "suspend":
      await suspendWorkspace(target);
      break;
    case "unsuspend":
      await db
        .prepare("UPDATE workspaces SET status = 'active', abuse_flags = 0 WHERE id = ?")
        .bind(target)
        .run();
      break;
    default:
      return bad("Unknown op.");
  }
  return NextResponse.json({ ok: true });
}
