// Readers for the trending:* keys trends-worker publishes into the shared KV
// namespace (contract in ./types.ts).
//
// They never throw to a page. Production has ZERO trending data until the
// first hand-approved snapshot lands, and plain `next dev` has no KV binding
// at all — so every failure path (missing key, malformed JSON, contract drift)
// degrades to null and the caller renders its empty state. The parse functions
// are pure and exported separately so the contract validation is
// unit-testable without any Cloudflare bindings, same as the rest of test/.

import { KINDS, type Card, type Kind, type WeekSnapshot } from "./types";

export const WEEKS_KEY = "trending:weeks";
export const weekKey = (week: string): string => `trending:${week}`;

// ISO-Monday week id, e.g. "2026-08-10". Also the guard on the /trending/[week]
// URL param before it gets interpolated into a KV key — an arbitrary segment
// must never be able to address other keys in the shared namespace.
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isWeekString(v: unknown): v is string {
  return typeof v === "string" && WEEK_RE.test(v);
}

function isCard(v: unknown): v is Card {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    // repoUrl becomes a raw <a href> on /trending, so shape-checking is not
    // enough: pin it to the origin the writer constructs (canonicalRepoUrl /
    // the gh: fallback) so a buggy or compromised writer of the shared KV
    // namespace can never ship a javascript:/data: href to every visitor.
    typeof c.repoUrl === "string" &&
    c.repoUrl.startsWith("https://github.com/") &&
    typeof c.kind === "string" &&
    (KINDS as readonly string[]).includes(c.kind) &&
    (c.description === null || typeof c.description === "string") &&
    typeof c.stars === "number" &&
    typeof c.starVel === "number" &&
    typeof c.starGrowth === "number" &&
    Array.isArray(c.corroboration) &&
    c.corroboration.every((s) => typeof s === "string") &&
    typeof c.score === "number" &&
    typeof c.rank === "number" &&
    typeof c.firstSeen === "string" &&
    typeof c.isNew === "boolean"
  );
}

// "trending:weeks" → ISO-Monday weeks, newest first. An empty array is
// reported as null: to every caller "no weeks yet" and "key missing" are the
// same day-one situation. Capped at 12 defensively even though the writer
// enforces the same cap.
export function parseWeeks(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every(isWeekString)) return null;
    return parsed.slice(0, 12);
  } catch {
    return null;
  }
}

// "trending:{week}" → WeekSnapshot. Strict on purpose: a single malformed card
// rejects the whole snapshot. The writer is a hand-approved step, so a
// contract violation is a bug — the honest empty state beats rendering a
// half-broken week. Cards are re-sorted by rank and capped at 10 per kind so a
// writer slip can't reorder or flood a section.
export function parseWeek(raw: string | null): WeekSnapshot | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (!isWeekString(o.week) || typeof o.generatedAt !== "string") return null;
    if (typeof o.kinds !== "object" || o.kinds === null) return null;
    const rawKinds = o.kinds as Record<string, unknown>;

    const kinds: Partial<Record<Kind, Card[]>> = {};
    for (const kind of KINDS) {
      const cards = rawKinds[kind];
      if (cards === undefined) continue;
      if (!Array.isArray(cards) || !cards.every(isCard)) return null;
      if (cards.length === 0) continue;
      kinds[kind] = [...cards].sort((a, b) => a.rank - b.rank).slice(0, 10);
    }
    return { week: o.week, generatedAt: o.generatedAt, kinds };
  } catch {
    return null;
  }
}

// The KV-backed readers. They take the namespace as a parameter (same shape as
// readSlugRecordWith in lib/db/documents.ts) so the pure layer above stays
// free of binding access; pages get the namespace via lib/trending/kv.ts.

export async function readWeeks(kv: KVNamespace): Promise<string[] | null> {
  try {
    return parseWeeks(await kv.get(WEEKS_KEY));
  } catch {
    return null;
  }
}

export async function readWeek(
  kv: KVNamespace,
  week: string,
): Promise<WeekSnapshot | null> {
  if (!isWeekString(week)) return null;
  try {
    return parseWeek(await kv.get(weekKey(week)));
  } catch {
    return null;
  }
}
