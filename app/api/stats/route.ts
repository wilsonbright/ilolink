// GET /api/stats?slug=[&token=] — private per-doc analytics (spec §7).
//
// Authorization goes through guardDoc(), which accepts EITHER a teamspace
// membership on the signed-in session or a legacy manage token, and answers via
// the one permission resolver. 404 for an unknown slug, 401 when nobody is
// identified, 403 when they are but the document isn't theirs.

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import { queryStats } from "@/lib/analytics/query";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

// Cross-script Durable Object stub shape (class defined in the content Worker).
interface ViewCounterStub {
  get(): Promise<number>;
}

// Exact headline views from the per-doc Durable Object; falls back to null (the
// client then shows the Analytics Engine count) if the DO is unreachable.
async function exactViews(docId: string): Promise<number | null> {
  try {
    const ns = (env() as unknown as { VIEW_COUNTER?: DurableObjectNamespace })
      .VIEW_COUNTER;
    if (!ns) return null;
    const stub = ns.get(ns.idFromName(docId)) as unknown as ViewCounterStub;
    return await stub.get();
  } catch {
    return null;
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await guardDoc(req, { require: "canRead" });
  if (!guard.ok) return guard.response;
  const { doc } = guard;

  const [stats, exact] = await Promise.all([
    queryStats(doc.id),
    exactViews(doc.id),
  ]);
  // The response is a superset of Stats: `doc` (the non-secret doc id, already
  // public in the served page's <meta name="ilo:doc">) lets the client reach the
  // view-origin /_feedback and /_comments endpoints, which key by doc id. Only
  // slug + token are known client-side, so this route is the slug→id bridge.
  // `exactViews` (from the Durable Object) overrides the sampled AE count when
  // available; the client prefers it for the headline number.
  return NextResponse.json(
    { ...stats, doc: doc.id, exactViews: exact },
    { headers: { "cache-control": "private, no-store" } },
  );
}
