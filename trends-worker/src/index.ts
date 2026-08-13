// ─────────────────────────────────────────────────────────────────────────
// ilolink trends worker (trending spec §4/§8, phase 1).
//
// A SEPARATE Worker with its OWN D1 database (ilolink-trends). The pipeline:
//   Sunday 22:00 cron  -> ingest GitHub searches + awesome-list diffs into D1
//   Monday 06:00 cron  -> score the week that just ended into trending_snapshots
//   POST /admin/approve -> a HUMAN publishes the frozen week to the shared KV
//                          namespace (trending:* keys), which the app reads.
// One-way data flow: this worker writes KV, the app reads KV; neither side
// ever touches the other's database.
//
// The fetch handler is admin-only and fails CLOSED: without an ADMIN_TOKEN
// secret every route 503s. GITHUB_TOKEN is optional — absent means keyless
// GitHub with tighter budgets, never a failure.
// ─────────────────────────────────────────────────────────────────────────

import type { Env } from "./types";
import { computeWeek, isIsoMonday, snapshotWeek } from "./week";
import { githubBudget, ingestGithub, fetchRepo, repoStatements, type Budget } from "./github";
import { ingestAwesome } from "./awesome";
import { computeTrendingWeek } from "./compute";
import { approveWeek } from "./publish";

// Constant-time compare of two ASCII strings (mirrors content-worker). Avoids
// a timing oracle on the admin bearer token.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Every ingest/compute run leaves a source_runs row, success or failure — the
// status endpoint is only trustworthy if failures are recorded too.
async function recordRun(
  env: Env,
  source: string,
  week: string,
  status: "ok" | "failed",
  itemCount: number,
  error: string | null,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO source_runs (source, week_start, status, item_count, error, ran_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(source, week, status, itemCount, error, Date.now())
    .run();
}

// Sunday ingest: GitHub first (search hits are free snapshots), then the
// awesome lists drawing per-repo fetches from the SAME budget pool. Each
// source is wrapped separately so one failing never blocks the other.
async function runIngest(env: Env, now: Date): Promise<Record<string, unknown>> {
  const week = snapshotWeek(now); // the week currently in progress
  // The budget carries a hard wall-clock deadline (see github.ts) so the whole
  // ingest — searches, top-ups, awesome-list star fetches — finishes inside
  // the platform's 15-minute cap instead of being killed mid-run.
  const budget = githubBudget(Boolean(env.GITHUB_TOKEN), now.getTime());
  const summary: Record<string, unknown> = { week };

  try {
    const gh = await ingestGithub(env, week, now, budget);
    await recordRun(env, "github", week, "ok", gh.itemCount, gh.errors.join("; ") || null);
    summary.github = gh;
  } catch (e) {
    await recordRun(env, "github", week, "failed", 0, String(e));
    summary.github = { error: String(e) };
  }

  try {
    const aw = await ingestAwesome(env, week, now, budget);
    await recordRun(env, "awesome_list", week, "ok", aw.itemCount, aw.errors.join("; ") || null);
    summary.awesome = aw;
  } catch (e) {
    await recordRun(env, "awesome_list", week, "failed", 0, String(e));
    summary.awesome = { error: String(e) };
  }

  return summary;
}

// Monday compute: score the week that just ended (NOT isoMonday(now) — see
// week.ts for the boundary reasoning).
async function runCompute(
  env: Env,
  week: string,
  force: boolean,
): Promise<Record<string, unknown>> {
  try {
    const result = await computeTrendingWeek(env, week, force);
    await recordRun(
      env,
      "compute",
      week,
      result.ok ? "ok" : "failed",
      result.itemCount,
      result.error ?? null,
    );
    return { week, ...result };
  } catch (e) {
    await recordRun(env, "compute", week, "failed", 0, String(e));
    return { week, ok: false, error: String(e) };
  }
}

// Manual watchlist add (spec §2.1): upsert the item now and, budget allowing,
// snapshot it immediately so it can rank as soon as next week.
async function addToWatchlist(
  env: Env,
  ownerRepo: string,
  now: Date,
): Promise<Record<string, unknown>> {
  const week = snapshotWeek(now);
  // A one-off admin call deserves one repo fetch even keyless (60/hr core);
  // 30s of deadline is plenty for a single request.
  const budget: Budget = {
    searchPagesPerQuery: 0,
    repoFetches: 1,
    delayMs: 0,
    deadlineMs: now.getTime() + 30_000,
  };
  const repo = await fetchRepo(env, budget, ownerRepo);
  if (repo) {
    await env.DB.batch(repoStatements(env.DB, repo, week, now.getTime()));
    return { ok: true, id: `gh:${repo.full_name.toLowerCase()}`, stars: repo.stargazers_count };
  }
  // Fetch failed (bad name? rate limit?) — still record the intent; the next
  // ingest's top-up pass will try again.
  const id = `gh:${ownerRepo.toLowerCase()}`;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO items (id, canonical_repo, name, first_seen, status, created_at)
       VALUES (?, ?, ?, ?, 'active', ?) ON CONFLICT(id) DO NOTHING`,
    ).bind(id, `https://github.com/${ownerRepo.toLowerCase()}`, ownerRepo, week, now.getTime()),
    env.DB.prepare(
      `INSERT INTO item_sources (item_id, source, source_ref, first_listed)
       VALUES (?, 'github', 'manual', ?) ON CONFLICT(item_id, source) DO NOTHING`,
    ).bind(id, week),
  ]);
  return { ok: true, id, note: "repo fetch failed; queued for next ingest" };
}

