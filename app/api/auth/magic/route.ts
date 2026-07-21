// POST /api/auth/magic — request a sign-in link for {email}.
//
// This runs on the app (creator) origin only. It mints a single-use magic token
// and hands it to the delivery layer. User creation is deliberately deferred to
// the callback: we don't touch the users table until someone proves control of
// the address. The response is always 200 {ok:true} regardless of whether the
// email exists or is even deliverable, so the endpoint can't be used to probe
// which addresses have accounts. In dev (no mail provider), the link URL is
// echoed back as devUrl so you can sign in without a real mailbox.
import { NextResponse, type NextRequest } from "next/server";
import { createMagicToken, buildMagicUrl } from "@/lib/auth/magic-link";
import { sendMagicLink } from "@/lib/auth/email";
import { rateLimit, clientIp } from "@/lib/ratelimit";

interface Body {
  email?: unknown;
}

// Deliberately permissive: reject only obvious non-addresses. Anything that
// passes still returns the same 200 as everything else.
function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const email = normalizeEmail(body.email);

  // Same opaque success whether or not we actually send. Never reveal state.
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  // Rate limit to blunt email bombing / Resend-quota abuse. Both windows must
  // pass; a blocked request returns the same opaque 200 and simply doesn't send.
  const ip = clientIp(request);
  const [ipOk, emailOk] = await Promise.all([
    rateLimit(`magic:ip:${ip}`, 10, 3600), // 10/hour per IP
    rateLimit(`magic:email:${email}`, 5, 3600), // 5/hour per address
  ]);
  if (!ipOk || !emailOk) {
    return NextResponse.json({ ok: true });
  }

  const token = await createMagicToken(email);
  const url = buildMagicUrl(request.nextUrl.origin, token);
  const result = await sendMagicLink(email, url);

  return NextResponse.json(
    result.devUrl ? { ok: true, devUrl: result.devUrl } : { ok: true },
  );
}
