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
  title: "Limits and safety of hosting AI-generated HTML — ilolink",
  description:
    "What ilolink strips from untrusted AI HTML, why interactive apps freeze, the 2 MB cap, and what's roadmap vs. live — with cookieless analytics on every doc.",
  alternates: { canonical: "/guides/limitations" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/limitations",
            headline: "Limits and safety of hosting AI-generated HTML",
            description:
              "Exactly what ilolink sanitizes, why JavaScript is frozen to static, the 2 MB cap, and which features are roadmap rather than live.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Limits & safety", path: "/guides/limitations" },
        ]}
      />
      <PageHeader
        title="Limits and safety of hosting AI-generated HTML"
        lead={
          <>
            ilolink sanitizes untrusted HTML on ingest — scripts stripped,
            JavaScript frozen to static — serves every doc isolated on{" "}
            <code>view.ilolink.com</code> under a strict CSP (
            <code>default-src &apos;none&apos;</code>), and caps docs at 2 MB.
            Here&apos;s exactly what that means, and what isn&apos;t supported
            yet.
          </>
        }
      />
      <Prose>
        <h2>What does ilolink strip, and why?</h2>
        <p>
          Anything that could run code in a reader&apos;s browser. On ingest,{" "}
          <code>javascript:</code>, <code>data:</code>, and{" "}
          <code>vbscript:</code> URLs are dropped, and by default no arbitrary
          JavaScript runs — inline <code>&lt;script&gt;</code>, event handlers,
          and imported scripts don&apos;t execute unless you mark the doc trusted
          at publish time. Forms are made inert (
          <code>form-action &apos;none&apos;</code>), so a pasted mockup
          can&apos;t post credentials anywhere. The reason is simple: you often
          publish HTML an AI wrote, not you, and it loads on a domain readers
          trust. Stripping the executable parts means a hostile or careless
          snippet can&apos;t phone home, redirect, or harvest anything.
        </p>
        <p>
          What survives is the part you actually want: the CSS is kept. A
          landing-page mockup, a styled report, a pricing table — they render
          exactly as designed, because layout and styling aren&apos;t a security
          risk. It&apos;s the scripts that go, not the look.
        </p>

        <h2>Will my interactive app work?</h2>
        <p>
          Not by default — it renders frozen to static. JavaScript isn&apos;t
          executed, so the app looks right at the state it shipped in, but
          nothing runs: no click handlers, no fetch calls, no state changes, no
          live charts. A counter won&apos;t count; a form won&apos;t submit; a
          tab won&apos;t switch. If you mark the HTML doc as trusted at publish
          time, it&apos;s kept as-is and its own scripts do run — contained in a
          sandboxed, opaque-origin iframe on the isolated{" "}
          <code>view.ilolink.com</code> origin, so the app works while still
          unable to touch cookies, storage, or other docs.
        </p>
        <p>
          If you need interaction, build or export to static first. Pre-render
          the view you want people to see and publish that. For most AI output —
          landing pages, design mockups, dashboards-as-images, write-ups — the
          static render is the whole point, and it comes through faithfully.
        </p>

        <h2>What&apos;s the size limit?</h2>
        <p>
          2 MB per doc — that&apos;s the raw pasted body or the dropped file.
          Images are allowed inline, and an AI-generated image can be embedded in
          an HTML or Markdown doc and published, as long as the whole thing fits
          under the cap. If you&apos;re over it, compress heavy assets: shrink or
          re-encode images, drop giant base64 blobs, and strip unused CSS the
          model left in. Most single-page mockups and Markdown docs are well
          under 2 MB once the images are reasonable.
        </p>

        <h2>What isn&apos;t supported yet?</h2>
        <p>Being blunt about the edges, so you don&apos;t plan around them:</p>
        <ul>
          <li>
            <strong>Audio and video hosting</strong> — not live. Format-specific
            metrics (per-slide, per-PDF-page, spreadsheet, watch-through,
            listen-through) are roadmap, not shipped. Don&apos;t plan around
            per-slide analytics today.
          </li>
          <li>
            <strong>Version rollback or history</strong> — docs are immutable.
            One version per link. If content changes, you publish a new doc and
            share the new link.
          </li>
          <li>
            <strong>Custom domains and pricing tiers</strong> — not offered.
            Links live at <code>ilolink.com/&lt;slug&gt;</code>.
          </li>
        </ul>
        <p>
          What <em>is</em> live is the read side: cookieless views and
          approximate uniques, average time on page, a scroll funnel bucketed at
          0 / 25 / 50 / 75 / 100%, referrers, countries, device class, 30-day
          daily views, plus click and scroll heatmaps, reactions with notes, and
          threaded comments. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>{" "}
          for the full set.
        </p>

        <h2>Is it safe to paste AI HTML I didn&apos;t write?</h2>
        <p>
          Yes — that&apos;s the design point. HTML you didn&apos;t write is
          exactly the untrusted case ilolink is built for. It&apos;s sanitized on
          ingest (scripts stripped, dangerous URLs dropped, forms inert) and then
          served isolated on a separate render origin,{" "}
          <code>view.ilolink.com</code>, under a strict content-security policy (
          <code>default-src &apos;none&apos;</code>). The branded{" "}
          <code>ilolink.com/&lt;slug&gt;</code> link 302-redirects there, so the
          doc never runs on your main domain and can&apos;t reach back into it.
          You get the rendered page; you don&apos;t inherit the model&apos;s
          mistakes.
        </p>
      </Prose>

      <Callout title="The hard limits, in one place">
        By default no arbitrary JavaScript runs — interactive apps render frozen
        to static, unless you mark the doc trusted, which runs its scripts in a
        sandboxed frame on the isolated origin. 2 MB per doc (raw body or file). Docs are immutable: no rollback or
        version history. No audio/video hosting and no format-specific
        (per-slide, per-page) metrics — those are roadmap. No custom domains. CSS
        is kept, so styled mockups look right.
      </Callout>

      <Faq
        items={[
          {
            q: "Why doesn't my JavaScript run?",
            a: "By design. By default, uploaded HTML is sanitized on ingest and no arbitrary JavaScript executes, so a page you didn't write can't run code on a domain readers trust. Interactive apps render frozen to their static state — the markup and CSS show, the scripts don't run — unless you mark the doc trusted at publish time, in which case it runs as-is inside a sandboxed frame on the isolated origin.",
          },
          {
            q: "What's the maximum doc size?",
            a: "2 MB per doc — that's the raw pasted body or the dropped file, images included. If you're over, compress or re-encode images and strip unused CSS the model left in.",
          },
          {
            q: "Can I edit or roll back a published doc?",
            a: "No. Docs are immutable — one version per link, and there's no version history or rollback yet. To change the content, publish a new doc and share the new link.",
          },
          {
            q: "Is it safe to publish HTML an AI wrote?",
            a: "Yes. By default it's sanitized on ingest — javascript:, data:, and vbscript: URLs dropped, no arbitrary JS, forms inert — and served isolated on view.ilolink.com under a strict CSP (default-src 'none'), reached via a 302 redirect so it never runs on the main domain. If you mark a doc trusted, it runs as-is inside a sandboxed frame on that same isolated origin.",
          },
          {
            q: "Can I host a video or track per-slide views?",
            a: "Not yet. Audio and video hosting, and format-specific metrics like per-slide or per-PDF-page and watch-through, are roadmap — not live. Today the supported set is HTML, Markdown, images, and files.",
          },
        ]}
      />

      <Cta sub="Paste your AI output, pick who can see it, and get a sanitized link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop: ask for one self-contained file, publish it, and see how it was read.",
          },
          {
            path: "/guides/do-links-expire",
            title: "Do ilolink links expire?",
            blurb:
              "Links are permanent by default; expiry is opt-in. How the visibility modes work.",
          },
        ]}
      />
    </Article>
  );
}
