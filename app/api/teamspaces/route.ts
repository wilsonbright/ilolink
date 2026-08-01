// POST /api/teamspaces — create a shared teamspace. The creator becomes owner.
//
// Distinct from the personal teamspace, which is auto-created at sign-in and
// never surfaced as a thing you make.

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { execute, queryFirst } from "@/lib/db/client";
import { currentUser } from "@/lib/auth/current-user";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MAX_NAME = 60;

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!(await rateLimit(`ts:create:${user.id}`, 10, 3600))) {
    return NextResponse.json(
      { error: "Too many teamspaces created. Try again later." },
      { status: 429 },
    );
  }
  // Also cap per IP: one throwaway account per teamspace would otherwise walk
  // straight past the per-user limit.
  if (!(await rateLimit(`ts:create:ip:${clientIp(req)}`, 20, 3600))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: { name?: unknown };
  try {
    body = (await req.json()) as { name?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = (typeof body.name === "string" ? body.name : "").trim();
  if (!name || name.length > MAX_NAME) {
    return NextResponse.json(
      { error: `Enter a name of 1–${MAX_NAME} characters.` },
      { status: 400 },
    );
  }

  const id = `t_${nanoid(16)}`;
  const now = Date.now();
  await execute(
    `INSERT INTO teamspaces (id, name, created_by, is_personal, created_at)
     VALUES (?, ?, ?, 0, ?)`,
    id,
    name,
    user.id,
    now,
  );
  await execute(
    `INSERT INTO teamspace_members (teamspace_id, user_id, role, joined_at)
     VALUES (?, ?, 'owner', ?)`,
    id,
    user.id,
    now,
  );

  const row = await queryFirst("SELECT * FROM teamspaces WHERE id = ?", id);
  return NextResponse.json({ teamspace: row }, { status: 201 });
}
