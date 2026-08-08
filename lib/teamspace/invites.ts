// Teamspace invitations.
//
// An invite is an emailed nanoid(32) whose SHA-256 is stored. Accepting
// requires being signed in, which means the recipient has proven control of an
// email address — but NOT necessarily the invited one. That is deliberate:
// people forward invitations, and refusing a forwarded invite that the owner
// intended to send is worse than accepting it. What matters is that holding the
// link is the authority, and the link only ever went to the invited address.

import { nanoid } from "nanoid";
import { execute, queryAll, queryFirst } from "@/lib/db/client";
import { hashToken, newOpaqueToken } from "@/lib/crypto/token";
import type { TeamRole } from "./permissions";
import { planFor } from "@/lib/billing/plans";

export const INVITE_TTL_DAYS = 14;

export interface InviteRow {
  id: string;
  teamspace_id: string;
  email_norm: string;
  role: TeamRole;
  invited_by: string;
  created_at: number;
  expires_at: number;
  accepted_at: number | null;
  revoked_at: number | null;
}

export type AcceptFailure =
  | "not_found"
  | "expired"
  | "revoked"
  | "already_accepted"
  // The team is at its plan's seat limit. A distinct reason on purpose: the
  // caller's message map falls back to "this invitation link isn't valid",
  // which would be actively misleading here — the link is perfectly valid, the
  // team is just full, and the fix is someone else's (upgrade or remove a
  // member), not the invitee's.
  | "seats_full";

export class InviteError extends Error {
  constructor(public reason: AcceptFailure) {
    super(reason);
  }
}

export async function createInvite(
  teamspaceId: string,
  emailNorm: string,
  role: TeamRole,
  invitedBy: string,
): Promise<{ invite: InviteRow; token: string }> {
  const token = newOpaqueToken();
  const now = Date.now();
  const id = `inv_${nanoid(16)}`;

  // Supersede any outstanding invite for the same address so a teamspace does
  // not accumulate live links after a typo-and-resend.
  await execute(
    `UPDATE invites SET revoked_at = ?
      WHERE teamspace_id = ? AND email_norm = ?
        AND accepted_at IS NULL AND revoked_at IS NULL`,
    now,
    teamspaceId,
    emailNorm,
  );

  await execute(
    `INSERT INTO invites
       (id, teamspace_id, email_norm, role, token_hash, invited_by, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    teamspaceId,
    emailNorm,
    role,
    await hashToken(token),
    invitedBy,
    now,
    now + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  const invite = await queryFirst<InviteRow>(
    "SELECT * FROM invites WHERE id = ?",
    id,
  );
  if (!invite) throw new Error("Failed to create the invitation.");
  return { invite, token };
}

// Idempotent: accepting an invite you have already accepted, or one for a
// teamspace you are already in, succeeds quietly rather than erroring.
export async function acceptInvite(
  token: string,
  userId: string,
): Promise<{ teamspaceId: string; role: TeamRole }> {
  const invite = await queryFirst<InviteRow>(
    "SELECT * FROM invites WHERE token_hash = ?",
    await hashToken(token),
  );
  if (!invite) throw new InviteError("not_found");
  if (invite.revoked_at) throw new InviteError("revoked");
  if (invite.expires_at < Date.now()) throw new InviteError("expired");

  const existing = await queryFirst<{ role: TeamRole }>(
    "SELECT role FROM teamspace_members WHERE teamspace_id = ? AND user_id = ?",
    invite.teamspace_id,
    userId,
  );
  if (existing) {
    return { teamspaceId: invite.teamspace_id, role: existing.role };
  }

  if (invite.accepted_at) throw new InviteError("already_accepted");

  const now = Date.now();

  // THE SEAT GATE. Note where it sits: after the existing-member short-circuit
  // above, so re-accepting an invite you already accepted stays idempotent and
  // never consumes a second seat.
  //
  // The limit is inside the INSERT, not a count() before it, and that is not
  // fussiness. D1 gives no transaction across these two statements, so a
  // JS-side count lets two people accepting two different invites at the same
  // moment both read "4 of 5 used" and both insert — selling a sixth seat on a
  // five-seat plan. Folding the count into the WHERE makes SQLite evaluate it
  // as one statement, and `meta.changes` reports whether the row went in.
  //
  // ON CONFLICT still matters: it keeps the double-accept case at 0 changes
  // rather than erroring, which is why changes === 0 has to be disambiguated
  // below rather than assumed to mean "full".
  const plan = planFor(
    (
      await queryFirst<{ plan: string }>(
        "SELECT plan FROM teamspaces WHERE id = ?",
        invite.teamspace_id,
      )
    )?.plan,
  );

  const res = await execute(
    `INSERT INTO teamspace_members (teamspace_id, user_id, role, invited_by, joined_at)
     SELECT ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM teamspace_members WHERE teamspace_id = ?) < ?
     ON CONFLICT(teamspace_id, user_id) DO NOTHING`,
    invite.teamspace_id,
    userId,
    invite.role,
    invite.invited_by,
    now,
    invite.teamspace_id,
    plan.seats,
  );

  if (!res.meta.changes) {
    // Nothing was inserted. Either the team is full, or another request
    // inserted this same user a moment ago (ON CONFLICT). Re-read to tell them
    // apart: reporting "team is full" to someone who is already a member would
    // be both wrong and alarming.
    const nowMember = await queryFirst<{ role: TeamRole }>(
      "SELECT role FROM teamspace_members WHERE teamspace_id = ? AND user_id = ?",
      invite.teamspace_id,
      userId,
    );
    if (!nowMember) throw new InviteError("seats_full");
    return { teamspaceId: invite.teamspace_id, role: nowMember.role };
  }
  // Conditional so two concurrent accepts cannot both consume the invite.
  await execute(
    "UPDATE invites SET accepted_at = ?, accepted_by = ? WHERE id = ? AND accepted_at IS NULL",
    now,
    userId,
    invite.id,
  );

  return { teamspaceId: invite.teamspace_id, role: invite.role };
}

export async function listPendingInvites(
  teamspaceId: string,
): Promise<InviteRow[]> {
  return queryAll<InviteRow>(
    `SELECT * FROM invites
      WHERE teamspace_id = ? AND accepted_at IS NULL AND revoked_at IS NULL
        AND expires_at > ?
      ORDER BY created_at DESC`,
    teamspaceId,
    Date.now(),
  );
}

export async function revokeInvite(
  inviteId: string,
  teamspaceId: string,
): Promise<void> {
  // Scoped to the teamspace so an id from another teamspace cannot be revoked.
  await execute(
    "UPDATE invites SET revoked_at = ? WHERE id = ? AND teamspace_id = ? AND revoked_at IS NULL",
    Date.now(),
    inviteId,
    teamspaceId,
  );
}
