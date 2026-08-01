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

// Two independent ceilings, tuned so a real person retrying never meets them.
//
// The window is short on purpose. rateLimit() re-puts the counter with a fresh
// TTL on every allowed hit, so the window runs from the LAST send, not the
// first — an hour-long window meant one distracted burst locked an address out
// for a full hour from its final attempt. Fifteen minutes keeps the same burst
// ceiling while making the lockout something you can wait out.
const EMAIL_SEND_LIMIT = 8;
const EMAIL_SEND_WINDOW = 15 * 60;
// Per-IP is the enumeration ceiling, so it stays hourly and stays the tighter
// of the two in practice: it is the one an attacker walking a list of addresses
// actually runs into. An office or campus NAT shares one IP, hence the headroom.
const IP_SEND_LIMIT = 40;
const IP_SEND_WINDOW = 60 * 60;

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

  // One ceiling stops hammering a single mailbox, the other stops one host
  // walking a list of addresses. The email key is hashed so the KV keyspace
  // holds no plaintext addresses.
  //
  // The wait is derived from the window rather than written into the string —
  // the old copy hardcoded "an hour" and would have started lying the moment
  // anyone retuned the limit.
  const emailKey = (await hashToken(emailNorm)).slice(0, 32);
  if (
    !(await rateLimit(
      `auth:send:email:${emailKey}`,
      EMAIL_SEND_LIMIT,
      EMAIL_SEND_WINDOW,
    ))
  ) {
    return NextResponse.json(
      {
        error:
          `Too many sign-in emails for that address. ` +
          `Try again in ${Math.round(EMAIL_SEND_WINDOW / 60)} minutes, ` +
          `or use the most recent code we sent you — it may still be valid.`,
      },
      { status: 429 },
    );
  }
  if (
    !(await rateLimit(
      `auth:send:ip:${clientIp(req)}`,
      IP_SEND_LIMIT,
      IP_SEND_WINDOW,
    ))
  ) {
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
