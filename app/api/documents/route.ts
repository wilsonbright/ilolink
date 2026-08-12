// DELETE /api/documents?slug=&token= — permanently unpublish a document.
// PATCH  /api/documents           — rename a document (its title).
//
// DELETE is authorized by guardDoc (canDelete): a teamspace member for docs they
// created, an owner otherwise, or a legacy manage token for pre-accounts docs.
// Resolve by slug, verify the token, then hard-delete every trace: D1 rows
// (comments, feedback, versions, doc), the KV slug record, and all R2 bodies.
// Irreversible by design — documents are immutable and there is no trash.

import { NextResponse } from "next/server";
import {
  getDocumentBySlug,
  deleteDocumentCascade,
} from "@/lib/db/documents";
import { guardDoc } from "@/lib/auth/doc-guard";
import { deleteByPrefix } from "@/lib/r2/store";
import { execute } from "@/lib/db/client";
import { normalizeTitle } from "@/lib/publish/title";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

// PATCH /api/documents — set a document's title.
//
// WHAT THIS DOES NOT DO, deliberately: it does not change the published page.
// The content worker derives the reader-facing <title>, og:title and card text
// from the first <h1> of the rendered body at request time, precisely to avoid a
// D1 read on the hot serving path (content-worker/src/index.ts:169-176). Nothing
// public reads documents.title. The UI says so, because a rename that silently
// failed to reach the page people actually see would be the worse surprise.
//
// It is not merely decorative either: title is a search predicate for the MCP
// `search` tool (mcp-worker/src/docs.ts:76-79, `WHERE title LIKE ?`), so a
// rename changes what a connected assistant can find.
//
// Gated on canEdit — its first consumer; every other doc route uses canRead,
// canDelete, canManageShares or canModerate. canEdit is the right level here and
// NOT the wrong one that `move` had to avoid: an editor share satisfies canEdit
// without teamspace membership, which would be theft for a move (it relocates
// ownership) but is exactly what an "editor" share is for when the change is the
// document's own metadata.
export async function PATCH(req: Request): Promise<NextResponse> {
  const body: unknown = await req.json().catch(() => null);
  const b = (body ?? {}) as Record<string, unknown>;
  const documentId = typeof b.documentId === "string" ? b.documentId : "";
  if (!documentId) {
    return NextResponse.json(
      { error: "A 'documentId' is required." },
      { status: 400 },
    );
  }

  const title = normalizeTitle(b.title as string);
  if (!title.ok) {
    return NextResponse.json({ error: title.error }, { status: 400 });
  }

  const guard = await guardDoc(req, { require: "canEdit", byId: documentId });
  if (!guard.ok) return guard.response;

  await execute(
    "UPDATE documents SET title = ?, updated_at = ? WHERE id = ?",
    title.value,
    Date.now(),
    documentId,
  );

  return NextResponse.json(
    { ok: true, title: title.value },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "A 'slug' is required." }, { status: 400 });
  }

  // Idempotent: an already-deleted doc reports success so the client can clear
  // its local history without getting stuck on a 404. Checked before the guard
  // so the response for a gone document does not depend on who is asking.
  const existing = await getDocumentBySlug(slug);
  if (!existing) return NextResponse.json({ ok: true, alreadyGone: true });

  // canDelete, which a member only holds for documents they created. The legacy
  // manage token still rides in the Authorization header rather than the query
  // string, since this is the one irreversible operation.
  const guard = await guardDoc(req, { require: "canDelete", slug });
  if (!guard.ok) return guard.response;
  const { doc } = guard;

  // Order: drop the public lookup first (stops new reads), then bodies, then rows.
  await env().KV.delete(`slug:${slug}`);
  await deleteByPrefix(`docs/${doc.id}/`);
  await deleteDocumentCascade(doc.id);

  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}