async function adminStatus(env: Env): Promise<Record<string, unknown>> {
  const runs = await env.DB.prepare(
    `SELECT source, week_start, status, item_count, error, ran_at
     FROM source_runs ORDER BY ran_at DESC LIMIT 10`,
  ).all();
  const items = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM items`,
  ).first<{ n: number }>();
  const snapshots = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM item_snapshots`,
  ).first<{ n: number }>();
  const approved = await env.DB.prepare(
    `SELECT week_start FROM approved_weeks ORDER BY week_start DESC`,
  ).all<{ week_start: string }>();
  return {
    runs: runs.results,
    itemCount: items?.n ?? 0,
    snapshotCount: snapshots?.n ?? 0,
    approvedWeeks: approved.results.map((r) => r.week_start),
  };
}

export default {
  // Cron dispatch is on the cron expression itself so adding a trigger later
  // can't silently reroute an existing one.
  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const now = new Date();
    if (controller.cron === "0 22 * * sun") {
      await runIngest(env, now);
    } else if (controller.cron === "0 6 * * mon") {
      await runCompute(env, computeWeek(now), false);
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // ─── admin gate ──────────────────────────────────────────────────────
    // Fail CLOSED: no ADMIN_TOKEN secret => no admin surface at all. A 503
    // (not 401) so a misconfigured deploy reads as "not set up", never as
    // "guess the password".
    const adminToken = env.ADMIN_TOKEN ?? "";
    if (!adminToken) return jsonResponse({ error: "admin disabled (no ADMIN_TOKEN)" }, 503);

    const auth = request.headers.get("authorization") ?? "";
    const presented = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (!constantTimeEqual(presented, adminToken)) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    try {
      const now = new Date();

      // The ingest sleeps for minutes between GitHub requests — far past the
      // ~100s the proxy gives an inline response before the client is timed
      // out and the invocation cancelled with it. Answer 202 immediately and
      // run in waitUntil; the outcome lands in source_runs (GET /admin/status).
      if (pathname === "/admin/ingest" && request.method === "POST") {
        ctx.waitUntil(runIngest(env, now));
        return jsonResponse(
          { ok: true, started: true, week: snapshotWeek(now), see: "/admin/status" },
          202,
        );
      }

      if (pathname === "/admin/compute" && request.method === "POST") {
        const week = url.searchParams.get("week") ?? computeWeek(now);
        if (!isIsoMonday(week)) {
          return jsonResponse({ error: `week must be an ISO Monday, got "${week}"` }, 400);
        }
        const force = url.searchParams.get("force") === "1";
        return jsonResponse(await runCompute(env, week, force));
      }

      if (pathname === "/admin/approve" && request.method === "POST") {
        // Default to the most recent COMPUTED week, not computeWeek(now):
        // the primary phase-1 flow is a human approving sometime after
        // Monday, and from Tuesday on computeWeek(now) is the in-progress
        // week with no snapshot rows — a guaranteed 409 without ?week=.
        let week = url.searchParams.get("week");
        if (week === null) {
          const latest = await env.DB.prepare(
            `SELECT MAX(week_start) AS w FROM trending_snapshots`,
          ).first<{ w: string | null }>();
          week = latest?.w ?? computeWeek(now);
        }
        if (!isIsoMonday(week)) {
          return jsonResponse({ error: `week must be an ISO Monday, got "${week}"` }, 400);
        }
        const result = await approveWeek(env, week, now);
        return jsonResponse({ week, ...result }, result.ok ? 200 : 409);
      }

      if (pathname === "/admin/watchlist" && request.method === "POST") {
        let body: { repo?: unknown };
        try {
          body = (await request.json()) as { repo?: unknown };
        } catch {
          return jsonResponse({ error: "invalid JSON body" }, 400);
        }
        const repo = typeof body.repo === "string" ? body.repo.trim() : "";
        // Real GitHub logins/repos are never all dots, and "." / ".." would
        // collapse under URL normalization into unintended api.github.com
        // paths ("owner/.." fetches the API root).
        if (
          !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
          repo.split("/").some((seg) => /^\.+$/.test(seg))
        ) {
          return jsonResponse({ error: 'expected {"repo": "owner/repo"}' }, 400);
        }
        return jsonResponse(await addToWatchlist(env, repo, now));
      }

      if (pathname === "/admin/status" && request.method === "GET") {
        return jsonResponse(await adminStatus(env));
      }

      return jsonResponse({ error: "not found" }, 404);
    } catch (e) {
      return jsonResponse({ error: String(e) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
