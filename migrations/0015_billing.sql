-- 0015_billing.sql — one-time-payment plans for teamspaces.
--
-- ADDITIVE AND NULLABLE ONLY, per the rule every migration since 0007 states:
-- a migration ships one full release AHEAD of the code that reads it, because
-- three workers deploy at different moments. 0014 was the one exception (a
-- rename), and WORKLOG.md records the 72-second window where production was
-- broken. Not repeating that.
--
-- WHY THERE IS NO plan_status / current_period_end:
-- These plans are ONE-TIME payments, not subscriptions. Nothing expires, so a
-- status column would encode a lifecycle that does not exist and would invite
-- code to check it. See lib/billing/plans.ts.
--
-- WHY NO NEW LIMIT COLUMNS:
-- Seats and document caps are derived from `plan` via lib/billing/plans.ts, not
-- stored per row. Storing them would let a row's limits drift from the plan it
-- claims, and would need a backfill on every pricing change. `teamspaces.plan`
-- already exists (0008) with DEFAULT 'free' and is read by nothing today, so
-- every existing row is already on the free plan with no backfill at all.
--
-- NOTE the legacy values already in `plan`: mcp-worker/src/workspace.ts writes
-- 'anon' and 'team' into workspaces.plan. planFor() treats any unrecognised
-- value as free rather than throwing, so those rows degrade safely.

-- Stripe linkage. All nullable: a teamspace that never paid has none of it.
ALTER TABLE teamspaces ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE teamspaces ADD COLUMN stripe_session_id TEXT;

-- How this teamspace got its plan: 'default' (never changed), 'stripe' (paid),
-- 'comp' (granted by us, no charge). Auditable on purpose — a comped team and
-- a paying team must be tellable apart when reconciling against Stripe.
ALTER TABLE teamspaces ADD COLUMN plan_source TEXT NOT NULL DEFAULT 'default';
ALTER TABLE teamspaces ADD COLUMN plan_updated_at INTEGER;

-- One Checkout Session may upgrade exactly one teamspace. This is the database
-- half of webhook idempotency: even if the events table were lost, a replayed
-- session cannot be applied to a second teamspace.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_stripe_session
  ON teamspaces(stripe_session_id);

-- Webhook idempotency. D1, NOT KV: KV is eventually consistent and
-- lib/ratelimit.ts already documents that it accepts double-counting under
-- concurrency. That tradeoff is fine for rate limits and unacceptable for
-- granting a paid plan. INSERT OR IGNORE + meta.changes is the atomic test.
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,              -- Stripe's event id, evt_...
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
