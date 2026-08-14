-- Connection audit metadata for the "manage access" screen (2026-08-14).
--
-- Records WHERE a connector token was minted from, so the owner (and, in the
-- team audit view, an admin) can spot a token created from an IP or place they
-- do not recognise. Purely descriptive — never an authorization input, so a
-- forged header can only make an audit line misleading, never grant access.
--
-- Additive only, per the standing migration rule (apply to remote D1 BEFORE the
-- code that reads these columns deploys). NULL on every pre-existing token,
-- which the UI renders as "unknown".
--
-- OAuth grants carry the equivalent fields inside their KV grant metadata (set
-- in mcp-worker/src/authorize.ts at approval time), not here — this table is
-- only the PAT half.

ALTER TABLE api_tokens ADD COLUMN created_ip TEXT;
ALTER TABLE api_tokens ADD COLUMN created_ua TEXT;
ALTER TABLE api_tokens ADD COLUMN created_geo TEXT;
