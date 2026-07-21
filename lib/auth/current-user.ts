// Resolves the signed-in creator for a server request: read the host-only
// session cookie, look up the KV session, then hydrate the User from D1.
// Returns null for anyone not signed in (all visitors — visitors never sign in).
import { cookies } from "next/headers";
import { env } from "@/lib/cf";
import { SESSION_COOKIE, getSession } from "@/lib/auth/session";
import type { User } from "@/lib/types";

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getSession(token);
  if (!session) return null;

  const user = await env()
    .DB.prepare(
      "SELECT id, email, name, created_at FROM users WHERE id = ?",
    )
    .bind(session.user_id)
    .first<User>();

  return user ?? null;
}
