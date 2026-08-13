import { describe, it, expect } from "vitest";
import {
  filterValidMentions,
  MAX_MENTIONS_PER_COMMENT,
  mentionCandidateIds,
} from "@/lib/notifications/store";

// The mentions field on POST /api/comments is attacker-controlled: any signed
// in user can send any shape with any ids. These two pure functions are the
// whole defense before a notification row is written, so their edges get
// pinned here.

describe("mentionCandidateIds — untrusted shape coercion", () => {
  it("ignores everything that is not an array of strings", () => {
    expect(mentionCandidateIds(undefined)).toEqual([]);
    expect(mentionCandidateIds(null)).toEqual([]);
    expect(mentionCandidateIds("u_alice")).toEqual([]);
    expect(mentionCandidateIds({ 0: "u_alice" })).toEqual([]);
    expect(mentionCandidateIds(42)).toEqual([]);
  });

  it("keeps string entries and drops the rest, silently", () => {
    expect(
      mentionCandidateIds(["u_a", 7, null, { id: "u_b" }, "u_c", ""]),
    ).toEqual(["u_a", "u_c"]);
  });

  it("dedupes repeated ids", () => {
    expect(mentionCandidateIds(["u_a", "u_a", "u_b", "u_a"])).toEqual([
      "u_a",
      "u_b",
    ]);
  });

  it("hard-caps at the contract limit, before any DB work", () => {
    const many = Array.from({ length: 50 }, (_, i) => `u_${i}`);
    const out = mentionCandidateIds(many);
    expect(out).toHaveLength(MAX_MENTIONS_PER_COMMENT);
    expect(out[0]).toBe("u_0");
    expect(out[9]).toBe("u_9");
  });

  it("cannot be inflated past the cap with duplicates padding the front", () => {
    // 10 copies of one id followed by 10 distinct ids: the dedupe must not let
    // the tail smuggle the total past the cap.
    const raw = [
      ...Array.from({ length: 10 }, () => "u_dup"),
      ...Array.from({ length: 10 }, (_, i) => `u_${i}`),
    ];
    expect(mentionCandidateIds(raw).length).toBeLessThanOrEqual(
      MAX_MENTIONS_PER_COMMENT,
    );
  });
});

describe("filterValidMentions — membership is the only gate", () => {
  const members = new Set(["u_alice", "u_bob", "u_self"]);

  it("keeps only ids that are members of the doc's teamspace", () => {
    expect(
      filterValidMentions(["u_alice", "u_outsider", "u_bob"], members, "u_self"),
    ).toEqual(["u_alice", "u_bob"]);
  });

  it("drops a self-mention even though the commenter is a member", () => {
    expect(filterValidMentions(["u_self", "u_alice"], members, "u_self")).toEqual(
      ["u_alice"],
    );
  });

  it("returns nothing when the member set is empty (non-member commenter path)", () => {
    expect(filterValidMentions(["u_alice"], new Set(), "u_self")).toEqual([]);
  });
});
