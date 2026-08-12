// /invite?t=<token> — accept a teamspace invitation.
//
// Accepting requires a session, so a signed-out recipient is bounced through
// /signin with `next` pointing back here. That round trip is what proves they
// control an email address at all; the link itself is the authority for WHICH
// teamspace they join.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { acceptInvite, InviteError } from "@/lib/teamspace/invites";
import { queryFirst } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitation — ilolink",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  not_found: "This invitation link isn't valid.",
  expired: "This invitation has expired. Ask for a new one.",
  revoked: "This invitation was withdrawn.",
  already_accepted: "This invitation has already been used.",
  // Without this entry the fallback below would say "this invitation link
  // isn't valid", which is false and sends the invitee chasing the wrong
  // problem. The link is fine; the team has no free seat, and only someone
  // who runs the team can fix it.
  seats_full:
    "This team has no seats left. Ask whoever invited you to upgrade the plan or free up a seat, then use this link again.",
};

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  if (!t) return <Problem message="This invitation link isn't valid." />;

  const user = await currentUser();
  if (!user) {
    // Preserve the token across sign-in so the accept happens automatically.
    redirect(`/signin?next=${encodeURIComponent(`/invite?t=${t}`)}`);
  }

  let result;
  try {
    result = await acceptInvite(t, user.id);
  } catch (e) {
    if (e instanceof InviteError) {
      return <Problem message={MESSAGES[e.reason] ?? MESSAGES.not_found} />;
    }
    throw e;
  }

  const teamspace = await queryFirst<{ name: string }>(
    "SELECT name FROM teamspaces WHERE id = ?",
    result.teamspaceId,
  );

  return (
    <div className="mx-auto max-w-sm py-8">
      <p className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
        Invitation
      </p>
      <h1 className="mb-2 text-2xl text-ink">
        You&rsquo;re in{teamspace?.name ? `: ${teamspace.name}` : ""}
      </h1>
      <p className="mb-6 leading-relaxed text-ink-soft">
        You joined as {result.role === "owner" ? "an owner" : "a member"}. Its
        documents now appear on your dashboard.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-accent px-4 py-2.5 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong"
      >
        Go to your documents
      </Link>
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-2 text-2xl text-ink">Invitation</h1>
      <p className="mb-6 leading-relaxed text-ink-soft">{message}</p>
      <Link
        href="/dashboard"
        className="font-extrabold text-accent-strong underline underline-offset-2 transition-colors duration-150 hover:text-accent"
      >
        Go to your documents
      </Link>
    </div>
  );
}
