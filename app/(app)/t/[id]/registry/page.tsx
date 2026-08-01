// /t/<id>/registry — everything this teamspace's assistants can read.
//
// This replaces /t/<id>/skills, which listed one kind because one kind existed.
// The registry now holds ten (see lib/artifacts/kinds.ts), and a flat list of
// them would be unreadable: "deploy" the runbook and "deploy" the workflow are
// legitimately different artifacts, so the kind has to be visible before the
// name means anything. Hence grouping by kind rather than sorting by date.
//
// Everything on a row — version, last author, date — is here rather than one
// click away for the same reason the skills list carried it: the audit trail is
// the mitigation for "a teammate can write instructions another agent
// executes", and a trail you have to go looking for is not one people read.
//
// New and Import still live at /t/<id>/new-skill and /t/<id>/import-skills;
// they are siblings of this segment, not children, so nothing can shadow an
// artifact legitimately named "new" or "import".

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { countProposals, listArtifacts } from "@/lib/artifacts/store-core";
import {
  ARTIFACT_KINDS,
  coerceKind,
  isArtifactKind,
  KINDS,
  type ArtifactKind,
} from "@/lib/artifacts/kinds";
import { queryAll, queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registry — ilolink",
  robots: { index: false, follow: false },
};

function when(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function RegistryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = await params;
  const { kind: kindParam } = await searchParams;

  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/t/${id}/registry`)}`);

  // Same rule as the rest of the teamspace surface: a non-member gets 404, so
  // teamspace ids cannot be probed by watching the status code.
  const role = await getMembership(id, user.id);
  if (!role) notFound();

  const teamspace = await queryFirst<{ name: string }>(
    "SELECT name FROM teamspaces WHERE id = ?",
    id,
  );
  if (!teamspace) notFound();

  // An unknown ?kind= reads as no filter rather than an error — a stale link
  // should show the registry, not a dead end.
  const active: ArtifactKind | null = isArtifactKind(kindParam)
    ? kindParam
    : null;

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  const bindings = { DB: e.DB, DOCS: e.DOCS };

  // Fetched unfiltered even when ?kind= is set, because the filter row shows a
  // count per kind and those counts have to be right whichever kind you are on.
  const [all, pending] = await Promise.all([
    listArtifacts(bindings, id, { limit: 500 }),
    countProposals(bindings, id),
  ]);

  // Last author for each artifact, in one query rather than one per row.
  // Keyed by version id: `current_version_id` already points at the live
  // published version, so this needs no MAX() subquery.
  const authors = new Map<string, string | null>();
  const versionIds = all
    .map((a) => a.current_version_id)
    .filter((v): v is string => Boolean(v));
  if (versionIds.length > 0) {
    const rows = await queryAll<{ id: string; email: string | null }>(
      `SELECT v.id, u.email
         FROM artifact_versions v
         LEFT JOIN users u ON u.id = v.created_by
        WHERE v.id IN (${versionIds.map(() => "?").join(",")})`,
      ...versionIds,
    );
    for (const r of rows) authors.set(r.id, r.email);
  }

  // coerceKind on the way out of D1: the column has no CHECK constraint (SQLite
  // cannot add one by ALTER), so an unexpected value degrades to 'skill' rather
  // than dropping the row into a group that does not render.
  const rows = all.map((a) => ({ ...a, kind: coerceKind(a.kind) }));

  const counts = new Map<ArtifactKind, number>();
  for (const r of rows) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);

  const groups = ARTIFACT_KINDS.filter((k) => !active || k === active)
    .map((kind) => ({ kind, items: rows.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-medium text-ink">Registry</h1>
        <span className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href={`/t/${id}/new-skill`}
            className="text-accent transition-colors duration-150 hover:text-ink"
          >
            New
          </Link>
          <Link
            href={`/t/${id}/import-skills`}
            className="text-accent transition-colors duration-150 hover:text-ink"
          >
            Import
          </Link>
          <Link
            href={`/t/${id}`}
            className="text-ink-soft transition-colors duration-150 hover:text-ink"
          >
            {teamspace.name}
          </Link>
        </span>
      </div>
      <p className="mb-6 leading-relaxed text-ink-soft">
        Skills, agents, specs, plans and handoffs any assistant connected to
        this teamspace can read. Every assistant that reads one is told who
        wrote it — so treat this as something to review, not just storage.
      </p>

      {/* Proposals are the reason a member's push does not silently become
          team policy. If there are any, they are the most important thing on
          this page, so they sit above the list rather than in the nav. */}
      {pending > 0 && (
        <Link
          href={`/t/${id}/proposals`}
          className="mb-6 block rounded-lg border border-hairline bg-accent-soft px-5 py-4 transition-colors duration-150 hover:border-accent"
        >
          <span className="text-ink">
            {pending} {pending === 1 ? "change is" : "changes are"} waiting for
            review
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
            Proposed versions are not what agents read until someone approves
            them. Open the inbox
          </span>
        </Link>
      )}

      {rows.length > 0 && (
        <nav className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
          <Link
            href={`/t/${id}/registry`}
            className={
              active === null
                ? "text-ink"
                : "text-ink-faint transition-colors duration-150 hover:text-ink"
            }
          >
            All <span className="tabular-nums">{rows.length}</span>
          </Link>
          {ARTIFACT_KINDS.filter(
            (k) => (counts.get(k) ?? 0) > 0 || k === active,
          ).map((k) => (
            <Link
              key={k}
              href={`/t/${id}/registry?kind=${k}`}
              className={
                active === k
                  ? "text-ink"
                  : "text-ink-faint transition-colors duration-150 hover:text-ink"
              }
            >
              {KINDS[k].plural}{" "}
              <span className="tabular-nums">{counts.get(k) ?? 0}</span>
            </Link>
          ))}
        </nav>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface px-5 py-8">
          <p className="mb-2 text-ink">Nothing here yet.</p>
          <p className="leading-relaxed text-ink-soft">
            <Link
              href={`/t/${id}/import-skills`}
              className="text-accent underline"
            >
              Import the skills you already have
            </Link>{" "}
            from a repo,{" "}
            <Link href={`/t/${id}/new-skill`} className="text-accent underline">
              write one here
            </Link>
            , or{" "}
            <Link href="/connect" className="text-accent underline">
              connect an assistant
            </Link>{" "}
            and ask it to save one.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface px-5 py-8">
          <p className="mb-2 text-ink">
            No {active ? KINDS[active].plural.toLowerCase() : "artifacts"} yet.
          </p>
          <p className="leading-relaxed text-ink-soft">
            {active ? KINDS[active].description : ""}{" "}
            <Link href={`/t/${id}/registry`} className="text-accent underline">
              See everything
            </Link>
          </p>
        </div>
      ) : (
        groups.map(({ kind, items }) => (
          <section key={kind} className="mb-10 last:mb-0">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-medium text-ink">{KINDS[kind].plural}</h2>
              <span className="shrink-0 text-sm tabular-nums text-ink-faint">
                {items.length}
              </span>
            </div>
            <p className="mb-2 text-sm leading-relaxed text-ink-faint">
              {KINDS[kind].description}
            </p>
            <ul>
              {items.map((a) => {
                const email = a.current_version_id
                  ? authors.get(a.current_version_id)
                  : null;
                return (
                  <li
                    key={a.id}
                    className="border-b border-hairline py-5 last:border-b-0"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      {/* Nothing published means the detail page has nothing to
                          show, so the name is not a link — the row's route in
                          is the review inbox below. */}
                      {a.version == null ? (
                        <span className="font-mono font-medium text-ink-soft">
                          {a.name}
                        </span>
                      ) : (
                        <Link
                          href={`/t/${id}/skills/${encodeURIComponent(a.name)}?kind=${kind}`}
                          className="font-mono font-medium text-ink transition-colors duration-150 hover:text-accent"
                        >
                          {a.name}
                        </Link>
                      )}
                      <span className="shrink-0 text-sm tabular-nums text-ink-faint">
                        {when(a.updated_at)}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed text-ink-soft">
                      {a.description}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-faint">
                      {/* No published version means the only version so far is
                          a proposal, so there is nothing an agent can read yet.
                          Saying "v?" would imply otherwise. */}
                      {a.version == null ? (
                        <Link
                          href={`/t/${id}/proposals`}
                          className="text-accent transition-colors duration-150 hover:text-ink"
                        >
                          awaiting review
                        </Link>
                      ) : (
                        <span>v{a.version}</span>
                      )}
                      {email && <span>{email}</span>}
                      {a.source_path && (
                        <span className="font-mono">{a.source_path}</span>
                      )}
                      {a.visibility === "public" && <span>public</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
