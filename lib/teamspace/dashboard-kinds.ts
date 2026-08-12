// The /dashboard kind axis: Documents plus the ten artifact kinds.
//
// /dashboard used to list documents only, while skills, agents, specs and the
// rest sat three clicks away behind /t → /t/<id> → "View N artifacts". The two
// never met, and in production eight of the ten kinds had never been used at
// all — largely because nothing ever showed they existed. This adds a second
// axis so one page answers "what does this teamspace hold?".
//
// Pure and D1-free so the rules are testable without a request, same as
// dashboard-tabs.ts, publish-target.ts and move-targets.ts.

import {
  ARTIFACT_KINDS,
  KINDS,
  coerceKind,
  isArtifactKind,
  type ArtifactKind,
} from "@/lib/artifacts/kinds";
import { SHARED_TAB_ID } from "./dashboard-tabs";

// The one axis value that is not an artifact kind. Documents are the page's
// original meaning, so they are also the default — see dashboardHref.
export const DOCUMENTS_KIND = "documents";

export type DashboardKind = typeof DOCUMENTS_KIND | ArtifactKind;

export interface KindTab {
  id: DashboardKind;
  label: string;
  count: number;
}

export interface ArtifactCountRow {
  teamspace_id: string;
  kind: string;
  n: number;
}

// Flat SQL rows → teamspace → kind → count.
//
// `kind` arrives as a bare string because the column carries no CHECK
// constraint. Unknown values fold into 'skill' via coerceKind — the same fold
// the registry applies on its way out of D1 — and SUM rather than replace, so a
// stray value cannot make the dashboard and the registry disagree on a total.
export function indexArtifactCounts(
  rows: ArtifactCountRow[],
): Map<string, Map<ArtifactKind, number>> {
  const byTeamspace = new Map<string, Map<ArtifactKind, number>>();
  for (const row of rows) {
    let kinds = byTeamspace.get(row.teamspace_id);
    if (!kinds) {
      kinds = new Map<ArtifactKind, number>();
      byTeamspace.set(row.teamspace_id, kinds);
    }
    const kind = coerceKind(row.kind);
    kinds.set(kind, (kinds.get(kind) ?? 0) + row.n);
  }
  return byTeamspace;
}

// Resolve ?kind= to an axis value.
//
// `allowArtifacts` is false on the virtual "shared with me" tab: artifacts have
// no per-item sharing, so that tab is documents-only by construction rather
// than by omission. Anything unrecognised falls back to Documents rather than
// 404ing, so a stale link still lands somewhere useful.
export function resolveActiveKind(
  requested: string | undefined,
  allowArtifacts: boolean,
): DashboardKind {
  if (!allowArtifacts) return DOCUMENTS_KIND;
  if (requested && isArtifactKind(requested)) return requested;
  return DOCUMENTS_KIND;
}

// Documents first, then all ten kinds in ARTIFACT_KINDS order — which is the
// canonical display order the registry already uses.
//
// Every kind is always present, including at zero. The taxonomy is closed and
// worth teaching, and the kinds nobody uses are exactly the ones nobody has
// been shown.
export function buildKindTabs(
  documentCount: number,
  kindCounts: Map<ArtifactKind, number> | undefined,
): KindTab[] {
  return [
    { id: DOCUMENTS_KIND, label: "Documents", count: documentCount },
    ...ARTIFACT_KINDS.map((kind) => ({
      id: kind,
      label: KINDS[kind].plural,
      count: kindCounts?.get(kind) ?? 0,
    })),
  ];
}

// The only place a /dashboard URL is built, so the two axes cannot drift apart
// in how they are linked.
//
// Emits only what is not the default: the first tab and Documents are both
// implied by a bare /dashboard, which is what keeps every pre-existing ?ts=
// link meaning exactly what it did before the kind axis existed.
export function dashboardHref(
  tabId: string,
  kind: DashboardKind,
  firstTabId: string | undefined,
): string {
  const params = new URLSearchParams();
  if (tabId !== firstTabId) params.set("ts", tabId);
  // The shared tab has no artifacts to select between, so it never carries one.
  if (kind !== DOCUMENTS_KIND && tabId !== SHARED_TAB_ID) {
    params.set("kind", kind);
  }
  const q = params.toString();
  return q ? `/dashboard?${q}` : "/dashboard";
}

// Where an artifact row links, or null when it must not be a link at all.
//
// An artifact whose only version is a proposal has current_version_id NULL, and
// getArtifact returns null for it — which the detail page turns into
// notFound(). Linking such a row would send people to a 404, so the caller
// renders the name as plain text and points "awaiting review" at the proposals
// inbox instead.
//
// The /t/<id>/skills/<name> path is a historical misnomer for nine of the ten
// kinds; it survives on bookmarks. Centralised here so there is one string to
// change if it is ever renamed.
export function artifactHref(
  teamspaceId: string,
  kind: ArtifactKind,
  name: string,
  hasPublishedVersion: boolean,
): string | null {
  if (!hasPublishedVersion) return null;
  return `/t/${teamspaceId}/skills/${encodeURIComponent(name)}?kind=${kind}`;
}
