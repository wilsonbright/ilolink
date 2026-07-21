// App-origin heatmap reader (Phase 3). Reads the per-doc click + scroll event
// stream out of Cloudflare Analytics Engine via its SQL-over-HTTP API and shapes
// it into the small Heatmap object the dashboard overlay renders.
//
// AE row layout this module reads against (WIRE CONTRACT, doubles extended to 6):
//   blob1=doc  blob2=event_type  blob5=device_class
//   double1=scroll_pct  double5=click_x  double6=click_y
// Click events store the click fractions in double5/double6 and the innerWidth
// device bucket in blob5; scroll events store the band in double1.
//
// AE SQL has NO bind parameters — values are interpolated as literals. The only
// caller-derived value is the doc id, validated strictly against [A-Za-z0-9_-]
// before it ever reaches the query string. The device-class literal is looked up
// from a fixed enum (never raw user input), so it is safe to interpolate too.

// Cloudflare account that owns the AE dataset (literal, not a binding).
const ACCOUNT_ID = "a8ec57aa9f4b6a49e48e60b1aa2a306e";
// The Analytics Engine dataset the content worker writes beacons into.
const DATASET = "ilolink_events";
// Doc ids are nanoid-shaped; this is also our SQL-injection guard.
const DOC_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// Fixed bucket -> deviceClass literal map (mirrors collect.ts deviceClass()).
// The values are the ONLY device-class strings ever interpolated, and they come
// from this closed enum — never from the request — so interpolation stays safe.
import { env } from "@/lib/cf";

const BUCKET_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "≤640",
  md: "641–1024",
  lg: "≥1025",
};

export interface HeatPoint {
  x: number;
  y: number;
}

export interface Heatmap {
  clicks: HeatPoint[];
  scroll: { pct: number; n: number }[];
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

// Clamp a fraction to [0,1]; non-finite -> 0.
function frac(v: unknown): number {
  const n = num(v);
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// Run one SQL statement against the AE SQL API. Returns rows, or [] on any
// failure (missing token, non-2xx, malformed body) — analytics is best-effort.
// Replicated from lib/analytics/query.ts (aeQuery is not exported there).
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

// Assemble the per-bucket Heatmap for one doc. Returns empty arrays on any AE
// error or a validation failure, so the overlay always has a shape to render.
export async function queryHeatmap(
  docId: string,
  bucket: "sm" | "md" | "lg",
): Promise<Heatmap> {
  if (!DOC_ID_RE.test(docId)) return { clicks: [], scroll: [] };
  const d = docId; // validated literal, safe to interpolate
  const cls = BUCKET_CLASS[bucket] ?? BUCKET_CLASS.lg; // fixed-enum literal

  // Click points for this device bucket. double5/double6 are the clamped [0,1]
  // fractions written by the click beacon. Cap the pull so the canvas stays sane.
  const clicksSql = `SELECT double5 AS x, double6 AS y FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'click' AND blob5 = '${cls}' LIMIT 5000`;

  // Scroll bands for the same bucket (25/50/75/100), same shape as query.ts.
  const scrollSql = `SELECT intDiv(toUInt32(double1), 25) * 25 AS pct, count() AS n FROM ${DATASET} WHERE blob1 = '${d}' AND blob2 = 'scroll' AND blob5 = '${cls}' GROUP BY pct ORDER BY pct`;

  const [clicks, scroll] = await Promise.all([
    aeQuery(clicksSql),
    aeQuery(scrollSql),
  ]);

  return {
    clicks: clicks.map((r) => ({ x: frac(r.x), y: frac(r.y) })),
    scroll: scroll.map((r) => ({ pct: num(r.pct), n: num(r.n) })),
  };
}
