"use client";

// Offers to attach pre-accounts documents to the signed-in account.
//
// Before accounts, a web-published document's only ownership proof was a manage
// token in this browser's localStorage. The server cannot enumerate those, so
// the browser has to volunteer them — this component reads the local history
// and posts the (slug, token) pairs to /api/claim, which verifies each one
// against the stored hash before attaching anything.
//
// Renders nothing when there is no local history, which is the common case for
// everyone who signed up after accounts existed.

import { useEffect, useState } from "react";
import { getHistory, type HistoryEntry } from "@/lib/history";

type State = "idle" | "working" | "done" | "error";

export function ClaimBanner({ knownSlugs }: { knownSlugs: string[] }) {
  const [pending, setPending] = useState<HistoryEntry[]>([]);
  const [state, setState] = useState<State>("idle");
  const [claimed, setClaimed] = useState(0);

  useEffect(() => {
    // Only offer entries the dashboard is not already showing.
    const known = new Set(knownSlugs);
    setPending(
      getHistory().filter((e) => e.manageToken && !known.has(e.slug)),
    );
  }, [knownSlugs]);

  if (state === "done") {
    return (
      <div className="mb-8 border-2 border-divider bg-accent-soft px-4 py-3">
        <p className="text-sm text-ink">
          Added {claimed} {claimed === 1 ? "document" : "documents"} to your
          account. <a href="/dashboard" className="text-accent-strong underline">Refresh</a>
        </p>
      </div>
    );
  }

  if (!pending.length) return null;

  async function claim() {
    setState("working");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: pending.map((e) => ({ slug: e.slug, token: e.manageToken })),
        }),
      });
      const data = (await res.json()) as { claimed?: number };
      if (!res.ok) {
        setState("error");
        return;
      }
      setClaimed(data.claimed ?? 0);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mb-8 border-2 border-divider bg-surface px-4 py-4">
      <p className="mb-1 text-sm font-semibold text-ink">
        {pending.length} {pending.length === 1 ? "document" : "documents"} published
        from this browser
      </p>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        These were published before you had an account, so they are remembered
        only here. Add them to your account to keep their analytics and comments
        reachable from any device.
      </p>
      {state === "error" && (
        <p className="mb-3 text-sm text-ink">
          Could not add them. Try again in a moment.
        </p>
      )}
      <button
        onClick={claim}
        disabled={state === "working"}
        className="bg-accent px-4 py-2 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
      >
        {state === "working" ? "Adding…" : "Add to my account"}
      </button>
    </div>
  );
}
