// Workspace model. A workspace is a private home for a teamspace's docs +
// analytics. Talks to D1 directly with the binding it is handed — no OpenNext
// env().
//
// Historical note: workspaces predate accounts, and were resolved either from an
// OAuth subject (Claude) or from a URL path token (ChatGPT). Both ChatGPT and
// Claude now arrive through the same OAuth flow, and a workspace is resolved
// from the teamspace sealed into the grant — see getOrCreateForTeamspace below.

import { customAlphabet } from "nanoid";

// Unguessable, URL-safe workspace id. It is no longer a bearer token, but it is
// still the subject of a signed dashboard link, so keep the alphabet URL-safe
// and the entropy high (~95 bits at length 16).
const nano = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  16,
);
export function mintWorkspaceId(): string {
  return `w_${nano()}`;
}

// "chatgpt_token" is never written any more — the path that minted it is
// retired — but rows carrying it still exist in D1, so the union has to keep
// reading it.
export type WorkspaceOrigin = "claude_oauth" | "chatgpt_token" | "web";

export interface Workspace {
  id: string;
  created_at: number;
  last_seen_at: number | null;
  origin: WorkspaceOrigin;
  oauth_subject: string | null;
  claimed_by: string | null;
  plan: string;
  quota_docs: number;
  status: string;
}

// Look up a workspace by its id / bearer token. Null if unknown or suspended.
export async function getWorkspace(
  DB: D1Database,
  id: string,
): Promise<Workspace | null> {
  const row = await DB.prepare(
    "SELECT * FROM workspaces WHERE id = ? AND status = 'active'",
  )
    .bind(id)
    .first<Workspace>();
  return row ?? null;
}

// Resolve the workspace for an OAuth subject (Claude path); create a fresh
// anonymous one on first authorize. Idempotent per subject.
export async function getOrCreateByOauthSubject(
  DB: D1Database,
  subject: string,
): Promise<Workspace> {
  const existing = await DB.prepare(
    "SELECT * FROM workspaces WHERE oauth_subject = ? AND status = 'active'",
  )
    .bind(subject)
    .first<Workspace>();
  if (existing) return existing;
  return createWorkspace(DB, "claude_oauth", subject);
}

// Insert a new anonymous workspace.
export async function createWorkspace(
  DB: D1Database,
  origin: WorkspaceOrigin,
  oauthSubject: string | null = null,
): Promise<Workspace> {
  const now = Date.now();
  const ws: Workspace = {
    id: mintWorkspaceId(),
    created_at: now,
    last_seen_at: now,
    origin,
    oauth_subject: oauthSubject,
    claimed_by: null,
    plan: "anon",
    quota_docs: 50,
    status: "active",
  };
  await DB.prepare(
    `INSERT INTO workspaces
      (id, created_at, last_seen_at, origin, oauth_subject, claimed_by, plan, quota_docs, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      ws.id,
      ws.created_at,
      ws.last_seen_at,
      ws.origin,
      ws.oauth_subject,
      ws.claimed_by,
      ws.plan,
      ws.quota_docs,
      ws.status,
    )
    .run();
  return ws;
}

// Resolve the workspace that backs a teamspace, creating one on first use.
//
// WHY THIS EXISTS. The document tools are still scoped by workspace_id — the
// pre-accounts ownership key — while every modern connection carries only
// {userId, teamspaceId}. When the OAuth props changed in Phase 4, nothing was
// left to populate props.workspaceId, so all eight document tools threw
// "this connection predates ilolink accounts" on connections created seconds
// earlier. This bridges the two models until documents are keyed by teamspace
// outright.
//
// One workspace per teamspace. The Phase 2 backfill already created exactly one
// per legacy workspace, so this only ever inserts for teamspaces made since.
export async function getOrCreateForTeamspace(
  DB: D1Database,
  teamspaceId: string,
  userId: string,
): Promise<Workspace> {
  const existing = await DB.prepare(
    "SELECT * FROM workspaces WHERE teamspace_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1",
  )
    .bind(teamspaceId)
    .first<Workspace>();
  if (existing) return existing;

  const now = Date.now();
  const id = mintWorkspaceId();
  // Quota comes from the teamspace, not the anonymous default: a real account's
  // limit should not be the 50 an anonymous workspace was given.
  const ts = await DB.prepare(
    "SELECT quota_docs FROM teamspaces WHERE id = ?",
  )
    .bind(teamspaceId)
    .first<{ quota_docs: number }>();

  await DB.prepare(
    `INSERT INTO workspaces
       (id, created_at, last_seen_at, origin, oauth_subject, claimed_by,
        plan, quota_docs, status, user_id, teamspace_id)
     VALUES (?, ?, ?, 'claude_oauth', NULL, NULL, 'team', ?, 'active', ?, ?)`,
  )
    .bind(id, now, now, ts?.quota_docs ?? 200, userId, teamspaceId)
    .run();

  // Re-read rather than construct: a concurrent first call may have won, and
  // returning the row that actually exists keeps two sessions on one workspace.
  const row = await DB.prepare(
    "SELECT * FROM workspaces WHERE teamspace_id = ? AND status = 'active' ORDER BY created_at ASC LIMIT 1",
  )
    .bind(teamspaceId)
    .first<Workspace>();
  if (!row) throw new Error("Failed to resolve a workspace for this teamspace.");
  return row;
}

// Best-effort last-seen bump (fire-and-forget from tools).
export async function touchLastSeen(DB: D1Database, id: string): Promise<void> {
  await DB.prepare("UPDATE workspaces SET last_seen_at = ? WHERE id = ?")
    .bind(Date.now(), id)
    .run();
}

// Signed, login-free dashboard URLs live in the shared token module (the app
// dashboard route verifies with the same HMAC + shared DASHBOARD_SECRET).
export { signedDashboardUrl, verifyDashboardToken } from "@/lib/mcp/dashboard-token";
