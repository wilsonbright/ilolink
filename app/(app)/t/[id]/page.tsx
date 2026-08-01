// /t/<id> — teamspace settings: who is in it, and who has been invited.
//
// Two segments, so it cannot collide with the single-segment slug rewrite in
// next.config.ts that proxies documents to the content worker.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership, listMembers } from "@/lib/teamspace/store";
import { listPendingInvites } from "@/lib/teamspace/invites";
import { queryFirst } from "@/lib/db/client";
import { MembersAdmin } from "./members-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teamspace — ilolink",
  robots: { index: false, follow: false },
};

export default async function TeamspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/t/${id}`)}`);

  const role = await getMembership(id, user.id);
  // 404 rather than 403 — a non-member must not be able to confirm that a
  // teamspace id exists.
  if (!role) notFound();

  const teamspace = await queryFirst<{ name: string; is_personal: number }>(
    "SELECT name, is_personal FROM teamspaces WHERE id = ?",
    id,
  );
  if (!teamspace) notFound();

  const isOwner = role === "owner";
  const [members, pending] = await Promise.all([
    listMembers(id),
    isOwner ? listPendingInvites(id) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-2xl font-medium text-ink">{teamspace.name}</h1>
        <Link
          href="/dashboard"
          className="text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          Documents
        </Link>
      </div>
      <p className="mb-8 leading-relaxed text-ink-soft">
        {teamspace.is_personal
          ? "Your personal teamspace. Invite someone and it becomes shared."
          : `${members.length} ${members.length === 1 ? "person" : "people"}. Everyone here can see and edit its documents.`}
      </p>

      <MembersAdmin
        teamspaceId={id}
        currentUserId={user.id}
        isOwner={isOwner}
        members={members.map((m) => ({
          user_id: m.user_id,
          email: m.email,
          role: m.role,
        }))}
        pendingInvites={pending.map((i) => ({
          id: i.id,
          email_norm: i.email_norm,
          role: i.role,
        }))}
      />
    </div>
  );
}
