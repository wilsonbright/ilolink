// robots.txt as data, plus the renderer that turns it into the served file.
//
// Split out of app/robots.ts (Next's typed metadata route) because that route
// can only express rules — it has no way to emit a Content-Signal line, and we
// need one. Keeping the rules as plain data also keeps them assertable without
// rendering: test/seo-sitemap-robots.test.ts checks that no Disallow here
// shadows a sitemap URL.

import { SITE_URL } from "./site";

// Crawlers stay off the signed-in app, which has no SEO value and should not be
// indexed. The isolated content origin (view.ilolink.com) sets its own noindex.
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

export function renderRobotsTxt(): string {
  return [
    "# Content Signals: https://contentsignals.org/",
    "# ai-train=no is an express reservation of rights under Article 4 of EU",
    "# Directive 2019/790. Citing this content is welcome; training on it is not.",
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
