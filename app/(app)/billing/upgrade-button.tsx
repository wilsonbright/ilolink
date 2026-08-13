"use client";

// Starts a Stripe Checkout Session for one plan step-up. Same contract as
// app/(app)/t/[id]/upgrade.tsx: this component never touches Stripe directly
// and never sees a key — it asks /api/billing/checkout for a session URL and
// hands the browser over. The plan itself is granted by the webhook, after
// Stripe confirms the money, because a user can reach the success URL without
// paying. Owner-only is enforced server-side; /billing only renders this for
// teamspaces the viewer owns.

import { useState } from "react";
import type { PlanId } from "@/lib/billing/plans";

export function UpgradeButton({
  teamspaceId,
  plan,
  label,
}: {
  teamspaceId: string;
  plan: PlanId;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamspace: teamspaceId, plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network problem. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={buy}
        className="w-full bg-accent px-4 py-2 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
      >
        {busy ? "Starting checkout…" : label}
      </button>
      {/* text-ink, not a red token — same reasoning as upgrade.tsx: the palette
          defines only ink/accent/surface, and every other form in the app
          renders errors this way. */}
      {error && <p className="mt-3 text-sm text-ink">{error}</p>}
    </div>
  );
}
