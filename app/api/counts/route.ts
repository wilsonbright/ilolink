// GET /api/counts?slug=&token= — compact per-doc tallies for the dashboard card.
//
// Same access model as /api/stats and /api/feedback: guardDoc resolves the doc
// by its public slug and requires canRead — a teamspace membership on the
// session, a direct share, or a legacy manage token. 404 unknown slug, 401 when
// nobody is identified, 403 when they are but it isn't theirs. Kept lean — the
// dashboard fetches one per card.

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import { queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

// Cross-script Durable Object stub shape (class defined in the content Worker).
interface ViewCounterStub {
  get(): Promise<number>;
}

// Exact per-doc headline views from the Durable Object counter; mirrors the
// exactViews helper in /api/stats. Falls back to 0 when the DO is unreachable.
async function exactViews(docId: string): Promise<number> {
  try {
    const ns = (env() as unknown as { VIEW_COUNTER?: DurableObjectNamespace })
      .VIEW_COUNTER;
    if (!ns) return 0;
    const stub = ns.get(ns.idFromName(docId)) as unknown as ViewCounterStub;
    return await stub.get();
  } catch {
    return 0;
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await guardDoc(req, { require: "canRead" });
  if (!guard.ok) return guard.response;
  const { doc } = guard;

  const [views, commentRow] = await Promise.all([
    exactViews(doc.id),
    queryFirst<{ n: number }>(
      "SELECT COUNT(*) AS n FROM comments WHERE document_id = ? AND status = 'visible'",
      doc.id,
    ),
  ]);

  return NextResponse.json(
    { views, comments: Number(commentRow?.n ?? 0) },
    { headers: { "cache-control": "private, no-store" } },
  );
}
