// GitHub ingest (spec §4 ingest-github, phase 1) — keyless-first. Watchlist
// growth and the weekly snapshot happen in ONE pass: the repo-search payload
// already carries stars/forks/issues/description/topics, so every search hit
// is simultaneously discovered (items/item_sources) and snapshotted
// (item_snapshots) with zero extra requests. Only watchlist repos the searches
// missed cost a per-repo REST fetch, under a hard budget.
//
// GITHUB_TOKEN is optional and its absence is a supported mode, never an
// error: keyless GitHub allows 10 search req/min and 60 core req/hr, so the
// keyless budget caps pages at 3/query, spaces requests ~6.5s apart (the
// scheduled handler has minutes of wall clock), and tops up at most 30 repos.
// With a token the caps rise. Anything skipped for budget is recorded in the
// source_runs error column — visible, not silent.

import type { Env } from "./types";
import { classifyKind } from "./classify";

const GITHUB_API = "https://api.github.com";
// GitHub rejects requests without a User-Agent; identify ourselves honestly.
const USER_AGENT = "ilolink-trends-worker (+https://ilolink.com)";

// One mutable budget object is threaded through the whole Sunday ingest so
// github.ts and awesome.ts draw per-repo fetches from the SAME pool.
export interface Budget {
  searchPagesPerQuery: number;
  repoFetches: number; // remaining per-repo REST fetches, shared pool
  delayMs: number; // spacing between GitHub requests
  deadlineMs: number; // absolute epoch ms — no GitHub request starts after this
}

// Cron handlers get 15 minutes of wall clock; the request spacing above means
// the ingest's duration is almost entirely sleep, so the budget carries a hard
// deadline and every fetch site checks it. 13 minutes leaves headroom for the
// awesome-list README fetches and the D1 writes that follow the last sleep —
// whatever the deadline cuts off is recorded as skipped, never lost silently.
export const INGEST_DEADLINE_MS = 13 * 60_000;

export function githubBudget(hasToken: boolean, startMs: number): Budget {
  const deadlineMs = startMs + INGEST_DEADLINE_MS;
  return hasToken
    ? // Authed search: 30/min. 9 queries × 10 pages ≈ 3.2 min of spacing plus
      // 250 fetches × 2.1s ≈ 8.75 min fits the deadline with margin — a larger
      // fetch cap would be structurally unspendable (500 × 2.1s alone is
      // 17.5 min, past the platform limit before searches even run).
      { searchPagesPerQuery: 10, repoFetches: 250, delayMs: 2_100, deadlineMs }
    : // Keyless search: 10/min. ~27 search sleeps + 30 fetches ≈ 6 min total.
      { searchPagesPerQuery: 3, repoFetches: 30, delayMs: 6_500, deadlineMs };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Every GitHub request goes through here: UA always, auth only when the
// optional token exists (fail open to keyless — never fail hard).
export function ghFetch(env: Env, url: string): Promise<Response> {
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return fetch(url, { headers });
}

// The subset of the repo payload we read (search results and /repos/* agree).
export interface GhRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  pushed_at: string | null;
  topics?: string[];
}

// Watchlist-growth + breakout queries (spec §2.1). Text queries carry the
// stars floor so keyless page caps still see everything that could rank; the
// breakout sweep catches repos too new to have accumulated topic-search rank.
export function buildSearchQueries(now: Date): string[] {
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return [
    "topic:mcp-server",
    "topic:claude-skills",
    "topic:ai-agents",
    "topic:claude-code",
    '"mcp server" stars:>25',
    '"claude skill" stars:>25',
    // Breakout sweep: created recently AND already past 50 stars.
    `topic:mcp-server created:>${fourWeeksAgo} stars:>50`,
    `topic:ai-agents created:>${fourWeeksAgo} stars:>50`,
    `claude created:>${fourWeeksAgo} stars:>50`,
  ];
}

// 'gh:owner/repo' (lowercased) — the canonical item identity for GitHub repos.
export function repoId(fullName: string): string {
  return `gh:${fullName.toLowerCase()}`;
}

export function canonicalRepoUrl(fullName: string): string {
  return `https://github.com/${fullName.toLowerCase()}`;
}

// The three statements that record one observed repo: upsert the item (search
// data refreshes name/description/kind, but never first_seen/created_at),
// remember the source, and upsert this week's snapshot.
export function repoStatements(
  db: D1Database,
  repo: GhRepo,
  week: string,
  nowMs: number,
): D1PreparedStatement[] {
  const id = repoId(repo.full_name);
  const kind = classifyKind({
    topics: repo.topics ?? [],
    name: repo.full_name.split("/")[1] ?? repo.full_name,
    description: repo.description,
  });
  return [
    db
      .prepare(
        `INSERT INTO items (id, canonical_repo, name, kind, description, first_seen, status, created_at, repo_created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           kind = excluded.kind,
           description = excluded.description,
           repo_created_at = excluded.repo_created_at`,
      )
      .bind(
        id,
        canonicalRepoUrl(repo.full_name),
        repo.full_name,
        kind,
        repo.description,
        week,
        nowMs,
        Date.parse(repo.created_at) || null,
      ),
    db
      .prepare(
        `INSERT INTO item_sources (item_id, source, source_ref, first_listed)
         VALUES (?, 'github', ?, ?)
         ON CONFLICT(item_id, source) DO NOTHING`,
      )
      .bind(id, repo.html_url, week),
    db
      .prepare(
        `INSERT INTO item_snapshots (item_id, week_start, stars, forks, open_issues, last_commit_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, week_start) DO UPDATE SET
           stars = excluded.stars,
           forks = excluded.forks,
           open_issues = excluded.open_issues,
           last_commit_at = excluded.last_commit_at`,
      )
      .bind(
        id,
        week,
        repo.stargazers_count,
        repo.forks_count,
        repo.open_issues_count,
        repo.pushed_at ? Date.parse(repo.pushed_at) || null : null,
      ),
  ];
}

