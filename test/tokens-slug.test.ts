import { describe, it, expect } from "vitest";
import {
  newManageToken,
  hashToken,
  verifyToken,
} from "@/lib/manage-token";
import { generateSlug, isValidCustomSlug } from "@/lib/slug";
import {
  MAX_BODY_BYTES,
  byteLength,
  isVisibility,
  isSourceType,
} from "@/lib/publish/pipeline";

describe("manage token", () => {
  it("mints a high-entropy token", () => {
    const t = newManageToken();
    expect(t.length).toBe(32);
    expect(newManageToken()).not.toBe(newManageToken());
  });

  it("hashToken is deterministic SHA-256 hex", async () => {
    const h1 = await hashToken("abc");
    const h2 = await hashToken("abc");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyToken accepts the right token, rejects wrong/empty/null", async () => {
    const token = newManageToken();
    const stored = await hashToken(token);
    expect(await verifyToken(token, stored)).toBe(true);
    expect(await verifyToken("wrong", stored)).toBe(false);
    expect(await verifyToken("", stored)).toBe(false);
    expect(await verifyToken(token, null)).toBe(false);
    expect(await verifyToken(token, "")).toBe(false);
  });
});

describe("slug", () => {
  it("generates a 6-char ambiguity-free slug", () => {
    for (let i = 0; i < 50; i++) {
      const s = generateSlug();
      expect(s).toHaveLength(6);
      expect(s).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/);
      expect(s).not.toMatch(/[01lio]/); // no ambiguous chars
    }
  });

  it("validates custom slugs and rejects reserved/invalid", () => {
    expect(isValidCustomSlug("my-doc")).toBe(true);
    expect(isValidCustomSlug("ab")).toBe(false); // too short
    expect(isValidCustomSlug("Has Space")).toBe(false);
    expect(isValidCustomSlug("UPPER")).toBe(false);
    expect(isValidCustomSlug("dashboard")).toBe(false); // reserved
    expect(isValidCustomSlug("api")).toBe(false); // reserved
  });
});

describe("publish input guards", () => {
  it("byteLength counts UTF-8 bytes, not chars", () => {
    expect(byteLength("abc")).toBe(3);
    expect(byteLength("é")).toBe(2); // 2-byte UTF-8
    expect(byteLength("😀")).toBe(4);
  });

  it("MAX_BODY_BYTES is 2 MB", () => {
    expect(MAX_BODY_BYTES).toBe(2 * 1024 * 1024);
  });

  it("visibility + source-type type guards", () => {
    expect(isVisibility("public")).toBe(true);
    expect(isVisibility("expiring")).toBe(true);
    expect(isVisibility("nope")).toBe(false);
    expect(isSourceType("md")).toBe(true);
    expect(isSourceType("html")).toBe(true);
    expect(isSourceType("pdf")).toBe(false);
  });
});
