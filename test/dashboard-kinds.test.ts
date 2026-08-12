import { describe, it, expect } from "vitest";
import {
  DOCUMENTS_KIND,
  indexArtifactCounts,
  resolveActiveKind,
  buildKindTabs,
  dashboardHref,
  artifactHref,
} from "@/lib/teamspace/dashboard-kinds";
import { ARTIFACT_KINDS, KINDS } from "@/lib/artifacts/kinds";
import { SHARED_TAB_ID } from "@/lib/teamspace/dashboard-tabs";

describe("resolveActiveKind", () => {
  it("defaults to documents when nothing is requested", () => {
    expect(resolveActiveKind(undefined, true)).toBe(DOCUMENTS_KIND);
  });

  it("accepts 'documents' typed by hand", () => {
    expect(resolveActiveKind(DOCUMENTS_KIND, true)).toBe(DOCUMENTS_KIND);
  });

  // A stale link should land on the page, not a dead end — same posture as
  // resolveActiveTab and coerceKind.
  it("falls back to documents for an unrecognised kind", () => {
    expect(resolveActiveKind("nonsense", true)).toBe(DOCUMENTS_KIND);
  });

  // Looped rather than listed: adding an eleventh kind must not silently skip
  // it here.
  it("round-trips every artifact kind", () => {
    for (const kind of ARTIFACT_KINDS) {
      expect(resolveActiveKind(kind, true)).toBe(kind);
    }
  });

  // The shared tab can never hold an artifact — there is no per-item sharing.
  it("forces documents when artifacts are not available", () => {
    for (const kind of ARTIFACT_KINDS) {
      expect(resolveActiveKind(kind, false)).toBe(DOCUMENTS_KIND);
    }
  });
});

describe("buildKindTabs", () => {
  // Pins the "show all ten, zeros included" decision. A later refactor that
  // hides empty kinds must fail here rather than quietly ship.
  it("always returns documents plus every artifact kind", () => {
    const tabs = buildKindTabs(0, undefined);
    expect(tabs).toHaveLength(1 + ARTIFACT_KINDS.length);
    expect(tabs[0].id).toBe(DOCUMENTS_KIND);
    expect(tabs.slice(1).map((t) => t.id)).toEqual([...ARTIFACT_KINDS]);
  });

  it("labels documents and takes artifact labels from KINDS", () => {
    const tabs = buildKindTabs(3, undefined);
    expect(tabs[0]).toEqual({ id: DOCUMENTS_KIND, label: "Documents", count: 3 });
    expect(tabs[1].label).toBe(KINDS[ARTIFACT_KINDS[0]].plural);
  });

  it("reports zero, never undefined, for a kind missing from the counts", () => {
    const counts = new Map([["skill" as const, 13]]);
    const tabs = buildKindTabs(0, counts);
    expect(tabs.find((t) => t.id === "skill")?.count).toBe(13);
    for (const t of tabs) expect(typeof t.count).toBe("number");
    expect(tabs.find((t) => t.id === "eval")?.count).toBe(0);
  });
});

describe("indexArtifactCounts", () => {
  it("groups by teamspace then kind", () => {
    const idx = indexArtifactCounts([
      { teamspace_id: "t_a", kind: "skill", n: 13 },
      { teamspace_id: "t_a", kind: "agent", n: 3 },
      { teamspace_id: "t_b", kind: "skill", n: 1 },
    ]);
    expect(idx.get("t_a")?.get("skill")).toBe(13);
    expect(idx.get("t_a")?.get("agent")).toBe(3);
    expect(idx.get("t_b")?.get("skill")).toBe(1);
  });

  // The column has no CHECK constraint, and the registry already folds unknown
  // kinds into 'skill'. Summing rather than replacing keeps the two surfaces
  // reporting the same total.
  it("folds an unknown kind into skill and sums with it", () => {
    const idx = indexArtifactCounts([
      { teamspace_id: "t_a", kind: "skill", n: 2 },
      { teamspace_id: "t_a", kind: "not-a-kind", n: 5 },
    ]);
    expect(idx.get("t_a")?.get("skill")).toBe(7);
  });

  it("returns an empty map for no rows", () => {
    expect(indexArtifactCounts([]).size).toBe(0);
  });
});

describe("dashboardHref", () => {
  const FIRST = "t_personal";

  it("is bare /dashboard for the first tab on documents", () => {
    expect(dashboardHref(FIRST, DOCUMENTS_KIND, FIRST)).toBe("/dashboard");
  });

  it("carries only the kind for the first tab", () => {
    expect(dashboardHref(FIRST, "skill", FIRST)).toBe("/dashboard?kind=skill");
  });

  it("carries only the teamspace for another tab on documents", () => {
    expect(dashboardHref("t_team", DOCUMENTS_KIND, FIRST)).toBe("/dashboard?ts=t_team");
  });

  it("carries both, teamspace first", () => {
    expect(dashboardHref("t_team", "agent", FIRST)).toBe(
      "/dashboard?ts=t_team&kind=agent",
    );
  });

  // The shared tab holds no artifacts, so a kind must never ride along with it.
  it("never carries a kind for the shared tab", () => {
    expect(dashboardHref(SHARED_TAB_ID, "skill", FIRST)).toBe(
      `/dashboard?ts=${SHARED_TAB_ID}`,
    );
  });

  it("handles an unknown first tab", () => {
    expect(dashboardHref("t_team", DOCUMENTS_KIND, undefined)).toBe(
      "/dashboard?ts=t_team",
    );
  });
});

describe("artifactHref", () => {
  // getArtifact returns null when nothing is published, and the detail page
  // turns that into notFound() — so this row must not be a link.
  it("returns null when there is no published version", () => {
    expect(artifactHref("t_a", "skill", "commit-style", false)).toBeNull();
  });

  it("points at the detail route with an explicit kind", () => {
    expect(artifactHref("t_a", "skill", "commit-style", true)).toBe(
      "/t/t_a/skills/commit-style?kind=skill",
    );
  });

  it("keeps the kind even for skill, and encodes the name", () => {
    expect(artifactHref("t_a", "runbook", "deploy prod", true)).toBe(
      "/t/t_a/skills/deploy%20prod?kind=runbook",
    );
  });
});
