// The cross-worker contract test: the app worker MINTS view-gate tokens
// (lib/view-gate.ts) and the content worker VERIFIES them
// (content-worker/src/view-gate.ts). Each side has its own unit tests against
// fixed vectors; this file is the only place the two real implementations meet,
// so a format drift (message string, hex casing, exp encoding) fails here even
// if both sides' own suites stay green.
import { describe, expect, it } from "vitest";
import { mintViewToken } from "@/lib/view-gate";
import { verifyViewGateToken } from "../content-worker/src/view-gate";

const SECRET = "cross-contract-secret";
const SLUG = "abc123";
const NOW = 1_760_000_000_000; // fixed epoch ms

describe("view-gate cross-worker contract", () => {
  it("content-worker verifies what the app mints", async () => {
    const token = await mintViewToken(SECRET, SLUG, NOW);
    expect(await verifyViewGateToken(SECRET, SLUG, token, NOW)).toBe(true);
    // Still valid just inside the TTL…
    expect(
      await verifyViewGateToken(SECRET, SLUG, token, NOW + 299_000),
    ).toBe(true);
    // …and dead after it.
    expect(
      await verifyViewGateToken(SECRET, SLUG, token, NOW + 301_000),
    ).toBe(false);
  });

  it("a token minted for one slug does not open another", async () => {
    const token = await mintViewToken(SECRET, SLUG, NOW);
    expect(await verifyViewGateToken(SECRET, "other0", token, NOW)).toBe(false);
  });

  it("a secret mismatch fails closed", async () => {
    const token = await mintViewToken(SECRET, SLUG, NOW);
    expect(await verifyViewGateToken("wrong", SLUG, token, NOW)).toBe(false);
    expect(await verifyViewGateToken("", SLUG, token, NOW)).toBe(false);
  });
});
