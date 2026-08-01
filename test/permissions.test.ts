import { describe, it, expect } from "vitest";
import {
  canInvite,
  canPublishInto,
  canRemoveMember,
  resolveDocAccess,
  type AccessInput,
} from "@/lib/teamspace/permissions";

const DOC = { teamspaceId: "t_team", createdBy: "u_author" };

function access(over: Partial<AccessInput> = {}) {
  return resolveDocAccess({
    userId: "u_someone",
    doc: DOC,
    membership: null,
    share: null,
    ...over,
  });
}

describe("resolveDocAccess — the stranger case", () => {
  it("gives a signed-out visitor nothing", () => {
    const c = access({ userId: null });
    expect(c).toEqual({
      canRead: false,
      canComment: false,
      canEdit: false,
      canDelete: false,
      canManageShares: false,
      canModerate: false,
    });
  });

  it("gives a signed-in non-member of another teamspace nothing", () => {
    // The single most important negative test in the system: being logged in
    // must not, by itself, grant access to somebody else's document.
    const c = access({ userId: "u_outsider", membership: null, share: null });
    expect(c.canRead).toBe(false);
    expect(c.canEdit).toBe(false);
    expect(c.canDelete).toBe(false);
    expect(c.canModerate).toBe(false);
  });
});

describe("resolveDocAccess — teamspace roles", () => {
  it("an owner can do everything", () => {
    const c = access({ userId: "u_owner", membership: "owner" });
    expect(c.canRead).toBe(true);
    expect(c.canComment).toBe(true);
    expect(c.canEdit).toBe(true);
    expect(c.canDelete).toBe(true);
    expect(c.canManageShares).toBe(true);
    expect(c.canModerate).toBe(true);
  });

  it("a member can read, comment, edit and moderate — but not manage shares", () => {
    const c = access({ userId: "u_member", membership: "member" });
    expect(c.canRead).toBe(true);
    expect(c.canEdit).toBe(true);
    expect(c.canModerate).toBe(true);
    expect(c.canManageShares).toBe(false);
  });

  it("a member may delete only what they created", () => {
    // Deletion drops the R2 bodies irreversibly, so one compromised member
    // account must not be able to wipe the whole teamspace.
    expect(access({ userId: "u_author", membership: "member" }).canDelete).toBe(true);
    expect(access({ userId: "u_other", membership: "member" }).canDelete).toBe(false);
  });

  it("a member cannot delete a document with unknown authorship", () => {
    const c = resolveDocAccess({
      userId: "u_member",
      doc: { teamspaceId: "t_team", createdBy: null },
      membership: "member",
      share: null,
    });
    expect(c.canDelete).toBe(false);
  });
});

describe("resolveDocAccess — direct shares", () => {
  it("editor: read/comment/edit, never delete or reshare", () => {
    const c = access({ share: "editor" });
    expect(c.canRead).toBe(true);
    expect(c.canComment).toBe(true);
    expect(c.canEdit).toBe(true);
    expect(c.canDelete).toBe(false);
    expect(c.canManageShares).toBe(false);
  });

  it("commenter: read and comment only", () => {
    const c = access({ share: "commenter" });
    expect(c.canRead).toBe(true);
    expect(c.canComment).toBe(true);
    expect(c.canEdit).toBe(false);
  });

  it("viewer: read only", () => {
    const c = access({ share: "viewer" });
    expect(c.canRead).toBe(true);
    expect(c.canComment).toBe(false);
    expect(c.canEdit).toBe(false);
  });

  it("a share never grants moderation of other people's comments", () => {
    for (const share of ["viewer", "commenter", "editor"] as const) {
      expect(access({ share }).canModerate).toBe(false);
    }
  });

  it("membership outranks a weaker direct share", () => {
    // Being a member AND holding a viewer share must not downgrade the member.
    const c = access({ userId: "u_member", membership: "member", share: "viewer" });
    expect(c.canEdit).toBe(true);
  });

  it("a share is ignored for a signed-out visitor", () => {
    expect(access({ userId: null, share: "editor" }).canEdit).toBe(false);
  });
});

describe("resolveDocAccess — legacy manage token", () => {
  it("still grants full control during the transition", () => {
    // Pre-accounts publishers have no server-side identity at all; the token in
    // their browser is the only proof they own the document.
    const c = access({ userId: null, legacyManageToken: true });
    expect(c.canRead).toBe(true);
    expect(c.canDelete).toBe(true);
    expect(c.canManageShares).toBe(true);
  });

  it("is not implied by merely being signed in", () => {
    expect(access({ userId: "u_x", legacyManageToken: false }).canRead).toBe(false);
  });
});

describe("resolveDocAccess — returned objects are independent", () => {
  it("mutating one result cannot poison another", () => {
    // The resolver returns spreads of shared constants; if that ever regressed
    // to returning the constants themselves, one caller could corrupt every
    // subsequent permission check in the isolate.
    const a = access({ membership: "owner" });
    a.canDelete = false;
    expect(access({ membership: "owner" }).canDelete).toBe(true);
  });
});

describe("teamspace-level actions", () => {
  it("only owners invite", () => {
    expect(canInvite("owner")).toBe(true);
    expect(canInvite("member")).toBe(false);
    expect(canInvite(null)).toBe(false);
  });

  it("owners remove anyone; members may only remove themselves", () => {
    expect(canRemoveMember("owner", "u_o", "u_m")).toBe(true);
    expect(canRemoveMember("member", "u_m", "u_m")).toBe(true); // leaving
    expect(canRemoveMember("member", "u_m", "u_other")).toBe(false);
    expect(canRemoveMember(null, "u_x", "u_x")).toBe(false);
  });

  it("both roles may publish, non-members may not", () => {
    expect(canPublishInto("owner")).toBe(true);
    expect(canPublishInto("member")).toBe(true);
    expect(canPublishInto(null)).toBe(false);
  });
});
