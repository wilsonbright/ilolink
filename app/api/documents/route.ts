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
import { verifyToken } from "@/lib/manage-token";
import { deleteByPrefix } from "@/lib/r2/store";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

export async function DELETE(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  // The manage token is destructive-irreversible, so it rides in the
  // Authorization header (not the query string, which lands in access logs).
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!slug || !token) {
    return NextResponse.json(
      { error: "slug (query) and Bearer token (Authorization header) are required." },
      { status: 400 },
    );
  }

  const doc = await getDocumentBySlug(slug);
  // Idempotent: an already-deleted doc reports success so the client can clear
  // its local history without getting stuck on a 404.
  if (!doc) return NextResponse.json({ ok: true, alreadyGone: true });

  if (!(await verifyToken(token, doc.manage_token_hash))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // Order: drop the public lookup first (stops new reads), then bodies, then rows.
  await env().KV.delete(`slug:${slug}`);
  await deleteByPrefix(`docs/${doc.id}/`);
  await deleteDocumentCascade(doc.id);

  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}
