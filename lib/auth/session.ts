// Server sessions: an opaque token in a host-only cookie maps to a SessionRecord
// held in KV. The cookie carries no identity itself, only the lookup token.
import { nanoid } from "nanoid";
import { env } from "@/lib/cf";
import type { SessionRecord } from "@/lib/types";

export const SESSION_COOKIE = "ilo_session";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const sessionKey = (token: string) => `session:${token}`;

// Cookie attributes for the session cookie.
//
// NO Domain attribute is set on purpose: the cookie is host-only, so it is
// scoped to the creator origin (app.ilolink.com) and is NEVER sent to the
// public content origin (view.ilolink.com). That keeps creator sessions out of
// untrusted rendered-document responses — origin isolation by construction.
export function sessionCookieAttrs(): {
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createSession(userId: string, email: string): Promise<string> {
  const token = nanoid(32);
  const now = Date.now();
  const record: SessionRecord = {
    user_id: userId,
    email,
    created_at: now,
    expires_at: now + SESSION_TTL_SECONDS * 1000,
  };
  await env().KV.put(sessionKey(token), JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return token;
}

export async function getSession(token: string): Promise<SessionRecord | null> {
  if (!token) return null;
  const record = await env().KV.get<SessionRecord>(sessionKey(token), "json");
  if (!record) return null;
  if (record.expires_at <= Date.now()) {
    await destroySession(token);
    return null;
  }
  return record;
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await env().KV.delete(sessionKey(token));
}
