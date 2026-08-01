// PATCH  /api/folders/<id>  — rename
// DELETE /api/folders/<id>  — archive (documents inside return to the root)
//
// Both resolve the folder through its teamspace, so an id from another
// teamspace reads as "not found" rather than being actionable.

import { NextResponse } from "next/server";
import { guardTeamspace } from "@/lib/auth/team-guard";
import { archiveFolder, FolderError, renameFolder } from "@/lib/teamspace/folders";
import { queryFirst } from "@/lib/db/client";

export const runtime = "nodejs";

// Read the owning teamspace from the folder itself; the caller does not get to
// assert which teamspace a folder belongs to.
async function teamspaceOf(folderId: string): Promise<string | null> {
  const row = await queryFirst<{ teamspace_id: string }>(
    "SELECT teamspace_id FROM folders WHERE id = ? AND archived_at IS NULL",
    folderId,
  );
  return row?.teamspace_id ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const teamspaceId = await teamspaceOf(id);
  if (!teamspaceId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const guard = await guardTeamspace(teamspaceId);
  if (!guard.ok) return guard.response;

  let body: { name?: unknown };
  try {
    body = (await req.json()) as { name?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    await renameFolder(teamspaceId, id, typeof body.name === "string" ? body.name : "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof FolderError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const teamspaceId = await teamspaceOf(id);
  // Idempotent: an already-archived folder is a success, not a 404, so a
  // double-click does not surface an error.
  if (!teamspaceId) return NextResponse.json({ ok: true, alreadyGone: true });

  const guard = await guardTeamspace(teamspaceId);
  if (!guard.ok) return guard.response;

  try {
    await archiveFolder(teamspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof FolderError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