// Fetch one repo by 'owner/repo' against the shared budget. Returns null when
// the budget or deadline is spent or the fetch fails (callers count and report
// skips).
export async function fetchRepo(
  env: Env,
  budget: Budget,
  ownerRepo: string,
): Promise<GhRepo | null> {
  if (budget.repoFetches <= 0 || Date.now() >= budget.deadlineMs) return null;
  budget.repoFetches--;
  await sleep(budget.delayMs);
  const res = await ghFetch(env, `${GITHUB_API}/repos/${ownerRepo}`);
  if (!res.ok) return null;
  return (await res.json()) as GhRepo;
}

export interface IngestResult {
  itemCount: number;
  errors: string[];
}

// Batch-write repo statements in chunks — D1 batches are atomic and bounded,
// and ~40 repos (120 statements) per batch stays comfortably inside limits.
async function writeRepos(
  db: D1Database,
  repos: GhRepo[],
  week: string,
  nowMs: number,
): Promise<void> {
  const CHUNK = 40;
  for (let i = 0; i < repos.length; i += CHUNK) {
    const statements = repos
      .slice(i, i + CHUNK)
      .flatMap((r) => repoStatements(db, r, week, nowMs));
    await db.batch(statements);
  }
}

export async function ingestGithub(
  env: Env,
  week: string,
  now: Date,
  budget: Budget,
): Promise<IngestResult> {
  const errors: string[] = [];
  const seen = new Map<string, GhRepo>(); // dedupe across overlapping queries

  // Phase A: searches. Every hit is discovery + snapshot in one payload.
  let deadlineHit = false;
  outer: for (const query of buildSearchQueries(now)) {
    for (let page = 1; page <= budget.searchPagesPerQuery; page++) {
      if (Date.now() >= budget.deadlineMs) {
        deadlineHit = true;
        break outer;
      }
      await sleep(budget.delayMs);
      const url =
        `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}` +
        `&sort=stars&order=desc&per_page=100&page=${page}`;
      let res: Response;
      try {
        res = await ghFetch(env, url);
      } catch (e) {
        errors.push(`search "${query}" p${page}: ${String(e)}`);
        break;
      }
      if (!res.ok) {
        // 403/429 = rate limited; anything else is equally terminal for this
        // query. Record and move on — a partial ingest beats a dead one.
        errors.push(`search "${query}" p${page}: HTTP ${res.status}`);
        break;
      }
      const body = (await res.json()) as { items?: GhRepo[] };
      const items = body.items ?? [];
      for (const repo of items) seen.set(repoId(repo.full_name), repo);
      if (items.length < 100) break; // last page for this query
    }
  }
  if (deadlineHit) {
    errors.push("deadline reached during searches; remaining queries skipped");
  }

  const nowMs = now.getTime();
  await writeRepos(env.DB, [...seen.values()], week, nowMs);

  // Phase B: top up watchlist repos the searches missed, most-starred first
  // (the ones most likely to rank), under the shared per-repo budget.
  //
  // Retirement guard: a deleted/renamed repo fails its fetch forever while its
  // historical star count keeps it at the head of this queue, burning a budget
  // slot every week and starving live repos. An item that HAS snapshotted
  // before but not within STALE_WEEKS stops being retried; a never-snapshotted
  // item (fresh watchlist add whose star fetch was skipped) still gets its
  // first attempts.
  const STALE_WEEKS = 8;
  const staleCutoff = new Date(
    Date.parse(`${week}T00:00:00Z`) - STALE_WEEKS * 7 * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const missed = await env.DB.prepare(
    `SELECT i.id FROM items i
     WHERE i.status = 'active' AND i.id LIKE 'gh:%'
       AND NOT EXISTS (SELECT 1 FROM item_snapshots s
                       WHERE s.item_id = i.id AND s.week_start = ?)
       AND (NOT EXISTS (SELECT 1 FROM item_snapshots s3
                        WHERE s3.item_id = i.id)
            OR EXISTS (SELECT 1 FROM item_snapshots s4
                       WHERE s4.item_id = i.id AND s4.week_start >= ?))
     ORDER BY (SELECT MAX(s2.stars) FROM item_snapshots s2
               WHERE s2.item_id = i.id) DESC`,
  )
    .bind(week, staleCutoff)
    .all<{ id: string }>();

  let toppedUp = 0;
  let skipped = 0;
  for (const row of missed.results) {
    const ownerRepo = row.id.slice("gh:".length);
    if (budget.repoFetches <= 0 || Date.now() >= budget.deadlineMs) {
      skipped++;
      continue;
    }
    const repo = await fetchRepo(env, budget, ownerRepo);
    if (!repo) {
      skipped++; // budget race or fetch failure — either way, not snapshotted
      continue;
    }
    await env.DB.batch(repoStatements(env.DB, repo, week, nowMs));
    toppedUp++;
  }
  if (skipped > 0) {
    errors.push(`top-up skipped ${skipped} repos (budget/deadline)`);
  }

  return { itemCount: seen.size + toppedUp, errors };
}
