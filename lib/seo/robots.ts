// robots.txt as data, plus the renderer that turns it into the served file.
//
// Split out of app/robots.ts (Next's typed metadata route) because that route
// can only express rules — it has no way to emit a Content-Signal line, and we
// need one. Keeping the rules as plain data also keeps them assertable without
// rendering: test/seo-sitemap-robots.test.ts checks that no Disallow here
// shadows a sitemap URL.

import { SITE_URL } from "./site";

// Crawlers stay off the signed-in app, which has no SEO value and should not be
// indexed. The isolated content origin (view.ilolink.com) has its OWN rules —
// see DOC_ORIGIN_DISALLOW below; do not add app paths to this list expecting
// them to cover documents, or vice versa.
//
// This list was written when the app was /dashboard + /publish + /api and went
// stale as the app grew: /t, /connect, /signin, /invite, /oauth and /w had all
// become crawlable. Every route group under app/(app) belongs here.
//
// `/t$` + `/t/` rather than a bare `/t`: Disallow is a PREFIX match, so `/t`
// would also block /terms — a legal page that is in the sitemap and must stay
// indexable. `$` (end-of-URL) is honoured by Google and Bing; a crawler that
// ignores it just sees a literal path that does not exist, which is harmless.
//
// Belt and braces, deliberately: pages under app/(app) also carry
// `robots: { index: false, follow: false }` metadata. Disallow saves crawl
// budget but cannot stop a linked-but-uncrawled URL appearing bare in results;
// the meta tag is the actual guarantee, for any crawler that fetches anyway.
export const DISALLOW = [
  "/api/",
  "/dashboard",
  "/publish",
  "/connect",
  "/signin",
  "/invite",
  "/oauth/",
  // The token IS the credential for these link-only surfaces — they must never
  // be fetched, let alone indexed.
  "/w/",
  "/t$",
  "/t/",
] as const;

// Content Signals (contentsignals.org): machine-readable permissions, separate
// from whether a crawler may FETCH the page at all.
//
//   search    — may index it and return links and short excerpts
//   ai-input  — may feed it to a model answering a question now (RAG, AI search)
//   ai-train  — may train or fine-tune a model on it
//
// yes / yes / no is the deliberate position: being cited by an assistant is
// distribution and we want it, while training is a one-way transfer that cannot
// be withdrawn once it has happened. Stating ai-train=no is also an express
// reservation of rights under Article 4 of EU Directive 2019/790.
//
// Cloudflare's managed robots.txt used to emit a version of this, but it will
// not serve an ai-input signal at all and paired the signals with a blanket
// `Disallow: /` for every named AI crawler — which blocked the citing we want.
// Turning that feature off hands the whole file back to this module, so the
// reservation has to live here or it does not exist.
export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=no";

const SIGNAL_PREAMBLE = [
  "# Content Signals: https://contentsignals.org/",
  "# ai-train=no is an express reservation of rights under Article 4 of EU",
  "# Directive 2019/790. Citing this content is welcome; training on it is not.",
];

export function renderRobotsTxt(): string {
  return [
    ...SIGNAL_PREAMBLE,
    "",
    "User-agent: *",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
    ...DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

// ── The document origin (view.ilolink.com) ───────────────────────────────
// Served by the content worker, which is a bare fetch handler with no
// framework routing — so until this existed, GET /robots.txt fell through to
// slug lookup and answered 404. Cloudflare's managed robots.txt used to paper
// over that on every hostname in the zone; turning it off (correctly, it blocked
// AI citation) left the document origin with no robots.txt at all, and therefore
// no ai-train reservation on the one origin that serves every user's document.
//
// A slug is `^[a-z0-9-]+$` (lib/slug.ts) and the apex only proxies
// `/:slug([a-z0-9-]{3,32})` (next.config.ts), so no rule below can shadow a
// document: none of them is spellable as a slug.
export const DOC_ORIGIN_DISALLOW = [
  // Beacons and fragments, not pages: /_collect, /_feedback, /_comments,
  // /_report, /_unlock. One prefix covers them because no slug may contain `_`.
  //
  // This exact rule would be HARMFUL on the apex, where it would also block
  // /_next/ and stop Google fetching the CSS and JS it needs to render a page.
  // Same string, opposite verdict, decided entirely by what else lives on the
  // hostname — which is why these two lists stay separate.
  "/_",
] as const;

// `/raw/` is deliberately NOT disallowed. A pdf document's page is an iframe
// around /raw/<slug>, so the words are only in the PDF itself; blocking it would
// make every public PDF unindexable while looking like a privacy measure. It is
// not one — /raw/ enforces the same access gate as the page it serves.
export function renderDocOriginRobotsTxt(): string {
  return [
    ...SIGNAL_PREAMBLE,
    "#",
    "# This is the isolated document origin. Documents are published here and",
    "# proxied under ilolink.com/<slug>, which every page names as its canonical.",
    "",
    "User-agent: *",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
    ...DOC_ORIGIN_DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    // No Sitemap line, and no sitemap to point at: published documents are
    // user content, not marketing pages, and app/sitemap.ts excludes them on
    // purpose. Pointing at the apex sitemap from here would advertise a list of
    // URLs that live on a different host and say nothing about this one.
    "",
  ].join("\n");
}
