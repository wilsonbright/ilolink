import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by @opennextjs/cloudflare: produces .next/standalone for the adapter.
  output: "standalone",
  poweredByHeader: false,
  cleanDistDir: true,
};

export default nextConfig;

// Wire OpenNext's Cloudflare dev bindings so `next dev` can reach D1/R2/KV locally.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
