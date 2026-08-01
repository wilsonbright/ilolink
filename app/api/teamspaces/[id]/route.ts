// PATCH /api/teamspaces/<id> — rename the teamspace, and turn the review step
// for member writes on or off. Owners only.

import { NextResponse } from "next/server";
import { execute, queryFirst } from "@/lib/db/client";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { canManageTeamspace } from "@/lib/teamspace/permissions";

export const runtime = "nodejs";

const MAX_NAME = 60;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: teamspaceId } = await params;

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
  if (!canManageTeamspace(role)) {
    return NextResponse.json(
      { error: "Only an owner can change this teamspace." },
      { status: 403 },
    );
  }

  let body: { name?: unknown; reviewMemberWrites?: unknown };
  try {
    body = (await req.json()) as {
      name?: unknown;
      reviewMemberWrites?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Both fields are optional and applied independently, so a caller can toggle
  // review without having to echo the current name back.
  const sets: string[] = [];
  const args: unknown[] = [];

  if (body.name !== undefined) {
    const name = (typeof body.name === "string" ? body.name : "").trim();
    if (!name || name.length > MAX_NAME) {
      return NextResponse.json(
        { error: `Enter a name of 1–${MAX_NAME} characters.` },
        { status: 400 },
      );
    }
    sets.push("name = ?");
    args.push(name);
  }

  if (body.reviewMemberWrites !== undefined) {
    if (typeof body.reviewMemberWrites !== "boolean") {
      return NextResponse.json(
        { error: "'reviewMemberWrites' must be true or false." },
        { status: 400 },
      );
    }
    sets.push("review_member_writes = ?");
    args.push(body.reviewMemberWrites ? 1 : 0);
  }

  if (sets.length === 0) {
    return NextResponse.json(
      { error: "Nothing to change." },
      { status: 400 },
    );
  }

  // Column names come from the two literals above, never from the body.
  await execute(
    `UPDATE teamspaces SET ${sets.join(", ")} WHERE id = ?`,
    ...args,
    teamspaceId,
  );

  const teamspace = await queryFirst(
    "SELECT id, name, review_member_writes FROM teamspaces WHERE id = ?",
    teamspaceId,
  );
  return NextResponse.json({ ok: true, teamspace });
}
