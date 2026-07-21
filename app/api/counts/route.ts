// GET /api/counts?slug=&token= — compact per-doc tallies for the dashboard card.
//
// Same accountless ownership proof as /api/stats and /api/feedback: resolve the
// doc by its public slug, verify the presented manage token against the stored
// hash, and only then return { views, comments }. 403 on a bad/absent token;
// 404 for an unknown slug. Kept lean — the dashboard fetches one per card.

import { NextResponse } from "next/server";
import { getDocumentBySlug } from "@/lib/db/documents";
import { verifyToken } from "@/lib/manage-token";
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
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await verifyToken(token, doc.manage_token_hash))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

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
