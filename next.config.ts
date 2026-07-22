import type { NextConfig } from "next";

// The isolated content worker actually renders docs; we reverse-proxy its paths
// under the apex so the address bar stays ilolink.com. App routes (/, /publish,
// /dashboard, /api, /_next, static files) are matched first and never proxied;
// only slug-shaped paths and the doc's own asset/beacon paths are forwarded.
const CONTENT = "https://view.ilolink.com";

const nextConfig: NextConfig = {
  // Required by @opennextjs/cloudflare: produces .next/standalone for the adapter.
  output: "standalone",
  poweredByHeader: false,
  cleanDistDir: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/tracker.js", destination: `${CONTENT}/tracker.js` },
        { source: "/widget.js", destination: `${CONTENT}/widget.js` },
        { source: "/_collect", destination: `${CONTENT}/_collect` },
        { source: "/_feedback", destination: `${CONTENT}/_feedback` },
        { source: "/_comments", destination: `${CONTENT}/_comments` },
        { source: "/_report", destination: `${CONTENT}/_report` },
        { source: "/_unlock/:slug", destination: `${CONTENT}/_unlock/:slug` },
        // Binary bytes for pdf documents, streamed by the content worker and
        // framed by the doc page's same-origin <iframe>.
        { source: "/raw/:slug", destination: `${CONTENT}/raw/:slug` },
      ],
      afterFiles: [
        // Only slug-shaped single segments (no dots, no app paths) are docs.
        { source: "/:slug([a-z0-9-]{3,32})", destination: `${CONTENT}/:slug` },
      ],
    };
  },
};

export default nextConfig;

// Wire OpenNext's Cloudflare dev bindings so `next dev` can reach D1/R2/KV
// locally. Only in dev — during `next build` (NODE_ENV=production) it must NOT
// run: it boots Miniflare/workerd, which fails in CI's Linux sandbox and isn't
// needed for a build.
if (process.env.NODE_ENV !== "production") {
  // Lazy import so the build never even loads it.
  import("@opennextjs/cloudflare")
    .then((m) => m.initOpenNextCloudflareForDev())
    .catch(() => {});
}
