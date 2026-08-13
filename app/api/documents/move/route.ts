// POST /api/documents/move — change which teamspace owns a document.
//
// Move exists to repair a shipped bug: until 02eb986 the composer never sent a
// teamspace, so every document published from the web landed in the personal
// one whatever the person meant, and there was no way to put it right.
//
// The slug is deliberately NOT touched. Every URL already shared keeps working —
// this changes ownership, not identity.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { queryFirst, execute } from "@/lib/db/client";
import { getMembership } from "@/lib/teamspace/store";
import { canPublishInto } from "@/lib/teamspace/permissions";
import {
  checkDocumentAllowance,
  documentLimitMessage,
} from "@/lib/billing/entitlements";
import { siteOrigin } from "@/lib/auth/config";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

function bad(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  // A legacy manage token is not enough. It proves you published a document, not
  // that you belong anywhere it could be moved TO — and the destination check
  // below needs a session either way.
  if (!user) return bad("Sign in to move a document.", 401);

  const body: unknown = await req.json().catch(() => null);
  const b = (body ?? {}) as Record<string, unknown>;
  const documentId = typeof b.documentId === "string" ? b.documentId : "";
  const teamspaceId = typeof b.teamspaceId === "string" ? b.teamspaceId : "";
  if (!documentId || !teamspaceId) {
    return bad("Both 'documentId' and 'teamspaceId' are required.");
  }

  const doc = await queryFirst<{ id: string; teamspace_id: string | null }>(
    "SELECT id, teamspace_id FROM documents WHERE id = ?",
    documentId,
  );
  // Same non-disclosure as resolveNamedTeamspace: "no such document" and "not
  // yours" must be indistinguishable, or ids can be probed.
  if (!doc) return bad("You can't move that document.", 403);

  // Where it is now. Membership — NOT resolveDocAccess's canEdit, which an
  // EDITOR SHARE also satisfies without any membership at all. Gating on canEdit
  // would let someone a document was merely shared with move it into their own
  // teamspace, which is theft rather than editing. The claim route guards the
  // same shape of attack in its "already attached to a teamspace" branch.
  const fromRole = doc.teamspace_id
    ? await getMembership(doc.teamspace_id, user.id)
    : null;
  if (!canPublishInto(fromRole)) {
    return bad("You can't move that document.", 403);
  }

  if (doc.teamspace_id === teamspaceId) {
    return bad("That document is already in that teamspace.");
  }

  // Where it is going. Identical gate to /api/publish, so a teamspace you may
  // not publish into is not one you may move into either.
  const toRole = await getMembership(teamspaceId, user.id);
  if (!canPublishInto(toRole)) {
    return bad("You can't move it there.", 403);
  }

  const target = await queryFirst<{ id: string; status: string }>(
    "SELECT id, status FROM teamspaces WHERE id = ?",
    teamspaceId,
  );
  if (!target) return bad("You can't move it there.", 403);
  if (target.status !== "active") return bad("That teamspace is suspended.", 403);

  // The cap the publish route enforces, enforced here too. Without this, move is
  // a way to put unlimited documents into a teamspace whose plan forbids them —
  // a billing bypass reachable from a button.
  const allowance = await checkDocumentAllowance(env().DB, teamspaceId);
  if (!allowance.allowed) {
    return bad(documentLimitMessage(allowance, `${siteOrigin()}/pricing`), 403);
  }

  // folder_id must go: folders.teamspace_id is NOT NULL (migration 0010), so a
  // folder belongs to exactly one teamspace. Carrying it across would leave the
  // document pointing at a folder in the teamspace it just left.
  await execute(
    "UPDATE documents SET teamspace_id = ?, folder_id = NULL, updated_at = ? WHERE id = ?",
    teamspaceId,
    Date.now(),
    documentId,
  );

  // Read receipts do not cross teamspaces: teamspace-A members' reading behavior
  // must not become visible to teamspace B, so the receipts are dropped outright.
  await execute("DELETE FROM member_doc_views WHERE document_id = ?", documentId);

  // The memory moves with the document: the old teamspace must not keep holding
  // a readable excerpt of a doc that may have been moved precisely to restrict it.
  await execute(
    "UPDATE org_memory SET teamspace_id = ? WHERE document_id = ?",
    teamspaceId,
    documentId,
  );

  return NextResponse.json({ ok: true, teamspaceId });
}
