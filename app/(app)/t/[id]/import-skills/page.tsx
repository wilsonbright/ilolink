// /t/<id>/import-skills — bring skills in from a local checkout.
//
// Sits beside skills/ rather than inside it, so it can never shadow a skill
// legitimately named "import"; see the note in ../new-skill/page.tsx.
//
// Files are parsed and reviewed in the browser, then written one at a time
// through the same API the editor uses. Existing names are passed down so the
// review can say "this will add a version" rather than surprising someone with
// a silent overwrite of a teammate's skill.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { listSkills } from "@/lib/skills/store-core";
import { queryFirst } from "@/lib/db/client";
import { env } from "@/lib/cf";
import { SkillImport } from "./skill-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import skills — ilolink",
  robots: { index: false, follow: false },
};

export default async function ImportSkillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(`/t/${id}/import-skills`)}`);
  }

  const role = await getMembership(id, user.id);
  if (!role) notFound();

  const teamspace = await queryFirst<{ name: string }>(
    "SELECT name FROM teamspaces WHERE id = ?",
    id,
  );
  if (!teamspace) notFound();

  const e = env() as unknown as { DB: D1Database; DOCS: R2Bucket };
  const existing = await listSkills({ DB: e.DB, DOCS: e.DOCS }, id, undefined, 200);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-medium text-ink">Import skills</h1>
        <Link
          href={`/t/${id}/skills`}
          className="shrink-0 text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          All skills
        </Link>
      </div>
      <p className="mb-8 leading-relaxed text-ink-soft">
        Bring skills you already keep in a repo into{" "}
        <span className="text-ink">{teamspace.name}</span>. Files are read in
        your browser and shown for review before anything is saved — these
        become instructions your team&rsquo;s assistants act on, so it is worth
        reading the list.
      </p>

      <SkillImport
        teamspaceId={id}
        existing={existing.map((s) => s.name)}
      />
    </div>
  );
}
