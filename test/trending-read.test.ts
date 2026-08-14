// The trending KV contract readers (lib/trending/read.ts). The parse layer is
// pure — no Cloudflare bindings — because the pages must survive every bad
// input production can produce: no data on day one, malformed JSON, contract
// drift from the trends-worker side. Every failure must come back as null,
// never a throw that reaches a page.

import { describe, expect, it } from "vitest";
import {
  isWeekString,
  parseWeek,
  parseWeeks,
  weekKey,
  WEEKS_KEY,
} from "@/lib/trending/read";
import type { Card } from "@/lib/trending/types";

const card = (over: Partial<Card> = {}): Card => ({
  id: "gh:owner/repo",
  name: "repo",
  repoUrl: "https://github.com/owner/repo",
  kind: "mcp-server",
  description: "A test server",
  stars: 420,
  starVel: 120,
  starGrowth: 2.1,
  corroboration: ["awesome-mcp-servers"],
  score: 1.5,
  rank: 1,
  firstSeen: "2026-08-10",
  isNew: true,
  ...over,
});

describe("keys", () => {
  it("builds the contract key shapes", () => {
    expect(WEEKS_KEY).toBe("trending:weeks");
    expect(weekKey("2026-08-10")).toBe("trending:2026-08-10");
  });
});

describe("isWeekString", () => {
  it("accepts ISO-Monday-shaped dates only", () => {
    expect(isWeekString("2026-08-10")).toBe(true);
    expect(isWeekString("2026-8-10")).toBe(false);
    expect(isWeekString("../secrets")).toBe(false);
    expect(isWeekString(20260810)).toBe(false);
    expect(isWeekString(null)).toBe(false);
  });
});

describe("parseWeeks", () => {
  it("parses a valid list", () => {
    expect(parseWeeks('["2026-08-10","2026-08-03"]')).toEqual([
      "2026-08-10",
      "2026-08-03",
    ]);
  });

  it("returns null for missing, malformed, empty, or off-contract values", () => {
    expect(parseWeeks(null)).toBeNull();
    expect(parseWeeks("not json")).toBeNull();
    expect(parseWeeks("{}")).toBeNull();
    // Empty list means "nothing published yet" — same as a missing key.
    expect(parseWeeks("[]")).toBeNull();
    expect(parseWeeks('["2026-08-10", 42]')).toBeNull();
    expect(parseWeeks('["august"]')).toBeNull();
  });

  it("caps at 12 weeks defensively", () => {
    const weeks = Array.from({ length: 20 }, (_, i) =>
      `2026-01-${String(i + 1).padStart(2, "0")}`,
    );
    expect(parseWeeks(JSON.stringify(weeks))).toHaveLength(12);
  });
});

describe("parseWeek", () => {
  const snapshot = {
    week: "2026-08-10",
    generatedAt: "2026-08-10T06:30:00Z",
    kinds: { "mcp-server": [card()], skill: [card({ kind: "skill" })] },
  };

  it("parses a valid snapshot", () => {
    const parsed = parseWeek(JSON.stringify(snapshot));
    expect(parsed?.week).toBe("2026-08-10");
    expect(parsed?.kinds["mcp-server"]?.[0]?.name).toBe("repo");
    expect(parsed?.kinds.skill).toHaveLength(1);
  });

  it("returns null for missing/malformed values and envelope drift", () => {
    expect(parseWeek(null)).toBeNull();
    expect(parseWeek("nope")).toBeNull();
    expect(parseWeek("[]")).toBeNull();
    expect(parseWeek('{"week":"2026-08-10"}')).toBeNull();
    expect(
      parseWeek(JSON.stringify({ ...snapshot, week: "week 33" })),
    ).toBeNull();
    expect(parseWeek(JSON.stringify({ ...snapshot, kinds: null }))).toBeNull();
  });

  it("rejects the whole snapshot on a single malformed card", () => {
    // Strict on purpose: the writer is a hand-approved step, so drift is a
    // bug — the empty state beats a half-broken week.
    const bad = {
      ...snapshot,
      kinds: { skill: [card({ kind: "skill" }), { name: "no fields" }] },
    };
    expect(parseWeek(JSON.stringify(bad))).toBeNull();
    const wrongKind = { ...snapshot, kinds: { skill: [card()] } };
    // Cards under an unknown kind key are ignored; a card whose own `kind`
    // field is off-list is still a valid card shape-wise.
    expect(parseWeek(JSON.stringify(wrongKind))).not.toBeNull();
  });

  it("rejects a repoUrl outside https://github.com/ (href injection)", () => {
    // repoUrl is rendered as a raw <a href>, so the origin the writer
    // constructs is part of the contract — a javascript:/data: href from a
    // buggy or compromised KV writer must reject the snapshot.
    const evil = {
      ...snapshot,
      kinds: { skill: [card({ kind: "skill", repoUrl: "javascript:alert(1)" })] },
    };
    expect(parseWeek(JSON.stringify(evil))).toBeNull();
    const offOrigin = {
      ...snapshot,
      kinds: { skill: [card({ kind: "skill", repoUrl: "https://example.com/x" })] },
    };
    expect(parseWeek(JSON.stringify(offOrigin))).toBeNull();
  });

  it("accepts a null description", () => {
    const s = { ...snapshot, kinds: { skill: [card({ kind: "skill", description: null })] } };
    expect(parseWeek(JSON.stringify(s))?.kinds.skill?.[0]?.description).toBeNull();
  });

  it("passes the baseline flag through, rejects a non-boolean one", () => {
    expect(parseWeek(JSON.stringify({ ...snapshot, baseline: true }))?.baseline).toBe(true);
    // Absent stays absent — the reader must not invent `baseline: false`.
    expect("baseline" in (parseWeek(JSON.stringify(snapshot)) ?? {})).toBe(false);
    // Anything else is contract drift, and drift rejects the whole snapshot.
    expect(parseWeek(JSON.stringify({ ...snapshot, baseline: "yes" }))).toBeNull();
  });

  it("re-sorts by rank and caps at 10 per kind", () => {
    const cards = Array.from({ length: 14 }, (_, i) =>
      card({ id: `gh:o/r${i}`, rank: 14 - i }),
    );
    const parsed = parseWeek(
      JSON.stringify({ ...snapshot, kinds: { "mcp-server": cards } }),
    );
    const ranks = parsed?.kinds["mcp-server"]?.map((c) => c.rank);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("drops empty and unknown kind buckets", () => {
    const parsed = parseWeek(
      JSON.stringify({
        ...snapshot,
        kinds: { skill: [], gadget: [card()], "mcp-server": [card()] },
      }),
    );
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!.kinds)).toEqual(["mcp-server"]);
  });
});
