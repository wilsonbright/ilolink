-- Backfill existing documents onto teamspace ownership. Idempotent — every
-- statement is a no-op on a second run.
--
--   npx wrangler d1 execute ilolink --local  --file scripts/backfill-ownership.sql
--   npx wrangler d1 execute ilolink --remote --file scripts/backfill-ownership.sql
--
-- Run AFTER migrations 0008 and 0009.
--
-- WHAT THIS DOES AND DOES NOT GUESS
--
-- MCP documents carry a workspace_id, so their ownership is recoverable: each
-- workspace becomes a shadow teamspace and its documents move across. The
-- shadow teamspace has NO members until somebody claims it by signing in from
-- the connector or the /w/<token> dashboard — we know the documents belong
-- together, but not to whom.
--
-- Web documents carry only a manage_token_hash, whose plaintext lives in one
-- browser's localStorage and nowhere on the server. There is NO honest way to
-- attribute them here, so this script deliberately leaves teamspace_id NULL on
-- them. They keep working through the legacy branch in
-- lib/teamspace/permissions.ts and are attached to an account only when their
-- publisher presents the token via the claim flow.

-- 1. One shadow teamspace per existing workspace.
--    The unique index on legacy_workspace_id makes re-runs a no-op.
INSERT OR IGNORE INTO teamspaces
  (id, name, created_by, plan, quota_docs, status, is_personal, legacy_workspace_id, created_at)
SELECT
  't_' || lower(hex(randomblob(8))),
  'Workspace ' || substr(w.id, 3, 6),
  NULL,
  w.plan,
  w.quota_docs,
  CASE w.status WHEN 'suspended' THEN 'suspended' ELSE 'active' END,
  0,
  w.id,
  w.created_at
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM teamspaces t WHERE t.legacy_workspace_id = w.id
);

-- 2. Point each workspace row at its teamspace (the connector keeps working
--    and now resolves to a teamspace).
UPDATE workspaces
   SET teamspace_id = (
     SELECT t.id FROM teamspaces t WHERE t.legacy_workspace_id = workspaces.id
   )
 WHERE teamspace_id IS NULL;

-- 3. Move MCP-published documents onto their teamspace.
UPDATE documents
   SET teamspace_id = (
     SELECT t.id FROM teamspaces t WHERE t.legacy_workspace_id = documents.workspace_id
   )
 WHERE workspace_id IS NOT NULL
   AND teamspace_id IS NULL;

-- 4. Deliberately absent: any statement touching web-published documents.
--    See the header. Attributing them would be a guess, and a wrong guess here
--    hands one person's analytics and delete button to another.
