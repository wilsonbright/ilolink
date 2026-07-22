-- Soft-unpublish for MCP (companion spec §4.6): unpublish_document sets a
-- timestamp and removes the KV slug record so the link 404s, but keeps the D1
-- row + R2 bodies so it stays reversible. No hard delete over MCP.
ALTER TABLE documents ADD COLUMN unpublished_at INTEGER;
