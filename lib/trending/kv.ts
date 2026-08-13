// Binding access for the trending surfaces, split from read.ts so the parse
// layer stays importable from plain-node vitest (lib/cf pulls in the OpenNext
// runtime).
//
// Tolerant of contexts where the Cloudflare binding isn't wired up (plain
// `next dev`, day-one prod hiccups): the trending pages treat "no KV" exactly
// like "no data yet" and render their empty state instead of crashing.

import { env } from "@/lib/cf";

export function trendingKv(): KVNamespace | null {
  try {
    return env().KV;
  } catch {
    return null;
  }
}
