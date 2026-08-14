// The approve step writes the trending:* KV keys the app renders verbatim, so
// this pins the CONTRACT: the exact Card/WeekPayload shape, rank-asc ordering,
// the max-10-per-kind and max-12-weeks caps, newest-first week index, and the
// refusal to publish a week that was never computed. Fake D1 follows the
// statement-recorder idiom of test/artifact-contribute.test.ts.

import { describe, it, expect } from "vitest";
import {
  approveWeek,
  awesomeListName,
  buildWeekPayload,
  type PublishRow,
} from "@/trends-worker/src/publish";
import type { Env, WeekPayload } from "@/trends-worker/src/types";

const WEEK = "2026-08-03";
const NOW = new Date("2026-08-10T07:00:00Z");

function publishRow(over: Partial<PublishRow> & { item_id: string }): PublishRow {
  return {
    kind: "skill",
    score: 2.34567,
    rank_in_kind: 1,
    star_vel: 120,
    star_growth: 1.8342,
    corroboration_count: 0,
    name: over.item_id.replace(/^gh:/, ""),
    canonical_repo: `https://github.com/${over.item_id.replace(/^gh:/, "")}`,
    description: null,
    first_seen: "2026-07-27",
    stars: 450,
    ...over,
  };
}

// Statement-recorder fake D1: every bind is captured; reads are answered by a
// regex switch over the SQL so the harness can vary what "the database" holds.
function fakeDB(answer: (sql: string) => unknown[]) {
  const statements: { sql: string; binds: unknown[] }[] = [];
  const DB = {
    prepare: (sql: string) => ({
      bind: (...binds: unknown[]) => {
        statements.push({ sql, binds });
        return {
          all: async () => ({ results: answer(sql) }),
          first: async () => answer(sql)[0] ?? null,
          run: async () => ({}),
        };
      },
    }),
  } as unknown as D1Database;
  return { DB, statements };
}

// Fake KV storing raw strings — what the app's typed-json get would parse.
function fakeKV(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const KV = {
    get: async (key: string) => {
      const v = map.get(key);
      return v === undefined ? null : JSON.parse(v);
    },
    put: async (key: string, value: string) => {
      map.set(key, value);
    },
  } as unknown as KVNamespace;
  return { KV, map };
}

function env(DB: D1Database, KV: KVNamespace): Env {
  return { DB, KV };
}

describe("approveWeek", () => {
  it("writes the byte-exact week payload and index the app depends on", async () => {
    const rows = [
      publishRow({
        item_id: "gh:a/skill-x",
        kind: "skill",
        description: "A skill",
        first_seen: WEEK, // picked up this week => isNew
        corroboration_count: 1,
      }),
      publishRow({
        item_id: "gh:b/server-y",
        kind: "mcp-server",
        score: 1.5,
        star_vel: 80,
        star_growth: 2.5,
        stars: null, // snapshot row missing => stars must default to 0
      }),
    ];
    const { DB } = fakeDB((sql) => {
      if (/FROM trending_snapshots t/.test(sql)) return rows;
      // Corroboration comes from awesome_seen (per-list rows), not the
      // collapsed item_sources 'awesome_list' enum — the chip must name the
      // directory that actually listed the item.
      if (/FROM awesome_seen/.test(sql)) {
        return [
          {
            repo_url: "a/skill-x",
            list_url:
              "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
          },
        ];
      }
      // A prior week with snapshots => a NORMAL velocity week, no baseline
      // flag in the payload (the baseline case has its own test below).
      if (/COUNT\(\*\) AS n FROM item_snapshots/.test(sql)) return [{ n: 1689 }];
      return [];
    });
    const { KV, map } = fakeKV();

    const result = await approveWeek(env(DB, KV), WEEK, NOW);
    expect(result).toEqual({ ok: true, itemCount: 2 });

    const payload = JSON.parse(map.get(`trending:${WEEK}`)!) as WeekPayload;
    expect(payload).toEqual({
      week: WEEK,
      generatedAt: "2026-08-10T07:00:00.000Z",
      kinds: {
        skill: [
          {
            id: "gh:a/skill-x",
            name: "a/skill-x",
            repoUrl: "https://github.com/a/skill-x",
            kind: "skill",
            description: "A skill",
            stars: 450,
            starVel: 120,
            starGrowth: 1.834, // rounded to 3dp
            corroboration: ["awesome-mcp-servers"],
            score: 2.3457, // rounded to 4dp
            rank: 1,
            firstSeen: WEEK,
            isNew: true,
          },
        ],
        "mcp-server": [
          {
            id: "gh:b/server-y",
            name: "b/server-y",
            repoUrl: "https://github.com/b/server-y",
            kind: "mcp-server",
            description: null,
            stars: 0,
            starVel: 80,
            starGrowth: 2.5,
            corroboration: [],
            score: 1.5,
            rank: 1,
            firstSeen: "2026-07-27",
            isNew: false,
          },
        ],
      },
    });

    expect(JSON.parse(map.get("trending:weeks")!)).toEqual([WEEK]);
  });

  it("keeps the week index newest-first, deduped, capped at 12", async () => {
    // 12 existing weeks, newest 2026-07-27 ... oldest 2026-05-11.
    const existing = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.parse("2026-07-27T00:00:00Z") - i * 7 * 86_400_000);
      return d.toISOString().slice(0, 10);
    });
    const { DB } = fakeDB((sql) =>
      /FROM trending_snapshots t/.test(sql)
        ? [publishRow({ item_id: "gh:a/skill-x" })]
        : [],
    );
    const { KV, map } = fakeKV({
      "trending:weeks": JSON.stringify(existing),
    });

    await approveWeek(env(DB, KV), WEEK, NOW);

    const weeks = JSON.parse(map.get("trending:weeks")!) as string[];
    expect(weeks).toHaveLength(12);
    expect(weeks[0]).toBe(WEEK); // new week leads
    expect(weeks[1]).toBe("2026-07-27");
    expect(weeks).not.toContain("2026-05-11"); // oldest fell off
    // Strictly descending (newest first, no dupes).
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i] < weeks[i - 1]).toBe(true);
    }
  });

  it("records the approval durably in approved_weeks", async () => {
    const { DB, statements } = fakeDB((sql) =>
      /FROM trending_snapshots t/.test(sql)
        ? [publishRow({ item_id: "gh:a/skill-x" })]
        : [],
    );
    const { KV } = fakeKV();

    await approveWeek(env(DB, KV), WEEK, NOW);

    const insert = statements.find((s) => /INSERT INTO approved_weeks/.test(s.sql));
    expect(insert).toBeDefined();
    expect(insert!.binds[0]).toBe(WEEK);
    expect(insert!.binds[1]).toBe(NOW.getTime());
  });

  it("stamps baseline:true when the prior week has no snapshots at all", async () => {
    const { DB } = fakeDB((sql) => {
      if (/FROM trending_snapshots t/.test(sql)) {
        return [publishRow({ item_id: "gh:a/x", star_vel: 0, star_growth: 0 })];
      }
      if (/COUNT\(\*\) AS n FROM item_snapshots/.test(sql)) return [{ n: 0 }];
      return [];
    });
    const { KV, map } = fakeKV();
    await approveWeek(env(DB, KV), WEEK, NOW);
    const payload = JSON.parse(map.get(`trending:${WEEK}`)!) as WeekPayload;
    expect(payload.baseline).toBe(true);
  });

  it("refuses to publish a week that was never computed — and touches nothing", async () => {
    const { DB, statements } = fakeDB(() => []);
    const { KV, map } = fakeKV();

    const result = await approveWeek(env(DB, KV), WEEK, NOW);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no computed snapshot/);
    expect(map.size).toBe(0); // no KV writes
    expect(
      statements.find((s) => /INSERT INTO approved_weeks/.test(s.sql)),
    ).toBeUndefined();
  });
});

