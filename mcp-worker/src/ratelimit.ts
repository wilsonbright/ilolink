// Per-workspace rate limiting for the mutating MCP tools (audit HIGH #2). MCP
// tools were previously unmetered: a single workspace token could loop
// publish/update with multi-MB bodies and exhaust CPU/R2. Same fixed-window KV
// pattern as lib/ratelimit.ts and content-worker's rateLimitKV, but takes the KV
// binding directly (no OpenNext env()). Best-effort: KV is eventually consistent
// and read-then-write is non-atomic, so a tight concurrent burst can slip a few
// extra through — acceptable here because a single assistant issues tool calls
// sequentially, and the goal is to blunt sustained loops, not to be exact.

import { PublishError } from "./publish-core";

async function allow(
  KV: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const k = `rl:${key}`;
  const current = Number((await KV.get(k)) ?? "0");
  if (current >= limit) return false;
  await KV.put(k, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}

// Throw a friendly, retryable error when a workspace exceeds `limit` calls to
// `action` within `windowSeconds`. Thrown as a PublishError so the tool wrappers
// surface it to the model as an ordinary tool error, not a crash.
export async function enforceMcpRate(
  KV: KVNamespace,
  workspaceId: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  if (!(await allow(KV, `mcp:${action}:${workspaceId}`, limit, windowSeconds))) {
    throw new PublishError(
      "You're doing that too fast — please wait a moment and try again.",
    );
  }
}
