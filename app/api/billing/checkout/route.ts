// POST /api/billing/checkout — start a Stripe Checkout Session for a teamspace.
//
// Body: { teamspace: string, plan: "team5" | "team10" }
// Returns: { url } — the client sends the browser there.
//
// AUTHORIZATION: only an OWNER of the teamspace may buy for it. Membership is
// not enough; a member could otherwise attach a payment (and a Stripe customer)
// to a team they merely belong to.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";
import { siteOrigin } from "@/lib/auth/config";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { createCheckoutSession, StripeError } from "@/lib/billing/stripe";
import { PLANS, isPlanId, type PlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";

function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function secretKey(): string {
  return (env() as unknown as { STRIPE_SECRET_KEY?: string }).STRIPE_SECRET_KEY ?? "";
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return bad("Sign in to upgrade.", 401);

  if (!secretKey()) {
    // Explicit rather than a Stripe 401 surfaced as a mystery: this is what a
    // deploy that forgot `wrangler secret put STRIPE_SECRET_KEY` looks like.
    return bad("Payments are not configured yet. Please try again later.", 503);
  }

  // Creating a Checkout Session is a network call to Stripe; don't let it be
  // looped. Not a security boundary, just a brake.
  const ip = clientIp(req);
  if (!(await rateLimit(`billing:checkout:user:${user.id}`, 20, 3600))) {
    return bad("Too many attempts. Please wait a few minutes.", 429);
  }
  if (!(await rateLimit(`billing:checkout:ip:${ip}`, 40, 3600))) {
    return bad("Too many attempts. Please wait a few minutes.", 429);
  }

  let body: { teamspace?: unknown; plan?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("Request body must be valid JSON.");
  }

  const teamspaceId = typeof body.teamspace === "string" ? body.teamspace : "";
  const planId = body.plan;
  if (!teamspaceId) return bad("Field 'teamspace' is required.");
  if (!isPlanId(planId) || planId === "free") {
    return bad("Field 'plan' must be a paid plan.");
  }

  // Owner only — see the header comment.
  const role = await getMembership(teamspaceId, user.id);
  if (role !== "owner") {
    return bad("Only the owner of a teamspace can upgrade it.", 403);
  }

  const ts = await queryFirst<{ plan: string; is_personal: number; name: string }>(
    "SELECT plan, is_personal, name FROM teamspaces WHERE id = ?",
    teamspaceId,
  );
  if (!ts) return bad("That teamspace does not exist.", 404);

  // Refuse to sell a plan that is not an upgrade. Without this, a second
  // purchase of the same tier silently takes the money and changes nothing,
  // and buying team5 after team10 would DOWNGRADE a team that already paid
  // more — potentially below its current member count.
  const current = PLANS[isPlanId(ts.plan) ? (ts.plan as PlanId) : "free"];
  const target = PLANS[planId];
  if (target.seats <= current.seats && current.priceCents > 0) {
    return bad(
      `This teamspace is already on the ${current.label} plan. ` +
        `Contact support if you need to change it.`,
      409,
    );
  }

  try {
    const { url } = await createCheckoutSession({
      secretKey: secretKey(),
      planId,
      teamspaceId,
      userId: user.id,
      customerEmail: user.email,
      // Stripe replaces {CHECKOUT_SESSION_ID}; the success page uses it only to
      // say what was bought. The PLAN IS NEVER GRANTED FROM THIS REDIRECT —
      // only the webhook grants, because a user can navigate to the success URL
      // by hand without paying a cent.
      successUrl: `${siteOrigin()}/t/${teamspaceId}?upgraded={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteOrigin()}/pricing?canceled=1`,
    });
    return NextResponse.json({ url }, { status: 200 });
  } catch (e) {
    if (e instanceof StripeError) {
      console.error("stripe checkout failed:", e.message);
      return bad("Could not start checkout. Please try again.", 502);
    }
    throw e;
  }
}
