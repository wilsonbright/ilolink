// POST /api/documents/move — file a document into a folder, or back to the root.
//
// Gated on canEdit for the document (so a viewer share cannot reorganize
// someone else's teamspace) AND on the folder resolving inside the document's
// own teamspace (so a document cannot be filed across the boundary).

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import { FolderError, moveDocument } from "@/lib/teamspace/folders";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: { slug?: unknown; folderId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug) {
    return NextResponse.json({ error: "A 'slug' is required." }, { status: 400 });
  }
  const folderId =
    typeof body.folderId === "string" && body.folderId ? body.folderId : null;

  const guard = await guardDoc(req, { require: "canEdit", slug });
  if (!guard.ok) return guard.response;

  // A document with no teamspace is an unclaimed pre-accounts one; there is no
  // teamspace whose folders it could be filed into.
  if (!guard.doc.teamspace_id) {
    return NextResponse.json(
      { error: "Add this document to your account before filing it." },
      { status: 409 },
    );
  }

  try {
    await moveDocument(guard.doc.teamspace_id, guard.doc.id, folderId);
    return NextResponse.json({ ok: true, folderId });
  } catch (e) {
    if (e instanceof FolderError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
