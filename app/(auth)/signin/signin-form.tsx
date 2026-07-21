"use client";

// The interactive half of sign-in: one email field that POSTs to
// /api/auth/magic and then swaps to a calm "check your inbox" state. In dev the
// endpoint returns a devUrl (no mailbox needed); we surface it as a subtle link.
import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

interface MagicResponse {
  ok?: boolean;
  devUrl?: string;
  error?: string;
}

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as MagicResponse;

      if (!res.ok) {
        setStatus("error");
        setMessage(
          data.error ?? "Something went wrong sending your link. Try again.",
        );
        return;
      }

      setDevUrl(data.devUrl ?? null);
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and retry.");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-10">
        <h2 className="text-lg font-medium text-ink">Check your inbox</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          If <span className="text-ink">{email.trim()}</span> has an account, a
          sign-in link is on its way. It works once and expires in 15 minutes.
        </p>
        {devUrl && (
          <p className="mt-6 text-sm text-ink-faint">
            <a
              href={devUrl}
              className="text-accent underline decoration-hairline underline-offset-4 transition-colors duration-150 hover:decoration-accent"
            >
              dev: open link
            </a>
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setDevUrl(null);
          }}
          className="mt-8 text-sm text-ink-faint underline decoration-hairline underline-offset-4 transition-colors duration-150 hover:text-ink-soft"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-10">
      <label htmlFor="email" className="block text-sm font-medium text-ink-soft">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-2 w-full rounded-md border border-hairline bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
      />

      {status === "error" && message && (
        <p className="mt-3 text-sm text-ink-soft">{message}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-surface transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a link"}
      </button>

      <p className="mt-4 text-sm text-ink-faint">
        No password. We email you a link that signs you in.
      </p>
    </form>
  );
}
