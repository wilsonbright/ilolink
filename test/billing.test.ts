// Billing: plan data and Stripe webhook signature verification.
//
// The signature tests are the important half. That check is the ONLY
// authentication on /api/stripe/webhook — the endpoint deliberately has no
// session, no Turnstile and no admin secret, because Stripe presents none of
// them. If it verifies wrongly in the permissive direction, anyone can grant
// themselves a paid plan; if it verifies wrongly in the strict direction, no
// paying customer ever receives one.

import { describe, it, expect } from "vitest";
import {
  PLANS,
  planFor,
  isPlanId,
  formatPrice,
  DEFAULT_PLAN,
} from "@/lib/billing/plans";
import { verifyStripeEvent } from "@/lib/billing/stripe";
import { hmacHex, hexFromBytes } from "@/lib/crypto/hmac";

describe("plans", () => {
  it("prices and limits match what the pricing copy promises", () => {
    expect(PLANS.free.priceCents).toBe(0);
    expect(PLANS.free.seats).toBe(1);
    expect(PLANS.free.docs).toBe(3);

    expect(PLANS.team5.priceCents).toBe(900);
    expect(PLANS.team5.seats).toBe(5);
    expect(PLANS.team5.docs).toBe(100);

    expect(PLANS.team10.priceCents).toBe(1900);
    expect(PLANS.team10.seats).toBe(10);
    expect(PLANS.team10.docs).toBe(500);
  });

  it("free means exactly one person — the upgrade trigger depends on it", () => {
    // If this ever becomes >1, inviting a teammate stops requiring payment and
    // the entire paid tier loses its reason to exist.
    expect(PLANS.free.seats).toBe(1);
  });

  it("higher tiers are strictly more generous", () => {
    expect(PLANS.team5.seats).toBeGreaterThan(PLANS.free.seats);
    expect(PLANS.team10.seats).toBeGreaterThan(PLANS.team5.seats);
    expect(PLANS.team5.docs).toBeGreaterThan(PLANS.free.docs);
    expect(PLANS.team10.docs).toBeGreaterThan(PLANS.team5.docs);
    expect(PLANS.team10.priceCents).toBeGreaterThan(PLANS.team5.priceCents);
  });

  it("planFor is total — legacy and junk values degrade to free, never throw", () => {
    // teamspaces.plan has no CHECK constraint and already contains 'anon' and
    // 'team' written by the MCP worker before billing existed. This runs inside
    // the publish path: a bad value must restrict, not 500.
    expect(planFor("team5").id).toBe("team5");
    expect(planFor("anon").id).toBe(DEFAULT_PLAN);
    expect(planFor("team").id).toBe(DEFAULT_PLAN);
    expect(planFor(null).id).toBe(DEFAULT_PLAN);
    expect(planFor(undefined).id).toBe(DEFAULT_PLAN);
    expect(planFor("").id).toBe(DEFAULT_PLAN);
    expect(planFor("TEAM5").id).toBe(DEFAULT_PLAN);
  });

  it("isPlanId rejects anything not a plan", () => {
    expect(isPlanId("free")).toBe(true);
    expect(isPlanId("team10")).toBe(true);
    expect(isPlanId("enterprise")).toBe(false);
    expect(isPlanId(5)).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });

  it("formats prices as whole dollars", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(900)).toBe("$9");
    expect(formatPrice(1900)).toBe("$19");
    expect(formatPrice(950)).toBe("$9.50");
  });
});

describe("hexFromBytes", () => {
  it("lowercase hex, zero-padded — Stripe's encoding", () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 255]).buffer;
    expect(hexFromBytes(bytes)).toBe("00010f10ff");
  });
});

const SECRET = "whsec_test_secret";

async function signedHeader(payload: string, tsSeconds: number, secret = SECRET) {
  const sig = await hmacHex(secret, `${tsSeconds}.${payload}`);
  return `t=${tsSeconds},v1=${sig}`;
}

