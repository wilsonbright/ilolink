// View-gate tokens for PRIVATE documents.
//
// CROSS-WORKER CONTRACT — this token format is verified by the content worker
// in content-worker/src/view-gate.ts (its twin of this logic). Change nothing
// here without changing it there in the same release, or members clicking
// ilolink.com/private/<slug> land on the gate page instead of the document.
//
// Format:  vt = "<exp>.<sig>"
//   exp — expiry as epoch SECONDS, decimal string
//   sig — lowercase hex HMAC-SHA256(VIEW_GATE_SECRET, slug + "." + exp)
//
// The app worker mints one after checking teamspace membership
// (app/private/[slug]/route.ts) and 302s to view.ilolink.com/<slug>?vt=…;
// the content worker recomputes the signature, compares in constant time, and
// requires exp to still be in the future. Validity is 300 seconds — long
// enough to follow a redirect and refresh, short enough that a leaked URL
// goes stale before it is worth sharing.
//
// Pure WebCrypto (crypto.subtle) — both workers run on workerd, and this file
// must never import env(), bindings, or anything Node-only.

import { hmacHex, constantTimeEqual } from "@/lib/crypto/hmac";

export const VIEW_TOKEN_TTL_SECONDS = 300;

// Mint "<exp>.<sig>" for `slug`, expiring ttlSeconds from nowMs.
export async function mintViewToken(
  secret: string,
  slug: string,
  nowMs: number,
  ttlSeconds: number = VIEW_TOKEN_TTL_SECONDS,
): Promise<string> {
  const exp = String(Math.floor(nowMs / 1000) + ttlSeconds);
  const sig = await hmacHex(secret, `${slug}.${exp}`);
  return `${exp}.${sig}`;
}

// True only for a well-formed, unexpired token whose signature matches this
// slug. Every failure — wrong shape, wrong slug, tampered signature, expired —
// is the same false; callers must treat false as "show the gate", never as a
// reason to explain what specifically was wrong.
export async function verifyViewToken(
  secret: string,
  slug: string,
  token: string,
  nowMs: number,
): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  // Shape first: exp is a decimal epoch-seconds string, sig is 64 lowercase
  // hex chars. This is parsing, not verification — the signature check below
  // is what decides, and constantTimeEqual keeps it length-independent.
  if (!/^\d+$/.test(exp) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = await hmacHex(secret, `${slug}.${exp}`);
  if (!constantTimeEqual(sig, expected)) return false;
  return Number(exp) * 1000 > nowMs;
}
