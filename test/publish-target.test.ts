import { describe, it, expect } from "vitest";
import {
  buildPublishTargets,
  resolvePublishTeamspace,
} from "@/lib/teamspace/publish-target";

// listTeamspacesForUser orders is_personal DESC, so personal is always first.
const PERSONAL = { id: "t_personal", name: "Personal", is_personal: 1 };
const TEAM = { id: "t_team", name: "BlockSurvey", is_personal: 0 };
const OTHER = { id: "t_other", name: "Sacca", is_personal: 0 };

describe("buildPublishTargets", () => {
  it("labels the personal teamspace 'Personal' regardless of its stored name", () => {
    expect(buildPublishTargets([{ ...PERSONAL, name: "wilson's stuff" }])).toEqual([
      { id: "t_personal", label: "Personal" },
    ]);
  });

  it("uses the real name for team teamspaces and keeps input order", () => {
    expect(buildPublishTargets([PERSONAL, TEAM, OTHER])).toEqual([
      { id: "t_personal", label: "Personal" },
      { id: "t_team", label: "BlockSurvey" },
      { id: "t_other", label: "Sacca" },
    ]);
  });

  it("returns nothing for a signed-out visitor", () => {
    expect(buildPublishTargets([])).toEqual([]);
  });
});

describe("resolvePublishTeamspace", () => {
  const targets = buildPublishTargets([PERSONAL, TEAM]);

  it("honours a requested teamspace the user belongs to", () => {
    expect(resolvePublishTeamspace("t_team", targets)).toBe("t_team");
  });

  it("falls back to personal when nothing is requested", () => {
    expect(resolvePublishTeamspace(undefined, targets)).toBe("t_personal");
  });

  // The dashboard's "shared with me" tab is virtual — it is not a teamspace the
  // user can publish into, so carrying ?ts=shared over must not be honoured.
  it("falls back to personal for the virtual shared tab", () => {
    expect(resolvePublishTeamspace("shared", targets)).toBe("t_personal");
  });

  // Defence in depth: the server re-checks membership in resolveNamedTeamspace,
  // but a hand-typed ?ts= must never preselect a teamspace the user isn't in.
  it("falls back to personal for a teamspace the user is not a member of", () => {
    expect(resolvePublishTeamspace("t_someone_else", targets)).toBe("t_personal");
  });

  it("returns undefined when the visitor has no teamspaces", () => {
    expect(resolvePublishTeamspace("t_team", [])).toBeUndefined();
  });
});
