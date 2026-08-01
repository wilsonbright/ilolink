// Request-scoped access to the signed-in user, for both route handlers and RSC.
//
// resolveSession() costs two indexed D1 reads, and a single render can ask for
// the user several times, so the result is memoized per request via React's
// cache(). In a route handler (no React render scope) cache() degrades to a
// plain call, which is correct — just uncached.

import { cache } from "react";
import { headers } from "next/headers";
import { resolveSession, type SessionContext, type UserRow } from "./session";

// RSC path: rebuild a Request from the incoming headers so one implementation
// serves both worlds.
export const currentSession = cache(async (): Promise<SessionContext | null> => {
  const h = await headers();
  const cookie = h.get("cookie");
  if (!cookie) return null;
  return resolveSession(new Request("https://ilolink.com/", { headers: { cookie } }));
});

export async function currentUser(): Promise<UserRow | null> {
  return (await currentSession())?.user ?? null;
}

// For RSC. Throws rather than redirecting so the caller decides the response —
// pages redirect to /signin?next=..., API routes return 401.
export class UnauthenticatedError extends Error {
  constructor() {
    super("Sign in to continue.");
  }
}

export async function requireUser(): Promise<UserRow> {
  const user = await currentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}
