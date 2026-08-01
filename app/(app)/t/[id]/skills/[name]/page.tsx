// /t/<id>/skills/<name> — read one skill, exactly as an agent would receive it.
//
// SECURITY: the body is rendered as PLAIN TEXT in a <pre>, never as markdown or
// HTML. A skill is arbitrary text written by any teamspace member, and this page
// is served from the app origin where the session cookie lives — rendering it
// as HTML would put attacker-controlled markup one origin away from the session
// and turn "write a skill" into stored XSS against your own teammates. The
// content worker exists precisely so untrusted bodies render somewhere else;
// this page must not become a second, unhardened renderer.
//
// React escapes the string for us, and <pre> preserves the formatting that
// makes markdown readable anyway.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { getSkill } from "@/lib/skills/store-core";
import { queryAll, queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Skill — ilolink",
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

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string; name: string }>;
}) {
  const { id, name: rawName } = await params;
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

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  // Scoped by teamspace id inside getSkill, so a name from another org simply
  // reads as missing.
  const found = await getSkill({ DB: e.DB, DOCS: e.DOCS }, id, name);
  if (!found) notFound();

  const history = await queryAll<{
    version: number;
    changelog: string | null;
    created_at: number;
    email: string | null;
  }>(
    `SELECT v.version, v.changelog, v.created_at, u.email
       FROM skill_versions v
       LEFT JOIN users u ON u.id = v.created_by
      WHERE v.skill_id = ?
      ORDER BY v.version DESC
      LIMIT 20`,
    found.skill.id,
  );

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h1 className="font-mono text-2xl font-medium text-ink">
          {found.skill.name}
        </h1>
        <Link
          href={`/t/${id}/skills`}
          className="shrink-0 text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          All skills
        </Link>
      </div>
      <p className="mb-2 leading-relaxed text-ink-soft">
        {found.skill.description}
      </p>
      <p className="mb-8 text-sm text-ink-faint">
        Version {found.version}
        {found.authorEmail ? ` · ${found.authorEmail}` : ""} ·{" "}
        {when(found.updatedAt)}
      </p>

      <pre className="mb-10 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-hairline bg-surface px-5 py-4 font-mono text-sm leading-relaxed text-ink">
        {found.body}
      </pre>

      {history.length > 1 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink-soft">History</h2>
          <ul>
            {history.map((h) => (
              <li
                key={h.version}
                className="flex items-baseline justify-between gap-4 border-b border-hairline py-3 last:border-b-0"
              >
                <span className="text-ink-soft">
                  v{h.version}
                  {h.changelog ? ` — ${h.changelog}` : ""}
                </span>
                <span className="shrink-0 text-sm text-ink-faint">
                  {h.email ?? "unknown"} · {when(h.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm leading-relaxed text-ink-faint">
        Skills are edited through a connected assistant, which keeps the version
        history and records who made each change.{" "}
        <Link href="/connect" className="text-accent underline">
          Connect an assistant
        </Link>
      </p>
    </div>
  );
}
