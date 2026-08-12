// Dashboard tokens are the whole authorization for /w/[token]: no session, no
// membership check, just the string in the URL. These tests pin the two ways
// that guard used to be bypassable.

import { describe, it, expect } from "vitest";
import {
  signedDashboardUrl,
  verifyDashboardToken,
} from "@/lib/mcp/dashboard-token";

const SECRET = "test-dashboard-secret";
const WS = "w_Ab3xY9kLmN2pQ7rS";

function tokenFrom(url: string): string {
  return url.slice(url.lastIndexOf("/") + 1);
}

describe("verifyDashboardToken", () => {
  it("accepts a token it signed", async () => {
    const token = tokenFrom(await signedDashboardUrl(WS, SECRET));
    expect(await verifyDashboardToken(token, SECRET)).toBe(WS);
  });

  it("rejects a bare, unsigned workspace id", async () => {
    // The retired ChatGPT connector used the id as its own bearer secret, so
    // this form was accepted with no signature check — which made the signature
    // optional for Claude-OAuth ids too (SECURITY-AUDIT-2026-07-23 finding #1).
    expect(await verifyDashboardToken(WS, SECRET)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const token = tokenFrom(await signedDashboardUrl(WS, SECRET));
    const [id, sig] = token.split("~");
    const flipped = sig[0] === "A" ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    expect(await verifyDashboardToken(`${id}~${flipped}`, SECRET)).toBeNull();
  });

  it("rejects a signature minted with a different secret", async () => {
    const token = tokenFrom(await signedDashboardUrl(WS, "other-secret"));
    expect(await verifyDashboardToken(token, SECRET)).toBeNull();
  });

  it("fails closed, not loudly, when the secret is missing", async () => {
    // Callers default DASHBOARD_SECRET to "" when the binding is absent. Web
    // Crypto rejects a zero-length HMAC key, so without the guard this threw
    // DataError out of a public page — a 500 where a 404 is the honest answer.
    const token = tokenFrom(await signedDashboardUrl(WS, SECRET));
    await expect(verifyDashboardToken(token, "")).resolves.toBeNull();
  });
});
