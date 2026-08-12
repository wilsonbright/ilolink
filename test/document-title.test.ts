import { describe, it, expect } from "vitest";
import { MAX_TITLE, normalizeTitle } from "@/lib/publish/title";

describe("normalizeTitle", () => {
  it("accepts an ordinary title unchanged", () => {
    expect(normalizeTitle("Working With Wilson")).toEqual({
      ok: true,
      value: "Working With Wilson",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeTitle("  Ship Report  ")).toEqual({
      ok: true,
      value: "Ship Report",
    });
  });

  // The title is one line in a list. A pasted heading carrying newlines would
  // otherwise break the row it sits in.
  it("collapses internal whitespace, including newlines, to single spaces", () => {
    expect(normalizeTitle("Ship\n\nReport   Week   30")).toEqual({
      ok: true,
      value: "Ship Report Week 30",
    });
  });

  it("rejects a title that is empty or only whitespace", () => {
    for (const raw of ["", "   ", "\n\t "]) {
      const r = normalizeTitle(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/1–200/);
    }
  });

  it("rejects a title longer than the limit", () => {
    const r = normalizeTitle("x".repeat(MAX_TITLE + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/1–200/);
  });

  it("accepts a title exactly at the limit", () => {
    const r = normalizeTitle("x".repeat(MAX_TITLE));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(MAX_TITLE);
  });

  // Length is measured AFTER collapsing, so padding cannot be used to smuggle a
  // long title past the check, and a title that only exceeds the limit because
  // of runs of spaces is accepted rather than refused.
  it("measures length after collapsing, not before", () => {
    const padded = "a" + " ".repeat(400) + "b";
    const r = normalizeTitle(padded);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("a b");
  });

  it("rejects a non-string", () => {
    for (const raw of [undefined, null, 42, {}]) {
      expect(normalizeTitle(raw as unknown as string).ok).toBe(false);
    }
  });
});
