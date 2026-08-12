import { describe, it, expect } from "vitest";
import { buildMoveTargets } from "@/lib/teamspace/move-targets";
import type { TeamRole } from "@/lib/teamspace/permissions";

// Shaped like a listTeamspacesForUser row: personal first, then by created_at.
function ts(
  id: string,
  name: string,
  is_personal: 0 | 1,
  role: TeamRole = "owner",
) {
  return { id, name, is_personal, role };
}

const PERSONAL = ts("t_personal", "Personal", 1);
const TEAM = ts("t_team", "BlockSurvey", 0);
const OTHER = ts("t_other", "Sacca", 0, "member");

describe("buildMoveTargets", () => {
  it("does not offer the teamspace the document is already in", () => {
    const targets = buildMoveTargets([PERSONAL, TEAM], "t_personal");
    expect(targets.map((t) => t.id)).toEqual(["t_team"]);
  });

  it("labels the personal teamspace 'Personal' whatever its stored name", () => {
    const targets = buildMoveTargets(
      [{ ...PERSONAL, name: "wilson's stuff" }, TEAM],
      "t_team",
    );
    expect(targets).toEqual([{ id: "t_personal", label: "Personal" }]);
  });

  it("keeps the input order, so personal stays first", () => {
    const targets = buildMoveTargets([PERSONAL, TEAM, OTHER], "t_nowhere");
    expect(targets.map((t) => t.label)).toEqual([
      "Personal",
      "BlockSurvey",
      "Sacca",
    ]);
  });

  // A document shared directly with you has a teamspace_id you are not a member
  // of; every teamspace you CAN publish into is a valid destination.
  it("offers every teamspace when the document's own is not one of yours", () => {
    const targets = buildMoveTargets([PERSONAL, TEAM], "t_someone_elses");
    expect(targets).toHaveLength(2);
  });

  it("offers nothing when the only teamspace you have is the current one", () => {
    expect(buildMoveTargets([PERSONAL], "t_personal")).toEqual([]);
  });

  it("offers nothing to a signed-out viewer", () => {
    expect(buildMoveTargets([], "t_personal")).toEqual([]);
  });

  // Defensive: all three roles can publish today, but the rule lives in
  // canPublishInto and this helper must not re-derive it. A role that cannot
  // publish must never be offered as a destination.
  it("excludes a teamspace whose role may not publish into it", () => {
    const readOnly = { ...TEAM, role: "viewer" as unknown as TeamRole };
    expect(buildMoveTargets([PERSONAL, readOnly], "t_personal")).toEqual([]);
  });
});
