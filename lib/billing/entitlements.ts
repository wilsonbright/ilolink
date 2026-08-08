// Entitlement checks: may this teamspace take one more member, or publish one
// more document?
//
// Takes the D1 binding as an argument rather than calling env(), because the
// document check has to run in BOTH the Next app and the standalone MCP worker,
// and the MCP worker has no OpenNext env(). Same convention as
// lib/publish/store-core.ts.
//
// THE COUNTING RULE, which was wrong before billing existed:
// Both limits count by `teamspace_id`. The MCP publish path used to count
// `WHERE workspace_id = ?`, but the web publish path never writes
// workspace_id — measured against production on 2026-08-08, 21 of 27 live
// documents had workspace_id NULL. So the MCP counter was blind to 78% of
// documents. Harmless when the quota was a generous 200 and nothing was sold on
// it; a trivially exploitable hole the moment the free plan is 3 documents:
// publish three on the web, then keep publishing over MCP forever.

import { planFor, type Plan } from "@/lib/billing/plans";

export interface Bindings {
  DB: D1Database;
}

export interface TeamspaceLimits {
  plan: Plan;
  seatsUsed: number;
  docsUsed: number;
}

// Live documents in a teamspace. `unpublished_at IS NULL` matches what both
// existing quota checks already counted, so unpublishing frees a slot.
export async function countDocuments(
  DB: D1Database,
  teamspaceId: string,
): Promise<number> {
  const row = await DB.prepare(
    `SELECT COUNT(*) AS n FROM documents
      WHERE teamspace_id = ? AND unpublished_at IS NULL`,
  )
    .bind(teamspaceId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function countMembers(
  DB: D1Database,
  teamspaceId: string,
): Promise<number> {
  const row = await DB.prepare(
    "SELECT COUNT(*) AS n FROM teamspace_members WHERE teamspace_id = ?",
  )
    .bind(teamspaceId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getPlan(
  DB: D1Database,
  teamspaceId: string,
): Promise<Plan> {
  const row = await DB.prepare("SELECT plan FROM teamspaces WHERE id = ?")
    .bind(teamspaceId)
    .first<{ plan: string }>();
  return planFor(row?.plan);
}

export async function getLimits(
  DB: D1Database,
  teamspaceId: string,
): Promise<TeamspaceLimits> {
  const [plan, seatsUsed, docsUsed] = await Promise.all([
    getPlan(DB, teamspaceId),
    countMembers(DB, teamspaceId),
    countDocuments(DB, teamspaceId),
  ]);
  return { plan, seatsUsed, docsUsed };
}

export interface DocCheck {
  allowed: boolean;
  used: number;
  limit: number;
  plan: Plan;
}

// Can this teamspace publish one more document?
//
// Read-then-write, deliberately not atomic. A user racing themselves could land
// one document over the cap; the cost is one extra row, and the alternative
// (folding the count into the INSERT) would have to be threaded through both
// publish paths and the whole R2 body write that precedes the INSERT. The seat
// check below IS atomic, because there the race is between different people and
// the thing being oversold is what was paid for.
export async function checkDocumentAllowance(
  DB: D1Database,
  teamspaceId: string,
): Promise<DocCheck> {
  const plan = await getPlan(DB, teamspaceId);
  const used = await countDocuments(DB, teamspaceId);
  return { allowed: used < plan.docs, used, limit: plan.docs, plan };
}

// The message a user sees when they hit the document cap.
//
// Names the number, the plan, and the way out. The previous quota error said
// only "Document quota reached for this teamspace", which told nobody what the
// quota was or what to do about it.
export function documentLimitMessage(check: DocCheck, upgradeUrl: string): string {
  return (
    `You've published ${check.used} of ${check.limit} documents on the ` +
    `${check.plan.label} plan. Unpublish one to free a slot, or upgrade for ` +
    `more room: ${upgradeUrl}`
  );
}

export function seatLimitMessage(plan: Plan): string {
  if (plan.seats <= 1) {
    return (
      "This is a personal teamspace, which is just you. To work with other " +
      "people, upgrade to a team plan and invite them."
    );
  }
  return (
    `This team is full — the ${plan.label} plan includes ${plan.seats} ` +
    `members. Upgrade for more seats, or remove a member first.`
  );
}
