// POST /api/teamspaces/<id>/proposals — approve or reject one proposed version.
//
// Approving is the moment a teammate's text becomes what every connected agent
// reads and acts on, so authority is re-derived here from D1 (getMembership +
// canReviewArtifact) rather than trusted from anything the client sent. The
// review inbox hides the buttons from a member; this refuses the request.
//
// The decision itself is reviewProposal's, which flips the row conditionally on
// it still being 'proposed'. Two admins clicking at once resolve it once, and
// the loser gets told rather than silently overwriting the winner.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { canReviewArtifact } from "@/lib/teamspace/permissions";
import { ArtifactError, reviewProposal } from "@/lib/artifacts/store-core";
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

  // 404 rather than 403 for a non-member, so teamspace ids cannot be probed.
  const role = await getMembership(teamspaceId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // A member IS in the teamspace, so 403 here leaks nothing they don't know.
  if (!canReviewArtifact(role)) {
    return NextResponse.json(
      { error: "Only an owner or admin can review proposals." },
      { status: 403 },
    );
  }

  if (!(await rateLimit(`artifact:review:${user.id}`, 200, 3600))) {
    return NextResponse.json(
      { error: "Too many review actions. Try again later." },
      { status: 429 },
    );
  }

  let body: { versionId?: unknown; approve?: unknown; note?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const versionId =
    typeof body.versionId === "string" ? body.versionId.trim() : "";
  if (!versionId) {
    return NextResponse.json(
      { error: "A 'versionId' is required." },
      { status: 400 },
    );
  }
  if (typeof body.approve !== "boolean") {
    return NextResponse.json(
      { error: "'approve' must be true or false." },
      { status: 400 },
    );
  }
  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 500)
      : null;

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };

  try {
    const result = await reviewProposal(
      { DB: e.DB, DOCS: e.DOCS },
      teamspaceId,
      versionId,
      user.id,
      body.approve,
      note,
    );
    return NextResponse.json({
      ok: true,
      ...result,
      status: body.approve ? "published" : "rejected",
    });
  } catch (err) {
    if (err instanceof ArtifactError) {
      // Already reviewed, or never pending — the caller's view of the queue is
      // stale, which is a conflict rather than a malformed request.
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Could not record that decision." },
      { status: 500 },
    );
  }
}