describe("verifyStripeEvent", () => {
  const now = 1_700_000_000_000; // fixed ms
  const nowSec = Math.floor(now / 1000);
  const payload = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: { object: { payment_status: "paid" } },
  });

  it("accepts a correctly signed event", async () => {
    const header = await signedHeader(payload, nowSec);
    const ev = await verifyStripeEvent(payload, header, SECRET, now);
    expect(ev).not.toBeNull();
    expect(ev?.id).toBe("evt_1");
    expect(ev?.type).toBe("checkout.session.completed");
  });

  it("rejects a wrong secret", async () => {
    const header = await signedHeader(payload, nowSec, "whsec_someone_else");
    expect(await verifyStripeEvent(payload, header, SECRET, now)).toBeNull();
  });

  it("rejects a tampered body — the signature covers the bytes", async () => {
    const header = await signedHeader(payload, nowSec);
    const tampered = payload.replace('"paid"', '"unpaid"');
    expect(await verifyStripeEvent(tampered, header, SECRET, now)).toBeNull();
  });

  it("rejects a re-serialised body, even when semantically identical", async () => {
    // The trap this guards: calling req.json() and re-stringifying changes
    // whitespace/key order, and every real webhook would silently 400.
    const header = await signedHeader(payload, nowSec);
    const reserialised = JSON.stringify(JSON.parse(payload), null, 2);
    expect(await verifyStripeEvent(reserialised, header, SECRET, now)).toBeNull();
  });

  it("rejects a stale timestamp outside the tolerance (replay)", async () => {
    const old = nowSec - 3600;
    const header = await signedHeader(payload, old);
    expect(await verifyStripeEvent(payload, header, SECRET, now)).toBeNull();
  });

  it("accepts a timestamp inside the tolerance", async () => {
    const recent = nowSec - 60;
    const header = await signedHeader(payload, recent);
    expect(await verifyStripeEvent(payload, header, SECRET, now)).not.toBeNull();
  });

  it("rejects a future timestamp outside tolerance", async () => {
    const future = nowSec + 3600;
    const header = await signedHeader(payload, future);
    expect(await verifyStripeEvent(payload, header, SECRET, now)).toBeNull();
  });

  it("accepts when ONE of several v1 signatures matches (secret rotation)", async () => {
    const good = await hmacHex(SECRET, `${nowSec}.${payload}`);
    const header = `t=${nowSec},v1=deadbeef,v1=${good}`;
    expect(await verifyStripeEvent(payload, header, SECRET, now)).not.toBeNull();
  });

  it("rejects a missing or malformed header", async () => {
    expect(await verifyStripeEvent(payload, null, SECRET, now)).toBeNull();
    expect(await verifyStripeEvent(payload, "", SECRET, now)).toBeNull();
    expect(await verifyStripeEvent(payload, "garbage", SECRET, now)).toBeNull();
    expect(await verifyStripeEvent(payload, `t=${nowSec}`, SECRET, now)).toBeNull();
    expect(await verifyStripeEvent(payload, "v1=abc", SECRET, now)).toBeNull();
  });

  it("rejects everything when the webhook secret is not configured", async () => {
    // A deploy that forgot `wrangler secret put STRIPE_WEBHOOK_SECRET` must
    // fail CLOSED. Note it cannot even reach the HMAC: Web Crypto refuses a
    // zero-length key ("DataError: Zero-length key is not supported"), so
    // without the early return this would THROW inside the route and surface
    // as a 500 that Stripe retries for three days. The guard turns that into a
    // clean rejection.
    const header = await signedHeader(payload, nowSec);
    expect(await verifyStripeEvent(payload, header, "", now)).toBeNull();
  });

  it("rejects a valid signature over a non-event body", async () => {
    const notAnEvent = JSON.stringify({ hello: "world" });
    const header = await signedHeader(notAnEvent, nowSec);
    expect(await verifyStripeEvent(notAnEvent, header, SECRET, now)).toBeNull();
  });
});
