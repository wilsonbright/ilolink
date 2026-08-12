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

// Inline SVGs rather than an icon dependency: four glyphs are not worth a
// package, and these are drawn on the same 24-grid at the same 1.7 stroke as
// the upload icon in /publish so the two surfaces look like one product. All
// are aria-hidden — the text beside each one already says what it means.
function IconDocument({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function IconPeople({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="9.5" cy="8" r="3.2" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4" />
      <path d="M15.2 5.2a3.2 3.2 0 0 1 0 5.6" />
    </svg>
  );
}

function IconSkill({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 10.9 10.1 9z" />
    </svg>
  );
}

function IconPlus({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconMore({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
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
    <div>
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b-2 border-divider pb-4">
          <h1 className="text-2xl text-ink">Teamspaces</h1>
          <div className="flex shrink-0 items-center gap-2">
            {/* This was a bare text link, and the designer read it as another
                line of copy rather than the way out to the document list. It is
                a bordered control now so it looks like something you press. */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border border-divider px-3 py-2 text-sm font-extrabold text-ink transition-colors duration-150 hover:bg-ink/5"
            >
              <IconDocument className="h-4 w-4" />
              Documents
            </Link>
            {/* The form is at the foot of the page, so the primary button is an
                anchor down to it rather than a second copy of it up here. */}
            <Link
              href="#new-teamspace"
              className="inline-flex items-center gap-1.5 bg-accent px-4 py-2 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong"
            >
              <IconPlus className="h-4 w-4" />
              New teamspace
            </Link>
          </div>
        </div>
        <p className="mt-3 leading-relaxed text-ink-soft">
          A teamspace is a shared home for documents. Everyone in one can see
          and edit what it holds, so invite the people you actually work with.
        </p>
      </div>

      <ul className="mb-8 space-y-3">
        {teamspaces.map((t) => {
          // Array.from rather than charAt: a teamspace named with an emoji
          // would otherwise put half a surrogate pair in the tile.
          const initial = (Array.from(t.name.trim())[0] ?? "?").toUpperCase();
          return (
            <li
              key={t.id}
              className="border border-hairline bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent-soft font-extrabold text-accent-strong"
                >
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/t/${t.id}`}
                    className="font-semibold text-ink transition-colors duration-150 hover:text-accent"
                  >
                    {t.name}
                  </Link>
                  {/* === 1, not truthiness: is_personal is an integer column,
                      and `{t.is_personal && …}` would render a bare "0" into
                      the card for every shared teamspace. */}
                  {t.is_personal === 1 && (
                    <p className="mt-0.5 text-xs text-ink-faint">
                      Personal workspace
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-faint">
                    {/* Keyed off the count, not is_personal: a personal
                        teamspace you have invited someone into really does
                        have two people in it. */}
                    <span className="inline-flex items-center gap-1.5">
                      <IconPeople className="h-3.5 w-3.5" />
                      {t.member_count === 1
                        ? "just you"
                        : people(t.member_count)}
                    </span>
                    {/* Shown at zero, unlike skills: an empty teamspace is
                        worth spotting, and "0 documents" is the fastest way to
                        see which one you never actually published into. */}
                    <span className="inline-flex items-center gap-1.5">
                      <IconDocument className="h-3.5 w-3.5" />
                      {t.document_count}{" "}
                      {t.document_count === 1 ? "document" : "documents"}
                    </span>
                    {/* Every populated kind, not just skills. This card used to
                        say "13 skills" for a teamspace holding 13 skills AND 3
                        agents, which read as wrong the moment /dashboard began
                        showing the agents. Kinds at zero stay hidden — ten of
                        them would bury the two that matter. */}
                    {artifactKindsFor(countsByTeamspace.get(t.id)).map(
                      ({ kind, n }) => (
                        <span
                          key={kind}
                          className="inline-flex items-center gap-1.5"
                        >
                          <IconSkill className="h-3.5 w-3.5" />
                          {n} {n === 1 ? KINDS[kind].label.toLowerCase() : KINDS[kind].plural.toLowerCase()}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* Square tag, not a pill — Modernist has no rounded chips. */}
                  <span className="bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold capitalize text-accent-strong">
                    {t.role}
                  </span>
                  {/* The mockup's overflow menu has no per-row actions to hold
                      yet — renaming, inviting and leaving all live on the
                      teamspace page — so the dots go there instead of opening
                      a menu with nothing in it. */}
                  <Link
                    href={`/t/${t.id}`}
                    aria-label={`Manage ${t.name}`}
                    className="p-1.5 text-ink-faint transition-colors duration-150 hover:text-ink"
                  >
                    <IconMore className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {shared.length === 0 && (
        <p className="mb-4 leading-relaxed text-ink-soft">
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
      <section className="mt-6 border border-hairline p-4">
        <p className="text-sm leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">What is a teamspace?</span>{" "}
          It&rsquo;s where your team&rsquo;s documents, skills, and knowledge
          live together.
        </p>
      </section>
    </div>
  );
}
