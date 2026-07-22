"use client";

// One moderation action button: POSTs to /api/admin/action with the admin key,
// then refreshes the server component to reflect the new state.
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActionButton({
  op,
  target,
  label,
  adminKey,
  danger,
}: {
  op: string;
  target: string;
  label: string;
  adminKey: string;
  danger?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function run() {
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ op, target }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`transition-colors duration-150 disabled:opacity-50 ${
        danger
          ? "text-[#b3261e] hover:text-[#8f1d18] dark:text-[#f2827a]"
          : "text-accent hover:text-ink"
      }`}
    >
      {busy ? "…" : err ? `${label} (retry)` : label}
    </button>
  );
}
