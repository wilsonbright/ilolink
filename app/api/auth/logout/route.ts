// POST /api/auth/logout — revoke the current session and clear the cookie.
//
// POST, not GET: a GET logout can be triggered by any <img> on any page.
// Revoking server-side as well as clearing the cookie means a copy of the
// cookie captured elsewhere is dead too.

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { resolveSession, revokeAllForUser, revokeSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let everywhere = false;
  try {
    const body = (await req.json()) as { everywhere?: unknown };
    everywhere = body?.everywhere === true;
  } catch {
    // No body is the common case for a plain sign-out.
  }

  const ctx = await resolveSession(req);
  if (ctx) {
    if (everywhere) await revokeAllForUser(ctx.user.id);
    else await revokeSession(ctx.sessionId);
  }

  // Always clear the cookie and always report success — an unauthenticated
  // logout is not an error worth surfacing.
  const res = NextResponse.json({ ok: true });
  res.headers.append("set-cookie", clearSessionCookie());
  return res;
}
