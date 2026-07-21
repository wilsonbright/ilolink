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
  title: "Share anything an AI made, as a real link — ilolink",
  description:
    "Take ChatGPT, Claude, or Gemini output — HTML, Markdown, an image, a file — publish it as a normal web page, and see how it was read: views, scroll funnel, heatmaps.",
  alternates: { canonical: "/guides/share-ai-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-ai-output",
            headline: "Share anything an AI made, as a real link",
            description:
              "Turn ChatGPT, Claude, or Gemini output into a normal web page anyone can open — then see how it was read.",
            datePublished: "2026-07-21",
          }),
          howTo({
            name: "Publish AI output as a shareable link",
            description:
              "Turn a self-contained AI export into a page at ilolink.com/<slug> and see how readers engage with it.",
            steps: [
              {
                name: "Ask for one self-contained file",
                text: "Tell the AI to give you a single self-contained HTML file, a Markdown doc, an image, or a file — one export, not a folder of assets.",
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
          { name: "Share AI output", path: "/guides/share-ai-output" },
        ]}
      />
      <PageHeader
        title="Share anything an AI made, as a real link"
        lead={
          <>
            Take ChatGPT, Claude, or Gemini output — HTML, Markdown, an image, a
            file — and publish it as a normal web page anyone can open at
            ilolink.com/&lt;slug&gt;. No account. Then see how it was read: views,
            scroll depth, heatmaps, feedback.
          </>
        }
      />
      <Prose>
        <h2>Why isn&apos;t AI output already shareable?</h2>
        <p>
          Because the AI never gave you a page. A ChatGPT canvas renders inside a
          sandbox with no publish button. A chatgpt.com share link shares the
          whole <strong>conversation</strong> — every prompt and false start —
          not the standalone thing you built. And a raw <code>.html</code> file
          doesn&apos;t render when you email it; it downloads, or shows up as
          source. So the output that looked finished on screen has nowhere to
          live once you want to send it to someone.
        </p>
        <p>
          ilolink is that missing step: a place to put one AI-made artifact so it
          becomes a URL, served like any web page, with the reading captured on
          the other side.
        </p>

        <h2>How do I turn it into a link?</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            Ask the AI for <strong>one self-contained file or export</strong> —
            a single HTML file with its CSS inline, a Markdown doc, an image, or
            a file. One artifact, not a project.
          </li>
          <li>
            Paste it, or drop the file, into the composer at{" "}
            <a href="/">ilolink.com</a>.
          </li>
          <li>Pick a visibility mode — public, unlisted, password, or expiring.</li>
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
          CSS is kept. An interactive JS app is shown <strong>frozen</strong> to
          its static state rather than executing. The cap is 2 MB per doc.
        </p>

        <h2>What can I share this way?</h2>
        <p>Today, cleanly:</p>
        <ul>
          <li>
            <strong>HTML pages and landing-page mockups</strong> — the CSS
            survives sanitizing, so the layout looks right.
          </li>
          <li>
            <strong>Markdown docs</strong> — specs, briefs, write-ups, README-style
            output.
          </li>
          <li>
            <strong>AI-generated images</strong>.
          </li>
          <li>
            <strong>Files</strong> — under the 2 MB cap.
          </li>
        </ul>
        <p>
          Slides, PDFs, spreadsheets, and diagrams — plus audio and video — are
          on the roadmap, not shipped. Media hosting isn&apos;t live yet, so
          don&apos;t plan around per-slide or per-page analytics today. When it
          lands, it lands; for now, the honest set is HTML, Markdown, images, and
          files.
        </p>

        <h2>What do I learn after I share?</h2>
        <p>
          This is the part the AI tools don&apos;t give you. Once the link is
          out, ilolink shows you how the page was actually read — all cookieless,
          from a rotating visitor hash, with no fingerprint and no personal
          profile:
        </p>
        <ul>
          <li>
            <strong>Views</strong> — total, plus approximate unique views (uniques
            are approximate by design).
          </li>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%, so
            you see where people stop.
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
        </p>
      </Prose>

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version
        history or rollback yet. If the content changes, you publish a new doc
        and share the new link. Sanitizing is strict on purpose: an interactive
        JavaScript app renders frozen, not running.
      </Callout>

      <Faq
        items={[
          {
            q: "Do I need an account?",
            a: "No. There's no login and no server-side account. You paste or drop your content and get a link. Ownership is a per-doc manage token kept in your browser.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. You paste Markdown or HTML, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default penalty.",
          },
          {
            q: "Does it work for a Claude artifact?",
            a: "Yes. Have Claude export the artifact as a single self-contained file — one HTML file with inline CSS, or Markdown — then paste or drop it in. A static mockup renders as designed; an interactive app is shown frozen.",
          },
          {
            q: "Where does the page actually load?",
            a: "The branded ilolink.com/<slug> link 302-redirects to an isolated render origin, view.ilolink.com, where the doc is served under a strict CSP (default-src 'none'). It runs on Cloudflare's edge over HTTPS.",
          },
        ]}
      />

      <Cta sub="Paste your AI output, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/best-way-to-share-ai-html",
            title: "The best way to share AI-generated HTML",
            blurb:
              "Why a raw .html file fails over email, and how the isolated render origin fixes it.",
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
