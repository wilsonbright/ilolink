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
  title: "How to share a Gemini output as a page — ilolink",
  description:
    "Copy Gemini's generated HTML or Markdown into one file, publish it on ilolink, get a link, and see the scroll funnel of how far readers got.",
  alternates: { canonical: "/guides/share-gemini-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-gemini-output",
            headline: "How to share a Gemini output as a page",
            description:
              "Copy Gemini's generated HTML or Markdown into a single file, publish it on ilolink, and see how far readers got.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share a Gemini output as a page",
            description:
              "Copy Gemini's generated HTML or Markdown into one self-contained file and publish it at ilolink.com/<slug>.",
            steps: [
              {
                name: "Get one self-contained file from Gemini",
                text: "Copy the generated HTML (with its CSS inline) or the Markdown into a single file. Ask Gemini for one self-contained file, not a folder of assets.",
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
          { name: "Share a Gemini output", path: "/guides/share-gemini-output" },
        ]}
      />
      <PageHeader
        title="How to share a Gemini output as a page"
        lead={
          <>
            Copy Gemini&apos;s generated HTML or Markdown into a single
            self-contained file, publish it on ilolink, and get a link at
            ilolink.com/&lt;slug&gt;. No account. Then see how far readers got:
            views, scroll funnel, heatmaps, feedback.
          </>
        }
      />
      <Prose>
        <h2>What can Gemini output that you can share?</h2>
        <p>
          Two things travel cleanly: <strong>HTML</strong> and{" "}
          <strong>Markdown</strong>. Gemini can generate a full HTML page — a
          landing-page mockup, a write-up, a styled document — or a Markdown doc
          like a spec or brief. Either way, the move is the same: copy it into{" "}
          <strong>one self-contained file</strong>. For HTML that means a single{" "}
          <code>.html</code> with its CSS inline, not a page that pulls in
          separate stylesheets or asset folders. For Markdown, the raw text is
          all you need — paste it straight in.
        </p>
        <p>
          Gemini doesn&apos;t hand you a public page. The generated HTML is
          something you copy out; on its own, a raw <code>.html</code> file
          doesn&apos;t render when you email it — it downloads, or shows as
          source. So the output that looked finished in the chat has nowhere to
          live until you give it a URL.
        </p>

        <h2>How to publish a Gemini output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In Gemini, copy the generated{" "}
            <strong>HTML (CSS inline) or Markdown</strong> into one
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
          Untrusted AI HTML is sanitized on the way in:{" "}
          <code>javascript:</code>, <code>data:</code>, and{" "}
          <code>vbscript:</code> URLs are dropped, and no arbitrary JavaScript
          runs. A static HTML mockup renders exactly as designed — the CSS is
          kept. If Gemini gave you something interactive, it&apos;s shown{" "}
          <strong>frozen</strong> to its static state rather than executing.
          Forms are inert. The cap is 2 MB per doc.
        </p>

        <h2>What you see after sharing</h2>
        <p>
          This is the part Gemini doesn&apos;t give you. Once the link is out,
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
        history or rollback yet. If the Gemini output changes, you publish a new
        doc and share the new link. Sanitizing is strict on purpose: interactive
        JavaScript renders frozen, not running.
      </Callout>

      <Faq
        items={[
          {
            q: "Do readers need an account to view it?",
            a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in your browser.",
          },
          {
            q: "What if the Gemini output has interactive JavaScript?",
            a: "It's frozen to its static state. The CSS is kept so the layout looks right, but no arbitrary JavaScript runs — an interactive app renders as a static snapshot, not a working app.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. Paste HTML or Markdown, or drop a file up to 2 MB, and get a link at no cost.",
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

      <Cta sub="Copy your Gemini HTML or Markdown, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The cross-tool pillar: ChatGPT, Claude, or Gemini output into a page anyone can open.",
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
