-- MCP connector (companion spec §3): anonymous workspaces own documents
-- published through the Claude/ChatGPT MCP tools. No accounts — a workspace is a
-- private home resolved from an OAuth subject (Claude) or a URL path token (ChatGPT).

CREATE TABLE IF NOT EXISTS workspaces (
  id            TEXT PRIMARY KEY,                 -- 'w_<nanoid>' (also the ChatGPT URL token)
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER,
  origin        TEXT NOT NULL DEFAULT 'unknown',  -- 'claude_oauth' | 'chatgpt_token' | 'web'
  oauth_subject TEXT,                             -- stable id from the OAuth grant (Claude); null for token path
  claimed_by    TEXT,                             -- email/user id if later claimed; no FK (no users table)
  plan          TEXT NOT NULL DEFAULT 'anon',
  quota_docs    INTEGER NOT NULL DEFAULT 50,
  status        TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_workspaces_oauth ON workspaces(oauth_subject);

-- Ownership link. NULL for existing/web docs; set for MCP-published docs.
ALTER TABLE documents ADD COLUMN workspace_id TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
