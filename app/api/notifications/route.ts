// GET  /api/notifications — the signed-in user's feed, newest first, limit 50.
// POST /api/notifications — mark read: {"action":"read-all"} or {"ids":[...]}.
//
// Strictly recipient-scoped: every query in lib/notifications/store.ts filters
// on the requester's user id, so there is no id a caller can pass to read or
// mark someone else's rows. The joined docTitle/commentExcerpt resolve at read
// time and go null when the underlying row was deleted — the migration chose a
// notification that outlives its comment over an FK that blocks unpublish.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import {
  listNotifications,
  markAllRead,
  markRead,
} from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const notifications = await listNotifications(db(), user.id, 50);
  return NextResponse.json(
    { notifications },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: { action?: unknown; ids?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.action === "read-all") {
    await markAllRead(db(), user.id);
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.ids)) {
    const ids = body.ids.filter((v): v is string => typeof v === "string");
    await markRead(db(), user.id, ids);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
