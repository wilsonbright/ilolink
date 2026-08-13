// GET /api/stats?slug=[&token=] — private per-doc analytics (spec §7).
//
// Authorization goes through guardDoc(), which accepts EITHER a teamspace
// membership on the signed-in session or a legacy manage token, and answers via
// the one permission resolver. 404 for an unknown slug, 401 when nobody is
// identified, 403 when they are but the document isn't theirs.

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import { getMembership } from "@/lib/teamspace/store";
import { queryStats } from "@/lib/analytics/query";
import { queryAll } from "@/lib/db/client";
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

// One row per member who opened the doc through /private/<slug> — the only
// place identity is known (member_doc_views, 0017). Public/unlisted views
// never reach that table, so this list is a members-only complement to the
// anonymous counts, not the full audience.
interface MemberViewRow {
  email: string;
  name: string | null;
  last_viewed_at: number;
  view_count: number;
}

// Best-effort like the rest of the analytics reads: any D1 hiccup degrades to
// an empty list rather than failing the whole stats response.
async function memberViews(docId: string): Promise<MemberViewRow[]> {
  try {
    return await queryAll<MemberViewRow>(
      `SELECT u.email, u.name, v.last_viewed_at, v.view_count
       FROM member_doc_views v
       JOIN users u ON u.id = v.user_id
       WHERE v.document_id = ?
       ORDER BY v.last_viewed_at DESC
       LIMIT 50`,
      docId,
    );
  } catch {
    return [];
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await guardDoc(req, { require: "canRead" });
  if (!guard.ok) return guard.response;
  const { doc, userId } = guard;

  // canRead is satisfied by share grantees and legacy manage-token holders too,
  // and neither belongs anywhere near teamspace members' emails and reading
  // behavior. memberViews therefore needs actual membership on top of the
  // guard: null for everyone else, exactly like a non-teamspace doc.
  const membership = doc.teamspace_id
    ? await getMembership(doc.teamspace_id, userId)
    : null;

  const [stats, exact, members] = await Promise.all([
    queryStats(doc.id),
    exactViews(doc.id),
    // memberViews is null (not []) for a non-teamspace doc — its absence is
    // what tells the client not to draw the section at all — and null again
    // for any caller who passed the guard without being a member.
    membership ? memberViews(doc.id) : Promise.resolve(null),
  ]);
  // The response is a superset of Stats: `doc` (the non-secret doc id, already
  // public in the served page's <meta name="ilo:doc">) lets the client reach the
  // view-origin /_feedback and /_comments endpoints, which key by doc id. Only
  // slug + token are known client-side, so this route is the slug→id bridge.
  // `exactViews` (from the Durable Object) overrides the sampled AE count when
  // available; the client prefers it for the headline number.
  return NextResponse.json(
    { ...stats, doc: doc.id, exactViews: exact, memberViews: members },
    { headers: { "cache-control": "private, no-store" } },
  );
}
