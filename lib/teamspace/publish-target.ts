// Which teamspace a new document should be published into.
//
// Until now /publish had no teamspace concept at all: the form never sent the
// `teamspace` field that /api/publish reads, so the route always fell through
// to ensurePersonalTeamspace() and EVERY web publish landed in the personal
// teamspace, whatever the user meant. The server side (resolveNamedTeamspace,
// membership-checked) was already built — it just had no client.
//
// Pure so it can be tested without a DB or a request, same as dashboard-tabs.ts.

import type { TeamspaceRow } from "./store";
import { SHARED_TAB_ID } from "./dashboard-tabs";

export interface PublishTarget {
  id: string;
  label: string;
}

// Mirrors buildDashboardTabs' labelling so the picker and the dashboard tabs
// never disagree about what a teamspace is called.
export function buildPublishTargets(
  teamspaces: Pick<TeamspaceRow, "id" | "name" | "is_personal">[],
): PublishTarget[] {
  return teamspaces.map((t) => ({
    id: t.id,
    label: t.is_personal ? "Personal" : t.name,
  }));
}

// Resolve a requested teamspace id (from ?ts=, carried over from the dashboard
// tab) to one the user can actually publish into.
//
// Anything unrecognised falls back to targets[0] — the personal teamspace, per
// listTeamspacesForUser's `ORDER BY t.is_personal DESC`. That covers three
// cases deliberately: no ?ts= at all, ?ts=shared (the dashboard's virtual
// "shared with me" tab, which is not a teamspace), and a hand-typed id the user
// is not a member of. The last one is only a UI guard — /api/publish re-checks
// membership in resolveNamedTeamspace and 403s regardless.
export function resolvePublishTeamspace(
  requested: string | undefined,
  targets: PublishTarget[],
): string | undefined {
  if (
    requested &&
    requested !== SHARED_TAB_ID &&
    targets.some((t) => t.id === requested)
  ) {
    return requested;
  }
  return targets[0]?.id;
}
