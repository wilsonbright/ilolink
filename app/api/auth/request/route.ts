// POST /api/auth/request — start a sign-in. Body: { email, next? }
//
// Mints a challenge and emails BOTH a 6-digit code and a magic link, then
// returns the challenge id so the caller can present the code form in the same
// tab (which is what keeps an in-progress publish draft alive).
//
// Always responds 200 with the same shape, whether or not the address has an
// account: revealing that would turn this into an account-enumeration oracle.

import { NextResponse } from "next/server";
import { createChallenge } from "@/lib/auth/challenge";
import { CODE_TTL_SECONDS, isPlausibleEmail, normalizeEmail } from "@/lib/auth/otp";
import { safeRedirect } from "@/lib/auth/redirect";
import { mailerConfig, siteOrigin } from "@/lib/auth/config";
import { sendEmail } from "@/lib/email/send";
import { signInEmail } from "@/lib/email/templates";
import { hashToken } from "@/lib/crypto/token";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: { email?: unknown; next?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; next?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email : "";
  if (!isPlausibleEmail(rawEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  const emailNorm = normalizeEmail(rawEmail);
  const redirectTo = safeRedirect(
    typeof body.next === "string" ? body.next : null,
  );

  // Two independent ceilings: one stops hammering a single mailbox, the other
  // stops one host walking a list of addresses. The email key is hashed so the
  // KV keyspace holds no plaintext addresses.
  const emailKey = (await hashToken(emailNorm)).slice(0, 32);
  if (!(await rateLimit(`auth:send:email:${emailKey}`, 5, 3600))) {
    return NextResponse.json(
      { error: "Too many sign-in emails for that address. Try again in an hour." },
      { status: 429 },
    );
  }
  if (!(await rateLimit(`auth:send:ip:${clientIp(req)}`, 20, 3600))) {
    return NextResponse.json(
      { error: "Too many sign-in attempts from this network." },
      { status: 429 },
    );
  }

  const challenge = await createChallenge(emailNorm, "signin", redirectTo);
  const linkUrl =
    `${siteOrigin()}/auth/callback` +
    `?t=${encodeURIComponent(challenge.linkToken)}` +
    `&next=${encodeURIComponent(redirectTo)}`;

  try {
    await sendEmail(
      mailerConfig(),
      emailNorm,
      signInEmail(challenge.code, linkUrl, Math.round(CODE_TTL_SECONDS / 60)),
    );
  } catch {
    // The challenge row already exists; surface the failure so the user retries
    // rather than sitting on a code that never arrives.
    return NextResponse.json(
      { error: "Could not send the email. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt,
  });
}
