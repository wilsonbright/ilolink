-- 0017_org_analytics.sql — three additive tables for the teamspace's own view
-- of itself: assistant audit trail, org memory, member read receipts.
--
-- ADDITIVE ONLY, per the standing rule (0015/0016): new tables, no existing
-- reader can break. Apply to the remote DB BEFORE deploying any worker that
-- writes them.
--
-- WHY NO FK CONSTRAINTS (same reasoning as 0016): documents and users outlive
-- or predate these rows in either direction, and unpublish deletes document
-- rows — an audit line or memory entry must survive that, not block it.

-- Every MCP tool call an assistant makes against a teamspace. Written
-- best-effort by mcp-worker at dispatch; the connections panel derives
-- "what's connected" from DISTINCT actor/client over a window, which stays
-- truthful even though OAuth grants themselves live opaquely in OAUTH_KV.
CREATE TABLE IF NOT EXISTS mcp_audit (
  id           TEXT PRIMARY KEY,           -- nanoid
  teamspace_id TEXT NOT NULL,
  user_id      TEXT,                       -- actor; NULL for legacy anon workspaces
  client       TEXT,                       -- PAT name or OAuth client name, if known
  tool         TEXT NOT NULL,              -- e.g. 'artifacts_get', 'publish_document'
  action       TEXT NOT NULL,              -- 'read' | 'write'
  target       TEXT,                       -- artifact name / doc slug, if any
  created_at   INTEGER NOT NULL            -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_ts
  ON mcp_audit(teamspace_id, created_at DESC);

-- Org memory: one entry per document pushed into a teamspace, captured at
-- publish time from the document's own content (title + leading text). Plain
-- extraction, deliberately not model-generated — the memory must never say
-- something the document didn't.
CREATE TABLE IF NOT EXISTS org_memory (
  id           TEXT PRIMARY KEY,           -- nanoid
  teamspace_id TEXT NOT NULL,
  document_id  TEXT,
  title        TEXT,
  excerpt      TEXT,                       -- first ~280 chars of body text
  kind         TEXT,                       -- source_type ('md', 'html', ...)
  created_by   TEXT,                       -- users.id of the publisher
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_org_memory_ts
  ON org_memory(teamspace_id, created_at DESC);

-- Member read receipts. Rows are written where identity is actually known:
-- the /private/<slug> mint on the app origin. Public/unlisted views stay
-- anonymous by design ("counted without cookies") — this table is the
-- members-only complement, not a tracker.
CREATE TABLE IF NOT EXISTS member_doc_views (
  document_id     TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  first_viewed_at INTEGER NOT NULL,
  last_viewed_at  INTEGER NOT NULL,
  view_count      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_member_views_doc
  ON member_doc_views(document_id, last_viewed_at DESC);
