// POST /api/teamspaces/<id>/skills — create or update a skill from the web.
//
// This is the ONLY web write path for the registry, and it deliberately calls
// the same putSkill() the MCP tool does rather than talking to D1 itself. The
// version history and `created_by` audit trail are the entire mitigation for
// "a teammate can write instructions another agent will execute" — a second
// implementation is a second place for that trail to be wrong, and it would
// drift the first time either side gained a field.
//
// The browser editor and the bulk importer both post here; the importer just
// posts many times. That keeps "imported" and "typed by hand" indistinguishable
// in the history, which is correct — both are a person putting instructions in
// front of the team's agents.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { putSkill, SkillError } from "@/lib/skills/store-core";
import { canPublishArtifact } from "@/lib/teamspace/permissions";
import { queryFirst } from "@/lib/db/client";
import { rateLimit } from "@/lib/ratelimit";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: teamspaceId } = await params;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  // Any member may write a skill — the same rule MCP applies. 404 rather than
  // 403 so a non-member cannot confirm the teamspace exists.
  const role = await getMembership(teamspaceId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Generous enough for a real import (dozens of files) but not an open pipe.
  if (!(await rateLimit(`skill:write:${user.id}`, 120, 3600))) {
    return NextResponse.json(
      { error: "Too many skill writes. Try again later." },
      { status: 429 },
    );
  }

  let body: {
    name?: unknown;
    description?: unknown;
    body?: unknown;
    changelog?: unknown;
    ifVersion?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };

  // Whether this write goes live or becomes a proposal. Read fresh from D1 and
  // FAILS CLOSED — an unreadable teamspace row means review stays on. This
  // route previously always published, which made the review step bypassable
  // from the browser regardless of the caller's role.
  const ts = await queryFirst<{ review_member_writes: number }>(
    "SELECT review_member_writes FROM teamspaces WHERE id = ?",
    teamspaceId,
  );
  const publish = canPublishArtifact(role, (ts?.review_member_writes ?? 1) === 1);

  try {
    const result = await putSkill(
      { DB: e.DB, DOCS: e.DOCS },
      teamspaceId,
      user.id,
      {
        name: String(body.name ?? ""),
        description: String(body.description ?? ""),
        body: String(body.body ?? ""),
        changelog:
          typeof body.changelog === "string" && body.changelog
            ? body.changelog
            : null,
        // Optimistic concurrency, same contract as skills_put: pass the version
        // you read and the write is refused if someone edited underneath you.
        ifVersion:
          typeof body.ifVersion === "number" ? body.ifVersion : null,
        publish,
      },
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (err) {
    if (err instanceof SkillError) {
      // 409 when the failure is a version conflict — the caller can recover by
      // re-reading, which is different from "your input was malformed".
      const conflict = err.message.includes("is at version");
      return NextResponse.json(
        { error: err.message },
        { status: conflict ? 409 : 400 },
      );
    }
    return NextResponse.json(
      { error: "Could not save that skill." },
      { status: 500 },
    );
  }
}
