// Admin gate for the moderation surface. Access is a single shared ADMIN_SECRET
// (Worker secret) presented once via POST /api/admin/login and thereafter held
// in the HttpOnly `ilo_admin` cookie — never in a URL, log line, or client
// payload. Constant-time compare; no other identity.

import { env } from "@/lib/cf";

// Name of the HttpOnly session cookie holding the admin secret.
export const ADMIN_COOKIE = "ilo_admin";

function adminSecret(): string {
  return (env() as unknown as { ADMIN_SECRET?: string }).ADMIN_SECRET ?? "";
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function verifyAdmin(key: string | undefined | null): boolean {
  const secret = adminSecret();
  return !!secret && typeof key === "string" && constantTimeEqual(key, secret);
}
