// POST /api/comments/moderate — hide or flag a comment on your own doc (spec §8).
//
// Body: { slug, commentId, action:"hide"|"flag", token }. We resolve the doc by
// slug, verify the manage token (constant-time) against its stored hash, then
// flip the comment's status — scoped to this document_id so a valid token for
// one doc can never touch another's comments. All values are D1-parametrized.

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import { execute } from "@/lib/db/client";

export const runtime = "nodejs";

type Action = "hide" | "flag";
const STATUS: Record<Action, string> = { hide: "hidden", flag: "flagged" };

function isAction(v: unknown): v is Action {
  return v === "hide" || v === "flag";
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }
  const b = body as Record<string, unknown>;

  const slug = typeof b.slug === "string" ? b.slug : "";
  const commentId = typeof b.commentId === "string" ? b.commentId : "";
  const token = typeof b.token === "string" ? b.token : "";
  const action = b.action;

  if (!slug || !commentId) {
    return NextResponse.json(
      { error: "Fields 'slug' and 'commentId' are required." },
      { status: 400 },
    );
  }
  if (!isAction(action)) {
    return NextResponse.json(
      { error: "Field 'action' must be 'hide' or 'flag'." },
      { status: 400 },
    );
  }

  // Slug and the legacy token arrive in the JSON body here, not the query.
  // canModerate — not canRead — so a viewer/commenter share cannot hide other
  // people's comments on a document merely shared with them.
  const guard = await guardDoc(req, {
    require: "canModerate",
    slug,
    token: token || null,
  });
  if (!guard.ok) return guard.response;
  const { doc } = guard;

  await execute(
    "UPDATE comments SET status = ? WHERE id = ? AND document_id = ?",
    STATUS[action],
    commentId,
    doc.id,
  );

  return NextResponse.json({ ok: true, status: STATUS[action] });
}
