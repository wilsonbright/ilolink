// Awesome-list ingest (spec §4 ingest-awesome, phase 1). Landing on a curated
// list is the strongest free editorial signal we get, so each tracked list's
// raw README is fetched weekly and every github.com/owner/repo link extracted.
// The diff is against the awesome_seen table in this worker's own D1 (not a
// stored README copy — no R2 here), which makes "new on the list" robust to
// README reordering/reformatting: a repo is new exactly once, ever, per list.
//
// New links become watchlist items + an 'awesome_list' source row (that source
// row is what scoring counts as corroboration). Only NEW links get a per-repo
// star fetch, drawn from the same budget pool as the GitHub ingest; on the
// very first run a huge list will blow past the budget, so the overflow lands
// as items without snapshots (rankable next week via search/top-up) and the
// skip count is recorded in source_runs.error.

import type { Env } from "./types";
import { classifyKind } from "./classify";
import {
  type Budget,
  type IngestResult,
  fetchRepo,
  repoId,
  repoStatements,
  canonicalRepoUrl,
} from "./github";

// Raw README URLs of the tracked lists (spec S6). URL shapes verified live
// 2026-08-14; the ComposioHQ list from the spec 404s and is omitted.
export const AWESOME_LISTS = [
  "https://raw.githubusercontent.com/anthropics/skills/main/README.md",
  "https://raw.githubusercontent.com/travisvn/awesome-claude-skills/main/README.md",
  "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
];

// Path segments that look like github.com/<owner>/... but aren't repos.
const NON_REPO_OWNERS = new Set([
  "topics",
  "sponsors",
  "orgs",
  "apps",
  "features",
  "marketplace",
  "collections",
  "trending",
  "about",
  "settings",
  "site",
  "contact",
  "blog",
  "readme",
  "search",
  "login",
  "notifications",
]);

// Pure: every distinct 'owner/repo' (lowercased) linked from a markdown blob.
// The regex char class stops at markdown/link punctuation, deeper path parts
// (/blob/, /tree/) are dropped by capturing only two segments, and a trailing
// ".git" or "." is stripped.
export function extractRepoLinks(markdown: string): string[] {
  const out = new Set<string>();
  const re = /https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/g;
  for (const match of markdown.matchAll(re)) {
    const owner = match[1].toLowerCase();
    if (NON_REPO_OWNERS.has(owner)) continue;
    let repo = match[2].toLowerCase();
    repo = repo.replace(/\.git$/, "").replace(/\.+$/, "");
    if (!repo) continue;
    out.add(`${owner}/${repo}`);
  }
  return [...out];
}

export async function ingestAwesome(
  env: Env,
  week: string,
  now: Date,
  budget: Budget,
): Promise<IngestResult> {
  const errors: string[] = [];
  const nowMs = now.getTime();
  let newCount = 0;
  let skippedStars = 0;

  for (const listUrl of AWESOME_LISTS) {
    let markdown: string;
    try {
      const res = await fetch(listUrl, {
        headers: { "user-agent": "ilolink-trends-worker (+https://ilolink.com)" },
      });
      if (!res.ok) {
        errors.push(`${listUrl}: HTTP ${res.status}`);
        continue;
      }
      markdown = await res.text();
    } catch (e) {
      errors.push(`${listUrl}: ${String(e)}`);
      continue;
    }

    const links = extractRepoLinks(markdown);

    // Diff against everything ever seen on this list.
    const seenRows = await env.DB.prepare(
      `SELECT repo_url FROM awesome_seen WHERE list_url = ?`,
    )
      .bind(listUrl)
      .all<{ repo_url: string }>();
    const seen = new Set(seenRows.results.map((r) => r.repo_url));
    const fresh = links.filter((l) => !seen.has(l));
    if (fresh.length === 0) continue;

    // Record the new links + minimal items/source rows in one batch per chunk.
    // Item metadata here is name-only (no ON CONFLICT UPDATE): the GitHub
    // ingest is authoritative for descriptions/topics, so an existing item is
    // left untouched and only gains the 'awesome_list' corroboration row.
    const CHUNK = 40;
    for (let i = 0; i < fresh.length; i += CHUNK) {
      const statements = fresh.slice(i, i + CHUNK).flatMap((ownerRepo) => {
        const id = repoId(ownerRepo);
        return [
          env.DB.prepare(
            `INSERT INTO awesome_seen (list_url, repo_url, first_seen)
             VALUES (?, ?, ?)
             ON CONFLICT(list_url, repo_url) DO NOTHING`,
          ).bind(listUrl, ownerRepo, week),
          env.DB.prepare(
            `INSERT INTO items (id, canonical_repo, name, kind, first_seen, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'active', ?)
             ON CONFLICT(id) DO NOTHING`,
          ).bind(
            id,
            canonicalRepoUrl(ownerRepo),
            ownerRepo,
            classifyKind({
              topics: [],
              name: ownerRepo.split("/")[1] ?? ownerRepo,
              description: null,
            }),
            week,
            nowMs,
          ),
          env.DB.prepare(
            `INSERT INTO item_sources (item_id, source, source_ref, first_listed)
             VALUES (?, 'awesome_list', ?, ?)
             ON CONFLICT(item_id, source) DO NOTHING`,
          ).bind(id, listUrl, week),
        ];
      });
      await env.DB.batch(statements);
    }
    newCount += fresh.length;

    // Star top-up for NEW links only, from the shared budget pool. A repo the
    // GitHub ingest already snapshotted this week needs nothing extra here,
    // but re-running repoStatements on it is a harmless idempotent upsert.
    for (const ownerRepo of fresh) {
      if (budget.repoFetches <= 0 || Date.now() >= budget.deadlineMs) {
        skippedStars++;
        continue;
      }
      const repo = await fetchRepo(env, budget, ownerRepo);
      if (!repo) {
        skippedStars++;
        continue;
      }
      await env.DB.batch(repoStatements(env.DB, repo, week, nowMs));
    }
  }

  if (skippedStars > 0) {
    errors.push(`star fetch skipped ${skippedStars} new repos (budget/deadline)`);
  }
  return { itemCount: newCount, errors };
}
