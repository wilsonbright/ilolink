"use client";

// Admin key prompt. Posts the key to /api/admin/login (which sets the HttpOnly
// cookie), then refreshes so the server component re-reads the cookie and
// renders the moderation queue. The key never enters the URL.
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErr(true);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="border-b-2 border-divider pb-3 text-lg text-ink">Moderation</h1>
      <form onSubmit={submit} className="mt-4">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
          placeholder="Admin key"
          className="w-full border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !key}
          className="mt-3 w-full bg-accent px-4 py-2 text-left text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
        >
          {busy ? "…" : "Enter"}
        </button>
        {err ? <p className="mt-2 text-sm font-semibold text-accent-strong">Wrong key.</p> : null}
      </form>
    </main>
  );
}
