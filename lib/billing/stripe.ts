// Stripe over plain fetch. No SDK — the same call the codebase already makes to
// Resend (lib/email/send.ts) and Turnstile (lib/turnstile.ts), for the same
// reasons: package.json carries zero vendor SDKs, and the Stripe SDK on workerd
// needs createSubtleCryptoProvider + createFetchHttpClient shims anyway because
// there are no sockets. Two endpoints and one signature check is less code than
// the shims.
//
// Takes its secrets as ARGUMENTS rather than reading env(). That is the
// convention lib/publish/store-core.ts set for anything a plain Worker might
// need to import, and it keeps this file unit-testable with no Cloudflare
// context.

import { constantTimeEqual, hmacHex } from "@/lib/crypto/hmac";
import { PLANS, type PlanId } from "@/lib/billing/plans";

const API = "https://api.stripe.com/v1";

export class StripeError extends Error {}

async function stripePost(
  secretKey: string,
  path: string,
  form: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
      // Pin the API version: Stripe changes response shapes between versions,
      // and an account-level default that moves under us would change what
      // this code receives without any deploy on our side.
      "stripe-version": "2024-06-20",
    },
    body: new URLSearchParams(form).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = body.error as { message?: string } | undefined;
    // Never surface Stripe's raw message to the browser — it can echo account
    // details. Callers translate this into something generic.
    throw new StripeError(err?.message ?? `Stripe ${path} failed (${res.status})`);
  }
  return body;
}

export interface CheckoutInput {
  secretKey: string;
  planId: Exclude<PlanId, "free">;
  teamspaceId: string;
  userId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

// Create a one-time-payment Checkout Session.
//
// Uses inline `price_data` rather than a pre-created Price object, so there is
// NOTHING to configure in the Stripe Dashboard before this works and no price
// id to keep in sync with lib/billing/plans.ts. The amount is read from the
// plans module at call time, which makes that module the single source of truth
// for what the customer is actually charged.
//
// mode=payment, NOT subscription: these plans are bought once and kept.
export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<{ id: string; url: string }> {
  const plan = PLANS[input.planId];
  const body = await stripePost(input.secretKey, "/checkout/sessions", {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(plan.priceCents),
    "line_items[0][price_data][product_data][name]": `ilolink — ${plan.label}`,
    "line_items[0][price_data][product_data][description]":
      `${plan.seats} members, ${plan.docs} documents. One-time payment.`,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    // client_reference_id and metadata both carry the teamspace. The webhook
    // reads metadata; client_reference_id is what shows up in the Stripe
    // Dashboard, which matters when reconciling a payment by hand.
    client_reference_id: input.teamspaceId,
    "metadata[teamspace_id]": input.teamspaceId,
    "metadata[plan_id]": input.planId,
    "metadata[user_id]": input.userId,
  });
  const id = typeof body.id === "string" ? body.id : "";
  const url = typeof body.url === "string" ? body.url : "";
  if (!id || !url) throw new StripeError("Stripe did not return a checkout URL.");
  return { id, url };
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

// Verify a Stripe webhook signature and parse the event.
//
// Implements the same scheme as stripe.webhooks.constructEvent: the header is
// `t=<unix>,v1=<hex>[,v1=<hex>...]`, and the signed payload is
// `<t>.<raw body>`. Three things here are easy to get wrong and all of them
// fail silently as "invalid signature":
//
//   1. The body must be the RAW bytes as received. Calling req.json() and
//      re-serialising changes whitespace and key order, and the digest will
//      never match. Callers must pass the string from req.text().
//   2. The digest is HEX, not the base64url this codebase uses everywhere else.
//   3. A header can carry SEVERAL v1 signatures during a secret rotation. Any
//      one matching is a pass, so they must all be checked.
//
// Returns null on any failure rather than throwing, so the caller answers with
// one uniform 400 and never leaks which check failed.
export async function verifyStripeEvent(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
  nowMs: number,
  toleranceSeconds = 300,
): Promise<StripeEvent | null> {
  if (!signatureHeader || !webhookSecret) return null;

  let timestamp = "";
  const provided: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "t") timestamp = v;
    else if (k === "v1") provided.push(v);
  }
  if (!timestamp || !provided.length) return null;

  // Replay window. Without this, a captured webhook body stays valid forever.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return null;
  if (Math.abs(nowMs / 1000 - ts) > toleranceSeconds) return null;

  const expected = await hmacHex(webhookSecret, `${timestamp}.${rawBody}`);
  if (!provided.some((sig) => constantTimeEqual(sig, expected))) return null;

  try {
    const parsed = JSON.parse(rawBody) as StripeEvent;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.type !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
