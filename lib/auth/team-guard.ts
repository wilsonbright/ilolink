// Membership gate for teamspace-scoped routes (folders, shares, settings).
//
// Mirrors lib/auth/doc-guard.ts. A non-member gets 404, never 403 — otherwise
// the status code tells a stranger which teamspace ids are real.

import { NextResponse } from "next/server";
import { currentUser } from "./current-user";
import { getMembership } from "@/lib/teamspace/store";
import type { TeamRole } from "@/lib/teamspace/permissions";
import type { UserRow } from "./session";

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
  opts: { ownerOnly?: boolean } = {},
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
  if (opts.ownerOnly && role !== "owner") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only an owner can do that." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user, role };
}
