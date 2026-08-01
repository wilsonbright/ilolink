// GET /api/auth/me — is this browser signed in?
//
// Exists so the statically-rendered landing page can show the right nav
// (Sign in vs. Your documents) without becoming dynamic. Rendering the home
// page server-side with a session lookup would add two D1 reads to every
// marketing hit, on the page that carries the most traffic and the least need
// for personalization.
//
// Returns the email so the nav can say who you are. Nothing else — this is a
// public-facing endpoint and the session row's contents are not its business.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  return NextResponse.json(
    user ? { signedIn: true, email: user.email } : { signedIn: false },
    // Must never be cached by a shared cache: the answer is per-session.
    { headers: { "cache-control": "private, no-store" } },
  );
}
