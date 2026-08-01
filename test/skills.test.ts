import { describe, it, expect } from "vitest";
import {
  isValidSkillName,
  provenancePreamble,
  MAX_NAME_LENGTH,
} from "@/lib/skills/store-core";

describe("skill names", () => {
  it("accepts kebab-case", () => {
    for (const n of ["commit-style", "a", "review-checklist-v2", "x1-y2"]) {
      expect(isValidSkillName(n)).toBe(true);
    }
  });

  it("rejects anything a retrieval key should not be", () => {
    // The name is what an agent types from memory, so "Commit Style" and
    // "commit-style" must not be able to become two different skills.
    for (const n of [
      "Commit-Style", // uppercase
      "commit style", // space
      "commit_style", // underscore
      "-leading",
      "trailing-",
      "double--hyphen",
      "", // empty
      "with/slash",
      "emoji-🙂",
    ]) {
      expect(isValidSkillName(n)).toBe(false);
    }
  });

  it("rejects names past the length cap", () => {
    expect(isValidSkillName("a".repeat(MAX_NAME_LENGTH))).toBe(true);
    expect(isValidSkillName("a".repeat(MAX_NAME_LENGTH + 1))).toBe(false);
  });
});

// The preamble is the ONLY containment for prompt injection through the
// registry: a skill is instructions another agent executes, and any member can
// write one. If it ever stops carrying these, the feature becomes a
// lateral-movement channel across every connected project.
describe("provenance preamble", () => {
  const p = provenancePreamble(
    "commit-style",
    "Acme Docs",
    "alice@example.com",
    3,
    Date.UTC(2026, 7, 1),
  );

  it("names the skill, teamspace, author and version", () => {
    expect(p).toContain("commit-style");
    expect(p).toContain("Acme Docs");
    expect(p).toContain("alice@example.com");
    expect(p).toContain("version 3");
    expect(p).toContain("2026-08-01");
  });

  it("states that the content is data, not operator instructions", () => {
    expect(p.toLowerCase()).toContain("untrusted");
    expect(p).toMatch(/DATA/);
    expect(p.toLowerCase()).toContain("not as instructions");
  });

  it("names the specific things a skill must not be allowed to do", () => {
    const lower = p.toLowerCase();
    expect(lower).toContain("tool permissions");
    expect(lower).toContain("credentials");
    expect(lower).toContain("safety");
  });

  it("tells the agent to surface the skill and its author to the user", () => {
    expect(p.toLowerCase()).toContain("tell the user");
  });

  it("degrades safely when the author is unknown", () => {
    const anon = provenancePreamble("x", "T", null, 1, Date.UTC(2026, 0, 1));
    expect(anon).toContain("an unknown member");
    expect(anon.toLowerCase()).toContain("untrusted");
  });
});
