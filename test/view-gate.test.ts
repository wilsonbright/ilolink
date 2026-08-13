import { describe, it, expect } from "vitest";
import {
  mintViewToken,
  verifyViewToken,
  VIEW_TOKEN_TTL_SECONDS,
} from "@/lib/view-gate";

// This token is the entire authorization for viewing a PRIVATE document on
// view.ilolink.com — the session cookie deliberately never reaches that
// origin. The mint side lives here; the verify side is duplicated in
// content-worker/src/view-gate.ts against the same format, so these fixed
// vectors double as the cross-worker contract.
describe("view-gate token", () => {
  const SECRET = "test-view-gate-secret";
  const SLUG = "quarterly-plan";
  const NOW = 1_755_000_000_000; // fixed epoch ms

  it("round-trips: a freshly minted token verifies for its slug", async () => {
    const t = await mintViewToken(SECRET, SLUG, NOW);
    expect(await verifyViewToken(SECRET, SLUG, t, NOW)).toBe(true);
  });

  it("matches the contract shape: '<epoch-seconds>.<64 lowercase hex>'", async () => {
    const t = await mintViewToken(SECRET, SLUG, NOW);
    const [exp, sig] = t.split(".");
    expect(exp).toBe(String(Math.floor(NOW / 1000) + VIEW_TOKEN_TTL_SECONDS));
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stays valid just before expiry and dies at it", async () => {
    const t = await mintViewToken(SECRET, SLUG, NOW);
    const expiry = NOW + VIEW_TOKEN_TTL_SECONDS * 1000;
    expect(await verifyViewToken(SECRET, SLUG, t, expiry - 1)).toBe(true);
    // exp > now must be strict: at the exact expiry instant the token is dead.
    expect(await verifyViewToken(SECRET, SLUG, t, expiry)).toBe(false);
    expect(await verifyViewToken(SECRET, SLUG, t, expiry + 1)).toBe(false);
  });

  it("rejects a token minted for a different slug", async () => {
    // The whole point of binding the slug into the signature: one member link
    // must not open every private document in the teamspace.
    const t = await mintViewToken(SECRET, "other-doc", NOW);
    expect(await verifyViewToken(SECRET, SLUG, t, NOW)).toBe(false);
  });

  it("rejects a token minted with a different secret", async () => {
    const t = await mintViewToken("wrong-secret", SLUG, NOW);
    expect(await verifyViewToken(SECRET, SLUG, t, NOW)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const t = await mintViewToken(SECRET, SLUG, NOW);
    const flipped =
      t.slice(0, -1) + (t.endsWith("0") ? "1" : "0");
    expect(await verifyViewToken(SECRET, SLUG, flipped, NOW)).toBe(false);
  });

  it("rejects a tampered expiry", async () => {
    // Extending exp without re-signing must fail — exp is inside the HMAC.
    const t = await mintViewToken(SECRET, SLUG, NOW);
    const sig = t.slice(t.indexOf(".") + 1);
    const later = String(Math.floor(NOW / 1000) + 9_999_999);
    expect(await verifyViewToken(SECRET, SLUG, `${later}.${sig}`, NOW)).toBe(false);
  });

  it("rejects malformed tokens", async () => {
    const sig64 = "a".repeat(64);
    for (const bad of [
      "",
      ".",
      "12345",
      "12345.",
      `.${sig64}`,
      `12345.deadbeef`, // sig too short
      `12345.${"A".repeat(64)}`, // uppercase hex is not the contract
      `12e5.${sig64}`, // exp must be plain decimal digits
      `-12345.${sig64}`,
      `12345.${sig64}.extra`,
    ]) {
      expect(await verifyViewToken(SECRET, SLUG, bad, NOW)).toBe(false);
    }
  });

  it("honours a custom ttl", async () => {
    const t = await mintViewToken(SECRET, SLUG, NOW, 10);
    expect(await verifyViewToken(SECRET, SLUG, t, NOW + 9_000)).toBe(true);
    expect(await verifyViewToken(SECRET, SLUG, t, NOW + 11_000)).toBe(false);
  });
});
