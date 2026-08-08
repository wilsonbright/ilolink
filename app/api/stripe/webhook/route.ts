// POST /api/stripe/webhook — the ONLY place a paid plan is ever granted.
//
// Deliberately not the checkout success redirect: anyone can visit a success
// URL by hand. Money is only real when Stripe says so, signed.
//
// This endpoint is intentionally outside every other gate in the app — no
// session, no Turnstile, no admin secret — because Stripe presents none of
// them. Its only authentication is the signature check in
// lib/billing/stripe.ts, which is why that check must be exactly right.
//
// NOT rate-limited on purpose. Stripe retries failed deliveries with backoff
// for up to three days; a 429 would look like a failure and cause more retries,
// and a sustained retry storm would be indistinguishable from an outage. The
// signature check already rejects anything unsigned before any work is done.

import { NextResponse } from "next/server";
import { env } from "@/lib/cf";
import { execute, queryFirst } from "@/lib/db/client";
import { verifyStripeEvent } from "@/lib/billing/stripe";
import { isPlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";

function secret(): string {
  return (
    (env() as unknown as { STRIPE_WEBHOOK_SECRET?: string }).STRIPE_WEBHOOK_SECRET ??
    ""
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  // RAW body, read exactly once. Stripe signs the bytes it sent, so calling
  // req.json() here (or anywhere before this) and re-serialising would change
  // whitespace and key order and the signature would never match — which would
  // present as "every webhook is a forgery" with nothing to explain it.
  const raw = await req.text();

  const event = await verifyStripeEvent(
    raw,
    req.headers.get("stripe-signature"),
    secret(),
    Date.now(),
  );
  if (!event) {
    // One uniform answer for a bad signature, a stale timestamp, and malformed
    // JSON alike — never tell an unauthenticated caller which check it failed.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Idempotency, in D1 rather than KV. Stripe delivers at-least-once and will
  // redeliver on any non-2xx, so without this a retry could grant a plan twice
  // (harmless today, but it would also double any future side effect such as a
  // receipt email). INSERT OR IGNORE + meta.changes is atomic; a KV read-then-
  // write is not, and lib/ratelimit.ts already documents that KV loses races.
  const first = await execute(
    "INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)",
    event.id,
    event.type,
    Date.now(),
  );
  if (!first.meta.changes) {
    // Already processed. 200 so Stripe stops retrying.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id?: string;
      payment_status?: string;
      customer?: string;
      metadata?: { teamspace_id?: string; plan_id?: string };
    };

    // `completed` does not always mean paid — a session can complete with a
    // delayed payment method still pending. Granting on anything other than
    // `paid` would hand out plans for money that has not arrived.
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: true, ignored: "unpaid" });
    }

    const teamspaceId = session.metadata?.teamspace_id ?? "";
    const planId = session.metadata?.plan_id ?? "";
    if (!teamspaceId || !isPlanId(planId) || planId === "free") {
      console.error("stripe webhook: unusable metadata", event.id, teamspaceId, planId);
      // 200: retrying will not fix bad metadata, and a 4xx here would have
      // Stripe redeliver this same broken event for three days.
      return NextResponse.json({ ok: true, ignored: "metadata" });
    }

    const ts = await queryFirst<{ id: string }>(
      "SELECT id FROM teamspaces WHERE id = ?",
      teamspaceId,
    );
    if (!ts) {
      console.error("stripe webhook: unknown teamspace", event.id, teamspaceId);
      return NextResponse.json({ ok: true, ignored: "unknown-teamspace" });
    }

    // Grant. `stripe_session_id` carries a UNIQUE index (migration 0015), so
    // one session can never upgrade two teamspaces even if the events table
    // were lost — the second write would fail rather than silently succeed.
    await execute(
      `UPDATE teamspaces
          SET plan = ?, plan_source = 'stripe', plan_updated_at = ?,
              stripe_customer_id = COALESCE(?, stripe_customer_id),
              stripe_session_id = ?
        WHERE id = ?`,
      planId,
      Date.now(),
      session.customer ?? null,
      session.id ?? null,
      teamspaceId,
    );

    // The MCP worker reads its own workspaces row. Its quota field is a stale
    // snapshot, so keep it in step rather than leaving two numbers that
    // disagree. The publish path no longer reads it (it counts by teamspace),
    // but anything else that does should not see 'free' on a paid team.
    await execute(
      "UPDATE workspaces SET plan = ? WHERE teamspace_id = ?",
      planId,
      teamspaceId,
    );
  }

  return NextResponse.json({ ok: true });
}
