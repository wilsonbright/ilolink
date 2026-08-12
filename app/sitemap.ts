// Sitemap for the marketing surface. Derived from the page registry so it can
// never fall out of sync with what actually exists. Published-doc pages
// (view.ilolink.com/*) are deliberately excluded — user content is noindex and
// must not dilute the marketing domain.
import type { MetadataRoute } from "next";
import { ALL_PAGES, CORPUS_UPDATED, absolute } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Corpus-wide fallback; a page carrying its own `updated` overrides it. Both
  // the home page and the /guides index are swept with the corpus, and neither
  // is in the registry (the registry lists leaf content), so they take it.
  const corpus = new Date(CORPUS_UPDATED);
  return [
    {
      url: absolute("/"),
      lastModified: corpus,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absolute("/guides"),
      lastModified: corpus,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...ALL_PAGES.map((p) => ({
      url: absolute(p.path),
      lastModified: p.updated ? new Date(p.updated) : corpus,
      changeFrequency: "monthly" as const,
      priority: p.priority,
    })),
  ];
}
