// Lightweight route guard for the creator surfaces. This only checks that the
// session cookie is present — a cheap gate so signed-out visitors get bounced to
// /signin at the edge. Full validation (KV lookup + D1 hydrate) happens in the
// page via currentUser(); a present-but-invalid cookie still fails there.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const signin = new URL("/signin", req.url);
  return NextResponse.redirect(signin);
}

// Protect the creator-only areas. Public content and auth routes are untouched.
export const config = {
  matcher: ["/dashboard/:path*", "/publish/:path*"],
};
