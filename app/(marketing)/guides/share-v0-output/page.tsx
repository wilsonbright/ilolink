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
  title: "Share v0 output as a web page — ilolink",
  description:
    "Export your v0 UI as one self-contained static HTML file, publish it at ilolink.com/<slug>, and see how it was read. Interactive JS renders frozen to static.",
  alternates: { canonical: "/guides/share-v0-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-v0-output",
            headline: "How to share v0 output as a web page",
            description:
              "Export a v0 UI as one self-contained static HTML file, publish it with ilolink, and see how it was read.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share v0 output as a web page",
            description:
              "Turn a v0 UI into a page at ilolink.com/<slug> that anyone can open, and see how readers engage with it.",
            steps: [
              {
                name: "Export v0 as one self-contained file",
                text: "v0 generates UI as React/Next code. Export or copy it as a single self-contained static HTML file with the CSS inline and images as https or data URLs — one file, not a project of linked assets.",
              },
              {
                name: "Paste or drop it into ilolink",
                text: "Paste the HTML, or drop the file, into the composer at ilolink.com. The cap is 2 MB per doc.",
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
          { name: "Share v0 output", path: "/guides/share-v0-output" },
        ]}
      />
      <PageHeader
        title="How to share v0 output as a web page"
        lead={
          <>
            v0 generates UI as React code, so export it to one self-contained
            static HTML file, paste or drop it into ilolink, and get
            ilolink.com/&lt;slug&gt;. Interactive JS is frozen to static — it
            renders as a visual mockup (layout + styles), not a running app. Then
            see how it was read.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the v0 link or output?</h2>
        <p>
          Because a raw v0 output isn&apos;t a standalone page. v0 hands you{" "}
          <strong>React/Next code</strong> — components, imports, a build step —
          which nobody can open by pasting a URL into a browser. Its own share
          link points back into the v0 project or chat, so a recipient lands on
          the generator, the prompts, and the code, not the clean screen you
          designed. To send someone the <em>result</em>, you need it exported as
          one self-contained static HTML file, then hosted somewhere that serves
          it like any web page.
        </p>
        <p>
          ilolink is that step: drop the one file in, get a URL, and the reading
          gets captured on the other side.
        </p>

        <h2>How to publish v0 output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In v0, export or copy the UI as{" "}
            <strong>one self-contained static HTML file</strong> — CSS inline,
            images as <code>https</code> or <code>data</code> URLs. One file, not
            a folder of React components and linked assets.
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
          Untrusted AI HTML is sanitized on the way in: scripts are stripped and{" "}
          <strong>interactive JavaScript is frozen to static</strong>, so the
          layout and CSS render as designed but nothing executes — you get a
          visual mockup, not a live app. That&apos;s the default; if you mark the
          doc trusted at publish time, it&apos;s kept as-is and its own scripts
          run, sandboxed in an opaque-origin iframe on that same isolated origin.
          Inline <code>&lt;style&gt;</code> and
          Google Fonts work; other external stylesheets, external scripts,
          relative asset paths, and <code>http:</code> images do not, so keep
          everything inline and on <code>https</code> or <code>data</code> URLs.
          The cap is 2 MB per doc. If you&apos;re weighing formats, see{" "}
          <a href="/guides/best-way-to-share-ai-html">
            the best way to share AI-generated HTML
          </a>
          .
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part v0 doesn&apos;t give you. Once the link is out,
          ilolink shows how the mockup was actually read — all cookieless, from a
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
            <strong>Comments</strong> — threaded, anchored to the doc, plus
            reactions and short notes.
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
        A v0 UI shared here is a visual mockup: the layout and styles render, but
        interactive JavaScript is frozen to static and won&apos;t run. Docs are
        immutable too — one version per link, no history or rollback. If the
        design changes in v0, export it again and publish a new doc.
      </Callout>

      <Faq
        items={[
          {
            q: "Do viewers need an account to see the page?",
            a: "No. The published page is a normal web page at ilolink.com/<slug> — viewers open it in any browser with no v0 account and no ilolink login.",
          },
          {
            q: "Does the interactive JavaScript still work?",
            a: "Not by default. Interactive JS is frozen to static, so the layout and CSS render as designed and you get a faithful visual mockup that doesn't execute as a live app. But if you mark the doc trusted at publish time, it runs as-is inside a sandboxed frame on the isolated origin.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. You paste the HTML or drop a file up to 2 MB and get a link at no cost.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Export your v0 UI as one static file, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The pillar guide: turn ChatGPT, Claude, v0, or Gemini output into a page and see how it was read.",
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