describe("awesomeListName", () => {
  it("uses the repo alone when it is self-describing", () => {
    expect(
      awesomeListName(
        "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
      ),
    ).toBe("awesome-mcp-servers");
    expect(
      awesomeListName(
        "https://raw.githubusercontent.com/travisvn/awesome-claude-skills/main/README.md",
      ),
    ).toBe("awesome-claude-skills");
  });

  it("uses owner/repo when the repo name alone is ambiguous", () => {
    expect(
      awesomeListName(
        "https://raw.githubusercontent.com/anthropics/skills/main/README.md",
      ),
    ).toBe("anthropics/skills");
  });

  it("falls back to the raw value for unrecognized refs", () => {
    expect(awesomeListName("not-a-url")).toBe("not-a-url");
  });
});

describe("buildWeekPayload", () => {
  it("sorts by rank asc and trims each kind to 10 cards", () => {
    // 12 rows, deliberately shuffled ranks.
    const rows = Array.from({ length: 12 }, (_, i) =>
      publishRow({
        item_id: `gh:a/r${String(i).padStart(2, "0")}`,
        rank_in_kind: 12 - i,
      }),
    );
    const payload = buildWeekPayload(WEEK, NOW.toISOString(), rows, new Map());
    const cards = payload.kinds.skill!;
    expect(cards).toHaveLength(10);
    expect(cards.map((c) => c.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("drops rows whose kind is not a known bucket", () => {
    const payload = buildWeekPayload(
      WEEK,
      NOW.toISOString(),
      [publishRow({ item_id: "gh:a/x", kind: "mystery-kind" })],
      new Map(),
    );
    expect(payload.kinds).toEqual({});
  });

  it("derives repoUrl from a gh: id when canonical_repo is missing", () => {
    const payload = buildWeekPayload(
      WEEK,
      NOW.toISOString(),
      [publishRow({ item_id: "gh:a/x", canonical_repo: null })],
      new Map(),
    );
    expect(payload.kinds.skill![0].repoUrl).toBe("https://github.com/a/x");
  });

  it("carries baseline:true only when asked — absent otherwise, never false", () => {
    const rows = [publishRow({ item_id: "gh:a/x" })];
    const base = buildWeekPayload(WEEK, NOW.toISOString(), rows, new Map(), true);
    expect(base.baseline).toBe(true);
    // Absence (not false) on a normal week keeps the published JSON identical
    // to what the pre-baseline contract emitted.
    const normal = buildWeekPayload(WEEK, NOW.toISOString(), rows, new Map());
    expect("baseline" in normal).toBe(false);
  });
});
