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
  listDashboardArtifactCounts,
  listTeamspacesForUser,
  type DashboardDoc,
} from "@/lib/teamspace/store";
import {
  DOCUMENTS_KIND,
  buildKindTabs,
  dashboardHref,
  indexArtifactCounts,
  resolveActiveKind,
} from "@/lib/teamspace/dashboard-kinds";
import { listArtifacts } from "@/lib/artifacts/store-core";
import { queryAll } from "@/lib/db/client";
import { env } from "@/lib/cf";
import { ArtifactList, type ArtifactListItem } from "./artifact-list";
import {
  buildDashboardTabs,
  groupDocsByTab,
  resolveActiveTab,
  SHARED_TAB_ID,
} from "@/lib/teamspace/dashboard-tabs";
import { buildMoveTargets } from "@/lib/teamspace/move-targets";
import type { TeamRole } from "@/lib/teamspace/permissions";
import { ClaimBanner } from "./claim-banner";
import { DocumentRowActions } from "./document-row-actions";
import { VisibilityControl } from "./visibility-control";
import { DocumentTitle } from "./document-title";
import {
  TAG_CHIP_ACTIVE,
  TAG_CHIP_INACTIVE,
  TAG_NEUTRAL,
  TAG_OUTLINE,
} from "@/lib/ui/tags";

