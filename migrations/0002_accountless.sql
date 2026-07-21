-- Accountless pivot: no users, no server-side ownership.
-- Ownership becomes a per-doc manage token (SHA-256 stored) held in the browser.
-- Documents are immutable after publish (one version each).

DROP INDEX IF EXISTS idx_documents_owner;
ALTER TABLE documents DROP COLUMN owner_id;
ALTER TABLE documents ADD COLUMN manage_token_hash TEXT;
DROP TABLE IF EXISTS users;
