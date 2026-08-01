// Membership gate for teamspace-scoped routes (folders, shares, settings).
//
// Mirrors lib/auth/doc-guard.ts. A non-member gets 404, never 403 — otherwise
// the status code tells a stranger which teamspace ids are real.

import { NextResponse } from "next/server";
import { currentUser } from "./current-user";
import { getMembership } from "@/lib/teamspace/store";
import { atLeast, type TeamRole } from "@/lib/teamspace/permissions";
import type { UserRow } from "./session";

// Phrased per required rank, because "only an owner" is a lie for a route that
// an admin may also call — and the wrong message is what sends someone to
// support asking for a promotion they do not need.
const DENIED: Record<TeamRole, string> = {
  owner: "Only an owner can do that.",
  admin: "Only an admin or owner can do that.",
  member: "Only a member of this teamspace can do that.",
};

export interface TeamGuardOk {
  ok: true;
  user: UserRow;
  role: TeamRole;
}
export interface TeamGuardFail {
  ok: false;
  response: NextResponse;
}

export async function guardTeamspace(
  teamspaceId: string,
  // Ranked rather than boolean: 'admin' exists between owner and member now, so
  // a route that needs "at least an admin" has no way to say so with a flag.
  opts: { minRole?: TeamRole } = {},
): Promise<TeamGuardOk | TeamGuardFail> {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in to continue." },
        { status: 401 },
      ),
    };
  }

  const role = await getMembership(teamspaceId, user.id);
  if (!role) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found." }, { status: 404 }),
    };
  }
  if (opts.minRole && !atLeast(role, opts.minRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: DENIED[opts.minRole] },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user, role };
}
