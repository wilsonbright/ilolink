// POST /api/auth/signout — end the current session.
//
// App (creator) origin only. Deletes the KV session behind the cookie, clears
// the cookie, and returns to the landing page. Idempotent: signing out when
// already signed out just redirects home.
import { NextResponse, type NextRequest } from "next/server";
import { destroySession, SESSION_COOKIE, sessionCookieAttrs } from "@/lib/auth/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    await destroySession(token);
  }

  const response = NextResponse.redirect(new URL("/", origin), { status: 303 });
  // Overwrite the cookie with the same attributes but an immediate expiry so the
  // browser drops it (path/secure/httpOnly must match to reliably clear it).
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieAttrs(), maxAge: 0 });
  return response;
}
