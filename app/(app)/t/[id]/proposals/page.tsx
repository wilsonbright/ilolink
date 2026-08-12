// /t/<id>/proposals — the review inbox.
//
// A member's write to the registry lands as `proposed`, not `published`, so it
// is NOT what connected agents read until someone with authority says so (see
// canPublishArtifact). That rule is only meaningful if the queue it creates is
// visible and easy to clear — an invisible queue turns every member's push into
// a change that quietly never happened.
//
// Everyone in the teamspace can see this list, including the people whose
// proposals are in it: knowing your push is waiting is the whole point. Only an
// owner or admin gets the buttons, and the route enforces that again server-side
// rather than trusting this page to have hidden them.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { canReviewArtifact } from "@/lib/teamspace/permissions";
import { listProposals } from "@/lib/artifacts/store-core";
import { coerceKind, KINDS } from "@/lib/artifacts/kinds";
import { queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";
import { ProposalInbox } from "./proposal-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposals — ilolink",
  robots: { index: false, follow: false },
};

function when(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(`/t/${id}/proposals`)}`);
  }

  const role = await getMembership(id, user.id);
  if (!role) notFound();

  const teamspace = await queryFirst<{ name: string }>(
    "SELECT name FROM teamspaces WHERE id = ?",
    id,
  );
  if (!teamspace) notFound();

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  const proposals = await listProposals({ DB: e.DB, DOCS: e.DOCS }, id);
  const canReview = canReviewArtifact(role);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b-2 border-divider pb-3">
        <h1 className="text-2xl text-ink">Proposals</h1>
        <span className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href={`/t/${id}/registry`}
            className="font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink"
          >
            Registry
          </Link>
          <Link
            href={`/t/${id}`}
            className="text-ink-soft transition-colors duration-150 hover:text-ink"
          >
            {teamspace.name}
          </Link>
        </span>
      </div>
      <p className="mb-8 leading-relaxed text-ink-soft">
        Changes written by a member and held back for review. Until one is
        approved it is not what assistants connected to this teamspace read —
        the live version stays exactly as it was.
      </p>

      {proposals.length === 0 ? (
        <div className="border border-hairline bg-surface px-5 py-8">
          <p className="mb-2 text-ink">Nothing waiting.</p>
          <p className="leading-relaxed text-ink-soft">
            Everything in{" "}
            <Link href={`/t/${id}/registry`} className="text-accent-strong underline">
              the registry
            </Link>{" "}
            is live.
          </p>
        </div>
      ) : (
        <ProposalInbox
          teamspaceId={id}
          canReview={canReview}
          items={proposals.map((p) => {
            const kind = coerceKind(p.kind);
            return {
              versionId: p.version_id,
              kind,
              kindLabel: KINDS[kind].label,
              name: p.name,
              version: p.version,
              description: p.description,
              changelog: p.changelog,
              sourcePath: p.source_path,
              authorEmail: p.author_email,
              replacesVersion: p.replaces_version,
              // Formatted on the server: toLocaleDateString in a client
              // component renders differently before and after hydration.
              proposedOn: when(p.created_at),
            };
          })}
        />
      )}
    </div>
  );
}
