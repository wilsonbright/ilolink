// Personal access tokens for MCP clients that cannot do OAuth.
//
// Binding-parameterized so mcp-worker can verify a token without OpenNext's
// env(), following the lib/publish/store-core.ts convention.

import { nanoid } from "nanoid";
import { hashToken, newOpaqueToken } from "@/lib/crypto/token";

// A recognizable prefix so a leaked token is greppable in logs and obvious in a
// paste, and so secret scanners can be taught to spot it.
export const PAT_PREFIX = "ilo_pat_";

export interface ApiTokenRow {
  id: string;
  user_id: string;
  teamspace_id: string;
  name: string | null;
  scopes: string;
  created_at: number;
  last_used_at: number | null;
  expires_at: number | null;
  revoked_at: number | null;
}

export interface ResolvedToken {
  userId: string;
  teamspaceId: string;
  tokenId: string;
  name: string | null;
  scopes: string[];
}

export function mintTokenValue(): string {
  return `${PAT_PREFIX}${newOpaqueToken()}`;
}

export async function createApiToken(
  DB: D1Database,
  userId: string,
  teamspaceId: string,
  name: string | null,
  scopes: string[],
): Promise<{ id: string; token: string }> {
  const token = mintTokenValue();
  const id = `pat_${nanoid(16)}`;
  await DB.prepare(
    `INSERT INTO api_tokens (id, user_id, teamspace_id, name, token_hash, scopes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      teamspaceId,
      name,
      await hashToken(token),
      scopes.join(","),
      Date.now(),
    )
    .run();
  // The raw value is returned exactly once and never stored.
  return { id, token };
}

// Resolve a presented bearer token. Returns null for anything that is not a
// live, unexpired, unrevoked token — callers must treat null as "reject".
export async function resolveApiToken(
  DB: D1Database,
  presented: string,
): Promise<ResolvedToken | null> {
  if (!presented.startsWith(PAT_PREFIX)) return null;

  const row = await DB.prepare(
    `SELECT t.id, t.user_id, t.teamspace_id, t.name, t.scopes, t.expires_at,
            t.revoked_at, u.status AS user_status
       FROM api_tokens t
       JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ?`,
  )
    .bind(await hashToken(presented))
    .first<{
      id: string;
      user_id: string;
      teamspace_id: string;
      name: string | null;
      scopes: string;
      expires_at: number | null;
      revoked_at: number | null;
      user_status: string;
    }>();

  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at && row.expires_at < Date.now()) return null;
  if (row.user_status !== "active") return null;

  return {
    userId: row.user_id,
    teamspaceId: row.teamspace_id,
    tokenId: row.id,
    name: row.name,
    scopes: row.scopes.split(",").filter(Boolean),
  };
}

// Best-effort; a failed touch must never block a tool call.
export async function touchApiToken(DB: D1Database, tokenId: string): Promise<void> {
  try {
    await DB.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?")
      .bind(Date.now(), tokenId)
      .run();
  } catch {
    // ignore
  }
}

export async function listApiTokens(
  DB: D1Database,
  userId: string,
): Promise<ApiTokenRow[]> {
  const res = await DB.prepare(
    `SELECT id, user_id, teamspace_id, name, scopes, created_at, last_used_at,
            expires_at, revoked_at
       FROM api_tokens
      WHERE user_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC`,
  )
    .bind(userId)
    .all<ApiTokenRow>();
  return res.results;
}

export async function revokeApiToken(
  DB: D1Database,
  userId: string,
  tokenId: string,
): Promise<boolean> {
  // Scoped to the owner so one user cannot revoke another's token by id.
  const res = await DB.prepare(
    "UPDATE api_tokens SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
  )
    .bind(Date.now(), tokenId, userId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}
