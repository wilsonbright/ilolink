// Magic-link tokens: short-lived, single-use proofs that a person controls an
// email address. The token lives only in KV under `magic:<token>`; consuming it
// deletes the key so a link can never be replayed.
import { nanoid } from "nanoid";
import { env } from "@/lib/cf";
import type { MagicLinkRecord } from "@/lib/types";

const MAGIC_TTL_SECONDS = 15 * 60; // 15 minutes
const magicKey = (token: string) => `magic:${token}`;

export async function createMagicToken(email: string): Promise<string> {
  const token = nanoid(32);
  const now = Date.now();
  const record: MagicLinkRecord = {
    email,
    created_at: now,
    expires_at: now + MAGIC_TTL_SECONDS * 1000,
  };
  await env().KV.put(magicKey(token), JSON.stringify(record), {
    expirationTtl: MAGIC_TTL_SECONDS,
  });
  return token;
}

// Returns the email the token was minted for, then deletes the key so it can be
// used exactly once. Returns null if the token is unknown, expired, or spent.
export async function consumeMagicToken(token: string): Promise<string | null> {
  if (!token) return null;
  const key = magicKey(token);
  const record = await env().KV.get<MagicLinkRecord>(key, "json");
  if (!record) return null;
  await env().KV.delete(key); // single-use: burn it regardless of validity below
  if (record.expires_at <= Date.now()) return null;
  return record.email;
}

export function buildMagicUrl(origin: string, token: string): string {
  // Must target the actual consumer route (GET handler that sets the session
  // cookie and redirects). Keep this in lockstep with app/api/auth/callback.
  const url = new URL("/api/auth/callback", origin);
  url.searchParams.set("token", token);
  return url.toString();
}
