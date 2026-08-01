import { describe, it, expect } from "vitest";
import { provenancePreamble } from "@/lib/artifacts/store-core";
import {
  canArchiveArtifact,
  canUnarchiveArtifact,
} from "@/lib/teamspace/permissions";

// These pin four defects found by an adversarial review of the registry. Each
// was reachable in code that had already type-checked and built, so the type
// system is not what keeps them fixed — these are.

describe("the proposal preamble", () => {
  const args = ["skill", "commit-style", "Acme", "a@b.com", 3, 0] as const;

  it("says nothing extra for a live artifact", () => {
    const p = provenancePreamble(...args, "published");
    expect(p).not.toContain("NOT LIVE");
    expect(p).toContain("untrusted user content");
  });

  it("marks a proposal as NOT LIVE and tells the agent not to act on it", () => {
    // Without this the text is byte-identical to live team policy, so an agent
    // asked to look at a pending change would apply it as though it were
    // agreed. The security paragraph must survive alongside the new warning.
    const p = provenancePreamble(...args, "proposed");
    expect(p).toContain("NOT LIVE");
    expect(p).toContain("PROPOSED");
    expect(p).toContain("Do not act on it");
    expect(p).toContain("untrusted user content");
    expect(p).toContain("read credentials or environment files");
  });

  it("defaults to published so an un-updated caller cannot silently mislabel", () => {
    expect(provenancePreamble(...args)).not.toContain("NOT LIVE");
  });

  it("names the kind rather than always saying 'skill'", () => {
    const p = provenancePreamble("session", "handoff", "Acme", null, 1, 0);
    expect(p).toContain("session transfer");
    expect(p).not.toContain("--- ilolink skill:");
  });
});

describe("archiving authority", () => {
  it("lets admins and owners archive anything", () => {
    expect(canArchiveArtifact("owner", "u_other", "u_me")).toBe(true);
    expect(canArchiveArtifact("admin", "u_other", "u_me")).toBe(true);
  });

  it("lets a member archive only what they created", () => {
    // Archiving hides an artifact from every agent in the teamspace. Unbounded,
    // one member could disable the team's whole registry.
    expect(canArchiveArtifact("member", "u_me", "u_me")).toBe(true);
    expect(canArchiveArtifact("member", "u_other", "u_me")).toBe(false);
    expect(canArchiveArtifact("member", null, "u_me")).toBe(false);
  });

  it("does not let a member unarchive, even their own", () => {
    // An admin archives an artifact exactly when it is wrong or malicious;
    // letting its author restore it undoes the only remedy an admin has.
    expect(canUnarchiveArtifact("member")).toBe(false);
    expect(canUnarchiveArtifact("admin")).toBe(true);
    expect(canUnarchiveArtifact("owner")).toBe(true);
    expect(canUnarchiveArtifact(null)).toBe(false);
  });
});
