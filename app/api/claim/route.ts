// POST /api/claim — attach pre-accounts documents to the signed-in user.
//
// Web documents published before accounts have no server-side owner at all;
// the only proof is the manage token in the publisher's browser localStorage
// (lib/history.ts, key `ilolink:history`). This route lets that browser trade
// those tokens for real ownership.
//
// Every item is verified independently against the stored hash, so a caller
// cannot claim a document by guessing its slug — they must already hold the
// token, which is exactly the authority the old system granted.

import { NextResponse } from "next/server";
import { execute, queryFirst } from "@/lib/db/client";
import { verifyToken } from "@/lib/crypto/token";
import { currentUser } from "@/lib/auth/current-user";
import { ensurePersonalTeamspace } from "@/lib/teamspace/store";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// A browser's history list is small; this only stops someone scripting the
// endpoint to brute-force tokens (which is already infeasible at 190 bits).
const MAX_ITEMS = 200;

interface ClaimItem {
  slug: string;
  token: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to claim." }, { status: 401 });
  }
  if (!(await rateLimit(`claim:ip:${clientIp(req)}`, 30, 3600))) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  let body: { items?: unknown };
  try {
    body = (await req.json()) as { items?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "'items' must be an array." }, { status: 400 });
  }

  const items: ClaimItem[] = body.items
    .slice(0, MAX_ITEMS)
    .filter(
      (i): i is ClaimItem =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as ClaimItem).slug === "string" &&
        typeof (i as ClaimItem).token === "string",
    );

  const teamspace = await ensurePersonalTeamspace(user.id);

  let claimed = 0;
  const alreadyOwned: string[] = [];
  const rejected: string[] = [];

  for (const item of items) {
    const doc = await queryFirst<{
      id: string;
      manage_token_hash: string | null;
      teamspace_id: string | null;
    }>(
      "SELECT id, manage_token_hash, teamspace_id FROM documents WHERE slug = ?",
      item.slug,
    );
    if (!doc) {
      rejected.push(item.slug);
      continue;
    }
    // Already attached to a teamspace — claiming again must not move it, or
    // anyone holding an old token could yank a document out of a teamspace it
    // has since been shared into.
    if (doc.teamspace_id) {
      alreadyOwned.push(item.slug);
      continue;
    }
    if (!(await verifyToken(item.token, doc.manage_token_hash))) {
      rejected.push(item.slug);
      continue;
    }
    await execute(
      `UPDATE documents SET teamspace_id = ?, created_by = ?, updated_at = ?
        WHERE id = ? AND teamspace_id IS NULL`,
      teamspace.id,
      user.id,
      Date.now(),
      doc.id,
    );
    claimed++;
  }

  return NextResponse.json(
    { ok: true, claimed, alreadyOwned, rejected, teamspaceId: teamspace.id },
    { headers: { "cache-control": "private, no-store" } },
  );
}
