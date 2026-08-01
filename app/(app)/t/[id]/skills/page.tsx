// /t/<id>/skills — what a teamspace's connected assistants can read.
//
// Until this page existed the skill registry had no browser surface at all: it
// could only be listed through MCP, which meant the instructions your agents
// follow were invisible unless you asked an agent to recite them. For a feature
// whose whole risk model is "a teammate can write instructions another agent
// will execute", not being able to see them was the wrong default.
//
// Read-only on purpose. Writing happens through MCP, where the version history
// and provenance preamble live; a second write path would be a second place for
// the audit trail to be wrong.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { listSkills } from "@/lib/skills/store-core";
import { queryAll, queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skills — ilolink",
  robots: { index: false, follow: false },
};

function when(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SkillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/t/${id}/skills`)}`);

  // Same rule as the rest of the teamspace surface: a non-member gets 404, so
  // teamspace ids cannot be probed by watching the status code.
  const role = await getMembership(id, user.id);
  if (!role) notFound();

  const teamspace = await queryFirst<{ name: string }>(
    "SELECT name FROM teamspaces WHERE id = ?",
    id,
  );
  if (!teamspace) notFound();

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  const skills = await listSkills({ DB: e.DB, DOCS: e.DOCS }, id, undefined, 200);

  // Current version number and author for each skill, in one query rather than
  // one per row. The audit trail is the point of this page, so "who last
  // changed this" has to be on the list itself, not hidden behind a click.
  const meta = new Map<string, { version: number; email: string | null }>();
  if (skills.length > 0) {
    const rows = await queryAll<{
      skill_id: string;
      version: number;
      email: string | null;
    }>(
      `SELECT v.skill_id, v.version, u.email
         FROM skill_versions v
         LEFT JOIN users u ON u.id = v.created_by
        WHERE v.skill_id IN (${skills.map(() => "?").join(",")})
          AND v.version = (
            SELECT MAX(v2.version) FROM skill_versions v2
             WHERE v2.skill_id = v.skill_id
          )`,
      ...skills.map((s) => s.id),
    );
    for (const r of rows) {
      meta.set(r.skill_id, { version: r.version, email: r.email });
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-2xl font-medium text-ink">Skills</h1>
        <Link
          href={`/t/${id}`}
          className="text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          {teamspace.name}
        </Link>
      </div>
      <p className="mb-8 leading-relaxed text-ink-soft">
        Instructions any assistant connected to this teamspace can read. Anyone
        here can write them, and every assistant that reads one is told who
        wrote it — so treat this list as something to review, not just storage.
      </p>

      {skills.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-surface px-5 py-8">
          <p className="mb-2 text-ink">No skills yet.</p>
          <p className="leading-relaxed text-ink-soft">
            Connect an assistant and ask it to write one.{" "}
            <Link href="/connect" className="text-accent underline">
              Connect an assistant
            </Link>
          </p>
        </div>
      ) : (
        <ul>
          {skills.map((s) => {
            const m = meta.get(s.id);
            return (
              <li
                key={s.id}
                className="border-b border-hairline py-5 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <Link
                    href={`/t/${id}/skills/${encodeURIComponent(s.name)}`}
                    className="font-mono font-medium text-ink transition-colors duration-150 hover:text-accent"
                  >
                    {s.name}
                  </Link>
                  <span className="shrink-0 text-sm tabular-nums text-ink-faint">
                    {when(s.updated_at)}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed text-ink-soft">
                  {s.description}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-faint">
                  {m && <span>v{m.version}</span>}
                  {m?.email && <span>{m.email}</span>}
                  {s.visibility === "public" && <span>public</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
