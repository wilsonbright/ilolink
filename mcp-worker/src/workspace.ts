// Anonymous workspace model (companion spec §3). A workspace is a private home
// for a person's docs + analytics, resolved from an OAuth subject (Claude) or a
// URL path token (ChatGPT). No accounts. Talks to D1 directly with the binding
// it is handed — no OpenNext env().

import { customAlphabet } from "nanoid";

// Unguessable, URL-safe workspace id. Doubles as the ChatGPT bearer token, so
// keep the alphabet URL-safe and the entropy high (~95 bits at length 16).
const nano = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  16,
);
export function mintWorkspaceId(): string {
  return `w_${nano()}`;
}

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

// Best-effort last-seen bump (fire-and-forget from tools).
export async function touchLastSeen(DB: D1Database, id: string): Promise<void> {
  await DB.prepare("UPDATE workspaces SET last_seen_at = ? WHERE id = ?")
    .bind(Date.now(), id)
    .run();
}

// --- Signed, login-free dashboard URL ---
// The link is the key. For the OAuth path the workspace id is never shown to the
// user, so we bind it into an HMAC-signed token. The dashboard route (Phase 3)
// verifies the signature before rendering.

function b64url(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(msg),
  );
  return b64url(sig);
}

export async function signedDashboardUrl(
  workspaceId: string,
  secret: string,
): Promise<string> {
  const sig = await hmac(secret, workspaceId);
  return `https://ilolink.com/w/${workspaceId}~${sig}`;
}

// Constant-time-ish verify for the dashboard route.
export async function verifyDashboardToken(
  token: string,
  secret: string,
): Promise<string | null> {
  const i = token.indexOf("~");
  if (i < 0) return null;
  const id = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = await hmac(secret, id);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let k = 0; k < sig.length; k++)
    diff |= sig.charCodeAt(k) ^ expected.charCodeAt(k);
  return diff === 0 ? id : null;
}
