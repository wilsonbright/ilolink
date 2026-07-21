import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Zen defaults: keep infra minimal for v1.
// - incrementalCache: KV is the low-latency edge cache for rendered/ISR content.
// - queue: "direct" runs revalidation inline (no extra queue) until Phase 3 needs batching.
export default defineCloudflareConfig({
  incrementalCache: "dummy",
  queue: "direct",
});
