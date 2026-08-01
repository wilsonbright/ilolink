// /t/<id>/skills/<name>/edit — revise a skill in the browser.
//
// Loads the current version and hands it to the editor, which sends it back as
// ifVersion so a teammate's edit made in between is refused with a 409 rather
// than silently overwritten. Two people editing the same skill from two
// projects is the expected case, not the edge case.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { getSkill } from "@/lib/skills/store-core";
import { queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";
import { SkillEditor } from "../../skill-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit skill — ilolink",
  robots: { index: false, follow: false },
};

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string; name: string }>;
}) {
  const { id, name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const user = await currentUser();
  if (!user) {
    redirect(
      `/signin?next=${encodeURIComponent(`/t/${id}/skills/${rawName}/edit`)}`,
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
  const found = await getSkill({ DB: e.DB, DOCS: e.DOCS }, id, name);
  if (!found) notFound();

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h1 className="font-mono text-2xl font-medium text-ink">
          {found.skill.name}
        </h1>
        <Link
          href={`/t/${id}/skills/${encodeURIComponent(found.skill.name)}`}
          className="shrink-0 text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          Cancel
        </Link>
      </div>
      <p className="mb-8 text-sm text-ink-faint">
        Editing version {found.version}
        {found.authorEmail ? ` · last changed by ${found.authorEmail}` : ""}
      </p>

      <SkillEditor
        teamspaceId={id}
        initial={{
          name: found.skill.name,
          description: found.skill.description,
          body: found.body,
          version: found.version,
        }}
      />
    </div>
  );
}
