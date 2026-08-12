// robots.txt. Allow the marketing surface; keep crawlers off the signed-in app,
// which has no SEO value and shouldn't be indexed.
// The isolated content origin (view.ilolink.com) sets its own noindex.
//
// This list was written when the app was /dashboard + /publish + /api and went
// stale as the app grew: /t, /connect, /signin, /invite, /oauth and /w were all
// crawlable. Every route group under app/(app) belongs here.
//
// `/t$` + `/t/` rather than a bare `/t`: Disallow is a PREFIX match, so `/t`
// would also block /terms — a legal page that is in the sitemap and must stay
// indexable. `$` (end-of-URL) is honoured by Google and Bing; a crawler that
// ignores it just sees a literal path that does not exist, which is harmless.
// test/seo-sitemap-robots.test.ts asserts no rule here shadows a sitemap URL.
//
// Belt and braces, deliberately: pages under app/(app) also carry
// `robots: { index: false, follow: false }` metadata. Disallow saves crawl
// budget but cannot stop a linked-but-uncrawled URL appearing bare in results;
// the meta tag is the actual guarantee, for any crawler that fetches anyway.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/publish",
        "/connect",
        "/signin",
        "/invite",
        "/oauth/",
        // The token IS the credential for these link-only surfaces — they must
        // never be fetched, let alone indexed.
        "/w/",
        "/t$",
        "/t/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
