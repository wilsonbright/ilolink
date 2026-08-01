-- Identity on comments.
--
-- Existing rows keep author_kind='anon' via the column default, so the eight
-- comments already in production render exactly as they do today. Anonymous
-- comments are NEVER retroactively attributed to a user who later signs up with
-- a matching name — author_name was always unverified free text.
--
-- comments.author_email_hash is left in place. It has been dead since migration
-- 0001 (written by nothing, read by nothing), but dropping it would force a
-- table rewrite on a table the content worker writes to on the hot path, for no
-- benefit. Cleanup belongs in a later, quieter migration.

ALTER TABLE comments ADD COLUMN author_user_id TEXT;
ALTER TABLE comments ADD COLUMN author_kind    TEXT NOT NULL DEFAULT 'anon';  -- 'user' | 'anon'
ALTER TABLE comments ADD COLUMN resolved_at    INTEGER;
ALTER TABLE comments ADD COLUMN resolved_by    TEXT;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_user_id);

-- Per-document commenting policy.
--   'anon'   — anyone may comment, signed in or not (the default, and what the
--              marketing corpus promises readers: "no account, no friction")
--   'signed' — only signed-in people, with their name attached
--   'off'    — nobody
--
-- Defaulting to 'anon' preserves the existing reader-feedback loop, which is
-- the entire point of the analytics product.
ALTER TABLE documents ADD COLUMN comments_mode TEXT NOT NULL DEFAULT 'anon';
