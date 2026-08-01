// PATCH  /api/teamspaces/<id>/members — change someone's role. Owners only.
// DELETE /api/teamspaces/<id>/members?user=<id> — remove a member, or leave.

import { NextResponse } from "next/server";
import { execute, queryFirst } from "@/lib/db/client";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import {
  canChangeRole,
  canRemoveMember,
  type TeamRole,
} from "@/lib/teamspace/permissions";

export const runtime = "nodejs";

const ROLES: TeamRole[] = ["owner", "admin", "member"];

function isTeamRole(v: unknown): v is TeamRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: teamspaceId } = await params;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  let body: { userId?: unknown; role?: unknown };
  try {
    body = (await req.json()) as { userId?: unknown; role?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const targetUserId = typeof body.userId === "string" ? body.userId : "";
  if (!targetUserId) {
    return NextResponse.json({ error: "A 'userId' is required." }, { status: 400 });
  }
  if (!isTeamRole(body.role)) {
    return NextResponse.json(
      { error: "Role must be one of owner, admin, member." },
      { status: 400 },
    );
  }
  const nextRole = body.role;

  const actorRole = await getMembership(teamspaceId, user.id);
  if (!actorRole) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!canChangeRole(actorRole)) {
    return NextResponse.json(
      { error: "Only an owner can change roles." },
      { status: 403 },
    );
  }

  const target = await queryFirst<{ role: TeamRole }>(
    "SELECT role FROM teamspace_members WHERE teamspace_id = ? AND user_id = ?",
    teamspaceId,
    targetUserId,
  );
  // Not a member of THIS teamspace: 404 rather than 403, same as a stranger
  // hitting the route, so a user id cannot be tested for membership.
  if (!target) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (target.role === nextRole) {
    return NextResponse.json({ ok: true, role: nextRole, unchanged: true });
  }

  // Never allow the last owner to be demoted: a teamspace with no owner can
  // never be administered again, and nothing in the schema would repair it.
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

  // The count above races two owners being demoted at once, so the rule is
  // restated inside the write itself — one statement, evaluated atomically, so
  // the second demotion sees the first and matches no rows.
  const res = await execute(
    `UPDATE teamspace_members SET role = ?
      WHERE teamspace_id = ? AND user_id = ?
        AND (? = 'owner' OR role <> 'owner' OR (
              SELECT COUNT(*) FROM teamspace_members o
               WHERE o.teamspace_id = ? AND o.role = 'owner') > 1)`,
    nextRole,
    teamspaceId,
    targetUserId,
    nextRole,
    teamspaceId,
  );
  if ((res.meta.changes ?? 0) === 0) {
    return NextResponse.json(
      { error: "Make someone else an owner first." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, role: nextRole });
}

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

  const target = await queryFirst<{ role: string }>(
    "SELECT role FROM teamspace_members WHERE teamspace_id = ? AND user_id = ?",
    teamspaceId,
    targetUserId,
  );
  // The target's role decides the answer for an admin, so it is read before the
  // permission check rather than after it.
  const targetRole: TeamRole | null =
    target && isTeamRole(target.role) ? target.role : null;
  if (!canRemoveMember(actorRole, user.id, targetUserId, targetRole)) {
    return NextResponse.json(
      { error: "Only an owner can remove other people." },
      { status: 403 },
    );
  }
  if (!target) return NextResponse.json({ ok: true, alreadyGone: true });

  // Never allow the last owner out: a teamspace with no owner can never be
  // administered again, and nothing in the schema would repair it.
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

  // Same restatement as PATCH: two owners leaving simultaneously would both
  // pass the count above, and the teamspace would end up ownerless.
  const res = await execute(
    `DELETE FROM teamspace_members
      WHERE teamspace_id = ? AND user_id = ?
        AND (role <> 'owner' OR (
              SELECT COUNT(*) FROM teamspace_members o
               WHERE o.teamspace_id = ? AND o.role = 'owner') > 1)`,
    teamspaceId,
    targetUserId,
    teamspaceId,
  );
  if ((res.meta.changes ?? 0) === 0) {
    return NextResponse.json(
      { error: "Make someone else an owner first." },
      { status: 409 },
    );
  }
  // Their direct document shares survive deliberately: losing teamspace
  // membership should not silently revoke a document someone shared with them
  // by name.
  return NextResponse.json({ ok: true });
}
