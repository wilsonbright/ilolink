import type { NextConfig } from "next";

// The isolated content worker actually renders docs; we reverse-proxy its paths
// under the apex so the address bar stays ilolink.com. App routes (/, /publish,
// /dashboard, /api, /_next, static files) are matched first and never proxied;
// only slug-shaped paths and the doc's own asset/beacon paths are forwarded.
const CONTENT = "https://view.ilolink.com";

// App-origin security headers (audit MEDIUM #9). The isolated content worker
// already sets a strict per-doc CSP; the app origin previously sent none, so the
// token-bearing dashboards (/w/*) and the admin surface could be framed and had
// no HSTS. frame-ancestors 'self' (not 'none') is deliberate: pdf documents are
// shown in a same-origin iframe. strict-origin-when-cross-origin keeps the
// path-embedded /w token out of cross-origin Referer headers (only the bare
// origin is sent off-site).
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// Framing rules are applied separately from the rest because /embed/* needs the
// opposite answer. X-Frame-Options has no "allow one specific origin" value
// (ALLOW-FROM is dead), so the only way to let the content origin frame the
// comment composer is to NOT emit the header on that path — hence the negative
// lookahead rather than a later override.
const FRAME_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

// The identity island: /embed/comment is framed BY a published document on the
// content origin. It is the one app surface that may be framed cross-origin,
// and it is deliberately the only place an authenticated write is reachable
// from a page the document author controls.
const EMBED_FRAME_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: `frame-ancestors 'self' ${CONTENT}`,
  },
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig: NextConfig = {
  // Required by @opennextjs/cloudflare: produces .next/standalone for the adapter.
  output: "standalone",
  poweredByHeader: false,
  cleanDistDir: true,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Everything except /embed/* keeps the strict framing rules.
      { source: "/((?!embed/).*)", headers: FRAME_HEADERS },
      { source: "/embed/:path*", headers: EMBED_FRAME_HEADERS },
      // Token/secret-bearing surfaces must never be stored by a shared cache.
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/w/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
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
