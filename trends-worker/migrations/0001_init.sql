-- ─────────────────────────────────────────────────────────────────────────
-- Trends pipeline schema (trending spec §3, phase-1 subset).
--
-- This migration chain belongs to the SEPARATE `ilolink-trends` D1 database
-- (database_id 82b6936f-..., bound as DB in trends-worker/wrangler.jsonc) —
-- NOT the product `ilolink` database, whose chain lives in the repo-root
-- migrations/. The split is deliberate: the trends pipeline bulk-writes
-- thousands of snapshot rows from untrusted external sources every week, and
-- keeping that churn (and any ingest bug) in its own database means it can
-- never contend with or corrupt product data. The only integration surface is
-- the trending:* KV keys written by the hand-approval step.
-- ─────────────────────────────────────────────────────────────────────────

-- One row per tracked thing (the watchlist). id 'gh:owner/repo' (lowercased).
-- domains / one_liner / getting_started / maturity are phase-2 enrichment
-- columns, created now so the spec §3 shape is stable across phases.
CREATE TABLE items (
  id TEXT PRIMARY KEY,               -- 'gh:owner/repo' | later 'mcpreg:com.x/server'
  canonical_repo TEXT,               -- dedup key: normalized GitHub URL
  name TEXT NOT NULL,
  kind TEXT,                         -- mechanical classification (src/classify.ts)
  domains TEXT,                      -- JSON array (phase-2 enrichment)
  one_liner TEXT,                    -- phase-2 enrichment (Claude API)
  getting_started TEXT,              -- phase-2 enrichment
  maturity TEXT,                     -- phase-2 enrichment
  license TEXT,
  description TEXT,                  -- the repo's OWN short description; only ever
                                     -- displayed with attribution (card links to repo)
  first_seen TEXT,                   -- ISO-Monday week the watchlist picked it up
  status TEXT DEFAULT 'active',      -- 'active' | 'archived' | 'hidden' | 'review'
  created_at INTEGER,                -- row creation, ms epoch
  repo_created_at INTEGER            -- repo creation on GitHub, ms epoch — backs the
                                     -- freshness multiplier and new-repo prior=0 rule
);
CREATE UNIQUE INDEX idx_items_repo ON items(canonical_repo) WHERE canonical_repo IS NOT NULL;

-- Which sources list an item. Sources beyond 'github' (S2–S6) count as
-- corroboration in scoring; phase 1 only ever writes 'github' | 'awesome_list'.
CREATE TABLE item_sources (
  item_id TEXT NOT NULL,
  source TEXT NOT NULL,              -- 'github' | 'mcp_registry' | 'glama' | 'smithery' | 'pulsemcp' | 'awesome_list' | 'npm' | 'pypi'
  source_ref TEXT,                   -- id/URL within that source
  first_listed TEXT,
  PRIMARY KEY (item_id, source)
);

-- Weekly metric snapshot per item; delta vs prior week = velocity.
CREATE TABLE item_snapshots (
  item_id TEXT NOT NULL,
  week_start TEXT NOT NULL,          -- ISO Monday
  stars INTEGER, forks INTEGER, open_issues INTEGER,
  downloads_week INTEGER,            -- phase-3 (npm/pypi), unused now
  last_commit_at INTEGER,
  mentions_hn INTEGER DEFAULT 0,     -- phase-3 buzz, unused now
  mentions_reddit INTEGER DEFAULT 0,
  PRIMARY KEY (item_id, week_start)
);
-- compute/publish read whole weeks at a time.
CREATE INDEX idx_snapshots_week ON item_snapshots(week_start);

-- The scored result per week — immutable once computed (compute refuses to
-- overwrite without an explicit force), because published archives point here.
CREATE TABLE trending_snapshots (
  week_start TEXT NOT NULL,
  item_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  score REAL NOT NULL,
  rank_in_kind INTEGER NOT NULL,
  star_vel INTEGER, star_growth REAL, corroboration_count INTEGER,
  why_trending TEXT,                 -- phase-2 enrichment, null in phase 1
  PRIMARY KEY (week_start, item_id)
);

-- Manual pin/hide/feature (admin). Phase 1 creates the table for schema
-- stability; nothing writes it yet.
CREATE TABLE editorial_overrides (
  item_id TEXT PRIMARY KEY,
  action TEXT NOT NULL,              -- 'pin' | 'hide' | 'feature'
  note TEXT, set_by TEXT, set_at INTEGER
);

-- One row per ingest/compute run: the admin status page reads the last few to
-- show green/red per source. `error` also carries partial-failure notes (e.g.
-- "top-up skipped N repos (budget)") on otherwise-ok runs.
CREATE TABLE source_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,              -- 'github' | 'awesome_list' | 'compute'
  week_start TEXT NOT NULL,
  status TEXT NOT NULL,              -- 'ok' | 'failed'
  item_count INTEGER DEFAULT 0,
  error TEXT,
  ran_at INTEGER NOT NULL
);

-- Every github.com/owner/repo link ever extracted from each tracked awesome
-- list. The weekly diff is against this table (D1-based — this worker has no
-- R2), so "new on the list" survives README reorderings and needs no stored
-- README copy.
CREATE TABLE awesome_seen (
  list_url TEXT NOT NULL,
  repo_url TEXT NOT NULL,            -- 'owner/repo', lowercased
  first_seen TEXT NOT NULL,          -- ISO-Monday week the link first appeared
  PRIMARY KEY (list_url, repo_url)
);

-- The hand-approval gate: a week exists in KV if and only if an admin approved
-- it, and this table is the durable record of that decision.
CREATE TABLE approved_weeks (
  week_start TEXT PRIMARY KEY,
  approved_at INTEGER NOT NULL       -- ms epoch
);
