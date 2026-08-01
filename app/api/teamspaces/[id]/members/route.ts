// DELETE /api/teamspaces/<id>/members?user=<id> — remove a member, or leave.

import { NextResponse } from "next/server";
import { execute, queryFirst } from "@/lib/db/client";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { canRemoveMember } from "@/lib/teamspace/permissions";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: teamspaceId } = await params;
  const targetUserId = new URL(req.url).searchParams.get("user");

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!targetUserId) {
    return NextResponse.json({ error: "A 'user' is required." }, { status: 400 });
  }

  const actorRole = await getMembership(teamspaceId, user.id);
  if (!actorRole) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!canRemoveMember(actorRole, user.id, targetUserId)) {
    return NextResponse.json(
      { error: "Only an owner can remove other people." },
      { status: 403 },
    );
  }

  // Never allow the last owner out: a teamspace with no owner can never be
  // administered again, and nothing in the schema would repair it.
  const target = await queryFirst<{ role: string }>(
    "SELECT role FROM teamspace_members WHERE teamspace_id = ? AND user_id = ?",
    teamspaceId,
    targetUserId,
  );
  if (!target) return NextResponse.json({ ok: true, alreadyGone: true });

  if (target.role === "owner") {
    const owners = await queryFirst<{ n: number }>(
      "SELECT COUNT(*) AS n FROM teamspace_members WHERE teamspace_id = ? AND role = 'owner'",
      teamspaceId,
    );
    if (Number(owners?.n ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Make someone else an owner first." },
        { status: 409 },
      );
    }
  }

  await execute(
    "DELETE FROM teamspace_members WHERE teamspace_id = ? AND user_id = ?",
    teamspaceId,
    targetUserId,
  );
  // Their direct document shares survive deliberately: losing teamspace
  // membership should not silently revoke a document someone shared with them
  // by name.
  return NextResponse.json({ ok: true });
}
