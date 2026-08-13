// GET /api/mentions/candidates?doc=<doc id> — who can be @mentioned here.
//
// Called by the comment composer in the /embed/comment iframe, so the response
// must never be a membership oracle OR a source of 403 noise in the embed:
// every miss — signed out, unknown id, doc without a teamspace, requester
// not a member — is the SAME 200 {"members":[]} as a teamspace with nobody
// else in it. Only a signed-in member of the doc's teamspace ever sees names.
//
// That shared-membership gate is also the privacy argument for the labels:
// name ?? email is exactly what the members page already shows this requester,
// so nothing new is exposed. Doc visibility is deliberately NOT consulted —
// public, unlisted, or private, membership is the only gate, because mentioning
// is a members-only act regardless of who can read the doc.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { queryFirst } from "@/lib/db/client";
import { getMembership, listMembers } from "@/lib/teamspace/store";

export const runtime = "nodejs";

const NOBODY = { members: [] as { id: string; label: string }[] };

function respond(body: typeof NOBODY): NextResponse {
  return NextResponse.json(body, {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return respond(NOBODY);

  // The composer passes the DOCUMENT ID — the same value it POSTs to
  // /api/comments — never the slug.
  const docId = new URL(req.url).searchParams.get("doc") ?? "";
  if (!docId) return respond(NOBODY);

  const doc = await queryFirst<{ teamspace_id: string | null }>(
    "SELECT teamspace_id FROM documents WHERE id = ?",
    docId,
  );
  if (!doc?.teamspace_id) return respond(NOBODY);

  const membership = await getMembership(doc.teamspace_id, user.id);
  if (!membership) return respond(NOBODY);

  const members = await listMembers(doc.teamspace_id);
  return respond({
    members: members.map((m) => ({
      id: m.user_id,
      label: m.name ?? m.email,
    })),
  });
}
