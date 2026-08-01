// /t/<id>/skills — kept only as a redirect to /t/<id>/registry.
//
// This page used to BE the list. The registry replaced it when skills stopped
// being the only kind of artifact, and maintaining two list pages would mean
// two places for "who last changed this" to be shown differently — on a surface
// whose whole purpose is that the audit trail is visible.
//
// The URL stays because it is already in bookmarks, in sent invitations, and in
// the nav of anyone mid-session. The segment also has to survive regardless:
// /t/<id>/skills/<name> is its child, and that route is very much alive.

import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SkillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Filtered to skills, so someone who followed a "Skills" link still lands on
  // skills rather than on ten kinds they did not ask for. Membership is checked
  // by the registry itself — checking it here too would be a second place to
  // get the 404-rather-than-403 rule wrong.
  redirect(`/t/${id}/registry?kind=skill`);
}
