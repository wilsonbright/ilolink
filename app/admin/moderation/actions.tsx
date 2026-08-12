"use client";

// One moderation action button: POSTs to /api/admin/action, then refreshes the
// server component to reflect the new state. Auth rides the HttpOnly `ilo_admin`
// cookie (sent automatically same-origin) — the key is never in JS or the URL.
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActionButton({
  op,
  target,
  label,
  danger,
}: {
  op: string;
  target: string;
  label: string;
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
        headers: { "content-type": "application/json" },
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
      className={`font-extrabold transition-colors duration-150 disabled:opacity-45 ${
        danger
          ? "text-accent-strong hover:text-accent"
          : "text-ink hover:text-accent-strong"
      }`}
    >
      {busy ? "…" : err ? `${label} (retry)` : label}
    </button>
  );
}
