"use client";

// Invite, promote/demote, remove, and revoke, for a teamspace settings page.
// Kept client-side because each is a one-shot fetch whose result is a small
// in-place state change.

import { useState } from "react";
import type { TeamRole } from "@/lib/teamspace/permissions";

export interface MemberView {
  user_id: string;
  email: string;
  role: TeamRole;
}

const ROLES: TeamRole[] = ["member", "admin", "owner"];

export function MembersAdmin({
  teamspaceId,
  members,
  pendingInvites,
  isOwner,
  currentUserId,
}: {
  teamspaceId: string;
  members: MemberView[];
  pendingInvites: { id: string; email_norm: string; role: string }[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ email: string; role: TeamRole }[]>([]);
  const [rows, setRows] = useState<MemberView[]>(members);
  const [pending, setPending] = useState(pendingInvites);
  // Which member row is mid-request, so its select can be disabled without
  // freezing the whole list.
  const [saving, setSaving] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/teamspaces/${teamspaceId}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = (await res.json()) as { error?: string; alreadyMember?: boolean };
      if (!res.ok) {
        setError(data.error ?? "Could not send the invitation.");
        return;
      }
      setMessage(
        data.alreadyMember
          ? `${email} is already in this teamspace.`
          : `Invitation sent to ${email}.`,
      );
      if (!data.alreadyMember) {
        setInvited((p) => [...p, { email, role: inviteRole }]);
      }
      setEmail("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(m: MemberView, role: TeamRole) {
    setError(null);
    setMessage(null);
    setSaving(m.user_id);
    try {
      const res = await fetch(`/api/teamspaces/${teamspaceId}/members`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: m.user_id, role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not change their role.");
        return;
      }
      setRows((p) =>
        p.map((r) => (r.user_id === m.user_id ? { ...r, role } : r)),
      );
      setMessage(
        m.user_id === currentUserId
          ? `You are now ${role === "admin" ? "an" : "a"} ${role}.`
          : `${m.email} is now ${role === "admin" ? "an" : "a"} ${role}.`,
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(null);
    }
  }

  async function remove(userId: string, label: string) {
    if (!confirm(`Remove ${label} from this teamspace?`)) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/teamspaces/${teamspaceId}/members?user=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not remove them.");
        return;
      }
      setRows((p) => p.filter((r) => r.user_id !== userId));
    } catch {
      setError("Network error. Try again.");
    }
  }

  async function revoke(inviteId: string, label: string) {
    if (!confirm(`Revoke the invitation to ${label}?`)) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/teamspaces/${teamspaceId}/invites/${encodeURIComponent(inviteId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not revoke the invitation.");
        return;
      }
      setPending((p) => p.filter((i) => i.id !== inviteId));
      setMessage(`Invitation to ${label} revoked.`);
    } catch {
      setError("Network error. Try again.");
    }
  }

  // The server refuses to remove OR demote the last owner (a teamspace with
  // none can never be administered again), so don't offer either action.
  const ownerCount = rows.filter((m) => m.role === "owner").length;
  const isLastOwner = (m: MemberView) => m.role === "owner" && ownerCount <= 1;
  const canRemove = (m: MemberView) => {
    if (isLastOwner(m)) return false;
    return isOwner || m.user_id === currentUserId;
  };

  return (
    <div>
      <ul className="mb-8">
        {rows.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0"
          >
            <span className="text-ink">
              {m.email}
              {m.user_id === currentUserId && (
                <span className="ml-2 text-sm text-ink-faint">you</span>
              )}
            </span>
            <span className="flex items-center gap-3 text-sm text-ink-faint">
              {isOwner && !isLastOwner(m) ? (
                <select
                  aria-label={`Role for ${m.email}`}
                  value={m.role}
                  disabled={saving === m.user_id}
                  onChange={(ev) => changeRole(m, ev.target.value as TeamRole)}
                  className="rounded-lg border border-hairline bg-surface px-2 py-1 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{m.role}</span>
              )}
              {canRemove(m) && (
                <button
                  onClick={() => remove(m.user_id, m.email)}
                  className="transition-colors duration-150 hover:text-accent"
                >
                  {m.user_id === currentUserId ? "leave" : "remove"}
                </button>
              )}
            </span>
          </li>
        ))}
        {invited.map((i) => (
          <li
            key={`new-${i.email}`}
            className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0"
          >
            <span className="text-ink-soft">{i.email}</span>
            <span className="text-sm text-ink-faint">
              invited as {i.role}
            </span>
          </li>
        ))}
        {pending.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0"
          >
            <span className="text-ink-soft">{i.email_norm}</span>
            <span className="flex items-center gap-3 text-sm text-ink-faint">
              <span>invited as {i.role}</span>
              {isOwner && (
                <button
                  onClick={() => revoke(i.id, i.email_norm)}
                  className="transition-colors duration-150 hover:text-accent"
                >
                  revoke
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isOwner && (
        <form onSubmit={invite} className="space-y-3">
          <label htmlFor="invite-email" className="block text-sm text-ink-soft">
            Invite by email
          </label>
          <div className="flex gap-2">
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="teammate@example.com"
              className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
            />
            <select
              aria-label="Role for the invitation"
              value={inviteRole}
              onChange={(ev) => setInviteRole(ev.target.value as TeamRole)}
              className="shrink-0 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink transition-colors duration-150 focus:border-accent focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy || !email}
              className="shrink-0 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Invite"}
            </button>
          </div>
          <p className="text-sm text-ink-faint">
            Members create and propose. Admins also invite, review proposals,
            and manage folders. Owners can additionally change roles and rename
            the teamspace.
          </p>
        </form>
      )}

      {message && <p className="mt-3 text-sm text-ink-soft">{message}</p>}
      {error && <p className="mt-3 text-sm text-ink">{error}</p>}
    </div>
  );
}
