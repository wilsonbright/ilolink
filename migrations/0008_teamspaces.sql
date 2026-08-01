-- Teamspaces, membership, and invitations.
--
-- THE KEY DECISION: is_personal.
--
-- Every user gets an auto-created personal teamspace at first sign-in, and
-- EVERYTHING — documents, folders, skills — is owned by a teamspace, never
-- directly by a user. Without this we would be replacing two ownership models
-- (manage_token_hash, workspace_id) with three. With it, "solo user" is just a
-- teamspace with one member, the workspace->teamspace backfill is mechanical,
-- and every access check has exactly one shape.
--
-- Solo users never see the concept: the UI only surfaces teamspaces once a
-- second one exists or someone is invited.
--
-- Additive only. Nothing existing reads these tables.

CREATE TABLE IF NOT EXISTS teamspaces (
  id                  TEXT PRIMARY KEY,               -- 't_<nanoid16>'
  name                TEXT NOT NULL,
  created_by          TEXT,                           -- users.id; NULL for backfilled shells
  plan                TEXT NOT NULL DEFAULT 'free',
  quota_docs          INTEGER NOT NULL DEFAULT 200,
  status              TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended'
  abuse_flags         INTEGER NOT NULL DEFAULT 0,
  is_personal         INTEGER NOT NULL DEFAULT 0,
  legacy_workspace_id TEXT,                           -- the workspaces row this came from
  created_at          INTEGER NOT NULL
);
-- Partial-unique via a plain unique index: SQLite treats NULLs as distinct, so
-- many teamspaces may have no legacy workspace while each real one maps once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_legacy ON teamspaces(legacy_workspace_id);
CREATE INDEX IF NOT EXISTS idx_ts_created_by ON teamspaces(created_by);

-- Only two roles, deliberately. 'owner' can invite, remove members, delete
-- documents, and rename the teamspace; 'member' can create, edit, and comment.
CREATE TABLE IF NOT EXISTS teamspace_members (
  teamspace_id TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL,          -- 'owner' | 'member'
  invited_by   TEXT,
  joined_at    INTEGER NOT NULL,
  PRIMARY KEY (teamspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tsm_user ON teamspace_members(user_id);

CREATE TABLE IF NOT EXISTS invites (
  id           TEXT PRIMARY KEY,       -- 'inv_<nanoid16>'
  teamspace_id TEXT NOT NULL,
  email_norm   TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member',
  token_hash   TEXT NOT NULL,          -- sha256 of an emailed nanoid(32)
  invited_by   TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,       -- +14d
  accepted_at  INTEGER,
  accepted_by  TEXT,
  revoked_at   INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_token ON invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_invites_ts ON invites(teamspace_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email_norm);
