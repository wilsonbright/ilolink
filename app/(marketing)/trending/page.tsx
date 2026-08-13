// /trending — the current week's hand-approved trending snapshot, read from
// the shared KV namespace (contract in lib/trending/types.ts; trends-worker
// writes, this page only reads).
//
// Request-time dynamic, unlike the rest of (marketing): the data changes every
// Monday without a deploy, so a build-time prerender would freeze whichever
// week (or the empty state) the build happened to see.

import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import { trendingKv } from "@/lib/trending/kv";
import { readWeek, readWeeks } from "@/lib/trending/read";
import { SnapshotView, TrendingEmpty } from "./_components/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trending in agent work — ilolink",
  description:
    "The skills, MCP servers, agents and frameworks that broke out this week — ranked by GitHub star velocity, corroborated by curated lists. New every Monday.",
  alternates: { canonical: "/trending" },
};

export default async function Page() {
  // Every failure — no KV binding, no weeks published yet, malformed snapshot
  // — funnels into the empty state. Production is exactly this on day one.
  const kv = trendingKv();
  const weeks = kv ? await readWeeks(kv) : null;
  const snapshot = kv && weeks ? await readWeek(kv, weeks[0]) : null;

  return (
    <>
      <JsonLd
        data={[
          article({
            path: "/trending",
            headline: "Trending in agent work",
            description:
              "A weekly, hand-approved ranking of the skills, MCP servers, agents and frameworks breaking out across GitHub.",
            datePublished: "2026-08-13",
            // The page's content is the snapshot, so the snapshot week is the
            // honest modification date once one exists.
            dateModified: snapshot?.week,
          }),
        ]}
      />
      {snapshot && weeks ? (
        <SnapshotView snapshot={snapshot} weeks={weeks} archive={false} />
      ) : (
        <TrendingEmpty />
      )}
    </>
  );
}
