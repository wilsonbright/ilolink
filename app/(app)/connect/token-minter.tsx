"use client";

// Mint a connector token for an assistant that cannot do OAuth.
//
// The raw value is returned exactly once and never stored in plaintext, so this
// component shows it prominently and says so. There is no endpoint that can
// return it again — losing it means minting another.

import { useState } from "react";

export interface TeamspaceChoice {
  id: string;
  name: string;
}

export function TokenMinter({
  connectorUrl,
  teamspaces,
}: {
  connectorUrl: string;
  teamspaces: TeamspaceChoice[];
}) {
  const [name, setName] = useState("");
  // Default to the first, which listTeamspacesForUser orders personal-first.
  const [teamspace, setTeamspace] = useState(teamspaces[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [issuedFor, setIssuedFor] = useState<string | null>(null);
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
        body: JSON.stringify({
          name: name || "Connector",
          teamspace: teamspace || undefined,
        }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? "Could not create a token.");
        return;
      }
      setToken(data.token);
      setIssuedFor(
        teamspaces.find((t) => t.id === teamspace)?.name ?? null,
      );
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
        {issuedFor && (
          // Naming the teamspace on the receipt is the point of the picker: a
          // token that silently published into the wrong org is exactly the
          // failure this replaced.
          <p className="mb-2 text-sm text-ink-soft">
            Scoped to <span className="text-ink">{issuedFor}</span>.
          </p>
        )}
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

      {/* A token binds to exactly one teamspace for its whole life. Without
          this control every token silently took the personal teamspace, so a
          new org was unreachable from any non-OAuth assistant. */}
      {teamspaces.length > 1 && (
        <div>
          <label htmlFor="tspace" className="block text-sm text-ink-soft">
            Which teamspace may it publish into and read skills from?
          </label>
          <select
            id="tspace"
            value={teamspace}
            onChange={(e) => setTeamspace(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink transition-colors duration-150 focus:border-accent focus:outline-none"
          >
            {teamspaces.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-ink">{error}</p>}
    </form>
  );
}
