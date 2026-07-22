import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Prose,
  Faq,
  Cta,
  RelatedLinks,
} from "../_components/content";

export const metadata: Metadata = {
  title: "ilolink help center — fixes & guides",
  description:
    "Quick fixes for a page that looks broken once hosted, images that won't load, and files over the 2 MB cap — plus how to get more from your analytics.",
  alternates: { canonical: "/help" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/help",
            headline: "ilolink help center",
            description:
              "Quick fixes for the most common issues — a page that looks broken once hosted, images that don't load, files over the 2 MB cap — plus how to get more from your analytics.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
        ]}
      />
      <PageHeader
        title="ilolink help center"
        lead={
          <>
            Quick fixes for the most common issues: a page that looks broken
            once hosted, images that don&apos;t load, and files over the 2 MB
            cap — plus where to get the most from your analytics. Start with the
            fix that matches what you&apos;re seeing.
          </>
        }
      />
      <Prose>
        <p>
          Most problems come from one thing: a published page has to be
          self-contained. It&apos;s served on an isolated origin under a strict
          content-security policy. Inline <code>&lt;style&gt;</code> and Google
          Fonts (<code>fonts.googleapis.com</code> stylesheets,{" "}
          <code>fonts.gstatic.com</code> files) work; so do{" "}
          <code>https://</code> and <code>data:</code> images. Other external
          stylesheets and scripts, author JavaScript, relative asset paths, and{" "}
          <code>http://</code> images are blocked and render broken. The three
          articles below cover the cases that actually come up.
        </p>

        <h2>Common fixes</h2>
        <ul>
          <li>
            <a href="/help/html-looks-broken">My HTML looks broken once hosted</a>{" "}
            — a blocked CDN stylesheet or script; ask the AI for one
            self-contained file with inline CSS.
          </li>
          <li>
            <a href="/help/images-dont-load">My images don&apos;t load</a> —
            relative paths and <code>http://</code> URLs are blocked; use
            absolute <code>https://</code> or <code>data:</code> images.
          </li>
          <li>
            <a href="/help/file-too-large">My file is over 2 MB</a> — the per-doc
            cap; trim it, split it, or share the key part.
          </li>
        </ul>

        <h2>Getting more from ilolink</h2>
        <ul>
          <li>
            <a href="/guides/quick-start">Quick-start: publish in a minute</a> —
            paste or drop your output, pick who can see it, get a link.
          </li>
          <li>
            <a href="/guides/reading-your-analytics">Reading your analytics</a> —
            what views, uniques, scroll depth, and heatmaps actually tell you.
          </li>
          <li>
            <a href="/guides/capabilities">What ilolink can do</a> — the full
            list of what&apos;s live, from visibility controls to feedback.
          </li>
        </ul>
      </Prose>

      <Faq
        items={[
          {
            q: "Why does my page look different once hosted?",
            a: "It's served on an isolated origin under a strict content-security policy. Inline styles and Google Fonts still work, but a page that pulled other external stylesheets or scripts — or used relative asset paths or http:// images — renders broken. The fix is one self-contained file with inline CSS and absolute https assets.",
          },
          {
            q: "Is there a size limit?",
            a: "Yes — 2 MB per doc. That covers most write-ups, specs, HTML pages, and inline images. If it's bigger, trim it, split it, or share the key part.",
          },
        ]}
      />

      <Cta sub="Publish a doc and see it live." />

      <RelatedLinks
        links={[
          {
            path: "/guides/requirements",
            title: "What you need to share an AI output",
            blurb:
              "The honest checklist — a file or text under 2 MB, no account, no server, no build step.",
          },
          {
            path: "/guides/limitations",
            title: "Limitations: what's in and out of scope",
            blurb:
              "The boundaries — the 2 MB cap, frozen JS, no version rollback, and what's on the roadmap.",
          },
        ]}
      />
    </Article>
  );
}
