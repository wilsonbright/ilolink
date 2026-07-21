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
  title: "Share a Claude artifact as a live web page — ilolink",
  description:
    "Export your Claude artifact as one self-contained HTML file, publish it at ilolink.com/<slug>, and see who opened it and how far they scrolled.",
  alternates: { canonical: "/guides/share-claude-artifact" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-claude-artifact",
            headline: "How to share a Claude artifact as a live web page",
            description:
              "Export a Claude artifact as one self-contained HTML file or its Markdown, publish it with ilolink, and see how it was read.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share a Claude artifact as a live web page",
            description:
              "Turn a Claude artifact into a page at ilolink.com/<slug> and see how readers engage with it.",
            steps: [
              {
                name: "Export the artifact as one file",
                text: "From the Claude UI, copy or download the artifact as a single self-contained HTML file with its CSS inline, or copy the Markdown. One export, not a folder of assets.",
              },
              {
                name: "Paste or drop it into ilolink",
                text: "Paste the HTML or Markdown, or drop the file, into the composer at ilolink.com. The cap is 2 MB per doc.",
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
          { name: "Share a Claude artifact", path: "/guides/share-claude-artifact" },
        ]}
      />
      <PageHeader
        title="How to share a Claude artifact as a live web page"
        lead={
          <>
            Export the artifact as one self-contained HTML file (or copy its
            Markdown), paste or drop it into ilolink, and get
            ilolink.com/&lt;slug&gt; — a real link anyone can open, no account.
            Then see who opened it and how far they read.
          </>
        }
      />
      <Prose>
        <h2>Why can&apos;t I just send the Claude link?</h2>
        <p>
          Because a Claude artifact only renders inside the Claude UI — it lives
          in the side panel of your chat, not at a public URL. Sharing the{" "}
          <strong>conversation</strong> link hands someone the whole thread —
          your prompts, the back-and-forth, every revision — not the standalone
          thing you built. There&apos;s no publish button that turns the artifact
          itself into a page. So the mockup or doc that looked finished on screen
          has nowhere to live once you want to send it to a client or teammate.
        </p>
        <p>
          ilolink is that missing step: a place to put the one artifact so it
          becomes a URL, served like any web page, with the reading captured on
          the other side.
        </p>

        <h2>How to publish a Claude artifact</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In the Claude UI, get the artifact as{" "}
            <strong>one self-contained HTML file</strong> — copy or download it
            with the CSS inline — or copy its <strong>Markdown</strong>. One
            artifact, not a project of linked assets.
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
          Untrusted AI HTML is sanitized on the way in:{" "}
          <code>javascript:</code>, <code>data:</code>, and{" "}
          <code>vbscript:</code> URLs are dropped, and no arbitrary JavaScript
          runs. A static landing-page mockup renders exactly as designed — the
          CSS is kept. An interactive artifact that relies on scripts is shown{" "}
          <strong>frozen</strong> to its static state rather than executing. The
          cap is 2 MB per doc. If you&apos;re weighing formats, see{" "}
          <a href="/guides/best-way-to-share-ai-html">
            the best way to share AI-generated HTML
          </a>
          .
        </p>

        <h2>What you see after you share</h2>
        <p>
          This is the part Claude doesn&apos;t give you. Once the link is out,
          ilolink shows how the page was actually read — all cookieless, from a
          rotating visitor hash, with no fingerprint and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Views</strong> — total, plus approximate unique views
            (uniques are approximate by design).
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
        history or rollback yet. If the artifact changes in Claude, you export it
        again and publish a new doc. Sanitizing is strict on purpose: an
        interactive artifact renders frozen, not running.
      </Callout>

      <Faq
        items={[
          {
            q: "Do I need a Claude account to view the page?",
            a: "No. The published page is a normal web page at ilolink.com/<slug> — viewers open it in any browser with no Claude account and no ilolink login.",
          },
          {
            q: "Does an interactive artifact stay interactive?",
            a: "No. JavaScript is frozen to static, so scripts don't run. The layout and CSS render as designed, but interactive behavior is shown in its static state — the artifact looks right, it just doesn't execute.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. You paste the HTML or Markdown, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
          {
            q: "Where does the page actually load?",
            a: "The branded ilolink.com/<slug> link 302-redirects to an isolated render origin, view.ilolink.com, where the doc is served under a strict CSP (default-src 'none'). It runs on Cloudflare's edge over HTTPS.",
          },
        ]}
      />

      <Cta sub="Export your Claude artifact as one file, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The pillar guide: turn ChatGPT, Claude, or Gemini output into a page and see how it was read.",
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
