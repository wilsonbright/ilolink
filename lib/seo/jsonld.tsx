// Structured-data helpers (Stage 4 of the content plan). Each builder returns a
// plain schema.org object; <JsonLd> serializes it into a script tag. Keeping the
// builders pure makes them trivial to unit-test and lets a page compose several
// (Article + HowTo + FAQPage) without duplicating the boilerplate.

import { SITE_NAME, SITE_URL, absolute } from "./site";

type Json = Record<string, unknown>;

export function organization(): Json {
  return {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function article(opts: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(opts.path) },
    author: organization(),
    publisher: organization(),
  };
}

export interface HowToStep {
  name: string;
  text: string;
}

export function howTo(opts: {
  name: string;
  description: string;
  steps: HowToStep[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqPage(items: FaqItem[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function softwareApplication(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbList(crumbs: Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absolute(c.path),
    })),
  };
}

// Escape the three sequences that can terminate/hijack a <script> block even
// inside JSON. Data here is app-authored, but escaping is unconditional so a
// stray "</script>" in future copy can never break out of the tag.
function safeLd(block: Json): string {
  return JSON.stringify(block)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

// Renders one or many schema objects as ld+json script tags.
export function JsonLd({ data }: { data: Json | Json[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeLd(block) }}
        />
      ))}
    </>
  );
}
