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
  title: "Share Perplexity output as a web page — ilolink",
  description:
    "Copy a Perplexity answer or report as Markdown into one file, publish it at ilolink.com/<slug>, and see how many read it and how far they scrolled.",
  alternates: { canonical: "/guides/share-perplexity-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-perplexity-output",
            headline: "How to share Perplexity output as a web page",
            description:
              "Copy a Perplexity answer or report as Markdown into one self-contained file, publish it with ilolink, and see how it was read.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share Perplexity output as a web page",
            description:
              "Turn a Perplexity answer into a page at ilolink.com/<slug> and see how readers engage with it.",
            steps: [
              {
                name: "Get one self-contained file from Perplexity",
                text: "Copy the Perplexity answer or research report — with its citations — as Markdown into a single file. One file, not a chat link. Keep any images as absolute https or data URLs.",
              },
              {
                name: "Paste or drop it into ilolink",
                text: "Paste the Markdown, or drop the file, into the composer at ilolink.com. The cap is 2 MB per doc.",
              },
              {
                name: "Pick a visibility mode",
                text: "Choose public, unlisted, password-protected, or expiring. Expiry is opt-in.",
              },
              {
                name: "Send the link",
                text: "You get ilolink.com/<slug>. It 302-redirects to an isolated render origin, view.ilolink.com, that serves the doc under a strict CSP.",
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
            name: "Share Perplexity output",
            path: "/guides/share-perplexity-output",
          },
        ]}
      />
      <PageHeader
        title="How to share Perplexity output as a web page"
        lead={
          <>
            Copy your Perplexity answer or report — citations and all — as
            Markdown into one file, paste or drop it into ilolink, and get
            ilolink.com/&lt;slug&gt;: a real link anyone can open, no account.
            Then see how many read it and how far they got — in aggregate, never
            by name.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the Perplexity link?</h2>
        <p>
          Because a Perplexity share link shares the <strong>thread</strong> —
          the query, the follow-ups, the whole conversation — not a clean
          standalone page. And a raw <code>.md</code> or <code>.txt</code> file
          isn&apos;t a page either: the person you send it to has to download it
          and open it in something. Neither is a URL you can drop in a message
          and know it renders the same for everyone.
        </p>
        <p>
          A hosted page is. Copy the one answer into a single file, publish it,
          and it becomes a web page served like any other — with the reading
          captured on the other side.
        </p>

        <h2>How to publish Perplexity output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In Perplexity, take the answer or research report you want and copy
            it — with its <strong>citations</strong> — as{" "}
            <strong>Markdown into one self-contained file</strong>. One file,
            not the thread link.
          </li>
          <li>
            Paste it, or drop the file, into the composer at{" "}
            <a href="/">ilolink.com</a>.
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
          Markdown renders straight to clean HTML, so a Perplexity answer is a
          natural fit — headings, lists, and links come across as written. If
          you paste HTML instead, by default it&apos;s sanitized on the way in:
          scripts are dropped, so any interactive JS is{" "}
          <strong>frozen to its static state</strong> while the layout and CSS
          render. If you mark the doc as <strong>trusted</strong> at publish
          time, it&apos;s kept as-is and its own scripts run inside a sandboxed
          frame on the isolated origin. Keep styling as inline CSS and images as absolute{" "}
          <code>https:</code> or <code>data:</code> URLs — relative asset paths
          and <code>http:</code> images won&apos;t load. The cap is 2 MB per
          doc. If you started from raw Markdown, see{" "}
          <a href="/guides/markdown-to-web-page">
            turning Markdown into a web page
          </a>
          .
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part the thread link never gave you. Once the page is out,
          ilolink shows how it was actually read — all cookieless, from a
          rotating visitor hash, with no fingerprint and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Views</strong> — total, plus approximate unique views
            (uniques are approximate by design).
          </li>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see where people stop reading the report.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll, viewable by device
            class.
          </li>
          <li>
            <strong>Reactions and notes</strong> — readers can react or leave a
            short note, no account.
          </li>
          <li>
            <strong>Comments</strong> — threaded, anchored to the doc.
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
          This page is one of several source guides under{" "}
          <a href="/guides/share-ai-output">sharing AI output</a>.
        </p>
      </Prose>

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version
        history or rollback yet. If you re-run the query and Perplexity gives you
        a better answer, you copy it out and publish a new doc with a new link.
      </Callout>

      <Faq
        items={[
          {
            q: "Do I need an account to view the page?",
            a: "No. The published page is a normal web page at ilolink.com/<slug> — viewers open it in any browser with no Perplexity account and no ilolink login.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. You paste the Markdown, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "What if my content has interactive JavaScript?",
            a: "Not by default — it's frozen to static, so scripts don't run and any interactive behavior is shown in its static state. But if you mark the HTML doc as trusted at publish time, it runs as-is inside a sandboxed frame on the isolated origin. A Markdown answer from Perplexity has no scripts anyway, so it renders exactly as written.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Copy your Perplexity answer into one file, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The pillar guide: turn Perplexity, ChatGPT, or Claude output into a page and see how it was read.",
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
