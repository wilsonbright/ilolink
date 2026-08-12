// POST /api/teamspaces/<id>/invite — invite someone by email. Admins and
// owners; only an owner may invite at the owner role.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import {
  canChangeRole,
  canInvite,
  type TeamRole,
} from "@/lib/teamspace/permissions";
import {
  createInvite,
  listPendingInvites,
  INVITE_TTL_DAYS,
} from "@/lib/teamspace/invites";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/otp";
import { mailerConfig, siteOrigin } from "@/lib/auth/config";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { queryFirst } from "@/lib/db/client";
import { rateLimit } from "@/lib/ratelimit";
import { env } from "@/lib/cf";
import { planFor } from "@/lib/billing/plans";
import { countMembers } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

const ROLES: TeamRole[] = ["owner", "admin", "member"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: teamspaceId } = await params;

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const role = await getMembership(teamspaceId, user.id);
  // 404 rather than 403 for a non-member: a stranger should not be able to
  // learn that a teamspace id exists by watching the status code change.
  if (!role) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!canInvite(role)) {
    return NextResponse.json(
      { error: "Only an admin or owner can invite people." },
      { status: 403 },
    );
  }

  if (!(await rateLimit(`ts:invite:${teamspaceId}`, 30, 3600))) {
    return NextResponse.json(
      { error: "Too many invitations sent. Try again later." },
      { status: 429 },
    );
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; role?: unknown };
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
  // Anything unrecognised lands as 'member' rather than 400ing, so an older
  // client that omits the field keeps working.
  const inviteRole: TeamRole =
    typeof body.role === "string" && (ROLES as string[]).includes(body.role)
      ? (body.role as TeamRole)
      : "member";
  // Minting an owner is an owner's privilege, not an admin's — otherwise an
  // admin could invite an address they control as owner and take the teamspace,
  // which is exactly the path canChangeRole and canRemoveMember already close.
  if (inviteRole === "owner" && !canChangeRole(role)) {
    return NextResponse.json(
      { error: "Only an owner can invite another owner." },
      { status: 403 },
    );
  }

  const teamspace = await queryFirst<{ name: string; plan: string }>(
    "SELECT name, plan FROM teamspaces WHERE id = ?",
    teamspaceId,
  );
  if (!teamspace) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Already a member — succeed quietly rather than sending a link that would
  // no-op, and do not reveal membership to a caller probing addresses.
  const already = await queryFirst<{ n: number }>(
    `SELECT COUNT(*) AS n FROM teamspace_members m
       JOIN users u ON u.id = m.user_id
      WHERE m.teamspace_id = ? AND u.email_norm = ?`,
    teamspaceId,
    emailNorm,
  );
  if (Number(already?.n ?? 0) > 0) {
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  // Seat check — NOT the authority. The real gate is inside the INSERT in
  // lib/teamspace/invites.ts acceptInvite(); this one exists so an owner is
  // told "your team is full" while they are looking at the invite form, rather
  // than the invitee discovering it days later by clicking a dead link.
  //
  // It cannot be the authority on its own: invites live 14 days and several can
  // be outstanding at once, so N invites all issued while there was room can
  // all be accepted afterwards. That is why pending invites are counted here
  // alongside members — it stops an owner over-issuing — and why the atomic
  // check still has to exist at acceptance.
  const plan = planFor(teamspace.plan);
  const seatsUsed = await countMembers(env().DB, teamspaceId);
  const pending = (await listPendingInvites(teamspaceId)).length;
  if (seatsUsed + pending >= plan.seats) {
    return NextResponse.json(
      {
        error:
          plan.seats <= 1
            ? "A personal teamspace is just you. Upgrade to a team plan to invite people."
            : `This team is full — the ${plan.label} plan includes ${plan.seats} members (${seatsUsed} joined, ${pending} invited). Upgrade for more seats, or remove someone first.`,
        upgrade: "/pricing",
      },
      { status: 403 },
    );
  }

  const { token } = await createInvite(
    teamspaceId,
    emailNorm,
    inviteRole,
    user.id,
  );
  const link = `${siteOrigin()}/invite?t=${encodeURIComponent(token)}`;

  try {
    await sendEmail(
      mailerConfig(),
      emailNorm,
      inviteEmail(teamspace.name, user.email, link),
    );
  } catch {
    return NextResponse.json(
      { error: "Could not send the invitation. Try again in a moment." },
      { status: 502 },
    );
  }

  // The link goes back to the inviter as well as to the mailbox. Invitation
  // mail lands in spam often enough that email-only delivery loses invites
  // outright, and the token was never email-bound anyway: lib/teamspace/invites.ts
  // states that holding the link IS the authority and that forwarding is
  // expected behaviour, not a hole. The caller has already proven they are an
  // admin or owner of this teamspace, and they are the person who just created
  // this token.
  //
  // Note this is returned only on the success path — a send failure still 502s
  // above rather than handing back a link, so a broken mailer stays visible
  // instead of quietly looking like a working one.
  return NextResponse.json(
    { ok: true, link, expiresInDays: INVITE_TTL_DAYS },
    { headers: { "cache-control": "no-store" } },
  );
}
