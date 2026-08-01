-- Accounts, sessions, and sign-in challenges.
--
-- This re-creates a `users` table that 0002_accountless.sql deliberately
-- dropped. The shape is different: email_norm is the lookup key, and
-- token_epoch exists so a single UPDATE can invalidate every outstanding MCP
-- OAuth grant for a user without enumerating them.
--
-- Additive and nullable only. Nothing here is read by existing code, so this
-- migration is safe to apply a full release ahead of the code that uses it.

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,                 -- 'u_<nanoid16>'
  email             TEXT NOT NULL,                    -- as entered, for display
  email_norm        TEXT NOT NULL,                    -- lowercased + trimmed; the lookup key
  name              TEXT,
  status            TEXT NOT NULL DEFAULT 'active',   -- 'active' | 'suspended'
  is_staff          INTEGER NOT NULL DEFAULT 0,       -- replaces the shared ADMIN_SECRET
  token_epoch       INTEGER NOT NULL DEFAULT 1,       -- bump to kill every OAuth grant
  created_at        INTEGER NOT NULL,
  last_seen_at      INTEGER,
  email_verified_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email_norm);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,          -- 's_<nanoid16>'
  user_id      TEXT NOT NULL,
  token_hash   TEXT NOT NULL,             -- sha256 of the raw cookie value
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  revoked_at   INTEGER,
  ua_hash      TEXT,                      -- coarse client fingerprint for the session list
  ip_hash      TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- One row per sign-in attempt. Holds BOTH factors: a 6-digit code (PBKDF2 —
-- low entropy, must be slow to verify) and a magic-link token (sha256 — 190
-- bits, no KDF needed). Either consumes the row.
CREATE TABLE IF NOT EXISTS auth_challenges (
  id          TEXT PRIMARY KEY,           -- 'ac_<nanoid16>'; safe to return to the client
  email_norm  TEXT NOT NULL,
  code_hash   TEXT NOT NULL,              -- pbkdf2$... from lib/crypto/password.ts
  link_hash   TEXT NOT NULL,              -- sha256 of a nanoid(32)
  purpose     TEXT NOT NULL,              -- 'signin' | 'invite' | 'share'
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  consumed_at INTEGER,
  redirect_to TEXT                        -- where to land after success; validated as a relative path
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_challenges_link ON auth_challenges(link_hash);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_email ON auth_challenges(email_norm, created_at);
