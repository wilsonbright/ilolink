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
      <h1 className="mb-2 text-2xl font-medium text-ink">
        You&rsquo;re in{teamspace?.name ? `: ${teamspace.name}` : ""}
      </h1>
      <p className="mb-6 leading-relaxed text-ink-soft">
        You joined as {result.role === "owner" ? "an owner" : "a member"}. Its
        documents now appear on your dashboard.
      </p>
      <Link
        href="/dashboard"
        className="inline-block rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity duration-150 hover:opacity-90"
      >
        Go to your documents
      </Link>
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-2 text-2xl font-medium text-ink">Invitation</h1>
      <p className="mb-6 leading-relaxed text-ink-soft">{message}</p>
      <Link href="/dashboard" className="text-accent underline">
        Go to your documents
      </Link>
    </div>
  );
}
