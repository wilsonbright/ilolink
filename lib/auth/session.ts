// Sessions and user records.
//
// Sessions are a D1 table holding only the SHA-256 of an opaque nanoid(32)
// cookie value. Deliberately NOT a JWT (revocation would need a denylist, which
// is a session table with extra steps) and NOT KV (eventually consistent — a
// revoked session lingering globally for ~60s becomes unacceptable once
// teamspace membership drives access).

import { nanoid } from "nanoid";
import { execute, queryFirst } from "@/lib/db/client";
import { hashToken, newOpaqueToken } from "@/lib/crypto/token";
import { readSessionCookie } from "./cookies";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
// A write per request would be wasteful; slide the window at most once a day.
const SLIDE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface UserRow {
  id: string;
  email: string;
  email_norm: string;
  name: string | null;
  status: string;
  is_staff: number;
  token_epoch: number;
  created_at: number;
  last_seen_at: number | null;
  email_verified_at: number | null;
}

export interface SessionContext {
  user: UserRow;
  sessionId: string;
}

// Find-or-create by normalized email. Sign-in and sign-up are the same act in a
// passwordless product: proving control of the address IS the registration.
export async function getOrCreateUser(
  email: string,
  emailNorm: string,
): Promise<UserRow> {
  const existing = await queryFirst<UserRow>(
    "SELECT * FROM users WHERE email_norm = ?",
    emailNorm,
  );
  if (existing) return existing;

  const now = Date.now();
  const id = `u_${nanoid(16)}`;
  // ON CONFLICT covers the race where two challenges for the same address are
  // redeemed concurrently; the losing insert falls through to the re-read.
  await execute(
    `INSERT INTO users (id, email, email_norm, created_at, email_verified_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email_norm) DO NOTHING`,
    id,
    email,
    emailNorm,
    now,
    now,
  );
  const row = await queryFirst<UserRow>(
    "SELECT * FROM users WHERE email_norm = ?",
    emailNorm,
  );
  if (!row) throw new Error("Failed to create the account.");
  return row;
}

// Returns the RAW token — the only time it exists in plaintext. Store the
// cookie from this and never log it.
export async function createSession(
  userId: string,
  request: Request,
): Promise<string> {
  const raw = newOpaqueToken();
  const now = Date.now();
  await execute(
    `INSERT INTO sessions
       (id, user_id, token_hash, created_at, expires_at, last_seen_at, ua_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    `s_${nanoid(16)}`,
    userId,
    await hashToken(raw),
    now,
    now + SESSION_TTL_SECONDS * 1000,
    now,
    await coarseUaHash(request),
  );
  return raw;
}

// Resolve the session cookie on an incoming request. One indexed D1 read.
export async function resolveSession(
  request: Request,
): Promise<SessionContext | null> {
  const raw = readSessionCookie(request.headers.get("cookie"));
  if (!raw) return null;

  const row = await queryFirst<{
    id: string;
    user_id: string;
    expires_at: number;
    last_seen_at: number;
    revoked_at: number | null;
  }>(
    `SELECT id, user_id, expires_at, last_seen_at, revoked_at
       FROM sessions WHERE token_hash = ?`,
    await hashToken(raw),
  );
  if (!row || row.revoked_at || row.expires_at < Date.now()) return null;

  const user = await queryFirst<UserRow>(
    "SELECT * FROM users WHERE id = ?",
    row.user_id,
  );
  // A suspended user's live sessions stop working on their next request.
  if (!user || user.status !== "active") return null;

  const now = Date.now();
  if (now - row.last_seen_at > SLIDE_AFTER_MS) {
    await execute(
      "UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?",
      now,
      now + SESSION_TTL_SECONDS * 1000,
      row.id,
    );
    await execute("UPDATE users SET last_seen_at = ? WHERE id = ?", now, user.id);
  }

  return { user, sessionId: row.id };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await execute(
    "UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL",
    Date.now(),
    sessionId,
  );
}

// "Sign out everywhere". Bumping token_epoch alongside this is what also kills
// outstanding MCP OAuth grants (see the Phase 4 design).
export async function revokeAllForUser(userId: string): Promise<void> {
  await execute(
    "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    Date.now(),
    userId,
  );
}

// Coarse, non-identifying: enough to label a session in a device list, not
// enough to fingerprint. Truncated to 16 hex chars.
async function coarseUaHash(request: Request): Promise<string | null> {
  const ua = request.headers.get("user-agent");
  if (!ua) return null;
  return (await hashToken(ua)).slice(0, 16);
}
