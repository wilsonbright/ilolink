"use client";

// Upgrade a teamspace. Owner-only — the server enforces that in
// /api/billing/checkout; this component only decides what to render.
//
// It never touches Stripe directly and never sees a key. It asks our own API
// for a Checkout Session URL and hands the browser over. Nothing about the
// plan changes here: the plan is granted by the webhook, after Stripe confirms
// the money, because a user can reach the success URL without paying.

import { useState } from "react";
import { PLANS, formatPrice, type PlanId } from "@/lib/billing/plans";

export function Upgrade({
  teamspaceId,
  currentPlan,
  seatsUsed,
  docsUsed,
}: {
  teamspaceId: string;
  currentPlan: PlanId;
  seatsUsed: number;
  docsUsed: number;
}) {
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plan = PLANS[currentPlan];

  async function buy(planId: PlanId) {
    setBusy(planId);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamspace: teamspaceId, plan: planId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network problem. Check your connection and try again.");
      setBusy(null);
    }
  }

  // Only offer plans that are a genuine step up. Offering the current tier
  // would take money and change nothing; offering a smaller one could cut a
  // team below the number of people already in it.
  const offers = (["team5", "team10"] as const).filter(
    (id) => PLANS[id].seats > plan.seats,
  );

  return (
    <section className="mt-10 rounded-lg border border-hairline bg-surface p-5">
      <h2 className="font-medium text-ink">Plan</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {plan.label} — {seatsUsed} of {plan.seats}{" "}
        {plan.seats === 1 ? "seat" : "seats"} used, {docsUsed} of {plan.docs}{" "}
        documents published.
      </p>

      {offers.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">
          This is the largest plan. Need more room?{" "}
          <a href="mailto:hello@sacca.ai" className="text-accent underline">
            Get in touch
          </a>
          .
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-faint">
            {plan.seats === 1
              ? "A personal teamspace is just you. Upgrade to invite people — one payment, no subscription."
              : "One payment, no subscription. Your plan does not expire."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {offers.map((id) => (
              <button
                key={id}
                type="button"
                disabled={busy !== null}
                onClick={() => buy(id)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
              >
                {busy === id
                  ? "Starting checkout…"
                  : `${PLANS[id].label} — ${formatPrice(PLANS[id].priceCents)} once`}
              </button>
            ))}
          </div>
        </>
      )}

      {/* text-ink, not a red token: the palette defines only ink/accent/surface
          (app/globals.css), and every other form in the app renders errors this
          way. Inventing a colour here would be the one red thing on the site. */}
      {error && <p className="mt-3 text-sm text-ink">{error}</p>}
    </section>
  );
}
