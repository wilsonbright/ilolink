// GET /api/feedback?slug=&token= — private feedback for the publisher.
//
// Reader NOTES are private (a note author reasonably expects only the publisher
// reads them), so they are served here, token-gated, NOT from the public
// content-origin /_feedback (which returns reaction tallies only). Same
// ownership proof as /api/stats: resolve doc by slug, verify the manage token.

import { NextResponse } from "next/server";
import { getDocumentBySlug } from "@/lib/db/documents";
import { verifyToken } from "@/lib/manage-token";
import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const token = url.searchParams.get("token");

  if (!slug || !token) {
    return NextResponse.json(
      { error: "Both 'slug' and 'token' are required." },
      { status: 400 },
    );
  }

  const doc = await getDocumentBySlug(slug);
  if (!doc) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (!(await verifyToken(token, doc.manage_token_hash))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const reactionRows = await queryAll<{ value: string; n: number }>(
    "SELECT value, COUNT(*) AS n FROM feedback WHERE document_id = ? AND kind = 'reaction' GROUP BY value",
    doc.id,
  );
  const reactions: Record<string, number> = { "👍": 0, "🤔": 0, "👀": 0 };
  for (const r of reactionRows) {
    if (r.value in reactions) reactions[r.value] = Number(r.n);
  }

  const notes = await queryAll<{ value: string; created_at: number }>(
    "SELECT value, created_at FROM feedback WHERE document_id = ? AND kind = 'note' ORDER BY created_at DESC LIMIT 200",
    doc.id,
  );

  return NextResponse.json(
    { reactions, notes },
    { headers: { "cache-control": "private, no-store" } },
  );
}
