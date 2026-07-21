import type { Metadata } from "next";
import { JsonLd, article, howTo } from "@/lib/seo/jsonld";
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
  title: "Turn Markdown into a shareable web page — ilolink",
  description:
    "Paste Markdown into ilolink and get a clean reading page at ilolink.com/<slug> — then see how far people read with a 0/25/50/75/100% scroll funnel.",
  alternates: { canonical: "/guides/markdown-to-web-page" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/markdown-to-web-page",
            headline: "How to turn Markdown into a shareable web page",
            description:
              "Paste Markdown into ilolink, get a clean reading page at ilolink.com/<slug>, and see how far readers scroll.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Publish Markdown as a shareable web page",
            description:
              "Paste a Markdown doc into ilolink, pick who can see it, and get a hosted reading page with a scroll-depth funnel.",
            steps: [
              {
                name: "Paste your Markdown",
                text: "Paste the Markdown into the composer at ilolink.com. No account, no login. The cap is 2 MB per doc.",
              },
              {
                name: "See it render in a reading shell",
                text: "ilolink renders the Markdown in a clean reading page — headings, lists, tables, and code blocks all styled.",
              },
              {
                name: "Pick a visibility mode",
                text: "Choose public, unlisted, password-protected, or expiring. Expiry is opt-in.",
              },
              {
                name: "Send the link",
                text: "You get ilolink.com/<slug>. It redirects to an isolated render origin served under a strict CSP.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Markdown to web page", path: "/guides/markdown-to-web-page" },
        ]}
      />
      <PageHeader
        title="Turn Markdown into a shareable web page"
        lead={
          <>
            Paste Markdown into ilolink and get a clean reading page at
            ilolink.com/&lt;slug&gt; — no account, no login. Then see how far
            people actually read it with a scroll-depth funnel bucketed at 0 / 25
            / 50 / 75 / 100%.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the .md file?</h2>
        <p>
          Because raw Markdown doesn&apos;t render for most people who receive
          it. A <code>.md</code> file opens as plain text with visible{" "}
          <code>#</code> and <code>*</code> characters in a mail client, a phone,
          or a text editor — the headings, tables, and links stay as symbols
          instead of formatting. A hosted page renders the same way on any
          device: the recipient taps a link and reads a real, styled document,
          nothing to download or open in the right app.
        </p>
        <p>
          Pasting into a chat or doc tool isn&apos;t better — it reflows the
          text, strips code fences, or mangles tables. ilolink turns the Markdown
          into a URL that renders the same on any device, and records how far
          each reader scrolls.
        </p>

        <h2>How to publish Markdown</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            Paste your Markdown into the composer at{" "}
            <a href="/">ilolink.com</a>. No account needed.
          </li>
          <li>
            It renders in a <strong>clean reading shell</strong> — headings,
            lists, tables, and code blocks styled for reading.
          </li>
          <li>Pick a visibility mode — public, unlisted, password, or expiring.</li>
          <li>
            Get <code>ilolink.com/&lt;slug&gt;</code> and send it.
          </li>
        </ol>
        <p>
          The branded link 302-redirects to an isolated render origin,{" "}
          <code>view.ilolink.com</code>, served under a strict content-security
          policy (<code>default-src &apos;none&apos;</code>). The cap is 2 MB per
          doc — plenty for a spec, brief, or write-up, and enough to embed an
          image inline if you need one. If you have HTML instead of Markdown, the{" "}
          <a href="/guides/best-way-to-share-ai-html">
            best way to share AI-generated HTML
          </a>{" "}
          covers that path.
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part a plain file can never give you. Once the link is out,
          ilolink shows you how the page was actually read — all cookieless, from
          a rotating visitor hash, with no fingerprint and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see how far into the doc people get before they stop.
          </li>
          <li>
            <strong>Average time on page</strong> — did they read it or bounce.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll, viewable by device
            class.
          </li>
          <li>
            <strong>Comments</strong> — threaded, anchored to the doc, no account
            to leave one.
          </li>
        </ul>
        <p>
          There&apos;s more — total and unique views (uniques are approximate),
          top referrers, countries, device class, and 30-day daily views. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>{" "}
          for the full picture, or open{" "}
          <a href="/dashboard">your documents</a> once you&apos;ve published one.
          This page is one of several under{" "}
          <a href="/guides/share-ai-output">share AI output</a>.
        </p>
      </Prose>

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version
        history or rollback yet. If the Markdown changes, you publish a new doc
        and share the new link.
      </Callout>

      <Faq
        items={[
          {
            q: "Does it render tables and code blocks?",
            a: "Yes. Standard Markdown renders — headings, lists, links, tables, blockquotes, and fenced code blocks all show up styled in the reading shell.",
          },
          {
            q: "Does someone need an account to view it?",
            a: "No. Readers just open ilolink.com/<slug> — no login, no signup. You don't need an account to publish either; ownership is a per-doc manage token kept in your browser.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing is free. Paste Markdown up to 2 MB and get a link at no cost.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Paste your Markdown, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The pillar guide: publish ChatGPT, Claude, or Gemini output — HTML, Markdown, an image, a file — as a normal web page.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "The full read-side picture: cookieless views, the scroll funnel, heatmaps, reactions, and comments.",
          },
        ]}
      />
    </Article>
  );
}
