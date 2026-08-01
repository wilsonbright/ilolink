// POST /api/auth/verify — finish a sign-in with the 6-digit code.
// Body: { challengeId, code }. Sets the session cookie on success.

import { NextResponse } from "next/server";
import { ChallengeError, redeemCode } from "@/lib/auth/challenge";
import { completeSignIn } from "@/lib/auth/signin";
import { serializeSessionCookie } from "@/lib/auth/cookies";
import { DEFAULT_REDIRECT, safeRedirect } from "@/lib/auth/redirect";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

// The per-challenge attempt counter is the real defence; this only blunts a
// host churning through fresh challenges.
const IP_VERIFY_LIMIT = 30;

export async function POST(req: Request): Promise<NextResponse> {
  let body: { challengeId?: unknown; code?: unknown };
  try {
    body = (await req.json()) as { challengeId?: unknown; code?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!challengeId || !code) {
    return NextResponse.json({ error: "Enter the code." }, { status: 400 });
  }

  if (!(await rateLimit(`auth:verify:ip:${clientIp(req)}`, IP_VERIFY_LIMIT, 3600))) {
    return NextResponse.json(
      { error: "Too many attempts from this network." },
      { status: 429 },
    );
  }

  let redeemed;
  try {
    redeemed = await redeemCode(challengeId, code);
  } catch (e) {
    if (e instanceof ChallengeError) {
      // "expired" and "too_many_attempts" are actionable, so say them plainly.
      // Everything else collapses to one message — distinguishing "no such
      // challenge" from "wrong code" would leak which ids are live.
      const message =
        e.reason === "expired"
          ? "That code expired. Request a new one."
          : e.reason === "too_many_attempts"
            ? "Too many incorrect attempts. Request a new code."
            : "That code isn't right.";
      const status = e.reason === "bad_code" ? 401 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    throw e;
  }

  const { user, sessionToken: raw } = await completeSignIn(redeemed.emailNorm, req);

  const res = NextResponse.json({
    ok: true,
    redirectTo: safeRedirect(redeemed.redirectTo ?? DEFAULT_REDIRECT),
    email: user.email,
  });
  res.headers.append("set-cookie", serializeSessionCookie(raw));
  return res;
}
