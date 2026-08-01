// /dashboard — the signed-in document list.
//
// Previously this was a fully client-side component reading localStorage: there
// was no server-side "list my documents" query at all, so switching browsers
// permanently lost the list (links kept working; the list did not). It is now
// server-rendered from teamspace membership, and the local history survives
// only to power the claim banner.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  listDashboardDocs,
  listTeamspacesForUser,
  type DashboardDoc,
} from "@/lib/teamspace/store";
import { ClaimBanner } from "./claim-banner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your documents — ilolink",
  robots: { index: false, follow: false },
};

function when(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fdashboard");

  const [docs, teamspaces] = await Promise.all([
    listDashboardDocs(user.id),
    listTeamspacesForUser(user.id),
  ]);

  const live = docs.filter((d) => !d.unpublished_at);
  // Group by folder, root first. Folders exist per teamspace, so two teamspaces
  // may each have one called "Drafts"; keying by id keeps them apart while the
  // heading shows the name.
  const groups = new Map<string, { name: string | null; docs: typeof live }>();
  for (const d of live) {
    const key = d.folder_id ?? "";
    if (!groups.has(key)) groups.set(key, { name: d.folder_name, docs: [] });
    groups.get(key)!.docs.push(d);
  }
  const rootGroup = groups.get("");
  const folderGroups = [...groups.entries()]
    .filter(([k]) => k !== "")
    .sort((a, b) => (a[1].name ?? "").localeCompare(b[1].name ?? ""));
  const unpublished = docs.filter((d) => d.unpublished_at);
  // Only worth naming teamspaces once there is more than the personal one —
  // a solo user should never meet the concept.
  const showTeamspace = teamspaces.some((t) => !t.is_personal);

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-medium text-ink">Your documents</h1>
        <Link
          href="/publish"
          className="text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          Publish new
        </Link>
      </div>

      <ClaimBanner knownSlugs={docs.map((d) => d.slug)} />

      {live.length === 0 && unpublished.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface px-5 py-8">
          <p className="mb-2 text-ink">Nothing published yet.</p>
          <p className="leading-relaxed text-ink-soft">
            Publish a document and it will appear here, on every device you sign
            in from.{" "}
            <Link href="/publish" className="text-accent underline">
              Publish your first document
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {rootGroup && <DocList docs={rootGroup.docs} showTeamspace={showTeamspace} />}
          {folderGroups.map(([id, g]) => (
            <section key={id} className="mt-8">
              <h2 className="mb-1 text-sm font-medium text-ink-soft">
                {g.name}
                <span className="ml-2 tabular-nums text-ink-faint">
                  {g.docs.length}
                </span>
              </h2>
              <DocList docs={g.docs} showTeamspace={showTeamspace} />
            </section>
          ))}
        </>
      )}

      {unpublished.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-ink-soft">Unpublished</h2>
          <ul>
            {unpublished.map((d) => (
              <li
                key={d.id}
                className="border-b border-hairline py-4 last:border-b-0"
              >
                <Link
                  href={`/dashboard/${d.slug}`}
                  className="text-ink-soft transition-colors duration-150 hover:text-accent"
                >
                  {d.title || d.slug}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DocList({
  docs,
  showTeamspace,
}: {
  docs: DashboardDoc[];
  showTeamspace: boolean;
}) {
  return (
    <ul>
      {docs.map((d) => (
            <li
              key={d.id}
              className="border-b border-hairline py-5 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                <Link
                  href={`/dashboard/${d.slug}`}
                  className="font-medium text-ink transition-colors duration-150 hover:text-accent"
                >
                  {d.title || d.slug}
                </Link>
                <span className="shrink-0 text-sm tabular-nums text-ink-faint">
                  {when(d.published_at)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-faint">
                <span>{d.visibility}</span>
                <span>{d.source_type}</span>
                {showTeamspace && d.teamspace_name && (
                  <span>{d.teamspace_name}</span>
                )}
                {d.via === "shared" && <span>shared with you</span>}
                <a
                  href={`/${d.slug}`}
                  className="text-accent transition-colors duration-150 hover:text-ink"
                >
                  open
                </a>
              </div>
        </li>
      ))}
    </ul>
  );
}
