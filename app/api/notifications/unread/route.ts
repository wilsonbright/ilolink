// GET /api/notifications/unread — the badge count for the nav island.
//
// Called on every page render, signed in or not, so it must be cheap and never
// noisy: signed out is a plain 200 {"count":0}, not a 401 the shell would have
// to special-case. The count itself is one hit on the partial unread index.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { unreadCount } from "@/lib/notifications/store";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  const count = user ? await unreadCount(db(), user.id) : 0;
  return NextResponse.json(
    { count },
    { headers: { "cache-control": "private, no-store" } },
  );
}
