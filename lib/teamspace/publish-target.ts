// Which teamspace a new document should be published into.
//
// Until now /publish had no teamspace concept at all: the form never sent the
// `teamspace` field that /api/publish reads, so the route always fell through
// to ensurePersonalTeamspace() and EVERY web publish landed in the personal
// teamspace, whatever the user meant. The server side (resolveNamedTeamspace,
// membership-checked) was already built — it just had no client.
//
// Pure so it can be tested without a DB or a request, same as dashboard-tabs.ts.
//
// BUNDLE CONSTRAINT: this module is imported by publish-form.tsx, a client
// component, so it ships to the browser. `TeamspaceRow` is an `import type` and
// `SHARED_TAB_ID` comes from dashboard-tabs.ts, which is likewise type-only
// against ./store — that is what keeps it client-safe. Never add a *value*
// import from ./store here; it would drag @/lib/db/client and nanoid into the
// browser bundle.

import type { TeamspaceRow } from "./store";
import type { Visibility } from "@/lib/types";
import { SHARED_TAB_ID } from "./dashboard-tabs";

export interface PublishTarget {
  id: string;
  label: string;
  /**
   * True for the auto-created personal teamspace. Drives the visibility
   * default — see defaultVisibilityFor.
   */
  personal: boolean;
}

// Mirrors buildDashboardTabs' labelling so the picker and the dashboard tabs
// never disagree about what a teamspace is called.
export function buildPublishTargets(
  teamspaces: Pick<TeamspaceRow, "id" | "name" | "is_personal">[],
): PublishTarget[] {
  return teamspaces.map((t) => ({
    id: t.id,
    label: t.is_personal ? "Personal" : t.name,
    // D1 stores this as 1/0, not a boolean, so coerce rather than compare.
    personal: !!t.is_personal,
  }));
}

// Where a document lands decides how open it starts.
//
// Personal is one person publishing something they mean to send, so the link is
// public. A shared teamspace is team content, and defaulting that to the open
// web is a leak nobody asked for — unlisted keeps the link working, keeps the
// page out of search (content-worker sets noindex), and stops the title and
// body being quoted in previews (lib/seo/doc-preview.ts).
//
// This is a default, not a policy: the publisher can still pick any of the four
// modes, and doing so makes the choice sticky (see publish-form.tsx).
export function defaultVisibilityFor(isPersonal: boolean): Visibility {
  return isPersonal ? "public" : "unlisted";
}

// Whether the "Publish into" picker is worth showing.
//
// More than one target is the obvious case. The single-target case is only
// worth surfacing when that target is NOT personal: every signed-in user has a
// personal teamspace, so one-and-personal means there is no choice to make and
// the default (public) is already what the form says. One-and-shared can happen
// if a personal teamspace is ever not `active` — listTeamspacesForUser filters
// on status — and there the visibility would quietly default to unlisted with
// nothing on screen explaining why.
export function shouldShowTeamspacePicker(targets: PublishTarget[]): boolean {
  if (targets.length > 1) return true;
  return targets.length === 1 && !targets[0].personal;
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
