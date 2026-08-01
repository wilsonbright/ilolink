"use client";

// Two-step passwordless sign-in, deliberately in ONE tab.
//
// Step 1 collects the address and starts a challenge; step 2 takes the 6-digit
// code from the email. The user never navigates away, which is the whole point:
// this form is also mounted inside the publish flow, where leaving the page
// would destroy an in-progress draft (up to a 15 MB File held in React state).
// The emailed magic link exists for people who would rather switch devices.

import { useRef, useState } from "react";

type Step = "email" | "code";

const ERROR_COPY: Record<string, string> = {
  bad_link: "That sign-in link isn't valid. Request a new one.",
  not_found: "That sign-in link isn't valid. Request a new one.",
  expired: "That sign-in link expired. Request a new one.",
  consumed: "That link was already used. Request a new one.",
  too_many_attempts: "Too many attempts. Request a new code.",
};

export function SignInForm({
  next,
  initialError,
  onSignedIn,
}: {
  next?: string;
  initialError?: string;
  // When embedded (e.g. in the publish flow) the host handles what happens
  // next; standalone, we navigate.
  onSignedIn?: (redirectTo: string) => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? (ERROR_COPY[initialError] ?? null) : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const data = (await res.json()) as { challengeId?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setChallengeId(data.challengeId ?? "");
      setStep("code");
      setNotice(`We sent a code to ${email}.`);
      // Focus after paint so the field exists.
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const data = (await res.json()) as {
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "That code isn't right.");
        return;
      }
      const to = data.redirectTo ?? "/dashboard";
      if (onSignedIn) onSignedIn(to);
      // A full load, not a client push: the session cookie was just set and
      // every cached RSC payload above us was rendered signed-out.
      else window.location.assign(to);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink " +
    "placeholder:text-ink-faint focus:border-accent focus:outline-none " +
    "transition-colors duration-150";
  const button =
    "w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white " +
    "transition-opacity duration-150 hover:opacity-90 disabled:opacity-50";

  if (step === "email") {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-ink-soft">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
            className={field}
          />
        </div>
        {error && <p className="text-sm text-ink">{error}</p>}
        <button type="submit" disabled={busy || !email} className={button}>
          {busy ? "Sending…" : "Continue with email"}
        </button>
        <p className="text-sm leading-relaxed text-ink-faint">
          No password. We&rsquo;ll email you a code — and a link, if you&rsquo;d
          rather sign in on another device.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} className="space-y-4">
      {notice && <p className="text-sm text-ink-soft">{notice}</p>}
      <div>
        <label htmlFor="code" className="mb-1.5 block text-sm text-ink-soft">
          Six-digit code
        </label>
        <input
          ref={codeRef}
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(ev) => setCode(ev.target.value)}
          placeholder="000000"
          className={`${field} text-center text-2xl tracking-[0.4em] tabular-nums`}
        />
      </div>
      {error && <p className="text-sm text-ink">{error}</p>}
      <button type="submit" disabled={busy || code.length < 6} className={button}>
        {busy ? "Verifying…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
          setNotice(null);
        }}
        className="w-full text-sm text-ink-faint transition-colors duration-150 hover:text-accent"
      >
        Use a different email
      </button>
    </form>
  );
}
