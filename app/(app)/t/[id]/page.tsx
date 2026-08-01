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
  const [members, pending, skillCount] = await Promise.all([
    listMembers(id),
    isOwner ? listPendingInvites(id) : Promise.resolve([]),
    queryFirst<{ n: number }>(
      "SELECT COUNT(*) AS n FROM skills WHERE teamspace_id = ? AND archived_at IS NULL",
      id,
    ),
  ]);
  const skills = Number(skillCount?.n ?? 0);

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

      <section className="mt-12 border-t border-hairline pt-8">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="font-medium text-ink">Skills</h2>
          <Link
            href={`/t/${id}/skills`}
            className="shrink-0 text-sm text-accent transition-colors duration-150 hover:text-ink"
          >
            {skills === 0
              ? "View"
              : `View ${skills} ${skills === 1 ? "skill" : "skills"}`}
          </Link>
        </div>
        <p className="leading-relaxed text-ink-soft">
          Shared instructions that assistants connected to this teamspace can
          read and write.
        </p>
        {/* The gotcha worth stating outright: an assistant authorised BEFORE
            this teamspace existed is still bound to whichever teamspace was
            picked at approval time, because the id is sealed into the OAuth
            grant. Nothing errors — it just quietly writes somewhere else. */}
        <p className="mt-3 leading-relaxed text-ink-soft">
          An assistant you connected earlier is still pointed at whichever
          teamspace you chose when you approved it. To let one work here,
          reconnect it and pick{" "}
          <span className="text-ink">{teamspace.name}</span> on the approval
          screen, or create a connector token scoped to this teamspace.{" "}
          <Link href="/connect" className="text-accent underline">
            Connect an assistant
          </Link>
        </p>
      </section>
    </div>
  );
}
