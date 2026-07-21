// Per-doc manage token: the only proof of "I published this" in an accountless
// world. The raw token lives in the publisher's browser (localStorage); only its
// SHA-256 is stored server-side. High entropy (nanoid 32 ≈ 190 bits), so a plain
// SHA-256 is sufficient — no slow KDF needed. Presented to privileged endpoints
// (private analytics, comment moderation) and constant-time compared.
import { nanoid } from "nanoid";

export function newManageToken(): string {
  return nanoid(32);
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time compare of the presented token's hash against the stored hash.
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
