import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Prose,
  Callout,
  Faq,
  Cta,
  RelatedLinks,
} from "../../_components/content";

export const metadata: Metadata = {
  title: "My HTML looks broken — ilolink help",
  description:
    "Lost your styling once hosted? A blocked CDN stylesheet is almost always why. Fix: publish one self-contained HTML file with the CSS inlined.",
  alternates: { canonical: "/help/html-looks-broken" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/help/html-looks-broken",
            headline: "My HTML looks broken after publishing",
            description:
              "Why an AI-generated page loses its styling on ilolink — a blocked CDN stylesheet or script — and how to fix it with one self-contained, inline-CSS file.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "HTML looks broken", path: "/help/html-looks-broken" },
        ]}
      />
      <PageHeader
        title="My HTML looks broken"
        lead={
          <>
            If your page lost its styling once hosted, it almost certainly
            loaded CSS from a CDN link that ilolink&apos;s security policy
            blocks. The fix: publish <strong>one self-contained file</strong>{" "}
            with the CSS inlined in a <code>&lt;style&gt;</code> tag.
          </>
        }
      />
      <Prose>
        <h2>Why it happens</h2>
        <p>
          Every published page is served isolated on{" "}
          <code>view.ilolink.com</code> under a strict Content-Security-Policy.
          Inline <code>&lt;style&gt;</code> works, and Google Fonts stylesheets
          from <code>fonts.googleapis.com</code> work — but a{" "}
          <code>&lt;link rel=&quot;stylesheet&quot;&gt;</code> or{" "}
          <code>&lt;script src&gt;</code> pointing at any other CDN (Tailwind
          CDN, Bootstrap, and so on) is blocked. When the browser can&apos;t
          load that stylesheet, your layout falls back to raw, unstyled HTML.
        </p>
        <p>
          Author JavaScript never runs either. Scripts are frozen to static on
          ingest, so the layout and CSS render but event handlers, JS
          frameworks, and interactive widgets do nothing. A page that builds its
          styling <em>with</em> JavaScript will therefore also look bare.
        </p>

        <h2>The fix</h2>
        <p>
          Go back to the chatbot and ask for one self-contained file. A prompt
          that works:{" "}
          <code>
            put all the CSS inline in a single self-contained HTML file, no
            external stylesheets or scripts
          </code>
          . Then paste that file into ilolink. A couple of specifics:
        </p>
        <ul>
          <li>
            <strong>Inline the CSS</strong> in a <code>&lt;style&gt;</code> tag
            in the same file — no <code>&lt;link&gt;</code> to a CSS CDN.
          </li>
          <li>
            <strong>Use absolute <code>https://</code> or <code>data:</code> URIs</strong>{" "}
            for images. Relative paths like <code>./logo.png</code> resolve
            against <code>view.ilolink.com</code>, which has no such file.
          </li>
          <li>
            <strong>Google Fonts via <code>&lt;link&gt;</code></strong> to{" "}
            <code>fonts.googleapis.com</code> do work — leave those in.
          </li>
        </ul>
        <Callout title="Allowed vs. blocked">
          <p>
            <strong>Allowed:</strong> inline CSS, Google Fonts,{" "}
            <code>https</code>/<code>data:</code> images.
          </p>
          <p>
            <strong>Blocked:</strong> other CDN stylesheets and scripts, author
            JavaScript, relative asset paths.
          </p>
        </Callout>

        <h2>What still won&apos;t work</h2>
        <p>
          Inlining CSS fixes the styling, but two things stay off the table.
          Interactive JavaScript apps stay frozen to static — if you need the
          finished visual, export or build it to static HTML/CSS first and
          publish that. And assets from other CDNs stay blocked; download them
          and embed them as <code>data:</code> URIs, or host them somewhere that
          serves over <code>https://</code> and link them absolutely.
        </p>
      </Prose>
      <Faq
        items={[
          {
            q: "Do Google Fonts work?",
            a: "Yes. A <link> to fonts.googleapis.com and the font files from fonts.gstatic.com are both allowed under the policy, so Google Fonts render normally.",
          },
          {
            q: "Will my Tailwind-CDN page work?",
            a: "No. The Tailwind CDN script is blocked, so none of the utility classes get styled. Inline the compiled CSS into a <style> tag instead of loading it from the CDN.",
          },
          {
            q: "Why is my button dead?",
            a: "Author JavaScript is frozen to static on every published page, so click handlers and interactive scripts don't run. The button renders but can't do anything — build the interactive part to static output before publishing.",
          },
          {
            q: "The page renders but images are missing — same cause?",
            a: "Usually a related one: relative or http:// image paths. Switch them to absolute https:// URLs or data: URIs. See the images-don't-load help page for the full fix.",
          },
        ]}
      />
      <Cta sub="Re-export as one self-contained file with inline CSS, then paste it in." />
      <RelatedLinks
        links={[
          {
            path: "/help/images-dont-load",
            title: "Images don't load",
            blurb: "Fix broken images: absolute https or data URIs, never relative paths.",
          },
          {
            path: "/guides/limitations",
            title: "Limits and safety",
            blurb: "What ilolink strips, why JS is frozen, and what's live vs. roadmap.",
          },
        ]}
      />
    </Article>
  );
}
