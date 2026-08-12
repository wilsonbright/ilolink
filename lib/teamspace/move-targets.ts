// Where a document may be moved to.
//
// Move exists to repair a shipped bug: until 02eb986 the composer never sent a
// teamspace, so every document published from the web landed in the personal
// one whatever the person meant. Without move there was no way to put those
// documents where they belong.
//
// Pure, so the rule is testable without D1 — same reasoning as dashboard-tabs.ts
// and publish-target.ts. This decides what to OFFER; POST /api/documents/move
// re-checks membership and the target's plan allowance on the server, because a
// list the client was handed is a convenience and never a control.

import { canPublishInto, type TeamRole } from "./permissions";
import type { TeamspaceRow } from "./store";

export interface MoveTarget {
  id: string;
  label: string;
}

type Candidate = Pick<TeamspaceRow, "id" | "name" | "is_personal"> & {
  role: TeamRole;
};

export function buildMoveTargets(
  teamspaces: Candidate[],
  currentTeamspaceId: string | null,
): MoveTarget[] {
  return teamspaces
    .filter((t) => t.id !== currentTeamspaceId && canPublishInto(t.role))
    .map((t) => ({
      id: t.id,
      // Matches buildDashboardTabs and buildPublishTargets, so a teamspace is
      // never called one thing in the tab bar and another in this menu.
      label: t.is_personal ? "Personal" : t.name,
    }));
}
