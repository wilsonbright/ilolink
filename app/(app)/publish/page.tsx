import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth/current-user";
import { listTeamspacesForUser } from "@/lib/teamspace/store";
import {
  buildPublishTargets,
  resolvePublishTeamspace,
} from "@/lib/teamspace/publish-target";
import { PublishForm } from "./publish-form";

// Reads the session to work out which teamspaces you can publish into, so it
// cannot be statically rendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// noindex: this is the signed-in composer, and `/` already carries the public
// one — indexing both would compete for the same query with the gated copy.
export const metadata: Metadata = {
  title: "Publish — ilolink",
  description: "Paste Markdown or HTML, get a link, and see how it's read.",
  robots: { index: false, follow: false },
};

// Publishing requires a session (/api/publish returns 401 without one) and the
// document is owned by a teamspace. Pre-accounts docs still carry the per-doc
// manage token the browser keeps, not by a signed-in session.
//
// `?ts=` is carried over from the /dashboard tab you clicked "Publish new" from,
// so the teamspace you were looking at is the one preselected. It is only a
// default — the picker can override it, and /api/publish re-checks membership.
export default async function PublishPage({
  searchParams,
}: {
  searchParams: Promise<{ ts?: string }>;
}) {
  const { ts } = await searchParams;
  // Signed out is a normal state here: the form renders, and submitting prompts
  // for an account in place rather than bouncing to /signin first.
  const user = await currentUser();
  const teamspaces = user ? await listTeamspacesForUser(user.id) : [];
  const targets = buildPublishTargets(teamspaces);
  const initialTeamspaceId = resolvePublishTeamspace(ts, targets);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="text-sm font-extrabold tracking-tight text-ink transition-colors duration-150 hover:text-accent"
      >
        ilolink
      </Link>

      <div className="mt-12">
        <h1 className="text-3xl leading-tight text-ink">
          Publish a document
        </h1>
        {/* Said "No account needed" until 2026-08-08 — left over from the
            accountless era and contradicted by the comment above this
            component: /api/publish returns 401 without a session. Readers
            still need no account, and that is the half worth saying. */}
        <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">
          Paste your Markdown or HTML, or drop a file. You get a link, and you
          can see how people actually read it. Anyone can open it &mdash; no
          account needed to read.
        </p>
        <PublishForm
          teamspaces={targets}
          initialTeamspaceId={initialTeamspaceId}
        />
      </div>
    </main>
  );
}
