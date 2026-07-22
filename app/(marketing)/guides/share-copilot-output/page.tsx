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
  title: "How to share Microsoft Copilot output as a page — ilolink",
  description:
    "Copy Microsoft Copilot's HTML or Markdown into one self-contained file, publish it as a real link, then see how it was read: views, scroll funnel, heatmaps.",
  alternates: { canonical: "/guides/share-copilot-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-copilot-output",
            headline: "How to share Microsoft Copilot output as a page",
            description:
              "Copy Microsoft Copilot's HTML or Markdown into one self-contained file, publish it at ilolink.com/<slug>, and track how it was read.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share Microsoft Copilot output as a page",
            description:
              "Turn a Microsoft Copilot answer into a shareable page at ilolink.com/<slug> and see how readers engage with it.",
            steps: [
              {
                name: "Get one self-contained file from Copilot",
                text: "Copy Copilot's HTML or Markdown into a single self-contained file — CSS inline, images as absolute https or data URLs, not a folder of assets.",
              },
              {
                name: "Paste or drop it into ilolink",
                text: "Paste the Markdown or HTML, or drop the file, into the composer at ilolink.com. The cap is 2 MB per doc.",
              },
              {
                name: "Pick a visibility mode",
                text: "Choose public, unlisted, password-protected, or expiring. Expiry is opt-in.",
              },
              {
                name: "Send the link",
                text: "You get ilolink.com/<slug>. It redirects to an isolated render origin that serves the doc under a strict CSP.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          {
            name: "Share Copilot output",
            path: "/guides/share-copilot-output",
          },
        ]}
      />
      <PageHeader
        title="How to share Microsoft Copilot output as a page"
        lead={
          <>
            Get one self-contained file out of Microsoft Copilot, paste or drop
            it into <a href="/">ilolink.com</a>, and get a link at
            ilolink.com/&lt;slug&gt; anyone can open. Then see how it was read.
            Copilot outputs text, Markdown, HTML, or code — copy the HTML or
            Markdown into one self-contained file.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the Microsoft Copilot link or output?</h2>
        <p>
          A raw file or a chat link isn&apos;t a standalone page. A{" "}
          <code>.html</code> or <code>.md</code> file you email lands as a
          download — the reader has to save it and open it, and a Markdown file
          shows up as plain text, not a rendered page. A Copilot conversation
          link, where one exists, shares the <strong>thread</strong> — your
          prompts and its revisions — behind a Microsoft sign-in, not the clean
          output on its own.
        </p>
        <p>
          A hosted page fixes both. You lift the HTML or Markdown into a single
          self-contained file and publish that. ilolink turns it into a URL
          served like any web page, with the reading captured on the other side.
        </p>

        <h2>How to publish Microsoft Copilot output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            Get <strong>one self-contained file</strong> from Copilot — copy its
            HTML or Markdown into a single file, CSS inline, images as absolute{" "}
            <code>https</code> or <code>data</code> URLs.
          </li>
          <li>
            Paste it, or drop the <code>.md</code> or <code>.html</code> file,
            into the composer at <a href="/">ilolink.com</a>.
          </li>
          <li>
            Pick a visibility mode — public, unlisted, password, or expiring.
          </li>
          <li>
            Get <code>ilolink.com/&lt;slug&gt;</code> and send it.
          </li>
        </ol>
        <p>
          The branded link 302-redirects to an isolated render origin,{" "}
          <code>view.ilolink.com</code>, where the doc is served under a strict
          content-security policy (<code>default-src &apos;none&apos;</code>).
          Untrusted AI HTML is sanitized on the way in: scripts are stripped and
          any interactive JavaScript is <strong>frozen to static</strong> — the
          layout and CSS render, but nothing executes. Inline <code>&lt;style&gt;</code>{" "}
          and Google Fonts work; other external stylesheets, external scripts,
          relative asset paths, and <code>http:</code> images do not, so keep
          everything inline and use <code>https</code> or <code>data</code> URLs.
          The cap is 2 MB per doc. For the wider view, see{" "}
          <a href="/guides/share-ai-output">share AI output as a real link</a> and{" "}
          <a href="/guides/best-way-to-share-ai-html">
            the best way to share AI-generated HTML
          </a>
          .
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part Copilot doesn&apos;t give you. Once the link is out,
          ilolink shows you how the page was actually read — all cookieless, from
          a rotating visitor hash, with no fingerprint and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Views</strong> — total, plus approximate unique views.
          </li>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see where people stop.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll, viewable by device
            class.
          </li>
          <li>
            <strong>Comments</strong> — threaded, anchored to the doc, plus
            reactions and notes.
          </li>
        </ul>
        <p>
          There&apos;s more — average time on page, top referrers, countries,
          device class, 30-day daily views. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>{" "}
          for the full picture, or open{" "}
          <a href="/dashboard">your documents</a> once you&apos;ve published one.
        </p>
      </Prose>

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version
        history or rollback yet. If the output changes, you publish a new doc and
        share the new link. Sanitizing is strict on purpose: any interactive
        JavaScript in Copilot&apos;s HTML renders frozen, not running.
      </Callout>

      <Faq
        items={[
          {
            q: "Does a reader need an account to view it?",
            a: "No. Anyone with the link can open the page — no account and no login. Only the publish side is accountless too; you paste or drop the output and get a link.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. You paste the Markdown or HTML, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "Will interactive JavaScript from Copilot run?",
            a: "No. Untrusted AI HTML is sanitized on ingest and scripts are stripped, so any interactive JavaScript is frozen to static — the layout and CSS render, but nothing executes. Text and Markdown render exactly as written.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Copy your Copilot HTML or Markdown in, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop for Copilot, ChatGPT, Claude, or Gemini output: publish it as a page, then see how it was read.",
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
