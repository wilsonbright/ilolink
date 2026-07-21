// Sitemap for the marketing surface. Derived from the page registry so it can
// never fall out of sync with what actually exists. Published-doc pages
// (view.ilolink.com/*) are deliberately excluded — user content is noindex and
// must not dilute the marketing domain.
import type { MetadataRoute } from "next";
import { ALL_PAGES, SITE_UPDATED, absolute } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(SITE_UPDATED);
  return [
    {
      url: absolute("/"),
      lastModified: updated,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absolute("/guides"),
      lastModified: updated,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...ALL_PAGES.map((p) => ({
      url: absolute(p.path),
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: p.priority,
    })),
  ];
}
