import { describe, it, expect } from "vitest";
import {
  parseSkillFile,
  skillNameFromPath,
  slugifySkillName,
  inferDescription,
} from "@/lib/skills/frontmatter";
import { isValidSkillName } from "@/lib/skills/store-core";

describe("skill frontmatter", () => {
  it("pulls name and description out of a normal SKILL.md", () => {
    const p = parseSkillFile(
      `---\nname: commit-style\ndescription: Use when writing a commit message.\n---\n# Commit style\n\nImperative mood.`,
    );
    expect(p.name).toBe("commit-style");
    expect(p.description).toBe("Use when writing a commit message.");
    expect(p.body.startsWith("# Commit style")).toBe(true);
    // The fence must not survive into the body — it would be shown to agents.
    expect(p.body).not.toContain("---");
  });

  it("treats a file with no frontmatter as all body", () => {
    const p = parseSkillFile("# Just a doc\n\nNo fence here.");
    expect(p.name).toBeNull();
    expect(p.description).toBeNull();
    expect(p.body).toContain("Just a doc");
  });

  it("survives a BOM, CRLF, quotes and unknown keys", () => {
    // A BOM would otherwise stop the fence matching at position 0 and silently
    // turn the entire frontmatter block into body text.
    const p = parseSkillFile(
      `﻿---\r\nname: "api-errors"\r\nallowed-tools: Read, Bash\r\ndescription: 'Use when handling API errors.'\r\n---\r\nBody here.`,
    );
    expect(p.name).toBe("api-errors");
    expect(p.description).toBe("Use when handling API errors.");
    expect(p.body).toBe("Body here.");
  });

  it("ignores a fence that is not at the very start", () => {
    const p = parseSkillFile("Intro paragraph.\n\n---\nname: nope\n---\n");
    expect(p.name).toBeNull();
  });
});

describe("naming an imported file", () => {
  it("uses the directory for the plugin SKILL.md layout", () => {
    // .claude/skills/commit-style/SKILL.md — the basename carries nothing.
    expect(skillNameFromPath("skills/commit-style/SKILL.md")).toBe("commit-style");
    expect(skillNameFromPath("commit-style.md")).toBe("commit-style");
  });

  it("coerces human filenames into valid retrieval keys", () => {
    for (const [input, expected] of [
      ["Commit Style", "commit-style"],
      ["api_error_handling", "api-error-handling"],
      ["  Spaced  Out  ", "spaced-out"],
      ["weird!!chars??", "weirdchars"],
      ["--leading-and-trailing--", "leading-and-trailing"],
    ] as const) {
      const out = slugifySkillName(input);
      expect(out).toBe(expected);
      // Whatever we coerce to must be writable, or import fails at the server.
      expect(isValidSkillName(out)).toBe(true);
    }
  });

  it("returns something invalid rather than guessing when there is nothing to use", () => {
    // Caught and reported by the importer; never silently written.
    expect(isValidSkillName(slugifySkillName("🙂🙂"))).toBe(false);
  });
});

describe("inferred descriptions", () => {
  it("skips headings and blank lines", () => {
    expect(inferDescription("# Title\n\n\nThe first real line.\nSecond.")).toBe(
      "The first real line.",
    );
  });

  it("returns null for a body with nothing but headings", () => {
    expect(inferDescription("# Only\n## Headings")).toBeNull();
  });
});
