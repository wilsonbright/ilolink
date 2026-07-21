-- ilolink initial schema (D1 / SQLite)
-- Bodies live in R2; metadata + interactions live here. IDs are nanoid unless noted.
-- Epoch milliseconds for all *_at columns.

-- creators
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  created_at    INTEGER NOT NULL
);

-- a published document (one shareable URL)
CREATE TABLE IF NOT EXISTS documents (
  id                 TEXT PRIMARY KEY,
  slug               TEXT UNIQUE NOT NULL,      -- 6-char default, custom allowed
  owner_id           TEXT NOT NULL REFERENCES users(id),
  title              TEXT,                      -- from first H1 / <title> or user-set
  source_type        TEXT NOT NULL,             -- 'md' | 'html'
  visibility         TEXT NOT NULL,             -- 'public' | 'unlisted' | 'password' | 'expiring'
  password_hash      TEXT,                      -- null unless visibility='password'
  current_version_id TEXT,                      -- REFERENCES document_versions(id)
  expires_at         INTEGER,                   -- null unless expiring
  published_at       INTEGER,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);

-- version history (LLM content iterates; keep the trail)
CREATE TABLE IF NOT EXISTS document_versions (
  id              TEXT PRIMARY KEY,
  document_id     TEXT NOT NULL REFERENCES documents(id),
  raw_r2_key      TEXT NOT NULL,                -- original .md/.html
  rendered_r2_key TEXT NOT NULL,                -- sanitized, render-ready HTML
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_doc ON document_versions(document_id);

-- threaded comments
CREATE TABLE IF NOT EXISTS comments (
  id                TEXT PRIMARY KEY,
  document_id       TEXT NOT NULL REFERENCES documents(id),
  parent_id         TEXT REFERENCES comments(id),  -- null = top-level
  author_name       TEXT,
  author_email_hash TEXT,                          -- hashed, optional notify; never shown
  anchor            TEXT,                          -- JSON: selection range / null (Phase 4)
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'visible', -- 'visible' | 'hidden' | 'flagged'
  created_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_doc ON comments(document_id);

-- lightweight feedback (reactions + notes)
CREATE TABLE IF NOT EXISTS feedback (
  id           TEXT PRIMARY KEY,
  document_id  TEXT NOT NULL REFERENCES documents(id),
  kind         TEXT NOT NULL,                    -- 'reaction' | 'note'
  value        TEXT NOT NULL,                    -- emoji key, or note text
  visitor_hash TEXT NOT NULL,                    -- daily-rotating hash
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_doc ON feedback(document_id);

-- Note: magic-link / session tokens live in KV, not here.
-- Note: analytics events go to Analytics Engine, not here.
