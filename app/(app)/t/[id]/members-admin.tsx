"use client";

// Invite, promote/demote, remove, and revoke, for a teamspace settings page.
// Kept client-side because each is a one-shot fetch whose result is a small
// in-place state change.

import { useState } from "react";
import type { TeamRole } from "@/lib/teamspace/permissions";
import { CopyField } from "@/app/(app)/connect/copy-field";
// Accent-tinted for the roles that carry authority, outlined for plain
// membership.
import { TAG_ACCENT, TAG_OUTLINE } from "@/lib/ui/tags";
import { FIELD_INPUT } from "@/lib/ui/form";

export interface MemberView {
  user_id: string;
  email: string;
  role: TeamRole;
}

const ROLES: TeamRole[] = ["member", "admin", "owner"];

// Member rows are three tracks (who / role / action); the header spans the
// first two. Both defined here so they cannot drift apart.
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-5 border-t border-hairline py-3.5";

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
  // The accept link for the invitation just sent, so it can be handed over by
  // hand when the email does not arrive. Only ever the most recent one — an
  // older link is superseded the moment the same address is invited again
  // (createInvite revokes outstanding invites for that address).
  const [lastLink, setLastLink] = useState<{ email: string; link: string } | null>(
    null,
  );
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
    // Clear first: a link left over from the previous invite would sit under a
    // fresh error and read as if it belonged to this one.
    setLastLink(null);
    try {
      const res = await fetch(`/api/teamspaces/${teamspaceId}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = (await res.json()) as {
        error?: string;
        alreadyMember?: boolean;
        link?: string;
      };
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
        if (data.link) setLastLink({ email, link: data.link });
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
      {/* Table idiom: an uppercase header over a strong 2px top rule, hairline
          rules between rows. The invited/pending rows below share the same
          columns, so one header covers all three lists. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 border-t-2 border-divider py-3 text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">
        <span>Member</span>
        <span>Role</span>
      </div>
      <ul className="mb-8">
        {rows.map((m) => (
          <li key={m.user_id} className={ROW_GRID}>
            <span className="truncate text-[15px] text-ink">
              {m.email}
              {m.user_id === currentUserId && (
                <span className="ml-2 text-[13px] text-ink-faint">
                  &mdash; you
                </span>
              )}
            </span>
            {isOwner && !isLastOwner(m) ? (
              <select
                aria-label={`Role for ${m.email}`}
                value={m.role}
                disabled={saving === m.user_id}
                onChange={(ev) => changeRole(m, ev.target.value as TeamRole)}
                className={`${FIELD_INPUT} disabled:opacity-45`}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <span className={m.role === "member" ? TAG_OUTLINE : TAG_ACCENT}>
                {m.role}
              </span>
            )}
            {canRemove(m) ? (
              <button
                onClick={() => remove(m.user_id, m.email)}
                className="text-[13px] text-ink-faint transition-colors duration-150 hover:text-accent-strong"
              >
                {m.user_id === currentUserId ? "leave" : "remove"}
              </button>
            ) : (
              // Keeps the action track occupied so the role column does not
              // drift to the right edge on rows with nothing to click.
              <span aria-hidden="true" className="w-px" />
            )}
          </li>
        ))}
        {invited.map((i) => (
          <li key={`new-${i.email}`} className={ROW_GRID}>
            <span className="truncate text-[15px] text-ink-soft">{i.email}</span>
            <span className="text-[13px] text-ink-faint">
              invited as {i.role}
            </span>
            <span aria-hidden="true" className="w-px" />
          </li>
        ))}
        {pending.map((i) => (
          <li key={i.id} className={ROW_GRID}>
            <span className="truncate text-[15px] text-ink-soft">
              {i.email_norm}
            </span>
            <span className="text-[13px] text-ink-faint">
              invited as {i.role}
            </span>
            {isOwner ? (
              <button
                onClick={() => revoke(i.id, i.email_norm)}
                className="text-[13px] text-ink-faint transition-colors duration-150 hover:text-accent-strong"
              >
                revoke
              </button>
            ) : (
              <span aria-hidden="true" className="w-px" />
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        // id="invite": the page header's "Invite someone" button is an anchor
        // down to this form.
        <form onSubmit={invite} id="invite" className="scroll-mt-6 space-y-3">
          <label
            htmlFor="invite-email"
            className="block text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-faint"
          >
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
              className={`min-w-0 flex-1 ${FIELD_INPUT}`}
            />
            <select
              aria-label="Role for the invitation"
              value={inviteRole}
              onChange={(ev) => setInviteRole(ev.target.value as TeamRole)}
              className={`shrink-0 ${FIELD_INPUT}`}
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
              className="shrink-0 bg-accent px-4 py-2.5 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
            >
              {busy ? "Sending…" : "Invite"}
            </button>
          </div>
          <p className="text-sm text-ink-faint">
            Members create and propose. Admins also invite, review proposals,
            and manage folders. Owners can additionally change roles and rename
            the teamspace.
          </p>
          {/* Said before the invite is sent, not only after: someone who has
              already watched one invitation vanish needs to know the fallback
              exists while they are deciding whether to bother. */}
          <p className="text-sm text-ink-faint">
            Invitation email can land in spam or promotions — tell them to look
            there if it isn&rsquo;t in the inbox. You can also copy the link and
            send it yourself; it works exactly the same way.
          </p>
        </form>
      )}

      {message && <p className="mt-3 text-sm text-ink-soft">{message}</p>}
      {error && <p className="mt-3 text-sm text-ink">{error}</p>}

      {/* The link is the authority — anyone holding it can join at the invited
          role — so it is shown to the person who just minted it and nobody
          else. See lib/teamspace/invites.ts: forwarding an invitation is the
          expected case, not a hole. */}
      {lastLink && (
        <div className="mt-4 border-2 border-divider bg-surface p-4">
          <p className="mb-2 text-sm text-ink">
            Invitation link for{" "}
            <span className="font-semibold">{lastLink.email}</span>
          </p>
          <CopyField value={lastLink.link} label="the invitation link" />
          <p className="mt-2 text-sm text-ink-faint">
            Send it over chat if the email doesn&rsquo;t arrive. It expires in
            14 days, and inviting the same address again replaces it.
          </p>
        </div>
      )}
    </div>
  );
}
