// /trending/[week] — a frozen archive week. Snapshots are immutable once
// approved, so this page is the "GitHub trending for agent work" history
// nobody else keeps. 404 for any week that isn't in trending:weeks — the
// archive only reaches back as far as the published list (max 12 weeks).
//
// Single dynamic segment under /trending, so it cannot collide with the
// root-level slug rewrite that proxies documents to the content worker.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd, article } from "@/lib/seo/jsonld";
import { trendingKv } from "@/lib/trending/kv";
import { isWeekString, readWeek, readWeeks } from "@/lib/trending/read";
import { SnapshotView, formatWeek } from "../_components/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  // Malformed segments 404 in the page body; no metadata needed for those.
  if (!isWeekString(week)) return {};
  return {
    title: `Trending in agent work — week of ${formatWeek(week)} — ilolink`,
    description: `The skills, MCP servers, agents and frameworks that broke out in the week of ${formatWeek(week)} — ranked by GitHub star velocity, corroborated by curated lists.`,
    alternates: { canonical: `/trending/${week}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;

  // Only weeks the published list admits exist. This also covers the newest
  // week: it renders here too rather than redirecting, so an archived link
  // keeps working after the week stops being current.
  const kv = trendingKv();
  const weeks = kv ? await readWeeks(kv) : null;
  if (!kv || !weeks || !isWeekString(week) || !weeks.includes(week)) notFound();

  const snapshot = await readWeek(kv, week);
  if (!snapshot) notFound();

  return (
    <>
      <JsonLd
        data={[
          article({
            path: `/trending/${week}`,
            headline: `Trending in agent work — week of ${formatWeek(week)}`,
            description: `A frozen, hand-approved ranking of the skills, MCP servers, agents and frameworks that broke out in the week of ${formatWeek(week)}.`,
            // The snapshot publishes the Monday it covers and never changes.
            datePublished: week,
          }),
        ]}
      />
      <SnapshotView snapshot={snapshot} weeks={weeks} archive={true} />
    </>
  );
}
