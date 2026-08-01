// Opaque bearer tokens: session cookies, magic links, invites, PATs.
//
// All of these are high-entropy random strings (nanoid 32 ≈ 190 bits), so a
// plain SHA-256 is the right hash — an attacker who steals the D1 table cannot
// brute-force a 190-bit preimage, and a slow KDF would only tax our own hot
// path. Low-entropy secrets (a 6-digit OTP) MUST NOT use this; they go through
// lib/crypto/password.ts (PBKDF2) instead.
//
// Promoted out of lib/manage-token.ts so the auth layer doesn't depend on a
// module named after the accountless-era manage token.
import { nanoid } from "nanoid";

// 32 chars of nanoid alphabet ≈ 190 bits.
export function newOpaqueToken(): string {
  return nanoid(32);
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time compare of a presented token against a stored hash.
export async function verifyToken(
  token: string,
  storedHash: string | null,
): Promise<boolean> {
  if (!token || !storedHash) return false;
  const h = await hashToken(token);
  if (h.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) {
    diff |= h.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
