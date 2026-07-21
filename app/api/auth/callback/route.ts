// GET /api/auth/callback?token=… — complete a magic-link sign-in.
//
// App (creator) origin only. Consuming the token burns it (single-use), and only
// here — after proving control of the address — do we get-or-create the user.
// On success we open a session and drop the host-only session cookie, then send
// the person to their dashboard. Any bad, expired, or spent token lands back on
// the sign-in page with a generic error; we never say why.
import { NextResponse, type NextRequest } from "next/server";
import { consumeMagicToken } from "@/lib/auth/magic-link";
import { getOrCreateUser } from "@/lib/db/users";
import { createSession, SESSION_COOKIE, sessionCookieAttrs } from "@/lib/auth/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;
  const token = request.nextUrl.searchParams.get("token") ?? "";

  const email = await consumeMagicToken(token);
  if (!email) {
    return NextResponse.redirect(new URL("/signin?error=expired", origin));
  }

  const user = await getOrCreateUser(email);
  const sessionToken = await createSession(user.id, user.email);

  const response = NextResponse.redirect(new URL("/dashboard", origin));
  response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieAttrs());
  return response;
}
