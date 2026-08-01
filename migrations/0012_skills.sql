-- The skill registry: reusable agent instructions, shared across every project
-- a teamspace's members connect from.
--
-- Deliberately NOT stored as documents. A document is keyed by public slug and
-- carries visibility, password_hash, expires_at, trusted, unpublished_at,
-- analytics, comments, and a KV hot path — none of which apply to a skill, and
-- all of which would need "AND kind != 'skill'" bolted onto every existing
-- query (listDocuments, searchDocuments, the publish quota count, the
-- dashboard). Wrong shape, permanent tax.
--
-- Skills ARE looked up by name, which documents have no index for.
--
-- Bodies live in R2 under skills/<skill_id>/<version>/SKILL.md, written through
-- the same putBodyWith/getBodyWith helpers as document bodies.

CREATE TABLE IF NOT EXISTS skills (
  id                 TEXT PRIMARY KEY,   -- 'sk_<nanoid16>'
  teamspace_id       TEXT NOT NULL,
  name               TEXT NOT NULL,      -- kebab-case; the retrieval key
  description        TEXT NOT NULL,      -- the line an agent matches on
  current_version_id TEXT,
  visibility         TEXT NOT NULL DEFAULT 'team',  -- 'team' | 'public'
  tags               TEXT,               -- JSON array
  created_by         TEXT NOT NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  archived_at        INTEGER
);
-- One name per teamspace: the whole point is that skills_get("commit-style")
-- resolves to exactly one thing.
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_ts_name ON skills(teamspace_id, name);
CREATE INDEX IF NOT EXISTS idx_skills_updated ON skills(teamspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS skill_versions (
  id          TEXT PRIMARY KEY,          -- 'skv_<nanoid16>'
  skill_id    TEXT NOT NULL,
  version     INTEGER NOT NULL,          -- monotonic per skill, from 1
  body_r2_key TEXT NOT NULL,
  body_sha256 TEXT NOT NULL,             -- dedupe + optimistic concurrency
  description TEXT NOT NULL,             -- snapshot at this version
  changelog   TEXT,
  created_by  TEXT NOT NULL,             -- users.id — this is the audit trail
  created_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_versions_num ON skill_versions(skill_id, version);
