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
  title: "How to share Mistral Le Chat output as a page — ilolink",
  description:
    "Copy Le Chat's HTML, Markdown, or Canvas doc into one self-contained file, publish it on ilolink, get a link, and see how it was read.",
  alternates: { canonical: "/guides/share-mistral-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-mistral-output",
            headline: "How to share Mistral Le Chat output as a page",
            description:
              "Copy Mistral Le Chat's HTML, Markdown, or Canvas content into a single file, publish it on ilolink, and see how readers read it.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share Mistral Le Chat output as a page",
            description:
              "Copy Le Chat's HTML, Markdown, or Canvas content into one self-contained file and publish it at ilolink.com/<slug>.",
            steps: [
              {
                name: "Get one self-contained file from Le Chat",
                text: "Copy the generated HTML (with its CSS inline), the Markdown, or the Canvas content into a single file. Ask Le Chat for one self-contained file, not a folder of assets.",
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
          {
            name: "Share Mistral Le Chat output",
            path: "/guides/share-mistral-output",
          },
        ]}
      />
      <PageHeader
        title="How to share Mistral Le Chat output as a page"
        lead={
          <>
            Get one self-contained file out of Mistral Le Chat, paste or drop it
            into ilolink, and get a link at ilolink.com/&lt;slug&gt;. Le Chat
            outputs text, Markdown, code, HTML, and Canvas docs — copy the
            HTML/Markdown or the Canvas content into a single file, then see how
            it was read.
          </>
        }
      />
      <Prose>
        <h2>Why not just send the Mistral Le Chat link?</h2>
        <p>
          A Le Chat conversation link opens the chat, not a clean page — the
          reader lands in your session, or needs their own account, and the
          output sits inside the thread instead of standing on its own. What Le
          Chat gives you is <strong>content</strong>: Markdown, code, a block of
          HTML, or a <strong>Canvas</strong> document you edited alongside the
          chat. None of that is a hosted page. A raw <code>.html</code> file
          doesn&apos;t render when you email it — it downloads, or shows as
          source. So the thing that looked finished in Le Chat has nowhere to
          live until you give it a URL.
        </p>
        <p>
          ilolink turns that content into a standalone public page at{" "}
          <code>ilolink.com/&lt;slug&gt;</code> — no account for you to publish,
          no account for anyone to read it.
        </p>

        <h2>How to publish Mistral Le Chat output</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            In Le Chat, copy the{" "}
            <strong>HTML (CSS inline), Markdown, or Canvas content</strong> into
            one self-contained file. Ask for a single file, not a project of
            assets.
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
          Untrusted HTML is sanitized on the way in: <code>&lt;script&gt;</code>{" "}
          and <code>javascript:</code> URLs are dropped, and interactive
          JavaScript is <strong>frozen to static</strong> — the layout and CSS
          render, but scripts don&apos;t run. Inline CSS, Google Fonts, and
          https/data images work. The cap is 2 MB per doc.
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part Le Chat doesn&apos;t give you. Once the link is out,
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
        history or rollback yet. If the Le Chat output changes, you publish a new
        doc and share the new link. By default, sanitizing is strict:
        interactive JavaScript renders frozen to static, so an interactive build
        shows as a visual preview, not a running app — unless you mark the doc
        trusted at publish time, which runs it as-is inside a sandboxed frame on
        the isolated origin.
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
            q: "What if the Le Chat output has interactive JavaScript?",
            a: "Not by default — it's frozen to static, so the layout and CSS render and the page looks right, but scripts don't run and an interactive build shows as a static visual preview. If you mark the doc trusted at publish time, it runs as-is inside a sandboxed frame on the isolated origin.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
        ]}
      />

      <Cta sub="Copy your Le Chat HTML, Markdown, or Canvas content, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The cross-tool pillar: Le Chat, ChatGPT, or Claude output into a page anyone can open.",
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
