// GET /api/stats?slug=&token= — private per-doc analytics (spec §7).
//
// Accountless: the manage token minted at publish time is the only proof of
// ownership. We resolve the doc by its public slug, verify the presented token
// against the stored hash (constant-time), and only then return its Stats.
// 403 on a bad/absent token; 404 for an unknown slug (slugs are public URLs).

import { NextResponse } from "next/server";
import { getDocumentBySlug } from "@/lib/db/documents";
import { verifyToken } from "@/lib/manage-token";
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
