// The approve step — the ONLY code that writes the app-facing trending:* KV
// keys, and it runs solely on an explicit POST /admin/approve. Compute can run
// all it wants; nothing reaches the /trending page until a human has looked at
// the week and approved it (spec §8 phase 1: hand-approved snapshot).
//
// KV contract (byte-exact, the app depends on it):
//   "trending:weeks"        -> ["2026-08-10", "2026-08-03", ...] newest first, max 12
//   "trending:" + week      -> WeekPayload (see types.ts): cards per kind,
//                              sorted by rank asc, max 10 per kind
// description on a card is the repo's own short description — displayed with
// attribution (the card links to the repo) — never README content.

import type { Card, Env, Kind, WeekPayload } from "./types";
import { KINDS } from "./types";
import { priorWeek } from "./week";

const MAX_WEEKS = 12;
const MAX_PER_KIND = 10;

export interface PublishRow {
  item_id: string;
  kind: string;
  score: number;
  rank_in_kind: number;
  star_vel: number | null;
  star_growth: number | null;
  corroboration_count: number | null;
  name: string;
  canonical_repo: string | null;
  description: string | null;
  first_seen: string | null;
  stars: number | null;
}

// Corroboration chips must credit the actual directory (spec §1 attribution
// rule: "credits the directory it was corroborated by"), so an awesome-list
// raw-README URL becomes a human-readable list name: the repo alone when it is
// self-describing ("awesome-mcp-servers"), otherwise "owner/repo"
// ("anthropics/skills"). Unrecognized refs fall back to the raw value —
// rendering something odd beats silently dropping a credit.
export function awesomeListName(listUrl: string): string {
  const m = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//.exec(
    listUrl,
  );
  if (!m) return listUrl;
  const [, owner, repo] = m;
  return repo.toLowerCase().startsWith("awesome") ? repo : `${owner}/${repo}`;
}

// Pure payload builder — exported so the fake-D1 test can pin the exact shape.
export function buildWeekPayload(
  week: string,
  generatedAt: string,
  rows: PublishRow[],
  sourcesByItem: Map<string, string[]>,
  baseline = false,
): WeekPayload {
  const kinds: Partial<Record<Kind, Card[]>> = {};
  const KIND_SET = new Set<string>(KINDS);

  for (const row of rows) {
    if (!KIND_SET.has(row.kind)) continue; // never publish an unknown bucket
    const kind = row.kind as Kind;
    const card: Card = {
      id: row.item_id,
      name: row.name,
      // canonical_repo is set for every gh: item; the id-derived fallback
      // keeps the card linkable even if a future source forgets it.
      repoUrl:
        row.canonical_repo ??
        (row.item_id.startsWith("gh:")
          ? `https://github.com/${row.item_id.slice(3)}`
          : ""),
      kind,
      description: row.description,
      stars: row.stars ?? 0,
      starVel: row.star_vel ?? 0,
      // Rounded for stable, tidy JSON — full precision lives in D1.
      starGrowth: Math.round((row.star_growth ?? 0) * 1000) / 1000,
      corroboration: sourcesByItem.get(row.item_id) ?? [],
      score: Math.round(row.score * 10000) / 10000,
      rank: row.rank_in_kind,
      firstSeen: row.first_seen ?? week,
      isNew: row.first_seen === week,
    };
    (kinds[kind] ??= []).push(card);
  }

  for (const kind of Object.keys(kinds) as Kind[]) {
    kinds[kind] = kinds[kind]!
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_PER_KIND);
  }

  return { week, generatedAt, kinds, ...(baseline ? { baseline } : {}) };
}

export interface ApproveResult {
  ok: boolean;
  error?: string;
  itemCount: number;
}

