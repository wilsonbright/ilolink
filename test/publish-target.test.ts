import { describe, it, expect } from "vitest";
import {
  buildPublishTargets,
  defaultVisibilityFor,
  resolvePublishTeamspace,
  shouldShowTeamspacePicker,
} from "@/lib/teamspace/publish-target";

// listTeamspacesForUser orders is_personal DESC, so personal is always first.
const PERSONAL = { id: "t_personal", name: "Personal", is_personal: 1 };
const TEAM = { id: "t_team", name: "BlockSurvey", is_personal: 0 };
const OTHER = { id: "t_other", name: "Sacca", is_personal: 0 };

describe("buildPublishTargets", () => {
  it("labels the personal teamspace 'Personal' regardless of its stored name", () => {
    expect(buildPublishTargets([{ ...PERSONAL, name: "wilson's stuff" }])).toEqual([
      { id: "t_personal", label: "Personal", personal: true },
    ]);
  });

  it("uses the real name for team teamspaces and keeps input order", () => {
    expect(buildPublishTargets([PERSONAL, TEAM, OTHER])).toEqual([
      { id: "t_personal", label: "Personal", personal: true },
      { id: "t_team", label: "BlockSurvey", personal: false },
      { id: "t_other", label: "Sacca", personal: false },
    ]);
  });

  // D1 hands back 1/0, and `personal` feeds a boolean-typed helper — a truthy
  // 1 leaking through would typecheck at the call site and read wrong here.
  it("coerces D1's 1/0 to a real boolean", () => {
    const [personal, team] = buildPublishTargets([PERSONAL, TEAM]);
    expect(personal.personal).toBe(true);
    expect(team.personal).toBe(false);
  });

  it("returns nothing for a signed-out visitor", () => {
    expect(buildPublishTargets([])).toEqual([]);
  });
});

describe("defaultVisibilityFor", () => {
  it("publishes personal documents publicly", () => {
    expect(defaultVisibilityFor(true)).toBe("public");
  });

  // The whole point: team content must not default to the open web — or even
  // to link-holders. Members only, checked at ilolink.com/private/<slug>.
  it("keeps shared-teamspace documents private to their members", () => {
    expect(defaultVisibilityFor(false)).toBe("private");
  });
});

describe("shouldShowTeamspacePicker", () => {
  const [personal, team] = buildPublishTargets([PERSONAL, TEAM]);

  it("stays hidden for a signed-out visitor", () => {
    expect(shouldShowTeamspacePicker([])).toBe(false);
  });

  // A solo user never meets the concept: one personal teamspace means no
  // choice, and the default it implies is the one already on screen.
  it("stays hidden for a lone personal teamspace", () => {
    expect(shouldShowTeamspacePicker([personal])).toBe(false);
  });

  it("shows as soon as there is a real choice", () => {
    expect(shouldShowTeamspacePicker([personal, team])).toBe(true);
  });

  // Degenerate but reachable: if the personal teamspace is not `active`,
  // listTeamspacesForUser drops it and the only target is shared — which
  // silently changes the default, so the destination has to be visible.
  it("shows for a lone shared teamspace, because it changes the default", () => {
    expect(shouldShowTeamspacePicker([team])).toBe(true);
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
