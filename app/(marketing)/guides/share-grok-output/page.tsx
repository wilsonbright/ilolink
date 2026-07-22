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
  title: "How to share Grok output as a page — ilolink",
  description:
    "Copy Grok's text, Markdown, or HTML into one self-contained file, publish it on ilolink, get a link, and see how far readers actually got.",
  alternates: { canonical: "/guides/share-grok-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-grok-output",
            headline: "How to share Grok output as a page",
            description:
              "Copy Grok's text, Markdown, or HTML into one self-contained file, publish it on ilolink, and see how it was read.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share Grok output as a page",
            description:
              "Copy Grok's text, Markdown, or HTML into one self-contained file and publish it at ilolink.com/<slug>.",
            steps: [
              {
                name: "Get one self-contained file from Grok",
                text: "Copy Grok's answer as Markdown, or its generated HTML with the CSS inline, into a single file. Ask for one self-contained file, not a folder of assets.",
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
          { name: "Share Grok output", path: "/guides/share-grok-output" },
        ]}
      />
      <PageHeader
        title="How to share Grok output as a page"
        lead={
          <>
            Copy Grok&apos;s output into one self-contained file, paste or drop
            it into ilolink, and get a link at ilolink.com/&lt;slug&gt;. No
            account. Then see how it was read: views, scroll funnel, heatmaps,
            feedback. Grok gives you text, Markdown, or HTML — put it in one
            file.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the Grok link or output?</h2>
        <p>
          Grok answers in <strong>text</strong>, <strong>Markdown</strong>, or{" "}
          <strong>HTML</strong> — a write-up, a spec, a styled page. None of that
          is a standalone page you can hand to someone. A raw{" "}
          <code>.md</code> or <code>.html</code> file doesn&apos;t render when
          you email it — it downloads, or shows as source. And a link back to the
          chat shares the thread, not a clean page: the reader lands in your
          conversation, not on the finished thing.
        </p>
        <p>
          A hosted page fixes both. Copy the output into one self-contained file,
          publish it, and you get a real URL that opens and renders for anyone —
          and, on the other side, tells you how it was read.
        </p>

        <h2>How to publish Grok output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In Grok, copy the answer as <strong>Markdown</strong>, or the
            generated <strong>HTML with its CSS inline</strong>, into one
            self-contained file. Ask for a single file, not a project.
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
          Untrusted AI HTML is sanitized on the way in: scripts are dropped and
          no arbitrary JavaScript runs. Inline CSS is kept, so a styled page
          renders as designed; inline <code>&lt;style&gt;</code> and Google Fonts
          work, but external stylesheets, relative asset paths, and{" "}
          <code>http:</code> images do not — use inline CSS and{" "}
          <code>https</code>/<code>data:</code> images. If Grok gave you something
          interactive, by default it&apos;s shown <strong>frozen</strong> to its
          static state rather than executing, and forms are inert — unless you
          mark the doc <strong>trusted</strong> at publish time, in which case it
          runs as-is inside a sandboxed frame on the isolated origin. The cap is 2
          MB per doc.
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part Grok doesn&apos;t give you. Once the link is out,
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
            so you see exactly how far readers got.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll, viewable by device
            class.
          </li>
          <li>
            <strong>Reactions, notes, and comments</strong> — readers can react,
            leave a short note, or thread a comment, no account.
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

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version
        history or rollback yet. If the Grok output changes, you publish a new
        doc and share the new link. Sanitizing is strict by default: interactive
        JavaScript renders frozen — unless you mark the doc trusted, which runs it
        sandboxed on the isolated origin.
      </Callout>

      <Faq
        items={[
          {
            q: "Do readers need an account to view it?",
            a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in your browser.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. Paste text, Markdown, or HTML, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "What if the Grok output has interactive JavaScript?",
            a: "By default it's frozen to its static state — the CSS is kept so the layout looks right, but no arbitrary JavaScript runs, so an interactive page renders as a static snapshot, not a working app. If you mark the doc trusted at publish time, it runs as-is inside a sandboxed frame on the isolated origin instead.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Copy your Grok output into one file, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The cross-tool pillar: ChatGPT, Claude, Gemini, or Grok output into a page anyone can open.",
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
