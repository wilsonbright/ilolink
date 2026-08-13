// /t/<id>/skills/<name> — read one artifact, exactly as an agent would get it.
//
// The route still says "skills" because it is the URL that already exists and
// that bookmarks, the registry and the plugin bundle already point at. The KIND
// rides in as ?kind=, defaulting to 'skill', so every link written before the
// registry grew nine more kinds still resolves to the artifact it always did.
//
// SECURITY: the body is rendered as PLAIN TEXT in a <pre>, never as markdown or
// HTML. An artifact is arbitrary text written by any teamspace member, and this
// page is served from the app origin where the session cookie lives — rendering
// it as HTML would put attacker-controlled markup one origin away from the
// session and turn "write a skill" into stored XSS against your own teammates.
// The content worker exists precisely so untrusted bodies render somewhere else;
// this page must not become a second, unhardened renderer.
//
// React escapes the string for us, and <pre> preserves the formatting that
// makes markdown readable anyway.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { getArtifact, type VersionStatus } from "@/lib/artifacts/store-core";
import { coerceKind, KINDS } from "@/lib/artifacts/kinds";
import { queryAll, queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artifact — ilolink",
  robots: { index: false, follow: false },
};

function when(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ArtifactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; name: string }>;
  searchParams: Promise<{ kind?: string; version?: string }>;
}) {
  const { id, name: rawName } = await params;
  const { kind: kindParam, version: versionParam } = await searchParams;
  const name = decodeURIComponent(rawName);

  const user = await currentUser();
  if (!user) {
    redirect(
      `/signin?next=${encodeURIComponent(`/t/${id}/skills/${rawName}`)}`,
    );
  }

  const role = await getMembership(id, user.id);
  if (!role) notFound();

  const teamspace = await queryFirst<{ name: string }>(
    "SELECT name FROM teamspaces WHERE id = ?",
    id,
  );
  if (!teamspace) notFound();

  // An unknown kind coerces to 'skill' rather than 404ing: a stale link should
  // land on something, and 'skill' is what every pre-registry link meant.
  const kind = coerceKind(kindParam);
  const info = KINDS[kind];

  // An explicit ?version= is how the review inbox links at a proposal. Without
  // it getArtifact returns the live published version, which is what everyone
  // else should see and what an agent would receive.
  const asked = Number(versionParam);
  const wanted = Number.isInteger(asked) && asked > 0 ? asked : undefined;

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  // Scoped by teamspace id inside getArtifact, so a name from another org
  // simply reads as missing.
  const found = await getArtifact(
    { DB: e.DB, DOCS: e.DOCS },
    id,
    kind,
    name,
    wanted,
  );
  if (!found) notFound();

  const history = await queryAll<{
    version: number;
    changelog: string | null;
    status: VersionStatus;
    created_at: number;
    email: string | null;
  }>(
    // `skill_id` survived the table rename to artifact_versions — SQLite renames
    // the table, not its columns.
    `SELECT v.version, v.changelog, v.status, v.created_at, u.email
       FROM artifact_versions v
       LEFT JOIN users u ON u.id = v.created_by
      WHERE v.skill_id = ?
      ORDER BY v.version DESC
      LIMIT 20`,
    found.artifact.id,
  );

  return (
    // The app shell's <main> no longer caps width (pages own their container),
    // so the reading measure this page always had is now set here.
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b-2 border-divider pb-3">
        <h1 className="font-mono text-2xl text-ink">
          {found.artifact.name}
        </h1>
        <span className="flex shrink-0 items-center gap-3 text-sm">
          {/* The browser editor writes kind='skill' only, so offering Edit on a
              spec or a runbook would quietly create a second artifact of the
              wrong kind under the same name. Those are edited in the repo and
              pushed. */}
          {kind === "skill" && (
            <Link
              href={`/t/${id}/skills/${encodeURIComponent(found.artifact.name)}/edit`}
              className="font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink"
            >
              Edit
            </Link>
          )}
          <Link
            href={`/t/${id}/registry?kind=${kind}`}
            className="text-ink-soft transition-colors duration-150 hover:text-ink"
          >
            All {info.plural.toLowerCase()}
          </Link>
        </span>
      </div>
      <p className="mb-2 leading-relaxed text-ink-soft">
        {found.artifact.description}
      </p>
      <p className="mb-4 text-sm text-ink-faint">
        {info.label} · Version {found.version}
        {found.authorEmail ? ` · ${found.authorEmail}` : ""} ·{" "}
        {when(found.updatedAt)}
      </p>

      {/* Said outright, because the difference between "this is what agents
          read" and "this is what someone suggested agents read" is the entire
          point of the review step, and the two look identical otherwise. */}
      {found.status === "proposed" && (
        <p className="mb-6 border-2 border-divider bg-accent-soft px-5 py-4 leading-relaxed text-ink-soft">
          <span className="text-ink">Proposed — not live.</span> No assistant
          reads this version until an owner or admin approves it.{" "}
          <Link href={`/t/${id}/proposals`} className="text-accent-strong underline">
            Review it
          </Link>
        </p>
      )}
      {found.status === "rejected" && (
        <p className="mb-6 border border-hairline bg-surface px-5 py-4 leading-relaxed text-ink-soft">
          <span className="text-ink">Rejected.</span> Kept for the record — it
          was never what assistants read.
        </p>
      )}

      <pre className="mb-10 overflow-x-auto whitespace-pre-wrap break-words border border-hairline bg-surface px-5 py-4 font-mono text-sm leading-relaxed text-ink">
        {found.body}
      </pre>

      {history.length > 1 && (
        <section>
          {/* Table idiom: uppercase header over the strong rule, hairline rows. */}
          <h2 className="border-b-2 border-divider pb-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">
            History
          </h2>
          <ul>
            {history.map((h) => (
              <li
                key={h.version}
                className="flex items-baseline justify-between gap-4 border-b border-hairline py-3 transition-colors duration-150 last:border-b-0 hover:bg-ink/5"
              >
                <span className="text-ink-soft">
                  <Link
                    href={`/t/${id}/skills/${encodeURIComponent(found.artifact.name)}?kind=${kind}&version=${h.version}`}
                    className="transition-colors duration-150 hover:text-accent"
                  >
                    v{h.version}
                  </Link>
                  {h.changelog ? ` — ${h.changelog}` : ""}
                </span>
                <span className="shrink-0 text-sm text-ink-faint">
                  {h.status !== "published" && `${h.status} · `}
                  {h.email ?? "unknown"} · {when(h.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm leading-relaxed text-ink-faint">
        Edits here and edits from a connected assistant go through the same
        path, so the version history is one story either way.{" "}
        <Link href="/connect" className="text-accent-strong underline">
          Connect an assistant
        </Link>
      </p>
    </div>
  );
}
