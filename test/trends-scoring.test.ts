// Scoring is the pipeline's judgment call, so its edges are pinned hard: the
// star_vel floor, the growth cap, the 12x total-multiplier cap (amendment b),
// the small-n ln fallback vs. real z-scores (amendment a), the honest handling
// of items with no prior-week snapshot, and deterministic per-kind ranking.

import { describe, it, expect } from "vitest";
import {
  DEFAULT_SCORING_CONFIG,
  mergeScoringConfig,
  scoreWeek,
  type ScoreInput,
} from "@/trends-worker/src/scoring";
import type { Kind } from "@/trends-worker/src/types";

const WEEK = "2026-08-03"; // Monday; week ends 2026-08-10, prior Monday 2026-07-27

function input(over: Partial<ScoreInput> & { itemId: string }): ScoreInput {
  return {
    kind: "mcp-server" as Kind,
    starsNow: 200,
    starsPrior: 100,
    corroborationCount: 0,
    repoCreatedAt: null,
    ...over,
  };
}

describe("the star_vel floor", () => {
  it("drops velocity 14, keeps velocity 15", () => {
    const out = scoreWeek(WEEK, [
      input({ itemId: "gh:a/slow", starsNow: 114, starsPrior: 100 }), // vel 14
      input({ itemId: "gh:a/fast", starsNow: 115, starsPrior: 100 }), // vel 15
    ]);
    expect(out.map((r) => r.itemId)).toEqual(["gh:a/fast"]);
    expect(out[0].starVel).toBe(15);
  });
});

describe("caps", () => {
  it("caps star_growth at 4.0 however explosive the ratio", () => {
    // (1020+20)/(0+20) = 52 uncapped.
    const out = scoreWeek(WEEK, [
      input({ itemId: "gh:a/x", starsNow: 1020, starsPrior: 0 }),
    ]);
    expect(out[0].starGrowth).toBe(4);
    // score = ln(vel * cappedGrowth + 1) on the small-n path
    expect(out[0].score).toBeCloseTo(Math.log(1020 * 4 + 1), 10);
  });

  it("caps the TOTAL multiplier product at 12x (amendment b)", () => {
    // Inflate freshness via config so growth(4) * fresh(10) = 40 uncapped;
    // a fresh new repo would dominate structurally without the product cap.
    const cfg = mergeScoringConfig({ freshMultiplier: 10 });
    const created = Date.parse("2026-08-05T00:00:00Z"); // this week → fresh, prior=0 ok
    const out = scoreWeek(
      WEEK,
      [
        input({
          itemId: "gh:a/new",
          starsNow: 100,
          starsPrior: null,
          repoCreatedAt: created,
        }),
      ],
      cfg,
    );
    expect(out[0].score).toBeCloseTo(Math.log(100 * 12 + 1), 10);
  });
});

