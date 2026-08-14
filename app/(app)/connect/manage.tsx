"use client";

// Manage what can reach this account's teamspaces: connector tokens (PATs) and
// OAuth-connected assistants. Both are revocable here — the screen that was
// missing when a leaked token had no "off" switch.
//
// Two independent lists, each loaded on mount from its own endpoint and each
// degrading to its own empty/error state so one failing never blanks the other.
// Revoke is two-step (arm → confirm), the same guard the document DangerZone
// uses, because it is irreversible: the client re-authenticates from scratch.

import { useCallback, useEffect, useState } from "react";

interface TokenRow {
  id: string;
  name: string | null;
  scopes: string;
  teamspace_id: string;
  created_at: number;
  last_used_at: number | null;
}

interface ConnectionRow {
  id: string;
  clientId: string;
  scope: string[];
  createdAt: number;
  email: string | null;
}

function when(ms: number | null): string {
  if (!ms) return "never";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// A short, human label for an OAuth client_id. DCR clients (Claude) get an
// opaque id; CIMD clients (ChatGPT) get an https metadata URL — show its host,
// which reads as the app name, not the whole URL.
function clientLabel(clientId: string): string {
  try {
    if (clientId.startsWith("http")) return new URL(clientId).host;
  } catch {
    /* fall through */
  }
  return clientId;
}

// One revoke button that arms on first click and fires on the second.
function RevokeButton({
  label,
  busy,
  onConfirm,
}: {
  label: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:bg-accent-soft/40"
      >
        {label}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-3">
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:bg-accent-soft/40 disabled:opacity-45"
      >
        {busy ? "Revoking…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        disabled={busy}
        className="text-sm text-ink-faint transition-colors duration-150 hover:text-ink disabled:opacity-45"
      >
        Cancel
      </button>
    </span>
  );
}

export function ManageConnections({
  teamspaceNames,
}: {
  // id → display name, so a token's teamspace shows as a name not an opaque id.
  teamspaceNames: Record<string, string>;
}) {
  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [connections, setConnections] = useState<ConnectionRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const loadTokens = useCallback(async () => {
    try {
      const r = await fetch("/api/tokens");
      const d = (await r.json()) as { tokens?: TokenRow[] };
      setTokens(r.ok && Array.isArray(d.tokens) ? d.tokens : []);
    } catch {
      setTokens([]);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      const r = await fetch("/api/connections");
      const d = (await r.json()) as { connections?: ConnectionRow[] };
      setConnections(r.ok && Array.isArray(d.connections) ? d.connections : []);
    } catch {
      setConnections([]);
    }
  }, []);

  useEffect(() => {
    void loadTokens();
    void loadConnections();
  }, [loadTokens, loadConnections]);

  async function revokeToken(id: string, name: string) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/tokens?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (r.ok) {
        setTokens((ts) => (ts ?? []).filter((t) => t.id !== id));
        setAnnounce(`Revoked token ${name}`);
      } else {
        setAnnounce(`Could not revoke ${name}`);
      }
    } catch {
      setAnnounce(`Could not revoke ${name}`);
    } finally {
      setBusyId(null);
    }
  }

  async function disconnect(id: string, label: string) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/connections?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const d = (await r.json()) as { revoked?: boolean };
      if (r.ok && d.revoked) {
        setConnections((cs) => (cs ?? []).filter((c) => c.id !== id));
        setAnnounce(`Disconnected ${label}`);
      } else {
        setAnnounce(`Could not disconnect ${label}`);
      }
    } catch {
      setAnnounce(`Could not disconnect ${label}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Connector tokens (PATs) */}
      <section>
        <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-ink">
          Connector tokens
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Personal access tokens you created for assistants that connect with a
          token. Revoking one immediately stops it working.
        </p>
        <div className="mt-4 border-t-2 border-divider">
          {tokens === null ? (
            <p className="py-4 text-sm text-ink-faint">Loading…</p>
          ) : tokens.length === 0 ? (
            <p className="py-4 text-sm text-ink-faint">
              No connector tokens. Create one above.
            </p>
          ) : (
            tokens.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline py-3.5"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-ink">
                    {t.name || "Connector"}
                  </p>
                  <p className="text-sm text-ink-faint">
                    {teamspaceNames[t.teamspace_id] ?? "a teamspace"} · created{" "}
                    {when(t.created_at)} · last used {when(t.last_used_at)}
                  </p>
                </div>
                <RevokeButton
                  label="Revoke"
                  busy={busyId === t.id}
                  onConfirm={() => revokeToken(t.id, t.name || "Connector")}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* OAuth-connected assistants */}
      <section>
        <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-ink">
          Connected assistants
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Assistants you connected with OAuth (Claude, ChatGPT and the like).
          Disconnecting one revokes its access — it will have to reconnect.
        </p>
        <div className="mt-4 border-t-2 border-divider">
          {connections === null ? (
            <p className="py-4 text-sm text-ink-faint">Loading…</p>
          ) : connections.length === 0 ? (
            <p className="py-4 text-sm text-ink-faint">
              No connected assistants.
            </p>
          ) : (
            connections.map((c) => {
              const label = clientLabel(c.clientId);
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-hairline py-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink">{label}</p>
                    <p className="text-sm text-ink-faint">
                      {c.email ? `${c.email} · ` : ""}connected {when(c.createdAt)}
                    </p>
                  </div>
                  <RevokeButton
                    label="Disconnect"
                    busy={busyId === c.id}
                    onConfirm={() => disconnect(c.id, label)}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  );
}
