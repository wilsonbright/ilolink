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
  title: "How to share Lovable output as a page — ilolink",
  description:
    "Export your Lovable build to one self-contained HTML file, publish it on ilolink, get a link, and see how the preview was read.",
  alternates: { canonical: "/guides/share-lovable-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-lovable-output",
            headline: "How to share Lovable output as a page",
            description:
              "Export a Lovable build to one self-contained static HTML file, publish it on ilolink, and see how the preview was read.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share Lovable output as a page",
            description:
              "Export a Lovable build to one self-contained static HTML file and publish it at ilolink.com/<slug>.",
            steps: [
              {
                name: "Get one self-contained static file from Lovable",
                text: "Lovable builds a web app. Export or download the build, then flatten it to a single .html file with its CSS inline — not a folder of separate scripts and assets.",
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
                text: "You get ilolink.com/<slug>. It 302-redirects to an isolated render origin that serves the doc under a strict CSP.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Share Lovable output", path: "/guides/share-lovable-output" },
        ]}
      />
      <PageHeader
        title="How to share Lovable output as a page"
        lead={
          <>
            Lovable builds a web app. Export it to <strong>one
            self-contained static HTML file</strong>, paste or drop it into
            ilolink, and get a link at ilolink.com/&lt;slug&gt;. Interactive JS
            is frozen to static, so you get a visual preview — layout and styles
            — not a running app. Then see how it was read.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the Lovable link?</h2>
        <p>
          A Lovable project link or an export isn&apos;t a standalone hosted
          page you can drop into an email or a deck. The project link points at
          the builder, gated behind the workspace; the export is a bundle of
          files that doesn&apos;t render when you send it — a raw{" "}
          <code>.html</code> downloads or shows as source. ilolink gives the
          output a public page at its own URL that anyone can open.
        </p>
        <p>
          One thing to set expectations on: Lovable generates a real web{" "}
          <strong>app</strong> (React/Vite). ilolink hosts a{" "}
          <strong>static</strong> page. Interactive JavaScript is frozen to
          static, so what you publish renders as a{" "}
          <strong>visual preview or mockup</strong> — the layout and CSS come
          through, buttons and state don&apos;t run. For a live, clickable app,
          host the build on a dev platform. For a shareable preview people can
          look at and react to, ilolink is the fast path.
        </p>

        <h2>How to publish Lovable output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In Lovable, export or download the build, then flatten it to{" "}
            <strong>one self-contained static HTML file</strong> with its CSS
            inline — not a folder of scripts and assets.
          </li>
          <li>
            Paste the HTML, or drop the file, into the composer at{" "}
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
          content-security policy. On the way in, the HTML is sanitized by
          default: scripts are stripped and interactive JavaScript is frozen to
          its static state, so no arbitrary code runs — unless you mark the doc
          trusted at publish time, in which case it&apos;s served as-is and its
          scripts run inside a sandboxed frame on that same isolated origin.
          Inline CSS, Google Fonts, and{" "}
          <code>https</code> and <code>data</code> images render, so the design
          survives — the app just doesn&apos;t execute. The cap is 2 MB per doc,
          and every doc loads on its own isolated origin.
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          Once the link is out, ilolink shows how the preview was actually read
          — all cookieless, from a rotating visitor hash, with no fingerprint
          and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Views</strong> — total, plus approximate unique views
            (uniques are approximate by design).
          </li>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see how far readers got through the page.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll, viewable by device
            class.
          </li>
          <li>
            <strong>Reactions, notes, and comments</strong> — readers can react,
            leave a short note, or thread a comment anchored to a spot, no
            account.
          </li>
        </ul>
        <p>
          There&apos;s more — average time on page, top referrers, countries,
          device class, 30-day daily views. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>{" "}
          for the full picture, or start from{" "}
          <a href="/guides/share-ai-output">share anything an AI made</a> for the
          cross-tool version.
        </p>
      </Prose>

      <Callout title="Preview, not a live app">
        Lovable output on ilolink is a static preview. Interactive JavaScript is
        frozen, so state, routing, and buttons don&apos;t run — the layout and
        styles do. Docs are immutable too: one version per link, no rollback
        yet. If the build changes, publish a new doc and share the new link. For
        a running, clickable app, host the export on a dev platform instead.
      </Callout>

      <Faq
        items={[
          {
            q: "Do readers need an account to view it?",
            a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in your browser.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. Paste HTML or drop a file up to 2 MB and get a link at no cost.",
          },
          {
            q: "Will my Lovable app actually run on the page?",
            a: "Not by default. Interactive JavaScript is frozen to static, so the page renders as a visual preview — layout and CSS come through, but buttons, state, and routing don't execute. If you mark the doc trusted at publish time, though, it's served as-is and its scripts run inside a sandboxed frame on the isolated origin. Otherwise, for a live app, host the build on a dev platform.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Export your Lovable build to one static file, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The cross-tool pillar: turn output from any AI tool into a page anyone can open.",
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
