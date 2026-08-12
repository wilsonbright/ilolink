// GET  /api/teamspaces — which teamspaces may this browser publish into?
// POST /api/teamspaces — create a shared teamspace. The creator becomes owner.
//
// The personal teamspace is distinct: auto-created at sign-in, never surfaced
// as a thing you make, and always first in the GET (see listTeamspacesForUser's
// ORDER BY is_personal DESC — the composer's visibility default leans on it).

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { execute, queryFirst } from "@/lib/db/client";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership, listTeamspacesForUser } from "@/lib/teamspace/store";
import { buildPublishTargets } from "@/lib/teamspace/publish-target";
import { bootstrapTeamspace } from "@/lib/teamspace/bootstrap";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { env } from "@/lib/cf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME = 60;

// The landing-page composer is a client island on a statically prerendered page
// (see the hard constraint at the top of app/page.tsx), so it cannot be handed
// its teamspaces as props — it asks for them here after mount.
//
// Deliberately 200-with-signedIn:false rather than 401, mirroring
// /api/auth/me, which the same page already calls: most visitors to `/` are
// signed out, and a 401 would put a red console entry on every load of the
// highest-traffic page on the site.
//
// Not folded into /api/auth/me on purpose. That route exists to keep the
// landing page off D1-heavy work and documents itself as returning the email
// and "nothing else"; merging this in would make every marketing hit pay a
// teamspace query just to render a nav pill.
//
// No role filter: canPublishInto is atLeast("member"), so every membership row
// in the list is a valid destination.
export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  const teamspaces = user
    ? buildPublishTargets(await listTeamspacesForUser(user.id))
    : [];
  return NextResponse.json(
    { signedIn: !!user, teamspaces },
    // Must never reach a shared cache: this is per-session, and it is the first
    // response to carry shared-teamspace *names* to the public landing page.
    { headers: { "cache-control": "private, no-store" } },
  );
}

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

  let body: { name?: unknown; copySkillsFrom?: unknown };
  try {
    body = (await req.json()) as { name?: unknown; copySkillsFrom?: unknown };
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

  // Copying reads another teamspace's skills, so membership of the SOURCE must
  // be proven here — bootstrapTeamspace() deliberately does no check of its
  // own, and an unverified id would turn "create a teamspace" into a way to
  // read any org's skills by guessing its id. 404, not 403, so a caller cannot
  // learn which ids exist.
  const copyFromRaw =
    typeof body.copySkillsFrom === "string" && body.copySkillsFrom
      ? body.copySkillsFrom
      : null;
  if (copyFromRaw && !(await getMembership(copyFromRaw, user.id))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
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

  // Best-effort: the teamspace and its owner row are already committed, so a
  // bootstrap failure must not turn a successful create into a 500 the user
  // would retry.
  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  const bootstrap = await bootstrapTeamspace(
    { DB: e.DB, DOCS: e.DOCS },
    id,
    user.id,
    { copySkillsFrom: copyFromRaw },
  );

  const row = await queryFirst("SELECT * FROM teamspaces WHERE id = ?", id);
  return NextResponse.json({ teamspace: row, bootstrap }, { status: 201 });
}