export async function approveWeek(
  env: Env,
  week: string,
  now: Date,
): Promise<ApproveResult> {
  const rows = await env.DB.prepare(
    `SELECT t.item_id, t.kind, t.score, t.rank_in_kind, t.star_vel,
            t.star_growth, t.corroboration_count,
            i.name, i.canonical_repo, i.description, i.first_seen,
            s.stars
     FROM trending_snapshots t
     JOIN items i ON i.id = t.item_id
     LEFT JOIN item_snapshots s ON s.item_id = t.item_id AND s.week_start = t.week_start
     WHERE t.week_start = ?
     ORDER BY t.kind, t.rank_in_kind`,
  )
    .bind(week)
    .all<PublishRow>();

  // Approving a week that was never computed would publish an empty page —
  // refuse instead, so the mistake is visible at the curl.
  if (rows.results.length === 0) {
    return { ok: false, error: `no computed snapshot for week ${week}`, itemCount: 0 };
  }

  // Corroboration chips: named directories, never internal enums. Registry
  // sources (phase 2+) contribute their source name as-is; awesome-list rows
  // are resolved through awesome_seen instead, because item_sources keys on
  // (item_id, source) — several lists carrying one item collapse into a single
  // 'awesome_list' row there, while awesome_seen keeps one row per list, so
  // every directory that listed the item gets credited by name.
  const ids = rows.results.map((r) => r.item_id);
  const chipsByItem = new Map<string, Set<string>>();
  const addChip = (itemId: string, name: string): void => {
    const set = chipsByItem.get(itemId);
    if (set) set.add(name);
    else chipsByItem.set(itemId, new Set([name]));
  };

  const placeholders = ids.map(() => "?").join(", ");
  const sourceRows = await env.DB.prepare(
    `SELECT item_id, source FROM item_sources
     WHERE item_id IN (${placeholders})
       AND source NOT IN ('github', 'npm', 'pypi', 'awesome_list')`,
  )
    .bind(...ids)
    .all<{ item_id: string; source: string }>();
  for (const s of sourceRows.results) addChip(s.item_id, s.source);

  // awesome_seen keys on bare "owner/repo"; trending item ids are "gh:...".
  const ghIds = ids.filter((id) => id.startsWith("gh:"));
  if (ghIds.length > 0) {
    const repoUrls = ghIds.map((id) => id.slice("gh:".length));
    const awesomeRows = await env.DB.prepare(
      `SELECT repo_url, list_url FROM awesome_seen
       WHERE repo_url IN (${repoUrls.map(() => "?").join(", ")})`,
    )
      .bind(...repoUrls)
      .all<{ repo_url: string; list_url: string }>();
    for (const a of awesomeRows.results) {
      addChip(`gh:${a.repo_url}`, awesomeListName(a.list_url));
    }
  }

  // Sorted per item so the published JSON is deterministic across re-approvals.
  const sourcesByItem = new Map<string, string[]>();
  for (const [itemId, names] of chipsByItem) {
    sourcesByItem.set(itemId, [...names].sort());
  }

  // Baseline detection mirrors compute.ts exactly: a week with no prior-week
  // snapshots was scored on absolute stars, and the page must say so instead
  // of rendering zero-velocity lines as if nothing moved.
  const priorCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM item_snapshots WHERE week_start = ?`,
  )
    .bind(priorWeek(week))
    .first<{ n: number }>();
  const baseline = (priorCount?.n ?? 0) === 0;

  const payload = buildWeekPayload(
    week,
    now.toISOString(),
    rows.results,
    sourcesByItem,
    baseline,
  );

  // The week payload must exist before the index points at it — a reader that
  // sees the new week in trending:weeks must never 404 on the payload key.
  await env.KV.put(`trending:${week}`, JSON.stringify(payload));

  const existing =
    (await env.KV.get<string[]>("trending:weeks", "json")) ?? [];
  const weeks = [...new Set([week, ...existing.filter((w) => typeof w === "string")])]
    .sort()
    .reverse()
    .slice(0, MAX_WEEKS);
  await env.KV.put("trending:weeks", JSON.stringify(weeks));

  // Durable record of the human decision (re-approval just refreshes it).
  await env.DB.prepare(
    `INSERT INTO approved_weeks (week_start, approved_at) VALUES (?, ?)
     ON CONFLICT(week_start) DO UPDATE SET approved_at = excluded.approved_at`,
  )
    .bind(week, now.getTime())
    .run();

  return { ok: true, itemCount: rows.results.length };
}
