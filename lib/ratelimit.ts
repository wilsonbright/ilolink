import { env } from "@/lib/cf";

// Fixed-window rate limiter backed by KV counters (spec §6.5). Cheap and
// approximate — good enough to blunt abuse (email bombing, collector floods).
// Returns true when the action is ALLOWED, false when the window is exhausted.
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const kv = env().KV;
  const k = `rl:${key}`;
  const current = Number((await kv.get(k)) ?? "0");
  // Blocked hits return before any write, so they never extend the window.
  if (current >= limit) return false;
  // KV `put` without expirationTtl clears any existing expiry, so always set it.
  // The window effectively runs from the first hit; allowed hits (<= limit) may
  // extend it slightly, which is harmless for abuse-blunting.
  await kv.put(k, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}

// Best-effort client IP from Cloudflare request headers.
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
