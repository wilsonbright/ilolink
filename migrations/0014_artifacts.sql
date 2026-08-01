-- The artifact registry: everything an AI-native team keeps for its agents.
--
-- WHAT CHANGED AND WHY THE RENAME.
--
-- 0012 created `skills` — a versioned, teamspace-scoped, name-keyed store with
-- an audit trail. That shape turned out to be right for far more than skills:
-- agent definitions, specs, design docs, plans, workflows and session
-- handoffs all want exactly the same thing (a memorable name, a body, a
-- version history, and a record of who changed it). Rather than build a second
-- store that would drift, the table is renamed and given a `kind`.
--
-- This is safe to do as a rename rather than a new table because `skills` and
-- `skill_versions` have ZERO rows in production, and neither carries a foreign
-- key constraint that a rename would break. That window does not come back.
--
-- The MCP `skills_*` tools keep their names — those are a public contract that
-- connected assistants and the plugin bundle already depend on. They now
-- operate on kind='skill'.

ALTER TABLE skills RENAME TO artifacts;
ALTER TABLE skill_versions RENAME TO artifact_versions;

-- THE KIND. Defaults to 'skill' so every existing row (and every write that
-- predates the new code) keeps its current meaning without a backfill.
ALTER TABLE artifacts ADD COLUMN kind TEXT NOT NULL DEFAULT 'skill';

-- Artifacts live in the same folders documents do — one folder tree per
-- teamspace, not two competing ones.
ALTER TABLE artifacts ADD COLUMN folder_id TEXT;

-- The unique key was (teamspace_id, name), which meant an agent called
-- "deploy" and a skill called "deploy" could not coexist. Uniqueness is
-- per-kind: `deploy` the runbook and `deploy` the workflow are different
-- things a person would reasonably name the same.
DROP INDEX IF EXISTS idx_skills_ts_name;
DROP INDEX IF EXISTS idx_skills_updated;
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_ts_kind_name
  ON artifacts(teamspace_id, kind, name);
CREATE INDEX IF NOT EXISTS idx_artifacts_listing
  ON artifacts(teamspace_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_artifacts_folder
  ON artifacts(teamspace_id, folder_id);
-- Drives the sync changefeed: "what changed in this teamspace since X".
CREATE INDEX IF NOT EXISTS idx_artifacts_since
  ON artifacts(teamspace_id, updated_at);

-- ── Review: a push is a PROPOSAL, not a fait accompli ────────────────────────
--
-- Two members in two repos will push diverging versions of the same artifact.
-- Because artifacts are instructions other people's agents execute, the losing
-- write must not silently disappear and the winning one must not silently
-- become team policy. So a version carries a status, and `current_version_id`
-- on the artifact points only ever at a PUBLISHED one.
--
--   published — live; this is what artifacts_get returns
--   proposed  — written, visible in review, NOT yet what agents read
--   rejected  — declined, kept for the audit trail (never deleted)
--
-- Default 'published' so existing rows and owner/admin writes behave as before.
ALTER TABLE artifact_versions ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE artifact_versions ADD COLUMN reviewed_by TEXT;
ALTER TABLE artifact_versions ADD COLUMN reviewed_at INTEGER;
ALTER TABLE artifact_versions ADD COLUMN review_note TEXT;
-- Where a pushed version came from, so a sync client can map an artifact back
-- to the file it owns. slugifySkillName is lossy and one-way; this is not.
ALTER TABLE artifact_versions ADD COLUMN source_path TEXT;

CREATE INDEX IF NOT EXISTS idx_artifact_versions_pending
  ON artifact_versions(skill_id, status, created_at DESC);

-- ── Roles ───────────────────────────────────────────────────────────────────
--
-- 'admin' joins owner/member. SQLite cannot add a CHECK constraint by ALTER,
-- so the enum stays enforced in code (lib/teamspace/permissions.ts) exactly as
-- owner/member always were — this migration adds no constraint it cannot keep.
--
-- The division that makes the third role earn its place:
--   owner  — everything, including deleting the teamspace and making owners
--   admin  — invite, remove members, approve proposals, manage folders
--   member — create and PROPOSE; their pushes need an owner or admin to publish
--
-- That is also what makes the review flow above meaningful rather than
-- ceremonial: without a role that can approve, every proposal would be
-- self-approved.

-- Teamspaces gain a switch for teams that do not want the review step at all.
-- Default 1 (members propose). Set 0 and a member's write publishes directly,
-- which is the pre-existing behaviour.
ALTER TABLE teamspaces ADD COLUMN review_member_writes INTEGER NOT NULL DEFAULT 1;
