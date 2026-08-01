// Teamspace reads/writes, and the one helper that turns a (user, document)
// pair into capabilities.

import { nanoid } from "nanoid";
import { execute, queryAll, queryFirst } from "@/lib/db/client";
import {
  resolveDocAccess,
  type DocCapabilities,
  type ShareRole,
  type TeamRole,
} from "./permissions";

export interface TeamspaceRow {
  id: string;
  name: string;
  created_by: string | null;
  plan: string;
  quota_docs: number;
  status: string;
  is_personal: number;
  legacy_workspace_id: string | null;
  created_at: number;
}

export interface MemberRow {
  teamspace_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: number;
  email: string;
  name: string | null;
}

// Called on every sign-in. Idempotent: returns the existing personal teamspace
// if there is one. This is what makes "solo user" and "team" the same code
// path everywhere downstream.
export async function ensurePersonalTeamspace(
  userId: string,
): Promise<TeamspaceRow> {
  const existing = await queryFirst<TeamspaceRow>(
    "SELECT * FROM teamspaces WHERE created_by = ? AND is_personal = 1 LIMIT 1",
    userId,
  );
  if (existing) return existing;

  const id = `t_${nanoid(16)}`;
  const now = Date.now();
  await execute(
    `INSERT INTO teamspaces (id, name, created_by, is_personal, created_at)
     VALUES (?, ?, ?, 1, ?)`,
    id,
    "Personal",
    userId,
    now,
  );
  await execute(
    `INSERT INTO teamspace_members (teamspace_id, user_id, role, joined_at)
     VALUES (?, ?, 'owner', ?)
     ON CONFLICT(teamspace_id, user_id) DO NOTHING`,
    id,
    userId,
    now,
  );

  const row = await queryFirst<TeamspaceRow>(
    "SELECT * FROM teamspaces WHERE id = ?",
    id,
  );
  if (!row) throw new Error("Failed to create a personal teamspace.");
  return row;
}

export async function getMembership(
  teamspaceId: string | null,
  userId: string | null,
): Promise<TeamRole | null> {
  if (!teamspaceId || !userId) return null;
  const row = await queryFirst<{ role: TeamRole }>(
    "SELECT role FROM teamspace_members WHERE teamspace_id = ? AND user_id = ?",
    teamspaceId,
    userId,
  );
  return row?.role ?? null;
}

export async function listTeamspacesForUser(
  userId: string,
): Promise<(TeamspaceRow & { role: TeamRole })[]> {
  return queryAll<TeamspaceRow & { role: TeamRole }>(
    `SELECT t.*, m.role
       FROM teamspaces t
       JOIN teamspace_members m ON m.teamspace_id = t.id
      WHERE m.user_id = ? AND t.status = 'active'
      ORDER BY t.is_personal DESC, t.created_at ASC`,
    userId,
  );
}

export async function listMembers(teamspaceId: string): Promise<MemberRow[]> {
  return queryAll<MemberRow>(
    `SELECT m.teamspace_id, m.user_id, m.role, m.joined_at, u.email, u.name
       FROM teamspace_members m
       JOIN users u ON u.id = m.user_id
      WHERE m.teamspace_id = ?
      ORDER BY m.role = 'owner' DESC, m.joined_at ASC`,
    teamspaceId,
  );
}

export async function getDocShare(
  documentId: string,
  userId: string | null,
): Promise<ShareRole | null> {
  if (!userId) return null;
  // Strongest grant wins when a document is both shared and assigned.
  const row = await queryFirst<{ role: ShareRole }>(
    `SELECT role FROM document_shares
      WHERE document_id = ? AND user_id = ? AND revoked_at IS NULL
      ORDER BY CASE role WHEN 'editor' THEN 3 WHEN 'commenter' THEN 2 ELSE 1 END DESC
      LIMIT 1`,
    documentId,
    userId,
  );
  return row?.role ?? null;
}

// Shares can be created for an address with no account yet. On that person's
// first sign-in, bind those rows to their new user id.
export async function claimPendingShares(
  userId: string,
  emailNorm: string,
): Promise<number> {
  const res = await execute(
    `UPDATE document_shares
        SET user_id = ?, email_norm = NULL
      WHERE email_norm = ? AND user_id IS NULL AND revoked_at IS NULL`,
    userId,
    emailNorm,
  );
  return res.meta.changes ?? 0;
}

export interface AccessibleDoc {
  id: string;
  teamspace_id: string | null;
  created_by: string | null;
  manage_token_hash?: string | null;
}

// The convenience wrapper the routes call: fetch the two facts, then delegate
// to the pure resolver.
export async function docAccessFor(
  userId: string | null,
  doc: AccessibleDoc,
  legacyManageToken = false,
): Promise<DocCapabilities> {
  const [membership, share] = await Promise.all([
    getMembership(doc.teamspace_id, userId),
    getDocShare(doc.id, userId),
  ]);
  return resolveDocAccess({
    userId,
    doc: { teamspaceId: doc.teamspace_id, createdBy: doc.created_by },
    membership,
    share,
    legacyManageToken,
  });
}
