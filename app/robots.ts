// robots.txt. Allow the marketing surface; keep crawlers off app-only routes
// (dashboard, publish, api) that have no SEO value and shouldn't be indexed.
// The isolated content origin (view.ilolink.com) sets its own noindex.
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/publish", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
