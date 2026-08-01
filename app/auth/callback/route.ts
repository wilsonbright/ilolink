// GET /auth/callback?t=<linkToken>&next=<path> — the magic-link path.
//
// Redeems the link, sets the session cookie, and 302s onward. Errors land on
// /signin with a reason rather than rendering a dead end, because the most
// common failure here is benign: a link that was already used, or one a
// corporate mail scanner opened before the human did.

import { NextResponse } from "next/server";
import { ChallengeError, redeemLink } from "@/lib/auth/challenge";
import { completeSignIn } from "@/lib/auth/signin";
import { serializeSessionCookie } from "@/lib/auth/cookies";
import { safeRedirect } from "@/lib/auth/redirect";
import { siteOrigin } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const next = safeRedirect(url.searchParams.get("next"));
  const origin = siteOrigin();

  if (!token) return NextResponse.redirect(`${origin}/signin?e=bad_link`, 302);

  let redeemed;
  try {
    redeemed = await redeemLink(token);
  } catch (e) {
    const reason = e instanceof ChallengeError ? e.reason : "bad_link";
    return NextResponse.redirect(`${origin}/signin?e=${reason}`, 302);
  }

  const { sessionToken: raw } = await completeSignIn(redeemed.emailNorm, req);

  const res = NextResponse.redirect(
    `${origin}${safeRedirect(redeemed.redirectTo ?? next)}`,
    302,
  );
  res.headers.append("set-cookie", serializeSessionCookie(raw));
  return res;
}
