// DELETE /api/documents?slug=&token= — permanently unpublish a document.
//
// Accountless: the manage token minted at publish is the only proof of ownership.
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
import { env } from "@/lib/cf";

export const runtime = "nodejs";

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
