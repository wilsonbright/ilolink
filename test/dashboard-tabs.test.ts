import { describe, it, expect } from "vitest";
import {
  groupDocsByTab,
  buildDashboardTabs,
  resolveActiveTab,
  SHARED_TAB_ID,
} from "@/lib/teamspace/dashboard-tabs";
import type { DashboardDoc } from "@/lib/teamspace/store";

function doc(overrides: Partial<DashboardDoc>): DashboardDoc {
  return {
    id: "d_1",
    slug: "d1",
    title: "Doc",
    visibility: "public",
    source_type: "html",
    published_at: 1,
    unpublished_at: null,
    teamspace_id: "t_personal",
    teamspace_name: "Personal",
    is_personal: 1,
    created_by: "u_1",
    creator_label: "Wilson",
    folder_id: null,
    folder_name: null,
    via: "member",
    ...overrides,
  };
}

const teamspaces = [
  { id: "t_personal", name: "Personal", is_personal: 1 },
  { id: "t_team", name: "BlockSurvey", is_personal: 0 },
];

describe("groupDocsByTab", () => {
  it("groups member docs by their own teamspace_id", () => {
    const docs = [
      doc({ id: "d1", teamspace_id: "t_personal" }),
      doc({ id: "d2", teamspace_id: "t_team" }),
    ];
    const groups = groupDocsByTab(docs);
    expect(groups.get("t_personal")?.map((d) => d.id)).toEqual(["d1"]);
    expect(groups.get("t_team")?.map((d) => d.id)).toEqual(["d2"]);
  });

  it("groups shared docs under the virtual shared tab regardless of their real teamspace", () => {
    const docs = [
      doc({ id: "d1", via: "shared", teamspace_id: "t_someone_elses" }),
      doc({ id: "d2", via: "shared", teamspace_id: null }),
    ];
    const groups = groupDocsByTab(docs);
    expect(groups.get(SHARED_TAB_ID)?.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(groups.has("t_someone_elses")).toBe(false);
  });
});

describe("buildDashboardTabs", () => {
  it("always includes every teamspace, even with zero docs", () => {
    const tabs = buildDashboardTabs(teamspaces, new Map());
    expect(tabs).toEqual([
      { id: "t_personal", label: "Personal", count: 0 },
      { id: "t_team", label: "BlockSurvey", count: 0 },
    ]);
  });

  it("labels the personal teamspace 'Personal' regardless of its stored name", () => {
    const tabs = buildDashboardTabs(
      [{ id: "t_personal", name: "Wilson's space", is_personal: 1 }],
      new Map(),
    );
    expect(tabs[0].label).toBe("Personal");
  });

  it("appends a 'Shared with me' tab only when shared docs exist", () => {
    const withShared = buildDashboardTabs(
      teamspaces,
      groupDocsByTab([doc({ id: "d1", via: "shared", teamspace_id: "x" })]),
    );
    expect(withShared.at(-1)).toEqual({
      id: SHARED_TAB_ID,
      label: "Shared with me",
      count: 1,
    });

    const withoutShared = buildDashboardTabs(teamspaces, new Map());
    expect(withoutShared.some((t) => t.id === SHARED_TAB_ID)).toBe(false);
  });
});

describe("resolveActiveTab", () => {
  const tabs = buildDashboardTabs(teamspaces, new Map());

  it("falls back to the first tab (personal) when nothing is requested", () => {
    expect(resolveActiveTab(undefined, tabs)).toBe("t_personal");
  });

  it("falls back to the first tab when the requested id doesn't exist", () => {
    expect(resolveActiveTab("t_nonexistent", tabs)).toBe("t_personal");
  });

  it("honors a valid requested tab id", () => {
    expect(resolveActiveTab("t_team", tabs)).toBe("t_team");
  });
});
