// /t — every teamspace you belong to, and the way to make a new one.
//
// This page is the entry point the collaboration feature was missing. All of
// the machinery below it already existed — POST /api/teamspaces, the invite
// route, /invite acceptance, /t/<id> member admin — but nothing in the UI ever
// called the create endpoint, so a shared teamspace could not be brought into
// existence and the invite flow was unreachable in a browser.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  listTeamspacesWithCounts,
  listDashboardArtifactCounts,
} from "@/lib/teamspace/store";
import { indexArtifactCounts } from "@/lib/teamspace/dashboard-kinds";
import { ARTIFACT_KINDS, KINDS, type ArtifactKind } from "@/lib/artifacts/kinds";
import { TAG_ACCENT } from "@/lib/ui/tags";

// The populated kinds for one teamspace, in the canonical ARTIFACT_KINDS order
// so the card and the dashboard axis never disagree about sequence.
function artifactKindsFor(
  counts: Map<ArtifactKind, number> | undefined,
): { kind: ArtifactKind; n: number }[] {
  if (!counts) return [];
  return ARTIFACT_KINDS.map((kind) => ({ kind, n: counts.get(kind) ?? 0 })).filter(
    (x) => x.n > 0,
  );
}
import { CreateTeamspace } from "./create-teamspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teamspaces — ilolink",
  robots: { index: false, follow: false },
};

function people(n: number): string {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

export default async function TeamspacesPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Ft");

  const [teamspaces, artifactCountRows] = await Promise.all([
    listTeamspacesWithCounts(user.id),
    listDashboardArtifactCounts(user.id),
  ]);
  const countsByTeamspace = indexArtifactCounts(artifactCountRows);
  const shared = teamspaces.filter((t) => !t.is_personal);

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3 pb-5">
        <h1 className="ml-[-0.058em] text-[clamp(32px,3.6vw,44px)] leading-none text-ink">
          Teamspaces
        </h1>
        <div className="flex shrink-0 items-baseline gap-2.5">
          {/* This was a bare text link, and the designer read it as another
              line of copy rather than the way out to the document list. It is
              a bordered control now so it looks like something you press. */}
          <Link
            href="/dashboard"
            className="border border-divider px-4 py-2 text-sm font-extrabold text-ink transition-colors duration-150 hover:bg-ink/5"
          >
            Documents
          </Link>
          {/* The form is at the foot of the page, so the primary button is an
              anchor down to it rather than a second copy of it up here. */}
          <Link
            href="#new-teamspace"
            className="bg-accent px-4 py-2 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong"
          >
            New teamspace
          </Link>
        </div>
      </div>
      <p className="max-w-[62ch] border-b-2 border-divider pb-7 text-[15.5px] leading-[26px] text-ink-soft">
        A teamspace is a shared home for documents and the registry. Everyone
        in one can see and edit what it holds, so invite the people you
        actually work with.
      </p>

      <ul>
        {teamspaces.map((t) => {
          // Array.from rather than charAt: a teamspace named with an emoji
          // would otherwise put half a surrogate pair in the tile.
          const initial = (Array.from(t.name.trim())[0] ?? "?").toUpperCase();
          const meta: string[] = [];
          // === 1, not truthiness: is_personal is an integer column, and a
          // bare truthiness check reads shared rows' 0 as meaningful.
          if (t.is_personal === 1) meta.push("Personal workspace");
          // Keyed off the count, not is_personal: a personal teamspace you
          // have invited someone into really does have two people in it.
          meta.push(
            t.member_count === 1 ? "just you" : people(t.member_count),
          );
          // Shown at zero, unlike skills: an empty teamspace is worth
          // spotting, and "0 documents" is the fastest way to see which one
          // you never actually published into.
          meta.push(
            `${t.document_count} ${t.document_count === 1 ? "document" : "documents"}`,
          );
          // Every populated kind, not just skills. This row used to say
          // "13 skills" for a teamspace holding 13 skills AND 3 agents, which
          // read as wrong the moment /dashboard began showing the agents.
          // Kinds at zero stay hidden — ten of them would bury the two that
          // matter.
          for (const { kind, n } of artifactKindsFor(
            countsByTeamspace.get(t.id),
          )) {
            meta.push(
              `${n} ${n === 1 ? KINDS[kind].label.toLowerCase() : KINDS[kind].plural.toLowerCase()}`,
            );
          }
          return (
            <li
              key={t.id}
              className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 border-b-2 border-divider py-7"
            >
              <span
                aria-hidden
                className="grid h-12 w-12 place-items-center bg-accent text-[20px] font-extrabold text-canvas"
              >
                {initial}
              </span>
              <div className="min-w-0">
                <Link
                  href={`/t/${t.id}`}
                  className="text-[19px] font-extrabold tracking-[-0.015em] text-ink transition-colors duration-150 hover:text-accent"
                >
                  {t.name}
                </Link>
                <p className="mt-1 text-sm text-ink-faint">
                  {meta.join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className={`${TAG_ACCENT} capitalize`}>
                  {t.role}
                </span>
                {/* Member admin — renaming, inviting, leaving — all lives on
                    the teamspace page, so "People" goes there. */}
                <Link
                  href={`/t/${t.id}`}
                  className="text-[13px] text-accent-strong hover:underline"
                >
                  People
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {shared.length === 0 && (
        <p className="mt-7 max-w-[62ch] text-[15.5px] leading-[26px] text-ink-soft">
          You don&rsquo;t share a teamspace with anyone yet. Create one and you
          can invite people by email — they&rsquo;ll get a link that puts them
          straight in.
        </p>
      )}

      {/* Only teamspaces that actually hold skills are worth offering as a
          source — an empty one in the list just makes the choice look broken. */}
      <CreateTeamspace
        sources={teamspaces
          .filter((t) => t.skill_count > 0)
          .map((t) => ({
            id: t.id,
            name: t.name,
            skillCount: t.skill_count,
          }))}
      />

      {/* No "Learn more" link on this one, though the mockup has one: nothing
          under /guides explains what a teamspace is, and pointing it at the
          nearest page that mentions them (/pricing) would answer a different
          question than the one the sentence asks. */}
      <section className="mt-7">
        <p className="max-w-[62ch] text-sm leading-6 text-ink-faint">
          <span className="font-extrabold text-ink">
            What is a teamspace?
          </span>{" "}
          It&rsquo;s where your team&rsquo;s documents, skills, and knowledge
          live together.
        </p>
      </section>
    </div>
  );
}
