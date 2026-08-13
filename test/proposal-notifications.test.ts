// proposalRecipients decides who is told that an assistant filed a proposal on
// its own initiative. The property that matters is that the audience is
// exactly the people who can act on it: owners and admins, never a plain
// member (an artifact_proposal row is the one notification that names registry
// content a member has no review page for), and never the actor. Capping the
// fan-out matters too — one contribution must not write an unbounded batch.
//
// Pure, so no D1 harness: the SQL filters on role as well, and this is the
// belt-and-braces half that holds wherever the rows came from.

import { describe, it, expect } from "vitest";
import {
  proposalRecipients,
  MAX_PROPOSAL_NOTIFY,
} from "@/lib/notifications/store";

const member = (user_id: string, role: string) => ({ user_id, role });

describe("proposalRecipients", () => {
  it("notifies owners and admins", () => {
    expect(
      proposalRecipients(
        [member("u_owner", "owner"), member("u_admin", "admin")],
        "u_agentuser",
      ),
    ).toEqual(["u_owner", "u_admin"]);
  });

  it("never notifies the actor, even when the actor is an owner", () => {
    expect(
      proposalRecipients(
        [member("u_owner", "owner"), member("u_admin", "admin")],
        "u_owner",
      ),
    ).toEqual(["u_admin"]);
  });

  it("never notifies a plain member, whatever else is in the list", () => {
    expect(
      proposalRecipients(
        [
          member("u_member", "member"),
          member("u_owner", "owner"),
          member("u_viewer", "viewer"),
          member("u_member2", "member"),
        ],
        "u_actor",
      ),
    ).toEqual(["u_owner"]);
  });

  it("returns nothing for a personal teamspace whose sole owner is the actor", () => {
    // Not an error case: the contributor IS the review queue here, so there is
    // genuinely nobody to tell.
    expect(proposalRecipients([member("u_solo", "owner")], "u_solo")).toEqual(
      [],
    );
  });

  it("caps the fan-out at MAX_PROPOSAL_NOTIFY", () => {
    const admins = Array.from({ length: MAX_PROPOSAL_NOTIFY + 20 }, (_, i) =>
      member(`u_${i}`, "admin"),
    );
    const out = proposalRecipients(admins, "u_actor");
    expect(out).toHaveLength(MAX_PROPOSAL_NOTIFY);
    expect(out[0]).toBe("u_0");
    expect(out.at(-1)).toBe(`u_${MAX_PROPOSAL_NOTIFY - 1}`);
  });

  it("counts only kept rows toward the cap, so skipped roles cannot starve it", () => {
    // A run of members ahead of the reviewers must not eat cap slots — a
    // `slice(0, N)` before the role filter would fail this.
    const rows = [
      ...Array.from({ length: MAX_PROPOSAL_NOTIFY }, (_, i) =>
        member(`u_m${i}`, "member"),
      ),
      member("u_owner", "owner"),
    ];
    expect(proposalRecipients(rows, "u_actor")).toEqual(["u_owner"]);
  });
});
