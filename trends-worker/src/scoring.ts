// Scoring — pure functions implementing trending spec §2.3 (phase-1 signal
// subset: no download growth, no buzz), with two documented amendments:
//
//   (a) z-score within kind ONLY when the kind has >= zScoreMinN scored items;
//       below that, rank by ln(raw+1) directly. A z-score over a handful of
//       samples is noise — one outlier defines the distribution — and phase-1
//       kinds will routinely have 3–10 qualifiers.
//   (b) the total multiplier product over star_vel is capped at multiplierCap
//       (12x). The spec's individually-capped factors stack to 61x in the full
//       pipeline (4 × 1.6 × 1.6 × 1.5 × 4-ish), which lets a brand-new repo
//       structurally dominate on multipliers alone; 12x keeps velocity the
//       dominant term while the bonuses still matter.
//
// A third rule handles missing history per item: an item with no prior-week
// snapshot is scoreable only if the repo itself was created INSIDE the scored
// week (then its true prior star count is exactly 0, so prior=0 is honest).
// Anything older — including a repo created late in the prior week — has a
// nonzero true prior, so it waits for a real baseline snapshot; counting up
// to ~13 days of stars as one week's velocity would overstate exactly the
// breakout-sweep repos most likely to top the ranking. An OLD repo that
// merely joined the watchlist this week has an unknowable velocity and is
// dropped — anything else would fabricate a spike.
//
// Weights load from KV "trending:config" (mergeScoringConfig) so tuning needs
// no deploy; defaults below are the spec §2.3 numbers.

import type { Kind } from "./types";

const DAY_MS = 86_400_000;

export interface ScoringConfig {
  starVelFloor: number; // spec floor: star_vel >= 15 to enter the ranking
  growthCap: number; // cap on (stars_w+20)/(stars_w1+20)
  corroborationPerSource: number; // + per S2–S6 source listing the item
  corroborationMaxSources: number;
  freshMultiplier: number; // repo created within freshWindowDays
  freshWindowDays: number;
  multiplierCap: number; // amendment (b)
  zScoreMinN: number; // amendment (a)
  maxPerKind: number;
  baselineStarFloor: number; // min total stars to appear in a baseline week
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  starVelFloor: 15,
  growthCap: 4.0,
  corroborationPerSource: 0.15,
  corroborationMaxSources: 4,
  freshMultiplier: 1.5,
  freshWindowDays: 28,
  multiplierCap: 12,
  zScoreMinN: 20,
  maxPerKind: 10,
  baselineStarFloor: 50,
};

// Overlay a KV-sourced config blob onto the defaults. Only known keys carrying
// finite positive numbers are accepted — a malformed KV value must degrade to
// defaults, never to NaN scores.
export function mergeScoringConfig(raw: unknown): ScoringConfig {
  const cfg = { ...DEFAULT_SCORING_CONFIG };
  if (!raw || typeof raw !== "object") return cfg;
  const source = raw as Record<string, unknown>;
  for (const key of Object.keys(cfg) as (keyof ScoringConfig)[]) {
    const v = source[key];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) cfg[key] = v;
  }
  // Clamp maxPerKind so the approve step's IN(...) query stays under D1's
  // 100-bound-parameter limit (8 kinds × 12 = 96): an unbounded KV override
  // would let a config tweak silently brick publishing.
  cfg.maxPerKind = Math.min(cfg.maxPerKind, 12);
  return cfg;
}

export interface ScoreInput {
  itemId: string;
  kind: Kind;
  starsNow: number;
  starsPrior: number | null; // null = no snapshot for the prior week
  corroborationCount: number; // S2–S6 sources listing it (excludes 'github')
  repoCreatedAt: number | null; // ms epoch, from the GitHub payload
}

export interface ScoredRow {
  itemId: string;
  kind: Kind;
  score: number;
  rankInKind: number;
  starVel: number;
  starGrowth: number;
  corroborationCount: number;
}

