// DELETE /api/teamspaces/<id>/invites/<inviteId> — revoke a pending invite.
//
// Revoking is how a mistyped or reconsidered invitation is taken back before it
// is accepted; the link keeps working until someone does this.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { canInvite } from "@/lib/teamspace/permissions";
import { revokeInvite } from "@/lib/teamspace/invites";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
): Promise<NextResponse> {
  const { id: teamspaceId, inviteId } = await params;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const role = await getMembership(teamspaceId, user.id);
  // 404 rather than 403 for a non-member: a stranger should not be able to
  // learn that a teamspace id exists by watching the status code change.
  if (!role) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!canInvite(role)) {
    return NextResponse.json(
      { error: "Only an admin or owner can revoke invitations." },
      { status: 403 },
    );
  }

  // Idempotent, and scoped to this teamspace inside revokeInvite() — an id
  // belonging to another teamspace simply matches no rows, so the response
  // cannot be used to probe for invites elsewhere.
  await revokeInvite(inviteId, teamspaceId);
  return NextResponse.json({ ok: true });
}
