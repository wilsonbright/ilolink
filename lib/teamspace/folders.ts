// Folders. Teamspace-scoped, one level of nesting.
//
// Every mutation re-checks that the folder belongs to the teamspace the caller
// is a member of. Passing a folder id from another teamspace must never move a
// document across the boundary, so the check lives here rather than at the
// route, where it would be easy to forget on the next endpoint.

import { nanoid } from "nanoid";
import { execute, queryAll, queryFirst } from "@/lib/db/client";

export const MAX_FOLDER_NAME = 60;
// Nesting deeper than this would need recursive queries on every dashboard
// render, for depth nobody has asked for.
export const MAX_DEPTH = 2;

export interface FolderRow {
  id: string;
  teamspace_id: string;
  parent_id: string | null;
  name: string;
  created_by: string;
  created_at: number;
  updated_at: number;
  archived_at: number | null;
}

export class FolderError extends Error {}

export async function listFolders(teamspaceId: string): Promise<FolderRow[]> {
  return queryAll<FolderRow>(
    `SELECT * FROM folders
      WHERE teamspace_id = ? AND archived_at IS NULL
      ORDER BY parent_id IS NOT NULL, name COLLATE NOCASE ASC`,
    teamspaceId,
  );
}

// Scoped lookup — the only way this module resolves a folder, so a foreign id
// simply reads as "not found".
export async function getFolderIn(
  teamspaceId: string,
  folderId: string,
): Promise<FolderRow | null> {
  return queryFirst<FolderRow>(
    "SELECT * FROM folders WHERE id = ? AND teamspace_id = ? AND archived_at IS NULL",
    folderId,
    teamspaceId,
  );
}

export async function createFolder(
  teamspaceId: string,
  name: string,
  parentId: string | null,
  createdBy: string,
): Promise<FolderRow> {
  const clean = name.trim();
  if (!clean || clean.length > MAX_FOLDER_NAME) {
    throw new FolderError(`Enter a name of 1–${MAX_FOLDER_NAME} characters.`);
  }

  if (parentId) {
    const parent = await getFolderIn(teamspaceId, parentId);
    if (!parent) throw new FolderError("That folder no longer exists.");
    // One level only: a parent that already has a parent would make this depth 3.
    if (parent.parent_id) {
      throw new FolderError("Folders can only nest one level deep.");
    }
  }

  const id = `f_${nanoid(16)}`;
  const now = Date.now();
  await execute(
    `INSERT INTO folders (id, teamspace_id, parent_id, name, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    teamspaceId,
    parentId,
    clean,
    createdBy,
    now,
    now,
  );
  const row = await getFolderIn(teamspaceId, id);
  if (!row) throw new FolderError("Could not create the folder.");
  return row;
}

export async function renameFolder(
  teamspaceId: string,
  folderId: string,
  name: string,
): Promise<void> {
  const clean = name.trim();
  if (!clean || clean.length > MAX_FOLDER_NAME) {
    throw new FolderError(`Enter a name of 1–${MAX_FOLDER_NAME} characters.`);
  }
  const res = await execute(
    "UPDATE folders SET name = ?, updated_at = ? WHERE id = ? AND teamspace_id = ?",
    clean,
    Date.now(),
    folderId,
    teamspaceId,
  );
  if (!res.meta.changes) throw new FolderError("That folder no longer exists.");
}

// Archive rather than delete: the documents inside stay published and simply
// return to the teamspace root. Deleting a folder must never delete documents.
export async function archiveFolder(
  teamspaceId: string,
  folderId: string,
): Promise<void> {
  const now = Date.now();
  const res = await execute(
    "UPDATE folders SET archived_at = ? WHERE id = ? AND teamspace_id = ? AND archived_at IS NULL",
    now,
    folderId,
    teamspaceId,
  );
  if (!res.meta.changes) throw new FolderError("That folder no longer exists.");

  // Detach children and documents so nothing is stranded pointing at it.
  await execute(
    "UPDATE folders SET parent_id = NULL, updated_at = ? WHERE parent_id = ? AND teamspace_id = ?",
    now,
    folderId,
    teamspaceId,
  );
  await execute(
    "UPDATE documents SET folder_id = NULL, updated_at = ? WHERE folder_id = ? AND teamspace_id = ?",
    now,
    folderId,
    teamspaceId,
  );
}

// Move a document into a folder, or to the root with folderId = null.
export async function moveDocument(
  teamspaceId: string,
  documentId: string,
  folderId: string | null,
): Promise<void> {
  if (folderId) {
    const folder = await getFolderIn(teamspaceId, folderId);
    // Resolving through the teamspace is what stops a document being filed into
    // another teamspace's folder.
    if (!folder) throw new FolderError("That folder no longer exists.");
  }
  const res = await execute(
    "UPDATE documents SET folder_id = ?, updated_at = ? WHERE id = ? AND teamspace_id = ?",
    folderId,
    Date.now(),
    documentId,
    teamspaceId,
  );
  if (!res.meta.changes) throw new FolderError("That document is not in this teamspace.");
}
