// POST /api/comments/moderate — hide or flag a comment on your own doc (spec §8).
//
// Body: { slug, commentId, action:"hide"|"flag", token }. We resolve the doc by
// slug, verify the manage token (constant-time) against its stored hash, then
// flip the comment's status — scoped to this document_id so a valid token for
// one doc can never touch another's comments. All values are D1-parametrized.

import { NextResponse } from "next/server";
import { getDocumentBySlug } from "@/lib/db/documents";
import { verifyToken } from "@/lib/manage-token";
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

  if (!slug || !commentId || !token) {
    return NextResponse.json(
      { error: "Fields 'slug', 'commentId', and 'token' are required." },
      { status: 400 },
    );
  }
  if (!isAction(action)) {
    return NextResponse.json(
      { error: "Field 'action' must be 'hide' or 'flag'." },
      { status: 400 },
    );
  }

  const doc = await getDocumentBySlug(slug);
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await verifyToken(token, doc.manage_token_hash))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await execute(
    "UPDATE comments SET status = ? WHERE id = ? AND document_id = ?",
    STATUS[action],
    commentId,
    doc.id,
  );

  return NextResponse.json({ ok: true, status: STATUS[action] });
}
