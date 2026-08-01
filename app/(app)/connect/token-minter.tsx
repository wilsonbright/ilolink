"use client";

// Mint a connector token for an assistant that cannot do OAuth.
//
// The raw value is returned exactly once and never stored in plaintext, so this
// component shows it prominently and says so. There is no endpoint that can
// return it again — losing it means minting another.

import { useState } from "react";

export function TokenMinter({ connectorUrl }: { connectorUrl: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function mint(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || "Connector" }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? "Could not create a token.");
        return;
      }
      setToken(data.token);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-ink">
          Copy this now — it is not shown again.
        </p>
        <code className="mb-3 block overflow-x-auto rounded-lg bg-canvas px-3 py-2 font-mono text-sm text-ink">
          {token}
        </code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(token).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90"
        >
          {copied ? "Copied" : "Copy token"}
        </button>
        <div className="mt-4 border-t border-hairline pt-4 text-sm leading-relaxed text-ink-soft">
          <p className="mb-1">
            In your assistant, add an MCP server at{" "}
            <code className="text-ink">{connectorUrl}</code>
          </p>
          <p>
            with header{" "}
            <code className="text-ink">Authorization: Bearer &lt;token&gt;</code>.
            Never put the token in a URL — it would end up in logs and history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={mint} className="space-y-3">
      <label htmlFor="tname" className="block text-sm text-ink-soft">
        Name this connector (so you can tell them apart later)
      </label>
      <div className="flex gap-2">
        <input
          id="tname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ChatGPT"
          maxLength={60}
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create token"}
        </button>
      </div>
      {error && <p className="text-sm text-ink">{error}</p>}
    </form>
  );
}
