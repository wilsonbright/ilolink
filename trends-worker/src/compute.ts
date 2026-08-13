// trending-compute (spec §4): turn two weeks of snapshots into ranked
// trending_snapshots rows. Runs Monday 06:00 against the week that just ended
// (week.ts computeWeek), or on demand via POST /admin/compute.
//
// Two refusals are deliberate:
//   - Immutability: a week already computed is frozen (published archives
//     point at it); recomputing requires an explicit ?force=1.
//   - First-ever week: with no prior-week snapshots at all, star velocity is
//     unknowable for everything, and any "ranking" would be fabricated. The
//     run reports "insufficient history" instead; real rankings start in
//     week 2. (Per-item missing history is handled in scoring.ts: only repos
//     created this week get an honest prior of 0.)

import type { Env, Kind } from "./types";
import { KINDS } from "./types";
import { priorWeek } from "./week";
import {
  mergeScoringConfig,
  scoreWeek,
  type ScoreInput,
} from "./scoring";

export interface ComputeResult {
  ok: boolean;
  itemCount: number;
  error?: string;
}

// Everything scoring needs, joined in one query. corroboration counts only
// S2–S6-style sources — github is the baseline signal, not corroboration, and
// npm/pypi are download signals (phase 3), not listings.
const COMPUTE_QUERY = `
  SELECT s.item_id, s.stars, i.kind, i.repo_created_at, p.stars AS prior_stars,
         (SELECT COUNT(*) FROM item_sources src
          WHERE src.item_id = s.item_id
            AND src.source NOT IN ('github', 'npm', 'pypi')) AS corroboration
  FROM item_snapshots s
  JOIN items i ON i.id = s.item_id
  LEFT JOIN item_snapshots p ON p.item_id = s.item_id AND p.week_start = ?
  WHERE s.week_start = ? AND i.status = 'active' AND s.stars IS NOT NULL
`;

const KIND_SET = new Set<string>(KINDS);

export async function computeTrendingWeek(
  env: Env,
  week: string,
  force: boolean,
): Promise<ComputeResult> {
  // Immutability gate.
  const existing = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM trending_snapshots WHERE week_start = ?`,
  )
    .bind(week)
    .first<{ n: number }>();
  if ((existing?.n ?? 0) > 0) {
    if (!force) {
      return { ok: false, itemCount: 0, error: `week ${week} already computed (use force=1)` };
    }
    await env.DB.prepare(`DELETE FROM trending_snapshots WHERE week_start = ?`)
      .bind(week)
      .run();
  }

  // First-run gate: no prior-week snapshots at all => nothing is scoreable.
  const prior = priorWeek(week);
  const priorCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM item_snapshots WHERE week_start = ?`,
  )
    .bind(prior)
    .first<{ n: number }>();
  if ((priorCount?.n ?? 0) === 0) {
    return {
      ok: false,
      itemCount: 0,
      error: `insufficient history: no snapshots for prior week ${prior}`,
    };
  }

  const rows = await env.DB.prepare(COMPUTE_QUERY).bind(prior, week).all<{
    item_id: string;
    stars: number;
    kind: string | null;
    repo_created_at: number | null;
    prior_stars: number | null;
    corroboration: number;
  }>();

  const inputs: ScoreInput[] = rows.results.map((r) => ({
    itemId: r.item_id,
    // Ingest always classifies, but the column is nullable — fall back to the
    // classifier's own default rather than dropping the row.
    kind: (KIND_SET.has(r.kind ?? "") ? r.kind : "framework") as Kind,
    starsNow: r.stars,
    starsPrior: r.prior_stars,
    corroborationCount: r.corroboration,
    repoCreatedAt: r.repo_created_at,
  }));

  // Weights are tunable via KV without a deploy; junk degrades to defaults.
  const rawConfig = await env.KV.get("trending:config", "json");
  const scored = scoreWeek(week, inputs, mergeScoringConfig(rawConfig));

  if (scored.length > 0) {
    const CHUNK = 50;
    for (let i = 0; i < scored.length; i += CHUNK) {
      await env.DB.batch(
        scored.slice(i, i + CHUNK).map((s) =>
          env.DB.prepare(
            `INSERT INTO trending_snapshots
               (week_start, item_id, kind, score, rank_in_kind, star_vel, star_growth, corroboration_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(
            week,
            s.itemId,
            s.kind,
            s.score,
            s.rankInKind,
            s.starVel,
            s.starGrowth,
            s.corroborationCount,
          ),
        ),
      );
    }
  }

  return { ok: true, itemCount: scored.length };
}
