-- Folders for organizing a teamspace's documents.
--
-- One level of nesting is allowed by the schema (parent_id) but enforced in
-- code, not SQL: SQLite cannot express "a parent must itself have no parent",
-- and a recursive tree would need recursive queries on every dashboard render
-- for organizational depth nobody asked for.
--
-- Folders are scoped to a teamspace, never to a user — same rule as documents,
-- so a folder cannot outlive or escape the teamspace it organizes.

CREATE TABLE IF NOT EXISTS folders (
  id           TEXT PRIMARY KEY,   -- 'f_<nanoid16>'
  teamspace_id TEXT NOT NULL,
  parent_id    TEXT,               -- NULL = top level
  name         TEXT NOT NULL,
  created_by   TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  archived_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_folders_ts ON folders(teamspace_id, parent_id);

ALTER TABLE documents ADD COLUMN folder_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
