// POST /api/comments — post a comment AS THE SIGNED-IN USER.
//
// This lives on the app origin, not the content worker, and is only ever called
// from the /embed/comment iframe — which is itself served from this origin, so
// the request is same-origin and no credentialed cross-origin fetch exists
// anywhere in the design.
//
// Why that matters: ilolink.com and view.ilolink.com share a registrable
// domain, so they are same-site and SameSite=Lax offers no protection between
// them. A trusted=1 document runs arbitrary author JS by design
// (lib/sanitize/csp.ts), so anything the content origin can call with
// credentials is something every trusted-doc author can call. Keeping the
// authenticated write here — reachable only from a frame the author cannot read
// into — is what bounds that.
//
// Anonymous comments still go to the content worker's /_comments. This route is
// exclusively the identified path.

import { NextResponse } from "next/server";
import { db, execute, queryFirst } from "@/lib/db/client";
import { currentUser } from "@/lib/auth/current-user";
import { docAccessFor, getMembership } from "@/lib/teamspace/store";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { displayNameFromEmail } from "@/lib/email/display";
import {
  filterValidMentions,
  insertMentionNotifications,
  memberIdsAmong,
  mentionCandidateIds,
} from "@/lib/notifications/store";

export const runtime = "nodejs";

const MAX_BODY = 4000;

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to comment." }, { status: 401 });
  }

  let body: {
    doc?: unknown;
    body?: unknown;
    parentId?: unknown;
    anchor?: unknown;
    mentions?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const docId = typeof body.doc === "string" ? body.doc : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const parentId =
    typeof body.parentId === "string" && body.parentId ? body.parentId : null;

  if (!docId || !text) {
    return NextResponse.json({ error: "Write something first." }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: "That comment is too long." }, { status: 400 });
  }
  if (!(await rateLimit(`cm:user:${user.id}`, 30, 60))) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }
  if (!(await rateLimit(`cm:ip:${clientIp(req)}`, 60, 60))) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const doc = await queryFirst<{
    id: string;
    teamspace_id: string | null;
    created_by: string | null;
    comments_mode: string;
    visibility: string;
    unpublished_at: number | null;
    trusted: number;
  }>(
    `SELECT id, teamspace_id, created_by, comments_mode, visibility,
            unpublished_at, trusted
       FROM documents WHERE id = ?`,
    docId,
  );
  if (!doc || doc.unpublished_at) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Private (teamspace-only) docs: only members may write, matching the read
  // path (the content worker answers non-members with an empty thread). The
  // refusal is the SAME 404 an unknown id gets — a distinct error would hand
  // any signed-in prober an existence oracle for private ids. A private doc
  // with no teamspace fails closed the same way.
  if (doc.visibility === "private") {
    const membership = doc.teamspace_id
      ? await getMembership(doc.teamspace_id, user.id)
      : null;
    if (!membership) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  }
  if (doc.comments_mode === "off") {
    return NextResponse.json(
      { error: "Comments are turned off for this document." },
      { status: 403 },
    );
  }
  // A trusted document runs the author's own scripts, which can draw a
  // convincing fake composer over ours. Refuse identified comments there
  // outright rather than let a forged one carry a real name.
  if (doc.trusted) {
    return NextResponse.json(
      { error: "Comments are unavailable on this document." },
      { status: 403 },
    );
  }

  // Anyone signed in may comment on a doc that allows comments; a teamspace
  // grant is not required. Public documents are public. The access check
  // matters for the private surfaces, not for leaving a note.
  const caps = await docAccessFor(user.id, {
    id: doc.id,
    teamspace_id: doc.teamspace_id,
    created_by: doc.created_by,
  });

  if (parentId) {
    // One reply level only, matching the content worker's rule.
    const parent = await queryFirst<{ parent_id: string | null; document_id: string }>(
      "SELECT parent_id, document_id FROM comments WHERE id = ? AND status = 'visible'",
      parentId,
    );
    if (!parent || parent.document_id !== docId || parent.parent_id) {
      return NextResponse.json({ error: "Cannot reply to that." }, { status: 400 });
    }
  }

  const commentId = crypto.randomUUID();
  await execute(
    `INSERT INTO comments
       (id, document_id, parent_id, author_name, author_user_id, author_kind,
        anchor, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'user', ?, ?, 'visible', ?)`,
    commentId,
    docId,
    parentId,
    // Snapshot the display name so the thread still reads correctly if the
    // account is later renamed or removed. NEVER the full email: this column is
    // returned verbatim by the content worker's public GET /_comments, so
    // storing an address here would publish it to every reader.
    user.name ?? displayNameFromEmail(user.email),
    user.id,
    // Anchors are top-level only; a reply inherits its parent's.
    parentId ? null : anchorJson(body.anchor),
    text,
    Date.now(),
  );

  // @mentions ride along on the comment, best-effort: the comment is already
  // committed above, and a notification is a courtesy, not part of the write —
  // so any failure here is logged and swallowed rather than turned into a 500
  // for a comment the reader can already see.
  //
  // Mentions only take effect when the commenter is themselves a member of the
  // doc's teamspace (anonymous commenters go through the content worker and
  // never reach this route; signed-in non-members are dropped here). Every
  // candidate id is validated against that same teamspace's member list and
  // invalid or self ids are dropped silently — a malformed mentions field must
  // never fail the comment.
  try {
    const candidates = mentionCandidateIds(body.mentions);
    if (candidates.length > 0 && doc.teamspace_id) {
      const membership = await getMembership(doc.teamspace_id, user.id);
      if (membership) {
        const memberIds = await memberIdsAmong(db(), doc.teamspace_id, candidates);
        const recipients = filterValidMentions(candidates, memberIds, user.id);
        await insertMentionNotifications(db(), {
          recipients,
          actorUserId: user.id,
          teamspaceId: doc.teamspace_id,
          documentId: docId,
          commentId,
        });
      }
    }
  } catch (e) {
    console.error("mention notifications failed:", e);
  }

  return NextResponse.json({ ok: true, canModerate: caps.canModerate });
}

// The anchor contract is owned by the content worker; here we only need to
// store it verbatim when it is a plain object, and drop anything else.
function anchorJson(anchor: unknown): string | null {
  if (!anchor || typeof anchor !== "object") return null;
  try {
    const s = JSON.stringify(anchor);
    return s.length <= 2000 ? s : null;
  } catch {
    return null;
  }
}
