"use client";

// Manage what can reach this account's teamspaces: connector tokens (PATs) and
// OAuth-connected assistants. Your own are revocable here — the screen that was
// missing when a leaked token had no "off" switch. Admins/owners also get a
// read-only audit of every team member's connections.
//
// Each row carries where it was made from (date · place · device · IP), so an
// unfamiliar entry stands out. That context is descriptive only — never an
// authorization input.

import { useCallback, useEffect, useState } from "react";

interface TokenRow {
  id: string;
  name: string | null;
  scopes?: string;
  teamspace_id?: string;
  created_at: number;
  last_used_at: number | null;
  created_ip: string | null;
  created_ua: string | null;
  created_geo: string | null;
}

interface ConnectionRow {
  id: string;
  clientId: string;
  scope: string[];
  connectedAt: number; // milliseconds
  email: string | null;
  ip: string | null;
  ua: string | null;
  geo: string | null;
}

interface TeamMember {
  userId: string;
  email: string;
  role: string;
  tokens: TokenRow[];
  assistants: ConnectionRow[];
}

function when(ms: number | null): string {
  if (!ms) return "unknown";
  return new Date(ms).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// A short device label from a user-agent. Browser OAuth approvals carry a real
// browser UA; an assistant's own fetch carries its client string — show a
// cleaned version of whichever, and fall back to a truncated raw UA rather than
// guessing wrong.
function deviceLabel(ua: string | null): string | null {
  if (!ua) return null;
  const os = /iPhone|iPad|iOS/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/i.test(ua)
        ? "macOS"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Linux/i.test(ua)
            ? "Linux"
            : null;
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /Chrome\//i.test(ua)
      ? "Chrome"
      : /Firefox\//i.test(ua)
        ? "Firefox"
        : /Safari\//i.test(ua)
          ? "Safari"
          : null;
  if (browser && os) return `${browser} on ${os}`;
  if (os) return os;
  return ua.slice(0, 40);
}

// The muted "made from" line shared by every row.
function ContextLine({
  prefix,
  when: whenText,
  geo,
  ua,
  ip,
}: {
  prefix?: string;
  when: string;
  geo: string | null;
  ua: string | null;
  ip: string | null;
}) {
  const device = deviceLabel(ua);
  const parts = [
    prefix,
    whenText,
    geo ?? undefined,
    device ?? undefined,
    ip ?? undefined,
  ].filter(Boolean);
  return <p className="text-sm text-ink-faint">{parts.join(" · ")}</p>;
}

function clientLabel(clientId: string): string {
  try {
    if (clientId.startsWith("http")) return new URL(clientId).host;
  } catch {
    /* fall through */
  }
  return clientId;
}

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
  adminTeamspaces,
}: {
  teamspaceNames: Record<string, string>;
  // Teamspaces the viewer can audit (admin/owner). Empty → no team section.
  adminTeamspaces: { id: string; name: string }[];
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
                    <span className="ml-2 text-sm font-normal text-ink-faint">
                      {t.teamspace_id
                        ? (teamspaceNames[t.teamspace_id] ?? "a teamspace")
                        : ""}
                    </span>
                  </p>
                  <ContextLine
                    prefix={`created ${when(t.created_at)}`}
                    when={`last used ${when(t.last_used_at)}`}
                    geo={t.created_geo}
                    ua={t.created_ua}
                    ip={t.created_ip}
                  />
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
                    <ContextLine
                      when={`connected ${when(c.connectedAt)}`}
                      geo={c.geo}
                      ua={c.ua}
                      ip={c.ip}
                    />
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

      {adminTeamspaces.map((ts) => (
        <TeamAudit key={ts.id} teamspaceId={ts.id} teamspaceName={ts.name} />
      ))}

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  );
}

// Read-only audit of every member's connections in one teamspace. Admins/owners
// only (the API enforces it too). No revoke here — auditing another person's
// account access is a stronger power, deliberately left as a follow-up.
function TeamAudit({
  teamspaceId,
  teamspaceName,
}: {
  teamspaceId: string;
  teamspaceName: string;
}) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/connections/team?teamspace=${encodeURIComponent(teamspaceId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ members?: TeamMember[] }>) : { members: [] }))
      .then((d) => alive && setMembers(d.members ?? []))
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [teamspaceId]);

  // Only members who actually have a connection are worth a row.
  const withAny = (members ?? []).filter(
    (m) => m.tokens.length > 0 || m.assistants.length > 0,
  );

  return (
    <section>
      <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-ink">
        Team access — {teamspaceName}
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        Every connector token and assistant your teammates have connected to
        this teamspace. Read-only.
      </p>
      <div className="mt-4 border-t-2 border-divider">
        {members === null ? (
          <p className="py-4 text-sm text-ink-faint">Loading…</p>
        ) : withAny.length === 0 ? (
          <p className="py-4 text-sm text-ink-faint">
            No member connections yet.
          </p>
        ) : (
          withAny.map((m) => (
            <div key={m.userId} className="border-b border-hairline py-3.5">
              <p className="font-extrabold text-ink">
                {m.email}
                <span className="ml-2 text-sm font-normal text-ink-faint">
                  {m.role}
                </span>
              </p>
              <div className="mt-1.5 space-y-1.5 pl-1">
                {m.tokens.map((t) => (
                  <div key={t.id}>
                    <p className="text-sm text-ink">
                      Token · {t.name || "Connector"}
                    </p>
                    <ContextLine
                      prefix={`created ${when(t.created_at)}`}
                      when={`last used ${when(t.last_used_at)}`}
                      geo={t.created_geo}
                      ua={t.created_ua}
                      ip={t.created_ip}
                    />
                  </div>
                ))}
                {m.assistants.map((c) => (
                  <div key={c.id}>
                    <p className="text-sm text-ink">
                      Assistant · {clientLabel(c.clientId)}
                    </p>
                    <ContextLine
                      when={`connected ${when(c.connectedAt)}`}
                      geo={c.geo}
                      ua={c.ua}
                      ip={c.ip}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
