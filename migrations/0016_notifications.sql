-- 0016_notifications.sql — in-app notifications (first consumer: @mentions in
-- comments).
--
-- ADDITIVE ONLY, per the standing rule (see 0015): a brand-new table is the
-- safest shape — no existing reader can break. Apply to the remote DB BEFORE
-- deploying any worker that writes it.
--
-- WHY A GENERIC TABLE AND NOT comment_mentions:
-- The page this feeds is "notifications", not "mentions". kind discriminates
-- and the table is meant to grow more kinds.
--
-- AMENDED BY 0018: this header used to claim the nullable reference columns
-- cover future kinds "without another migration". That is wrong, and 0018 added
-- artifact_version_id rather than follow it. The columns are per-ENTITY, not a
-- generic slot: lib/notifications/store.ts joins document_id to `documents`, so
-- parking some other entity's id there resolves to a null document while still
-- reading as a document reference to everyone who comes after. A new kind that
-- points at a new entity gets its own nullable column.
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
