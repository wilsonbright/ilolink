-- Personal access tokens: the replacement for the w_<id>/mcp URL-token path.
--
-- That path made the workspace id itself the bearer secret AND put it in a URL,
-- where it lands in browser history, the assistant's stored connector config,
-- referrer chains, and Cloudflare request logs (mcp-worker has
-- observability: true). It also doubled as the dashboard key, so one leak gave
-- away both publishing and analytics.
--
-- A PAT is presented as `Authorization: Bearer ilo_pat_<nanoid32>` and never
-- appears in a URL. Only its SHA-256 is stored, so a database dump does not
-- yield working credentials.

CREATE TABLE IF NOT EXISTS api_tokens (
  id           TEXT PRIMARY KEY,          -- 'pat_<nanoid16>'
  user_id      TEXT NOT NULL,
  teamspace_id TEXT NOT NULL,
  name         TEXT,                      -- what the user called it, e.g. "ChatGPT"
  token_hash   TEXT NOT NULL,             -- sha256 of the raw token
  scopes       TEXT NOT NULL DEFAULT 'publish',  -- csv: publish, skills:read, skills:write
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER,
  expires_at   INTEGER,                   -- NULL = no expiry
  revoked_at   INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id, revoked_at);
