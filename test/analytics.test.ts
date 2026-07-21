import { describe, it, expect } from "vitest";
import {
  deviceClass,
  refHost,
  visitorHash,
  dailySalt,
} from "@/lib/analytics/collect";

describe("deviceClass buckets", () => {
  it("maps widths to the three device tiers", () => {
    expect(deviceClass(320)).toBe("≤640");
    expect(deviceClass(640)).toBe("≤640");
    expect(deviceClass(641)).toBe("641–1024");
    expect(deviceClass(1024)).toBe("641–1024");
    expect(deviceClass(1025)).toBe("≥1025");
    expect(deviceClass(1920)).toBe("≥1025");
  });

  it("defends against non-finite widths", () => {
    expect(deviceClass(NaN)).toBe("≤640");
  });
});

describe("refHost", () => {
  it("reduces a referrer to its bare host", () => {
    expect(refHost("https://news.ycombinator.com/item?id=1")).toBe(
      "news.ycombinator.com",
    );
    expect(refHost("")).toBe("");
    expect(refHost("not a url")).toBe("");
  });
});

describe("cookieless visitor hash", () => {
  it("is a deterministic 64-hex digest for the same inputs on the same day", async () => {
    const a = await visitorHash("1.2.3.4", "UA", "docX", "secret");
    const b = await visitorHash("1.2.3.4", "UA", "docX", "secret");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs across ip / ua / doc / salt", async () => {
    const base = await visitorHash("1.2.3.4", "UA", "docX", "secret");
    expect(await visitorHash("9.9.9.9", "UA", "docX", "secret")).not.toBe(base);
    expect(await visitorHash("1.2.3.4", "other", "docX", "secret")).not.toBe(base);
    expect(await visitorHash("1.2.3.4", "UA", "docY", "secret")).not.toBe(base);
    expect(await visitorHash("1.2.3.4", "UA", "docX", "other")).not.toBe(base);
  });

  it("dailySalt depends on the secret", async () => {
    expect(await dailySalt("a")).not.toBe(await dailySalt("b"));
    expect(await dailySalt("a")).toMatch(/^[0-9a-f]{64}$/);
  });
});
