// memoryRecent backs a future MCP org-memory recall tool. The property that
// matters is scoping: the query must filter by the teamspace_id it was handed
// (which the registration site takes from requireMember, never from the tool's
// arguments), and the limit must be clamped so one call can't drain the table.

import { describe, it, expect } from "vitest";
import {
  memoryRecent,
  MEMORY_MAX_LIMIT,
  MEMORY_DEFAULT_LIMIT,
} from "@/mcp-worker/src/memory";
import type { MemoryRow } from "@/mcp-worker/src/memory";

// Captures the SQL and bound values of the single prepare/bind/all the
// function performs — cheaper and clearer than a miniflare harness.
function fakeDB(rows: MemoryRow[]) {
  const seen: { sql: string; binds: unknown[] } = { sql: "", binds: [] };
  const DB = {
    prepare: (sql: string) => ({
      bind: (...binds: unknown[]) => {
        seen.sql = sql;
        seen.binds = binds;
        return { all: async () => ({ results: rows }) };
      },
    }),
  } as unknown as D1Database;
  return { DB, seen };
}

const row: MemoryRow = {
  title: "Q3 Notes",
  excerpt: "We shipped the connector.",
  kind: "md",
  created_at: 1_755_000_000_000,
  created_by_email: "wilson@blocksurvey.org",
};

describe("memoryRecent", () => {
  it("returns rows scoped to the bound teamspace, newest first", async () => {
    const { DB, seen } = fakeDB([row]);
    const out = await memoryRecent({ DB }, "ts_1", 10);
    expect(out).toEqual([row]);
    expect(seen.sql).toMatch(/WHERE m\.teamspace_id = \?/);
    expect(seen.sql).toMatch(/ORDER BY m\.created_at DESC/);
    expect(seen.binds[0]).toBe("ts_1");
    expect(seen.binds[1]).toBe(10);
  });

  it("attributes entries via a LEFT JOIN so memory survives a deleted author", () => {
    const { DB, seen } = fakeDB([]);
    return memoryRecent({ DB }, "ts_1").then(() => {
      expect(seen.sql).toMatch(/LEFT JOIN users/);
    });
  });

  it("clamps an oversized limit to the cap", async () => {
    const { DB, seen } = fakeDB([]);
    await memoryRecent({ DB }, "ts_1", 10_000);
    expect(seen.binds[1]).toBe(MEMORY_MAX_LIMIT);
  });

  it("clamps zero, negative, and NaN limits back to sane values", async () => {
    for (const bad of [0, -5, Number.NaN]) {
      const { DB, seen } = fakeDB([]);
      await memoryRecent({ DB }, "ts_1", bad);
      const n = seen.binds[1] as number;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(MEMORY_MAX_LIMIT);
    }
  });

  it("defaults the limit when the caller omits it", async () => {
    const { DB, seen } = fakeDB([]);
    await memoryRecent({ DB }, "ts_1");
    expect(seen.binds[1]).toBe(MEMORY_DEFAULT_LIMIT);
  });
});
