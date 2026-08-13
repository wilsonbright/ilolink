// The trends pipeline keys everything on ISO-Monday week strings, and its two
// crons sit on either side of the week boundary: ingest fires Sunday 22:00
// (inside the week it describes) and compute fires Monday 06:00 (inside the
// NEXT week, scoring the one that just ended). These tests pin that boundary
// exactly — get it wrong and compute scores an empty week every single run.

import { describe, it, expect } from "vitest";
import {
  isoMonday,
  snapshotWeek,
  computeWeek,
  priorWeek,
  isIsoMonday,
} from "@/trends-worker/src/week";

describe("isoMonday", () => {
  it("maps a mid-week date to that week's Monday", () => {
    // 2026-08-14 is a Friday.
    expect(isoMonday(new Date("2026-08-14T09:30:00Z"))).toBe("2026-08-10");
  });

  it("maps a Monday to itself, from midnight to end of day", () => {
    expect(isoMonday(new Date("2026-08-10T00:00:00Z"))).toBe("2026-08-10");
    expect(isoMonday(new Date("2026-08-10T23:59:59Z"))).toBe("2026-08-10");
  });

  it("maps a Sunday to the PRIOR Monday (ISO weeks start Monday)", () => {
    // 2026-08-09 is a Sunday; its ISO week began 2026-08-03.
    expect(isoMonday(new Date("2026-08-09T22:00:00Z"))).toBe("2026-08-03");
  });

  it("crosses the year boundary", () => {
    // 2026-01-01 is a Thursday; its week began Monday 2025-12-29.
    expect(isoMonday(new Date("2026-01-01T12:00:00Z"))).toBe("2025-12-29");
  });

  it("handles leap-year February", () => {
    // 2028-02-29 is a Tuesday; its week began Monday 2028-02-28.
    expect(isoMonday(new Date("2028-02-29T08:00:00Z"))).toBe("2028-02-28");
  });
});

describe("the Sunday/Monday cron boundary", () => {
  it("Sunday-22:00 ingest and Monday-06:00 compute target the SAME week", () => {
    const ingestRun = new Date("2026-08-09T22:00:00Z"); // Sunday cron
    const computeRun = new Date("2026-08-10T06:00:00Z"); // Monday cron, 8h later
    expect(snapshotWeek(ingestRun)).toBe("2026-08-03");
    expect(computeWeek(computeRun)).toBe("2026-08-03");
    expect(computeWeek(computeRun)).toBe(snapshotWeek(ingestRun));
  });

  it("compute must NOT use isoMonday(now) — Monday 06:00 is already the new week", () => {
    const computeRun = new Date("2026-08-10T06:00:00Z");
    expect(isoMonday(computeRun)).toBe("2026-08-10"); // the trap
    expect(computeWeek(computeRun)).toBe("2026-08-03"); // the fix
  });

  it("an off-schedule compute later the same Monday still targets the ended week", () => {
    expect(computeWeek(new Date("2026-08-10T18:00:00Z"))).toBe("2026-08-03");
  });
});

describe("priorWeek", () => {
  it("steps back exactly seven days", () => {
    expect(priorWeek("2026-08-03")).toBe("2026-07-27");
  });

  it("crosses the year boundary", () => {
    expect(priorWeek("2026-01-05")).toBe("2025-12-29");
  });
});

describe("isIsoMonday (admin ?week= validation)", () => {
  it("accepts a real ISO Monday", () => {
    expect(isIsoMonday("2026-08-03")).toBe(true);
    expect(isIsoMonday("2025-12-29")).toBe(true);
  });

  it("rejects non-Mondays, malformed strings, and garbage", () => {
    expect(isIsoMonday("2026-08-09")).toBe(false); // a Sunday
    expect(isIsoMonday("2026-8-3")).toBe(false); // not zero-padded
    expect(isIsoMonday("2026-13-01")).toBe(false); // no such month
    expect(isIsoMonday("last-monday")).toBe(false);
    expect(isIsoMonday("")).toBe(false);
  });
});
