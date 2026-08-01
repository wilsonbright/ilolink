// Document shares and assignments.
//
// One table, discriminated by `kind`: an assignment is a share plus a note, a
// due date, and an open/done state. Two near-identical tables would drift.
//
// A share may name an address with no account yet — the row carries email_norm
// and is bound to a user id on that person's first sign-in
// (claimPendingShares in ./store). That is what makes "share with a colleague"
// work before they have signed up.

import { nanoid } from "nanoid";
import { execute, queryAll, queryFirst } from "@/lib/db/client";
import type { ShareRole } from "./permissions";

export type ShareKind = "share" | "assignment";

export interface ShareRow {
  id: string;
  document_id: string;
  user_id: string | null;
  email_norm: string | null;
  role: ShareRole;
  kind: ShareKind;
  note: string | null;
  due_at: number | null;
  state: string;
  created_by: string;
  created_at: number;
  revoked_at: number | null;
  // Joined for display.
  email?: string | null;
}

export class ShareError extends Error {}

export const SHARE_ROLES: ShareRole[] = ["viewer", "commenter", "editor"];

export async function listShares(documentId: string): Promise<ShareRow[]> {
  return queryAll<ShareRow>(
    `SELECT s.*, COALESCE(u.email, s.email_norm) AS email
       FROM document_shares s
       LEFT JOIN users u ON u.id = s.user_id
      WHERE s.document_id = ? AND s.revoked_at IS NULL
      ORDER BY s.created_at ASC`,
    documentId,
  );
}

export async function shareDocument(
  documentId: string,
  emailNorm: string,
  role: ShareRole,
  kind: ShareKind,
  createdBy: string,
  extra: { note?: string | null; dueAt?: number | null } = {},
): Promise<ShareRow> {
  if (!SHARE_ROLES.includes(role)) throw new ShareError("Unknown role.");

  // Bind straight to a user id when the account already exists, so the grant is
  // live immediately rather than waiting for a sign-in that may never come.
  const user = await queryFirst<{ id: string }>(
    "SELECT id FROM users WHERE email_norm = ?",
    emailNorm,
  );

  // Re-sharing with the same person replaces the previous grant rather than
  // stacking rows, so revoking once actually revokes.
  await execute(
    `UPDATE document_shares SET revoked_at = ?
      WHERE document_id = ? AND revoked_at IS NULL
        AND (user_id = ? OR email_norm = ?)`,
    Date.now(),
    documentId,
    user?.id ?? null,
    emailNorm,
  );

  const id = `ds_${nanoid(16)}`;
  await execute(
    `INSERT INTO document_shares
       (id, document_id, user_id, email_norm, role, kind, note, due_at, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    documentId,
    user?.id ?? null,
    user ? null : emailNorm,
    role,
    kind,
    extra.note ?? null,
    extra.dueAt ?? null,
    createdBy,
    Date.now(),
  );

  const row = await queryFirst<ShareRow>(
    "SELECT * FROM document_shares WHERE id = ?",
    id,
  );
  if (!row) throw new ShareError("Could not share the document.");
  return row;
}

// Scoped to the document so an id from another document cannot be revoked.
export async function revokeShare(
  documentId: string,
  shareId: string,
): Promise<void> {
  await execute(
    "UPDATE document_shares SET revoked_at = ? WHERE id = ? AND document_id = ? AND revoked_at IS NULL",
    Date.now(),
    shareId,
    documentId,
  );
}

// Assignments only: mark done / reopen. Either party may flip it — the assignee
// finishing, or the assigner reopening.
export async function setAssignmentState(
  documentId: string,
  shareId: string,
  state: "open" | "done",
): Promise<void> {
  await execute(
    `UPDATE document_shares SET state = ?
      WHERE id = ? AND document_id = ? AND kind = 'assignment' AND revoked_at IS NULL`,
    state,
    shareId,
    documentId,
  );
}

// "Assigned to me", for the dashboard.
export async function listAssignmentsFor(userId: string): Promise<ShareRow[]> {
  return queryAll<ShareRow>(
    `SELECT s.*, d.slug AS email
       FROM document_shares s
       JOIN documents d ON d.id = s.document_id
      WHERE s.user_id = ? AND s.kind = 'assignment'
        AND s.state = 'open' AND s.revoked_at IS NULL
      ORDER BY s.due_at IS NULL, s.due_at ASC`,
    userId,
  );
}
