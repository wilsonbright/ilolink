// Session cookie serialization. Pure string work, no bindings — so the security
// properties below are unit-testable with no Cloudflare context.
//
// WHY THE __Host- PREFIX (this is the load-bearing decision):
//
// ilolink.com and view.ilolink.com share the registrable domain ilolink.com, so
// they are SAME-SITE but cross-origin. Two consequences that are easy to get
// wrong:
//
//   1. A cookie with `Domain=.ilolink.com` IS sent to view.ilolink.com, which
//      serves untrusted author HTML (and, for trusted=1 docs, arbitrary JS by
//      design — see lib/sanitize/csp.ts).
//   2. SameSite=Lax does NOT protect between them. Lax blocks cross-SITE
//      requests; these are same-site.
//
// The __Host- prefix makes the browser REFUSE the cookie unless it is Secure,
// Path=/, and has no Domain attribute. Host-locking therefore stops being a
// convention someone has to remember and becomes something the browser
// enforces on every Set-Cookie we ever write.
//
// Note this does not address the server-side leak where a Next.js rewrite
// forwards the Cookie header to the content worker (verified 2026-08-01); the
// content worker strips it on ingress for that.

export const SESSION_COOKIE = "__Host-ilo_session";

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export function serializeSessionCookie(
  rawToken: string,
  maxAgeSeconds: number = THIRTY_DAYS_SECONDS,
): string {
  return [
    `${SESSION_COOKIE}=${rawToken}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax", // Strict would break the click-through from the magic link.
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

// Read our session cookie out of a raw Cookie header. Deliberately tolerant of
// spacing, and never throws on a malformed header.
export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return value || null;
  }
  return null;
}
