-- 0016_notifications.sql — in-app notifications (first consumer: @mentions in
-- comments).
--
-- ADDITIVE ONLY, per the standing rule (see 0015): a brand-new table is the
-- safest shape — no existing reader can break. Apply to the remote DB BEFORE
-- deploying any worker that writes it.
--
-- WHY A GENERIC TABLE AND NOT comment_mentions:
-- The page this feeds is "notifications", not "mentions". kind discriminates;
-- the nullable reference columns cover future kinds (invite accepted, proposal
-- awaiting review) without another migration.
--
-- WHY NO FK CONSTRAINTS:
-- documents/comments rows are deleted on unpublish (see the FK-ordering note in
-- WORKLOG re document_versions). A notification outliving its comment is fine —
-- the reader shows "comment removed" — and must not block the delete.

CREATE TABLE IF NOT EXISTS notifications (
  id             TEXT PRIMARY KEY,             -- nanoid
  user_id        TEXT NOT NULL,                -- recipient (users.id)
  kind           TEXT NOT NULL,                -- 'mention' (more kinds later)
  actor_user_id  TEXT,                         -- who caused it; NULL = system
  teamspace_id   TEXT,
  document_id    TEXT,
  comment_id     TEXT,
  created_at     INTEGER NOT NULL,             -- epoch ms
  read_at        INTEGER                       -- NULL = unread
);

-- The two real queries: "my feed, newest first" and "my unread count".
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id) WHERE read_at IS NULL;
