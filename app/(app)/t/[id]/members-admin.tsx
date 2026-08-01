"use client";

// Invite + remove, for a teamspace settings page. Kept client-side because both
// are one-shot fetches whose result is a small in-place state change.

import { useState } from "react";

export interface MemberView {
  user_id: string;
  email: string;
  role: "owner" | "member";
}

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/teamspaces/${teamspaceId}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
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
      if (!data.alreadyMember) setInvited((p) => [...p, email]);
      setEmail("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
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
      setRemoved((p) => [...p, userId]);
    } catch {
      setError("Network error. Try again.");
    }
  }

  const visible = members.filter((m) => !removed.includes(m.user_id));
  // The server refuses to remove the last owner (a teamspace with none can
  // never be administered again), so don't offer the action at all.
  const ownerCount = visible.filter((m) => m.role === "owner").length;
  const canRemove = (m: MemberView) => {
    if (m.role === "owner" && ownerCount <= 1) return false;
    return isOwner || m.user_id === currentUserId;
  };

  return (
    <div>
      <ul className="mb-8">
        {visible.map((m) => (
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
              <span>{m.role}</span>
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
        {invited.map((e) => (
          <li
            key={`new-${e}`}
            className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0"
          >
            <span className="text-ink-soft">{e}</span>
            <span className="text-sm text-ink-faint">invited</span>
          </li>
        ))}
        {pendingInvites.map((i) => (
          <li
            key={i.id}
            className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0"
          >
            <span className="text-ink-soft">{i.email_norm}</span>
            <span className="text-sm text-ink-faint">invited</span>
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
            <button
              type="submit"
              disabled={busy || !email}
              className="shrink-0 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Invite"}
            </button>
          </div>
        </form>
      )}

      {message && <p className="mt-3 text-sm text-ink-soft">{message}</p>}
      {error && <p className="mt-3 text-sm text-ink">{error}</p>}
    </div>
  );
}
