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
  title: "How to share DeepSeek output as a page — ilolink",
  description:
    "Copy DeepSeek's HTML or Markdown into one self-contained file, publish it on ilolink, get a link, and see how far readers got.",
  alternates: { canonical: "/guides/share-deepseek-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-deepseek-output",
            headline: "How to share DeepSeek output as a page",
            description:
              "Copy DeepSeek's HTML or Markdown into a single self-contained file, publish it on ilolink, and see how readers read it.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share DeepSeek output as a page",
            description:
              "Copy DeepSeek's HTML or Markdown into one self-contained file and publish it at ilolink.com/<slug>.",
            steps: [
              {
                name: "Get one self-contained file from DeepSeek",
                text: "DeepSeek outputs text, Markdown, HTML, or code. Copy the HTML (with its CSS inline) or the Markdown into a single file. Ask for one self-contained file, not a folder of assets.",
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
          { name: "Share DeepSeek output", path: "/guides/share-deepseek-output" },
        ]}
      />
      <PageHeader
        title="How to share DeepSeek output as a page"
        lead={
          <>
            DeepSeek outputs text, Markdown, HTML, or code. Copy the HTML or
            Markdown into one self-contained file, drop it into ilolink, and get
            a link at ilolink.com/&lt;slug&gt;. No account. Then see how it was
            read: views, scroll funnel, heatmaps, comments.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the DeepSeek link or output?</h2>
        <p>
          DeepSeek gives you content in the chat — a Markdown brief, a styled{" "}
          <strong>HTML</strong> block, a chunk of prose, some code. None of that
          is a standalone page. A raw <code>.html</code> file doesn&apos;t render
          when you email it: it downloads, or shows as source. A share link to
          the chat shows the whole thread, not a clean, standalone version of the
          thing you made. So the output that looked finished has nowhere to live
          until you give it a URL.
        </p>
        <p>
          A hosted page fixes that. Copy the output into{" "}
          <strong>one self-contained file</strong> and publish it, and you get a
          real link that opens to the rendered page — nothing else on screen, no
          thread around it.
        </p>

        <h2>How to publish DeepSeek output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In DeepSeek, copy the{" "}
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
          Untrusted AI HTML is sanitized on the way in: scripts are stripped and
          no arbitrary JavaScript runs. Inline <code>&lt;style&gt;</code> and
          Google Fonts work; use absolute <code>https:</code> or{" "}
          <code>data:</code> images, since relative asset paths and{" "}
          <code>http:</code> images won&apos;t load. A static HTML mockup renders
          exactly as designed — the CSS is kept. If DeepSeek gave you something
          interactive, by default it&apos;s shown <strong>frozen</strong> to its
          static state rather than executing, and forms are inert. If you mark
          the doc <strong>trusted</strong> at publish time, it&apos;s kept as-is
          and its own scripts run, sandboxed on that isolated origin. The cap is
          2 MB per doc.
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part DeepSeek doesn&apos;t give you. Once the link is out,
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
            leave a short note, or thread an anchored comment, no account.
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
        history or rollback yet. If the DeepSeek output changes, you publish a
        new doc and share the new link. Sanitizing is strict by default: unless you
        mark a doc trusted, interactive JavaScript renders frozen, not running.
      </Callout>

      <Faq
        items={[
          {
            q: "Do readers need an account to view it?",
            a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in your browser.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. Paste HTML or Markdown, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "What if the DeepSeek output has interactive JavaScript?",
            a: "Not by default — it's frozen to its static state. The CSS is kept so the layout looks right, but no arbitrary JavaScript runs, so an interactive snippet renders as a static snapshot. If you mark the doc trusted at publish time, it runs as-is inside a sandboxed frame on the isolated origin — a working app, still contained.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Copy your DeepSeek HTML or Markdown, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The cross-tool pillar: DeepSeek, ChatGPT, Claude, or Gemini output into a page anyone can open.",
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