describe("items with no prior-week snapshot", () => {
  it("scores a repo created INSIDE the scored week with an honest prior of 0", () => {
    const out = scoreWeek(WEEK, [
      input({
        itemId: "gh:a/born-this-week",
        starsNow: 60,
        starsPrior: null,
        repoCreatedAt: Date.parse("2026-08-04T00:00:00Z"),
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].starVel).toBe(60); // 60 - 0
  });

  it("drops a repo created in the PRIOR week (its true prior is nonzero — it waits a week)", () => {
    // prior=0 for a repo born Tuesday of the prior week would count ~13 days
    // of stars as one week's velocity, systematically inflating exactly the
    // breakout-sweep intake path.
    const out = scoreWeek(WEEK, [
      input({
        itemId: "gh:a/born-prior-week",
        starsNow: 60,
        starsPrior: null,
        repoCreatedAt: Date.parse("2026-07-28T00:00:00Z"),
      }),
    ]);
    expect(out).toEqual([]);
  });

  it("drops an OLD repo that merely joined the watchlist (velocity unknowable)", () => {
    const out = scoreWeek(WEEK, [
      input({
        itemId: "gh:a/old-newcomer",
        starsNow: 5000,
        starsPrior: null,
        repoCreatedAt: Date.parse("2024-01-01T00:00:00Z"),
      }),
    ]);
    expect(out).toEqual([]);
  });

  it("drops an item with neither prior snapshot nor creation date", () => {
    const out = scoreWeek(WEEK, [
      input({ itemId: "gh:a/mystery", starsPrior: null, repoCreatedAt: null }),
    ]);
    expect(out).toEqual([]);
  });
});

describe("freshness and corroboration multipliers", () => {
  it("a fresh repo (created within 4 weeks) outscores an identical stale one", () => {
    const fresh = Date.parse("2026-07-20T00:00:00Z"); // within 28d of week end
    const [a, b] = scoreWeek(WEEK, [
      input({ itemId: "gh:a/fresh", repoCreatedAt: fresh }),
      input({ itemId: "gh:a/stale", repoCreatedAt: Date.parse("2025-01-01T00:00:00Z") }),
    ]);
    expect(a.itemId).toBe("gh:a/fresh");
    expect(a.score).toBeGreaterThan(b.score);
  });

  it("a corroborated item outscores an identical uncorroborated one", () => {
    const [a, b] = scoreWeek(WEEK, [
      input({ itemId: "gh:a/plain" }),
      input({ itemId: "gh:a/listed", corroborationCount: 1 }),
    ]);
    expect(a.itemId).toBe("gh:a/listed");
    // vel 100, growth (200+20)/(100+20), corroboration 1 + 0.15*1
    const growth = 220 / 120;
    expect(a.score).toBeCloseTo(Math.log(100 * growth * 1.15 + 1), 10);
    expect(b.score).toBeCloseTo(Math.log(100 * growth + 1), 10);
  });

  it("corroboration sources are capped at 4", () => {
    const [a, b] = scoreWeek(WEEK, [
      input({ itemId: "gh:a/four", corroborationCount: 4 }),
      input({ itemId: "gh:a/nine", corroborationCount: 9 }),
    ]);
    // Identical otherwise → identical scores; deterministic id tiebreak.
    expect(a.score).toBe(b.score);
    expect(a.itemId).toBe("gh:a/four");
  });
});

describe("small-n fallback vs z-scores (amendment a)", () => {
  it("below 20 items per kind, score IS ln(raw+1) — no z-scoring", () => {
    const out = scoreWeek(WEEK, [
      input({ itemId: "gh:a/x", starsNow: 150, starsPrior: 100 }), // vel 50
    ]);
    const growth = (150 + 20) / (100 + 20);
    expect(out[0].score).toBeCloseTo(Math.log(50 * growth + 1), 10);
  });

  it("at 20+ items per kind, scores are z-scores (mean 0, order preserved)", () => {
    const rows = Array.from({ length: 24 }, (_, i) =>
      input({
        itemId: `gh:a/r${String(i).padStart(2, "0")}`,
        starsNow: 120 + i * 15, // vels 20, 35, 50, ...
        starsPrior: 100,
      }),
    );
    const out = scoreWeek(WEEK, rows);
    expect(out).toHaveLength(10); // top 10 of 24
    // Highest velocity ranks first and sits above the mean.
    expect(out[0].itemId).toBe("gh:a/r23");
    expect(out[0].score).toBeGreaterThan(0);
    expect(out[0].rankInKind).toBe(1);
    // Strictly descending scores down the ranking.
    for (let i = 1; i < out.length; i++) {
      expect(out[i].score).toBeLessThan(out[i - 1].score);
    }
  });

  it("a zero-variance kind z-scores to all-zero instead of NaN", () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      input({ itemId: `gh:a/same${String(i).padStart(2, "0")}` }),
    );
    const out = scoreWeek(WEEK, rows);
    for (const r of out) expect(r.score).toBe(0);
  });
});

describe("ranking mechanics", () => {
  it("returns at most 10 per kind with ranks 1..10", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      input({
        itemId: `gh:a/k${String(i).padStart(2, "0")}`,
        starsNow: 200 + i,
      }),
    );
    const out = scoreWeek(WEEK, rows);
    expect(out).toHaveLength(10);
    expect(out.map((r) => r.rankInKind)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("ranks kinds independently", () => {
    const out = scoreWeek(WEEK, [
      input({ itemId: "gh:a/server", kind: "mcp-server" as Kind }),
      input({ itemId: "gh:a/skill", kind: "skill" as Kind }),
    ]);
    expect(out).toHaveLength(2);
    for (const r of out) expect(r.rankInKind).toBe(1);
  });
});

describe("mergeScoringConfig", () => {
  it("returns defaults for null / non-object / empty KV values", () => {
    expect(mergeScoringConfig(null)).toEqual(DEFAULT_SCORING_CONFIG);
    expect(mergeScoringConfig("garbage")).toEqual(DEFAULT_SCORING_CONFIG);
    expect(mergeScoringConfig({})).toEqual(DEFAULT_SCORING_CONFIG);
  });

  it("applies valid overrides and keeps the rest", () => {
    const cfg = mergeScoringConfig({ starVelFloor: 30 });
    expect(cfg.starVelFloor).toBe(30);
    expect(cfg.growthCap).toBe(DEFAULT_SCORING_CONFIG.growthCap);
  });

  it("rejects NaN, negatives, zeros, wrong types, and unknown keys", () => {
    const cfg = mergeScoringConfig({
      starVelFloor: NaN,
      growthCap: -4,
      maxPerKind: 0,
      freshMultiplier: "2",
      totallyUnknown: 99,
    });
    expect(cfg).toEqual(DEFAULT_SCORING_CONFIG);
  });

  it("clamps maxPerKind at 12 (approve's IN() must stay under D1's 100 params)", () => {
    expect(mergeScoringConfig({ maxPerKind: 50 }).maxPerKind).toBe(12);
    expect(mergeScoringConfig({ maxPerKind: 5 }).maxPerKind).toBe(5);
  });
});
