-- Converge the two ownership models onto teamspace_id.
--
-- Before this, a document was owned by EITHER a manage_token_hash (web publish,
-- raw token in one browser's localStorage) OR a workspace_id (MCP publish) —
-- with no bridge, so an MCP doc could not use /api/stats and a web doc was
-- invisible to the workspace dashboard.
--
-- After this, teamspace_id is the owner. manage_token_hash and workspace_id
-- stay readable through the transition (lib/auth/doc-access.ts still honors the
-- legacy token) and are dropped in a later migration, one full release after
-- the code stops reading them.
--
-- Additive and nullable only.

ALTER TABLE documents ADD COLUMN teamspace_id TEXT;
ALTER TABLE documents ADD COLUMN created_by   TEXT;   -- provenance, NOT ownership
CREATE INDEX IF NOT EXISTS idx_documents_teamspace ON documents(teamspace_id, published_at DESC);

-- Shares AND assignments in one table, discriminated by `kind`. An assignment
-- is a share plus a note, a due date, and a state; two near-identical tables
-- would drift apart.
--
-- email_norm exists so you can share with someone who has no account yet: the
-- row is claimed on their first sign-in by matching the normalized address.
CREATE TABLE IF NOT EXISTS document_shares (
  id          TEXT PRIMARY KEY,             -- 'ds_<nanoid16>'
  document_id TEXT NOT NULL,
  user_id     TEXT,                         -- exactly one of user_id / email_norm
  email_norm  TEXT,
  role        TEXT NOT NULL,                -- 'viewer' | 'commenter' | 'editor'
  kind        TEXT NOT NULL DEFAULT 'share',-- 'share' | 'assignment'
  note        TEXT,
  due_at      INTEGER,
  state       TEXT NOT NULL DEFAULT 'open', -- assignments: 'open' | 'done'
  created_by  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  revoked_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_shares_doc   ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_shares_user  ON document_shares(user_id, state);
CREATE INDEX IF NOT EXISTS idx_shares_email ON document_shares(email_norm);

-- `workspaces` was never an identity: mcp-worker/src/authorize.ts minted a
-- fresh crypto.randomUUID() subject per OAuth grant. It is a CONNECTION
-- CREDENTIAL. Rather than rename the table (which would break the deployed MCP
-- worker mid-rollout), bind each row to the user and teamspace it now belongs
-- to. The table is retired in Phase 9.
ALTER TABLE workspaces ADD COLUMN user_id      TEXT;
ALTER TABLE workspaces ADD COLUMN teamspace_id TEXT;
CREATE INDEX IF NOT EXISTS idx_workspaces_teamspace ON workspaces(teamspace_id);