// Score one week. `week` is the ISO Monday of the week the snapshots describe.
// Returns rows ranked per kind (rank 1..maxPerKind), kinds interleaved.
export function scoreWeek(
  week: string,
  rows: ScoreInput[],
  cfg: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoredRow[] {
  const weekStartMs = Date.parse(`${week}T00:00:00Z`);
  const weekEndMs = weekStartMs + 7 * DAY_MS;

  type Candidate = ScoredRow & { lnRaw: number };
  const byKind = new Map<Kind, Candidate[]>();

  for (const row of rows) {
    // Resolve the prior-week star count (see header: honest zero vs unknowable).
    let prior = row.starsPrior;
    if (prior === null) {
      const bornThisWeek =
        row.repoCreatedAt !== null && row.repoCreatedAt >= weekStartMs;
      if (!bornThisWeek) continue;
      prior = 0;
    }

    const starVel = row.starsNow - prior;
    if (starVel < cfg.starVelFloor) continue; // spec floor

    const starGrowth = Math.min(
      (row.starsNow + 20) / (prior + 20),
      cfg.growthCap,
    );
    const corroboration =
      1 +
      cfg.corroborationPerSource *
        Math.min(row.corroborationCount, cfg.corroborationMaxSources);
    const fresh =
      row.repoCreatedAt !== null &&
      weekEndMs - row.repoCreatedAt <= cfg.freshWindowDays * DAY_MS
        ? cfg.freshMultiplier
        : 1;

    // Amendment (b): one cap over the whole multiplier product.
    const multiplier = Math.min(
      starGrowth * corroboration * fresh,
      cfg.multiplierCap,
    );
    const lnRaw = Math.log(starVel * multiplier + 1);

    const candidate: Candidate = {
      itemId: row.itemId,
      kind: row.kind,
      score: 0, // filled per-kind below
      rankInKind: 0,
      starVel,
      starGrowth,
      corroborationCount: row.corroborationCount,
      lnRaw,
    };
    const bucket = byKind.get(row.kind);
    if (bucket) bucket.push(candidate);
    else byKind.set(row.kind, [candidate]);
  }

  const out: ScoredRow[] = [];
  for (const bucket of byKind.values()) {
    // Amendment (a): z-score only with a real sample size.
    if (bucket.length >= cfg.zScoreMinN) {
      const mean = bucket.reduce((s, c) => s + c.lnRaw, 0) / bucket.length;
      const variance =
        bucket.reduce((s, c) => s + (c.lnRaw - mean) ** 2, 0) / bucket.length;
      const std = Math.sqrt(variance);
      // Epsilon, not 0: identical lnRaw values still leave a ~1e-16 float
      // variance (the mean rounds), and dividing by that turns a flat field
      // into meaningless ±1 z-scores. Treat near-zero spread as no spread.
      for (const c of bucket) {
        c.score = std > 1e-9 ? (c.lnRaw - mean) / std : 0;
      }
    } else {
      for (const c of bucket) c.score = c.lnRaw;
    }

    // Deterministic order: score, then raw velocity, then id (stable reruns).
    bucket.sort(
      (a, b) =>
        b.score - a.score ||
        b.starVel - a.starVel ||
        (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0),
    );
    bucket.slice(0, cfg.maxPerKind).forEach((c, i) => {
      const { lnRaw: _drop, ...scored } = c;
      out.push({ ...scored, rankInKind: i + 1 });
    });
  }
  return out;
}

// Baseline week (the very first one): velocity is unknowable for EVERYTHING —
// there is no prior snapshot to subtract — so instead of refusing outright the
// launch week ranks by absolute stars and is published labelled as a baseline
// (WeekPayload.baseline, rendered as "N stars", never "↑ N this week"). This
// is the only honest ranking a single data point supports. starVel/starGrowth
// are 0 on purpose: a made-up velocity here would be exactly the fabrication
// the first-run refusal existed to prevent.
export function scoreBaselineWeek(
  rows: ScoreInput[],
  cfg: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoredRow[] {
  type Candidate = ScoredRow & { stars: number };
  const byKind = new Map<Kind, Candidate[]>();
  for (const row of rows) {
    if (row.starsNow < cfg.baselineStarFloor) continue; // junk floor
    const candidate: Candidate = {
      itemId: row.itemId,
      kind: row.kind,
      // ln keeps the stored score on the same shape the small-n velocity path
      // uses; ordering within the week is what matters, not the unit.
      score: Math.log(row.starsNow + 1),
      rankInKind: 0,
      starVel: 0,
      starGrowth: 0,
      corroborationCount: row.corroborationCount,
      stars: row.starsNow,
    };
    const bucket = byKind.get(row.kind);
    if (bucket) bucket.push(candidate);
    else byKind.set(row.kind, [candidate]);
  }

  const out: ScoredRow[] = [];
  for (const bucket of byKind.values()) {
    bucket.sort(
      (a, b) =>
        b.stars - a.stars ||
        (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0),
    );
    bucket.slice(0, cfg.maxPerKind).forEach((c, i) => {
      const { stars: _drop, ...scored } = c;
      out.push({ ...scored, rankInKind: i + 1 });
    });
  }
  return out;
}
