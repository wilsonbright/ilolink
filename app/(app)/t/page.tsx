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
import { listTeamspacesWithCounts } from "@/lib/teamspace/store";
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

  const teamspaces = await listTeamspacesWithCounts(user.id);
  const shared = teamspaces.filter((t) => !t.is_personal);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-2xl font-medium text-ink">Teamspaces</h1>
        <Link
          href="/dashboard"
          className="text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          Documents
        </Link>
      </div>
      <p className="mb-8 leading-relaxed text-ink-soft">
        A teamspace is a shared home for documents. Everyone in one can see and
        edit what it holds, so invite the people you actually work with.
      </p>

      <ul className="mb-10">
        {teamspaces.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between border-b border-hairline py-4 last:border-b-0"
          >
            <Link
              href={`/t/${t.id}`}
              className="font-medium text-ink transition-colors duration-150 hover:text-accent"
            >
              {t.name}
            </Link>
            <span className="flex shrink-0 items-center gap-3 text-sm text-ink-faint">
              {/* Keyed off the count, not is_personal: a personal teamspace you
                  have invited someone into really does have two people in it. */}
              <span>
                {t.member_count === 1 ? "just you" : people(t.member_count)}
              </span>
              {t.skill_count > 0 && (
                <span>
                  {t.skill_count} {t.skill_count === 1 ? "skill" : "skills"}
                </span>
              )}
              <span>{t.role}</span>
            </span>
          </li>
        ))}
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
    </div>
  );
}
