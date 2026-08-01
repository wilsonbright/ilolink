// GET /api/feedback?slug=&token= — private feedback for the publisher.
//
// Reader NOTES are private (a note author reasonably expects only the publisher
// reads them), so they are served here, token-gated, NOT from the public
// content-origin /_feedback (which returns reaction tallies only). Same
// ownership proof as /api/stats: resolve doc by slug, verify the manage token.

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await guardDoc(req, { require: "canRead" });
  if (!guard.ok) return guard.response;
  const { doc } = guard;

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
