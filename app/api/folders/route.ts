// POST /api/folders — create a folder in a teamspace. Any member may.

import { NextResponse } from "next/server";
import { guardTeamspace } from "@/lib/auth/team-guard";
import { createFolder, FolderError } from "@/lib/teamspace/folders";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: { teamspaceId?: unknown; name?: unknown; parentId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const teamspaceId = typeof body.teamspaceId === "string" ? body.teamspaceId : "";
  if (!teamspaceId) {
    return NextResponse.json({ error: "A 'teamspaceId' is required." }, { status: 400 });
  }

  const guard = await guardTeamspace(teamspaceId);
  if (!guard.ok) return guard.response;

  try {
    const folder = await createFolder(
      teamspaceId,
      typeof body.name === "string" ? body.name : "",
      typeof body.parentId === "string" && body.parentId ? body.parentId : null,
      guard.user.id,
    );
    return NextResponse.json({ folder }, { status: 201 });
  } catch (e) {
    if (e instanceof FolderError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
