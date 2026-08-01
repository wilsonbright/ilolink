import { describe, it, expect } from "vitest";
import {
  constantTimeEqual,
  hmac,
  signPayload,
  verifyPayload,
} from "@/lib/crypto/hmac";

// This envelope authorizes the cross-worker MCP handoff: the app asserts "this
// user approved this grant" and the MCP worker believes it on the strength of
// the signature alone. Every one of these cases is a way that could go wrong.
describe("signed payload envelope", () => {
  const SECRET = "test-secret-value";
  const NOW = 1_700_000_000_000;

  it("round-trips a payload", async () => {
    const t = await signPayload(SECRET, { userId: "u_1", teamspaceId: "t_1" }, 120, NOW);
    const out = await verifyPayload<{ userId: string; teamspaceId: string }>(
      SECRET,
      t,
      NOW,
    );
    expect(out?.userId).toBe("u_1");
    expect(out?.teamspaceId).toBe("t_1");
  });

  it("rejects a payload signed with a different secret", async () => {
    const t = await signPayload(SECRET, { userId: "u_1" }, 120, NOW);
    expect(await verifyPayload("other-secret", t, NOW)).toBeNull();
  });

  it("rejects a tampered body", async () => {
    // The whole point: flipping userId must invalidate the signature, or one
    // user could approve a grant as another.
    const t = await signPayload(SECRET, { userId: "u_1" }, 120, NOW);
    const [body, sig] = t.split(".");
    const evil = btoa(JSON.stringify({ userId: "u_admin", exp: NOW + 1000 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifyPayload(SECRET, `${evil}.${sig}`, NOW)).toBeNull();
    expect(body).not.toBe(evil);
  });

  it("rejects a tampered signature", async () => {
    const t = await signPayload(SECRET, { userId: "u_1" }, 120, NOW);
    const [body] = t.split(".");
    expect(await verifyPayload(SECRET, `${body}.AAAA`, NOW)).toBeNull();
  });

  it("rejects an expired payload", async () => {
    const t = await signPayload(SECRET, { userId: "u_1" }, 120, NOW);
    // One millisecond past expiry.
    expect(await verifyPayload(SECRET, t, NOW + 120_001)).toBeNull();
    // Still valid just before.
    expect(await verifyPayload(SECRET, t, NOW + 119_000)).not.toBeNull();
  });

  it("rejects structurally malformed tokens", async () => {
    for (const bad of ["", ".", "nodot", "a.b.c", "....", "abc."]) {
      expect(await verifyPayload(SECRET, bad, NOW)).toBeNull();
    }
  });

  it("rejects a body that is valid base64 but not an object", async () => {
    const body = btoa('"just a string"')
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const sig = await hmac(SECRET, body);
    expect(await verifyPayload(SECRET, `${body}.${sig}`, NOW)).toBeNull();
  });

  it("rejects a correctly signed payload with no expiry", async () => {
    // A signature alone must not be enough — an eternal grant assertion would
    // survive revocation forever.
    const body = btoa(JSON.stringify({ userId: "u_1" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const sig = await hmac(SECRET, body);
    expect(await verifyPayload(SECRET, `${body}.${sig}`, NOW)).toBeNull();
  });
});

describe("constantTimeEqual", () => {
  it("matches identical strings and rejects everything else", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "ab")).toBe(false);
    expect(constantTimeEqual("", "")).toBe(true);
  });
});
