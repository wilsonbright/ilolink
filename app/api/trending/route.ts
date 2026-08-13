// GET /api/trending?week= — the published weekly trending snapshot, straight
// from KV.
//
// Public and unauthenticated on purpose: this is the same hand-approved data
// /trending renders, and the trends-worker (a separate Worker) is the only
// writer of the trending:* keys. Default is the newest week in trending:weeks;
// ?week= selects an archive week. 404 JSON when nothing is published yet or
// the week isn't in the list — production is exactly that on day one, so the
// 404 is a normal answer here, not an error path.

import { NextResponse } from "next/server";
import { trendingKv } from "@/lib/trending/kv";
import { isWeekString, readWeek, readWeeks } from "@/lib/trending/read";

export const runtime = "nodejs";

// Cached briefly too — an empty launch-day KV shouldn't be re-asked on every
// poll, but a snapshot appearing Monday should show up within a minute.
function missing(): NextResponse {
  return NextResponse.json(
    { error: "no trending snapshot for that week" },
    { status: 404, headers: { "cache-control": "public, s-maxage=60" } },
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const kv = trendingKv();
  const weeks = kv ? await readWeeks(kv) : null;
  if (!kv || !weeks) return missing();

  const requested = new URL(req.url).searchParams.get("week");
  const week = requested ?? weeks[0];
  if (!isWeekString(week) || !weeks.includes(week)) return missing();

  const snapshot = await readWeek(kv, week);
  if (!snapshot) return missing();

  // Snapshots are immutable once approved; five minutes only bounds how long
  // the weeks list itself can be stale after a Monday approve.
  return NextResponse.json(snapshot, {
    headers: { "cache-control": "public, s-maxage=300" },
  });
}