// What buildMoveTargets needs from a teamspace row — listTeamspacesForUser
// returns a superset.
type MoveCandidate = {
  id: string;
  name: string;
  is_personal: number;
  role: TeamRole;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your library — ilolink",
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ts?: string; kind?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fdashboard");

  const { ts, kind } = await searchParams;
  const [docs, teamspaces, artifactCountRows] = await Promise.all([
    listDashboardDocs(user.id),
    listTeamspacesForUser(user.id),
    listDashboardArtifactCounts(user.id),
  ]);

  const docsByTab = groupDocsByTab(docs);
  const tabs = buildDashboardTabs(teamspaces, docsByTab);
  const activeTab = resolveActiveTab(ts, tabs);
  const activeDocs = docsByTab.get(activeTab) ?? [];
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? "";

  // The kind axis. The shared tab is documents-only by construction — artifacts
  // have no per-item sharing — so it is not offered a kind there.
  const countsByTeamspace = indexArtifactCounts(artifactCountRows);
  const allowArtifacts = activeTab !== SHARED_TAB_ID;
  const activeKind = resolveActiveKind(kind, allowArtifacts);
  const kindTabs = buildKindTabs(
    activeDocs.length,
    countsByTeamspace.get(activeTab),
  );

  // Only fetch rows for the kind actually being looked at. The registry fetches
  // every kind at once because it renders them all; this page shows one, and
  // copying that would be paying for ten lists to draw one.
  //
  // SECURITY: the only teamspace id that reaches this query is resolveActiveTab's
  // return value, which is constrained to ids from listTeamspacesForUser (a
  // membership join). A raw ?ts= never gets here.
  const ARTIFACT_PAGE = 200;
  let artifacts: ArtifactListItem[] = [];
  let artifactsTruncated = false;
  if (activeKind !== DOCUMENTS_KIND) {
    const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
    const listed = await listArtifacts(e, activeTab, {
      kind: activeKind,
      limit: ARTIFACT_PAGE,
    });
    artifactsTruncated = listed.length >= ARTIFACT_PAGE;
    // Author emails in one batched read, keyed on the published version — the
    // same shape the registry uses, so neither page needs a MAX() subquery.
    const versionIds = listed
      .map((a) => a.current_version_id)
      .filter((v): v is string => !!v);
    const authors = new Map<string, string>();
    if (versionIds.length > 0) {
      const rows = await queryAll<{ id: string; email: string }>(
        `SELECT v.id, u.email
           FROM artifact_versions v
           JOIN users u ON u.id = v.created_by
          WHERE v.id IN (${versionIds.map(() => "?").join(",")})`,
        ...versionIds,
      );
      for (const r of rows) authors.set(r.id, r.email);
    }
    artifacts = listed.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      version: a.version,
      updated_at: a.updated_at,
      source_path: a.source_path,
      authorEmail: a.current_version_id
        ? (authors.get(a.current_version_id) ?? null)
        : null,
    }));
  }

  const live = activeDocs.filter((d) => !d.unpublished_at);
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
  const unpublished = activeDocs.filter((d) => d.unpublished_at);
  // Only worth naming teamspaces once there is more than the personal one —
  // a solo user should never meet the concept. Within a single tab every doc
  // is already in one teamspace, so this only ever matters for the shared tab.
  const showTeamspace = activeTab === "shared";
  // Carry the tab you are looking at into the composer, so "Publish new" from
  // the BlockSurvey tab actually publishes into BlockSurvey. "Shared with me"
  // is a virtual tab, not a teamspace you can publish into, so it carries
  // nothing and /publish falls back to personal.
  const publishHref =
    activeTab === SHARED_TAB_ID ? "/publish" : `/publish?ts=${activeTab}`;

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-3 pb-5">
        {/* Was "Your documents". The page now holds ten artifact kinds as well,
            so naming one axis value as if it were the whole page was wrong. The
            URL is unchanged, so nothing anyone has bookmarked moves. */}
        <h1 className="ml-[-0.058em] text-[clamp(32px,3.6vw,44px)] leading-none text-ink">
          Your library
        </h1>
        {/* On an artifact kind "Publish new" would open a DOCUMENT composer,
            which is not what the person is looking at. Send them where that
            kind is actually created instead — as the quieter button, since it
            leaves the page rather than making something. */}
        {activeKind === DOCUMENTS_KIND ? (
          <Link
            href={publishHref}
            className="shrink-0 bg-accent px-4 py-2 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong"
          >
            Publish new
          </Link>
        ) : (
          <Link
            href={`/t/${activeTab}/registry?kind=${activeKind}`}
            className="shrink-0 border border-divider px-4 py-2 text-sm font-extrabold text-ink transition-colors duration-150 hover:bg-ink/5"
          >
            Open in registry
          </Link>
        )}
      </div>

      <ClaimBanner knownSlugs={docs.map((d) => d.slug)} />

      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2.5 pb-3.5">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              // Kind is sticky across the teamspace axis: switching teamspace
              // while looking at Agents keeps you on Agents.
              href={dashboardHref(tab.id, activeKind, tabs[0]?.id)}
              aria-current={tab.id === activeTab ? "page" : undefined}
              className={
                tab.id === activeTab
                  ? TAG_CHIP_ACTIVE
                  : `${TAG_CHIP_INACTIVE} transition-colors duration-150`
              }
            >
              {tab.label}
              {" · "}
              <span className="tabular-nums">
                {tab.count + sumKindCounts(countsByTeamspace.get(tab.id))}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* The kind axis. Rendered even for a solo user with one teamspace — the
          teamspace bar hides itself in that case, but hiding this too would
          mean nobody with a single teamspace ever discovers that skills and
          agents live here, which is the entire point of the page.

          Quieter than the teamspace chips on purpose: two rows of identical
          weight read as one confusing row. */}
      {allowArtifacts && (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t-2 border-divider py-3.5 text-sm">
            {kindTabs.map((k) => (
              <Link
                key={k.id}
                href={dashboardHref(activeTab, k.id, tabs[0]?.id)}
                aria-current={k.id === activeKind ? "page" : undefined}
                className={
                  "transition-colors duration-150 " +
                  (k.id === activeKind
                    ? "font-extrabold text-accent-strong"
                    : k.count > 0
                      ? "text-ink hover:text-accent-strong"
                      : "text-ink-faint hover:text-ink")
                }
              >
                {k.label}{" "}
                <span className="tabular-nums">{k.count}</span>
              </Link>
            ))}
          </div>
          {/* Ten zeros on a fresh account reads as a broken page rather than a
              capable one. Say where these come from — ONCE. The test is whether
              this user has artifacts ANYWHERE, not whether this tab does:
              someone whose team registry is full already knows how they get
              there, and repeating the pitch on their empty personal tab is a
              nag pointed at the wrong person. */}
          {!hasAnyArtifacts(countsByTeamspace) && (
            <p className="pb-3.5 text-sm leading-[22px] text-ink-faint">
              Skills, agents, specs and plans arrive when a connected assistant
              pushes them.{" "}
              <Link href="/connect" className="text-accent-strong underline">
                Connect an assistant
              </Link>
            </p>
          )}
        </>
      )}

      {activeKind !== DOCUMENTS_KIND ? (
        <ArtifactList
          teamspaceId={activeTab}
          kind={activeKind}
          items={artifacts}
          truncatedAt={artifactsTruncated ? ARTIFACT_PAGE : undefined}
        />
      ) : (
        <>

      {live.length === 0 && unpublished.length === 0 ? (
        <div className="border-2 border-divider bg-surface px-5 py-8">
          <p className="mb-2 text-ink">
            Nothing published yet{tabs.length > 1 ? ` in ${activeLabel}` : ""}.
          </p>
          <p className="leading-relaxed text-ink-soft">
            Publish a document and it will appear here, on every device you sign
            in from.{" "}
            <Link href={publishHref} className="text-accent-strong underline">
              Publish your first document
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {rootGroup && <DocList docs={rootGroup.docs} showTeamspace={showTeamspace} teamspaces={teamspaces} />}
          {folderGroups.map(([id, g]) => (
            <section key={id} className="mt-10">
              <h2 className="mb-2 text-[13px] uppercase tracking-[0.08em] text-ink">
                {g.name}
                <span className="ml-2 font-normal tabular-nums text-ink-faint">
                  {g.docs.length}
                </span>
              </h2>
              <DocList docs={g.docs} showTeamspace={showTeamspace} teamspaces={teamspaces} />
            </section>
          ))}
        </>
      )}

      {unpublished.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-[13px] uppercase tracking-[0.08em] text-ink">
            Unpublished
          </h2>
          <ul>
            {unpublished.map((d) => (
              <li
                key={d.id}
                className="border-t-2 border-divider py-4 transition-colors duration-150 hover:bg-ink/5"
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
        </>
      )}
    </div>
  );
}

// A teamspace tab counts everything the teamspace holds, so its number is the
// sum of its kind numbers. A tab reading "Personal 3" that opens onto twelve
// skills would be worse than no number at all.
function sumKindCounts(counts: Map<string, number> | undefined): number {
  if (!counts) return 0;
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}

// Does this user have a single artifact in any teamspace they belong to? It is
// what decides whether the "connect an assistant" line is still news to them.
function hasAnyArtifacts(
  countsByTeamspace: Map<string, Map<string, number>>,
): boolean {
  for (const counts of countsByTeamspace.values()) {
    if (sumKindCounts(counts) > 0) return true;
  }
  return false;
}

function DocList({
  docs,
  showTeamspace,
  teamspaces,
}: {
  docs: DashboardDoc[];
  showTeamspace: boolean;
  teamspaces: MoveCandidate[];
}) {
  return (
    <ul>
      {docs.map((d) => (
        <li
          key={d.id}
          // pr-4 only: the title stays flush left with the heading above it,
          // while the right-hand column (the date, and the actions ending in
          // Move) stops butting against the row's own edge — which with the
          // hover fill read as clipped.
          className="group/row grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-5 gap-y-2 border-t-2 border-divider py-5 pr-4 transition-colors duration-150 hover:bg-ink/5"
        >
          <DocumentTitle docId={d.id} slug={d.slug} title={d.title} />
          <span className="text-[13px] tabular-nums text-ink-faint">
            {/* Date, then who published it. creator_label is null on legacy
                docs that predate created_by — those show the date alone. */}
            {[when(d.published_at), d.creator_label]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-2">
            {/* Changeable in place. A doc shared with you is not yours to
                re-scope; everything else on this list sits in a teamspace you
                belong to, which is exactly what the PATCH requires — and the
                server re-checks that regardless of what this renders. */}
            <VisibilityControl
              slug={d.slug}
              visibility={d.visibility}
              canChange={d.via !== "shared"}
            />
            <span className={TAG_NEUTRAL}>{d.source_type}</span>
            {showTeamspace && d.teamspace_name && (
              <span className={TAG_NEUTRAL}>{d.teamspace_name}</span>
            )}
            {d.via === "shared" && (
              <span className={TAG_NEUTRAL}>shared with you</span>
            )}
            {/* A document shared with you is not yours to relocate, so it
                is offered no destinations — the server refuses that move
                independently, this just declines to suggest it. */}
            <DocumentRowActions
              docId={d.id}
              slug={d.slug}
              title={d.title || d.slug}
              moveTargets={
                d.via === "shared"
                  ? []
                  : buildMoveTargets(teamspaces, d.teamspace_id)
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
