// Admin gate for the moderation surface. Access is a single shared ADMIN_SECRET
// (Worker secret) presented as a `?key=` query on the page and an `x-admin-key`
// header on the action API. Constant-time compare; no other identity.

import { env } from "@/lib/cf";

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
