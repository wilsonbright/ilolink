// App-origin analytics reader (spec §7). Reads the per-doc event stream out of
// Cloudflare Analytics Engine via its SQL-over-HTTP API and shapes it into the
// small, honest Stats object the dashboard renders.
//
// AE stores each beacon as a row of blobN / doubleN columns (see the wire
// contract). The mapping this module reads against:
//   blob1=doc  blob2=event_type  blob3=referrer_host  blob4=country
//   blob5=device_class  blob6=path  blob7=visitor_hash
//   double1=scroll_pct  double2=time_on_page_s  double3=viewport_w
//   double4=viewport_h  index1=doc
//
// AE SQL has NO bind parameters — values are interpolated as literals. The only
// value we interpolate is the doc id, so we validate it strictly against
// [A-Za-z0-9_-] first and refuse (returning empty stats) if it does not match.
// Nothing else user-controlled ever reaches the query string.

import { env } from "@/lib/cf";

// Cloudflare account that owns the AE dataset (literal, not a binding).
const ACCOUNT_ID = "a8ec57aa9f4b6a49e48e60b1aa2a306e";
// The Analytics Engine dataset the content worker writes beacons into.
const DATASET = "ilolink_events";
// Doc ids are nanoid-shaped; this is also our SQL-injection guard.
const DOC_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export interface Stats {
  views: number;
  uniques: number;
  referrers: { host: string; n: number }[];
  countries: { code: string; n: number }[];
  devices: { class: string; n: number }[];
  scroll: { pct: number; n: number }[];
  avgTimeS: number;
  daily: { day: string; views: number }[];
}

// An all-zero Stats — returned for an unknown doc, a validation failure, or any
// AE hiccup, so callers never have to special-case "no data".
function emptyStats(): Stats {
  return {
    views: 0,
    uniques: 0,
    referrers: [],
    countries: [],
    devices: [],
    scroll: [],
    avgTimeS: 0,
    daily: [],
  };
}

// Minimal shape of the AE SQL HTTP response we depend on.
interface AeResponse {
  data?: Record<string, unknown>[];
}

// Coerce an AE cell (numbers can arrive as JSON numbers or strings) to a number.
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Coerce an AE cell to a trimmed string, "" when absent/null.
function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

// Run one SQL statement against the AE SQL API. Returns rows, or [] on any
// failure (missing token, non-2xx, malformed body) — analytics is best-effort.
async function aeQuery(sql: string): Promise<Record<string, unknown>[]> {
  const token = (env() as unknown as { AE_SQL_TOKEN?: string }).AE_SQL_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_engine/sql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "text/plain",
        },
        body: sql,
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as AeResponse;
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

// Assemble the dashboard Stats for one doc. Fans the independent aggregates out
// concurrently; each query already interpolates the pre-validated doc id.
export async function queryStats(docId: string): Promise<Stats> {
  if (!DOC_ID_RE.test(docId)) return emptyStats();
  const d = docId; // validated literal, safe to interpolate

  // NOTE: Analytics Engine SQL rejects COUNT(*)/COUNT(expr) ("COUNT() must have 0
  // arguments") and has no uniq()/uniqExact(). Use count() for row counts, and a
  // subquery (GROUP BY the visitor hash, then count() the groups) for uniques.
  const viewsSql = `SELECT count() AS views FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'pageview'`;
  const uniquesSql = `SELECT count() AS uniques FROM (SELECT blob7 FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'pageview' GROUP BY blob7)`;
  const avgSql = `SELECT avg(double2) AS avg_time FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'time'`;
  const refSql = `SELECT blob3 AS host, count() AS n FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'pageview' AND blob3 != '' GROUP BY host ORDER BY n DESC LIMIT 10`;
  const countrySql = `SELECT blob4 AS code, count() AS n FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'pageview' AND blob4 != '' GROUP BY code ORDER BY n DESC LIMIT 10`;
  const deviceSql = `SELECT blob5 AS class, count() AS n FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'pageview' AND blob5 != '' GROUP BY class ORDER BY n DESC`;
  const scrollSql = `SELECT intDiv(toUInt32(double1), 25) * 25 AS pct, count() AS n FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'scroll' GROUP BY pct ORDER BY pct`;
  const dailySql = `SELECT toDate(timestamp) AS day, count() AS views FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'pageview' AND timestamp > now() - INTERVAL '30' DAY GROUP BY day ORDER BY day`;

  const [views, uniques, avg, refs, countries, devices, scroll, daily] =
    await Promise.all([
      aeQuery(viewsSql),
      aeQuery(uniquesSql),
      aeQuery(avgSql),
      aeQuery(refSql),
      aeQuery(countrySql),
      aeQuery(deviceSql),
      aeQuery(scrollSql),
      aeQuery(dailySql),
    ]);

  return {
    views: num(views[0]?.views),
    uniques: num(uniques[0]?.uniques),
    avgTimeS: Math.round(num(avg[0]?.avg_time)),
    referrers: refs.map((r) => ({ host: str(r.host), n: num(r.n) })),
    countries: countries.map((r) => ({ code: str(r.code), n: num(r.n) })),
    devices: devices.map((r) => ({ class: str(r.class), n: num(r.n) })),
    scroll: scroll.map((r) => ({ pct: num(r.pct), n: num(r.n) })),
    daily: daily.map((r) => ({ day: str(r.day), views: num(r.views) })),
  };
}
