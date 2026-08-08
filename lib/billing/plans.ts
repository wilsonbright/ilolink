// The plans, as data. PURE — no bindings, no env(), no D1.
//
// That purity is load-bearing: app/page.tsx is statically prerendered (`○ /` in
// the build output) and may not touch a binding anywhere in its module graph.
// Importing lib/publish/pipeline.ts or lib/teamspace/store.ts from the landing
// page would break the prerender; importing this file cannot. Same precedent as
// lib/artifacts/kinds.ts.
//
// One source of truth for three consumers that must never disagree: the pricing
// copy, the Stripe Checkout line item, and the server-side limit checks. If a
// number here is wrong, it is wrong everywhere at once — which is the point.
//
// BILLING MODEL: one-time payment, lifetime. Not a subscription. There is no
// renewal, no dunning, no period end, and no downgrade-on-failure path, because
// there is nothing to fail. A teamspace that paid stays paid. This is why the
// schema has no plan_status/current_period_end columns — adding them would
// imply an expiry that does not exist.

export type PlanId = "free" | "team5" | "team10";

export interface Plan {
  id: PlanId;
  label: string;
  /** Price in the smallest currency unit (cents). 0 for free. */
  priceCents: number;
  /** Maximum members in a teamspace on this plan, INCLUDING the owner. */
  seats: number;
  /** Maximum live (not unpublished) documents in a teamspace on this plan. */
  docs: number;
  /** One line for the pricing card. */
  blurb: string;
  /** Shown as a bullet list on the pricing card. */
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Personal",
    priceCents: 0,
    // 1 seat means EXACTLY the owner. Inviting anybody requires a paid plan;
    // that is the whole upgrade trigger, so this number is not a soft limit.
    seats: 1,
    docs: 3,
    blurb: "For one person, publishing a few documents.",
    features: [
      "3 published documents",
      "Just you — invites need a team plan",
      "Full analytics: views, read-through, heatmaps",
      "Comments and reactions from readers",
      "Connect your AI assistant over MCP",
    ],
  },
  team5: {
    id: "team5",
    label: "Team of 5",
    priceCents: 900,
    seats: 5,
    docs: 100,
    blurb: "Pay once. Five people, forever.",
    features: [
      "100 published documents",
      "5 teammates, including you",
      "Shared registry: skills, specs, plans, handoffs",
      "Everything in Personal",
    ],
  },
  team10: {
    id: "team10",
    label: "Team of 10",
    priceCents: 1900,
    seats: 10,
    docs: 500,
    blurb: "Pay once. Ten people, forever.",
    features: [
      "500 published documents",
      "10 teammates, including you",
      "Shared registry: skills, specs, plans, handoffs",
      "Everything in Personal",
    ],
  },
};

export const PAID_PLAN_IDS: readonly PlanId[] = ["team5", "team10"];

export const DEFAULT_PLAN: PlanId = "free";

export function isPlanId(v: unknown): v is PlanId {
  return v === "free" || v === "team5" || v === "team10";
}

// Resolve a plan from whatever is in teamspaces.plan.
//
// Deliberately total: the column has no CHECK constraint (SQLite cannot add one
// by ALTER, see migrations/0014_artifacts.sql), and it already contains legacy
// values — 'anon' and 'team' were written by mcp-worker/src/workspace.ts before
// billing existed. An unknown value must resolve to the FREE plan rather than
// throwing, because this runs inside the publish path: a row with a typo in it
// should restrict a user, never 500 the request.
export function planFor(raw: string | null | undefined): Plan {
  return isPlanId(raw) ? PLANS[raw] : PLANS[DEFAULT_PLAN];
}

// Price formatted for display: 900 → "$9". Whole dollars only, because every
// current price is a whole dollar; if a cents price is ever added this must
// start rendering "$9.50" instead of silently truncating.
export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
