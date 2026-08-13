// /t/<id>/new-skill — write a skill in the browser.
//
// WHY THIS IS NOT UNDER skills/. As a child of skills/ it would sit beside
// skills/[name], where <name> is a real skill name. Next prefers a static
// segment over a dynamic one, so skills/new would silently shadow a skill
// actually called "new" — a valid kebab-case name. Prefixing with an underscore
// does not help: Next treats _folder as a PRIVATE folder and excludes it from
// routing entirely, so skills/_new built cleanly and produced no route at all.
// Moving up one level removes the ambiguity rather than encoding around it.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { queryFirst } from "@/lib/db/client";
import { SkillEditor } from "../skills/skill-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New skill — ilolink",
  robots: { index: false, follow: false },
};

export default async function NewSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await currentUser();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(`/t/${id}/new-skill`)}`);
  }

  const role = await getMembership(id, user.id);
  if (!role) notFound();

  const teamspace = await queryFirst<{ name: string }>(
    "SELECT name FROM teamspaces WHERE id = ?",
    id,
  );
  if (!teamspace) notFound();

  return (
    // The app shell's <main> no longer caps width (pages own their container),
    // so the reading measure this page always had is now set here.
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b-2 border-divider pb-3">
        <h1 className="text-2xl text-ink">New skill</h1>
        <Link
          href={`/t/${id}/skills`}
          className="shrink-0 text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink"
        >
          All skills
        </Link>
      </div>
      <p className="mb-8 leading-relaxed text-ink-soft">
        Anyone connected to <span className="text-ink">{teamspace.name}</span>{" "}
        will be able to read this, and their assistants will act on it. Your
        name is recorded against every version.
      </p>

      <SkillEditor teamspaceId={id} />
    </div>
  );
}
