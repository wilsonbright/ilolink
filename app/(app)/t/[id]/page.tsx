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
import { countProposals } from "@/lib/artifacts/store-core";
import { env } from "@/lib/cf";
import { MembersAdmin } from "./members-admin";
import { Upgrade } from "./upgrade";
import { planFor, isPlanId, type PlanId } from "@/lib/billing/plans";
import { countDocuments } from "@/lib/billing/entitlements";

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

  const teamspace = await queryFirst<{
    name: string;
    is_personal: number;
    plan: string;
  }>("SELECT name, is_personal, plan FROM teamspaces WHERE id = ?", id);
  if (!teamspace) notFound();

  const isOwner = role === "owner";
  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  const [members, pending, artifactCount, proposals] = await Promise.all([
    listMembers(id),
    isOwner ? listPendingInvites(id) : Promise.resolve([]),
    // Every kind, not just skills: this number links to the registry, and a
    // count that disagrees with the page it sends you to is worse than none.
    queryFirst<{ n: number }>(
      "SELECT COUNT(*) AS n FROM artifacts WHERE teamspace_id = ? AND archived_at IS NULL",
      id,
    ),
    countProposals({ DB: e.DB, DOCS: e.DOCS }, id),
  ]);
  const artifacts = Number(artifactCount?.n ?? 0);
  const plan = planFor(teamspace.plan);
  const docsUsed = await countDocuments(e.DB, id);

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      <p className="text-sm">
        <Link
          href="/t"
          className="text-ink-soft transition-colors duration-150 hover:text-accent-strong"
        >
          &larr; Teamspaces
        </Link>
      </p>
      <div className="flex flex-wrap items-baseline justify-between gap-3.5 pt-5">
        <h1 className="ml-[-0.058em] text-[clamp(32px,3.6vw,44px)] leading-none text-ink">
          {teamspace.name}
        </h1>
        <div className="flex gap-2.5">
          <Link
            href={`/dashboard?ts=${id}`}
            className="border border-divider px-4 py-2 text-sm font-extrabold text-ink transition-colors duration-150 hover:bg-ink/5"
          >
            Documents
          </Link>
          {/* Anchor to the invite form below — which only renders for owners,
              so the button is gated the same way. */}
          {isOwner && (
            <a
              href="#invite"
              className="bg-accent px-4 py-2 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong"
            >
              Invite someone
            </a>
          )}
        </div>
      </div>
      <p className="mb-7 mt-3.5 text-[15.5px] leading-[26px] text-ink-soft">
        {/* Was "Invite someone and it becomes shared" — no longer true. A
            personal teamspace is one seat, and inviting anyone requires a paid
            plan. Promising an invite that the seat gate will refuse is the
            worst version of this sentence. */}
        {teamspace.is_personal && plan.seats <= 1
          ? "Your personal teamspace — just you. Upgrade to a team plan to work with other people here."
          : `${members.length} of ${plan.seats} seats used. Everyone here can see and edit its documents.`}{" "}
        <Link
          href="/billing"
          className="font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink"
        >
          Manage plan
        </Link>
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

      <section className="mt-12 border-t-2 border-divider pt-8">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-ink">Registry</h2>
          <Link
            href={`/t/${id}/registry`}
            className="shrink-0 text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink"
          >
            {artifacts === 0
              ? "View"
              : `View ${artifacts} ${artifacts === 1 ? "artifact" : "artifacts"}`}
          </Link>
        </div>
        <p className="leading-relaxed text-ink-soft">
          Skills, agents, specs, plans and handoffs that assistants connected to
          this teamspace can read and write.
        </p>
        {/* Surfaced here as well as in the registry because a proposal is a
            teammate's change that has NOT taken effect, and the person who can
            approve it may only ever visit the teamspace page. */}
        {proposals > 0 && (
          <p className="mt-3 leading-relaxed text-ink-soft">
            <Link
              href={`/t/${id}/proposals`}
              className="text-accent-strong underline"
            >
              {proposals} {proposals === 1 ? "change is" : "changes are"}{" "}
              waiting for review
            </Link>{" "}
            — proposed versions are not what assistants read until someone
            approves them.
          </p>
        )}
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
          <Link href="/connect" className="text-accent-strong underline">
            Connect an assistant
          </Link>
        </p>
      </section>

      {/* Owner only. Anyone can SEE the plan they are on, but /api/billing/
          checkout refuses a non-owner, so showing buttons to a member would
          offer something the server will reject. */}
      {isOwner && (
        <Upgrade
          teamspaceId={id}
          currentPlan={(isPlanId(teamspace.plan) ? teamspace.plan : "free") as PlanId}
          seatsUsed={members.length}
          docsUsed={docsUsed}
        />
      )}

      {/* "Unless review is turned off" is load-bearing: whether a member's
          write lands as a proposal is per-teamspace
          (teamspaces.review_member_writes, see canPublishArtifact in
          lib/teamspace/permissions.ts), not a law of the product. */}
      <p className="mt-12 max-w-[62ch] text-sm leading-6 text-ink-faint">
        A member&rsquo;s registry writes wait for an admin, unless this
        teamspace turns review off. An admin&rsquo;s own writes go live
        immediately. Only an owner can make another owner.
      </p>
    </div>
  );
}
