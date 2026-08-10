// Pure grouping logic for the /dashboard tab split (personal vs. each
// teamspace, plus a virtual "shared with me" tab). Kept out of the page
// component so it's testable without a DB or a request.

import type { DashboardDoc } from "./store";
import type { TeamspaceRow } from "./store";

export const SHARED_TAB_ID = "shared";

export interface DashboardTab {
  id: string;
  label: string;
  count: number;
}

// A doc shared directly (not through membership) has a teamspace_id that
// isn't among the user's own teamspaces — group those under one virtual tab
// rather than a real teamspace tab the user doesn't belong to.
function tabKeyFor(doc: DashboardDoc): string {
  return doc.via === "shared" ? SHARED_TAB_ID : (doc.teamspace_id ?? SHARED_TAB_ID);
}

export function groupDocsByTab(
  docs: DashboardDoc[],
): Map<string, DashboardDoc[]> {
  const groups = new Map<string, DashboardDoc[]>();
  for (const doc of docs) {
    const key = tabKeyFor(doc);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }
  return groups;
}

export function buildDashboardTabs(
  teamspaces: Pick<TeamspaceRow, "id" | "name" | "is_personal">[],
  docsByTab: Map<string, DashboardDoc[]>,
): DashboardTab[] {
  const tabs: DashboardTab[] = teamspaces.map((t) => ({
    id: t.id,
    label: t.is_personal ? "Personal" : t.name,
    count: docsByTab.get(t.id)?.length ?? 0,
  }));
  const shared = docsByTab.get(SHARED_TAB_ID);
  if (shared && shared.length > 0) {
    tabs.push({ id: SHARED_TAB_ID, label: "Shared with me", count: shared.length });
  }
  return tabs;
}

// Resolve the requested tab id to one that actually exists, falling back to
// the personal teamspace (always first per listTeamspacesForUser's ordering).
export function resolveActiveTab(
  requested: string | undefined,
  tabs: DashboardTab[],
): string {
  if (requested && tabs.some((t) => t.id === requested)) return requested;
  return tabs[0]?.id ?? SHARED_TAB_ID;
}
