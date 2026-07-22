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
  title: "How to publish HTML from ChatGPT canvas — ilolink",
  description:
    "Copy the HTML out of a ChatGPT canvas into one self-contained file, publish it as a real link, then see how it was read: views, scroll funnel, heatmaps.",
  alternates: { canonical: "/guides/publish-chatgpt-html" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/publish-chatgpt-html",
            headline: "How to publish HTML from ChatGPT canvas",
            description:
              "Copy the HTML out of a ChatGPT canvas into one self-contained file, publish it at ilolink.com/<slug>, and track how it was read.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Publish HTML from ChatGPT canvas",
            description:
              "Turn a ChatGPT canvas into a shareable page at ilolink.com/<slug> and see how readers engage with it.",
            steps: [
              {
                name: "Ask for one self-contained HTML file",
                text: "Tell ChatGPT to give you a single self-contained HTML file with its CSS inline — one file, not a folder of assets.",
              },
              {
                name: "Copy the HTML out of the canvas",
                text: "Select all of the canvas content and copy it, or use the canvas copy control, so you have the full HTML on your clipboard.",
              },
              {
                name: "Paste or drop it into ilolink",
                text: "Paste the HTML, or drop the .html file, into the composer at ilolink.com. The cap is 2 MB per doc.",
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
          { name: "Publish ChatGPT HTML", path: "/guides/publish-chatgpt-html" },
        ]}
      />
      <PageHeader
        title="How to publish HTML from ChatGPT canvas"
        lead={
          <>
            Copy the HTML out of a ChatGPT canvas into one self-contained file,
            paste or drop it into <a href="/">ilolink.com</a>, and get a link at
            ilolink.com/&lt;slug&gt; anyone can open. Then track how it was read:
            views, scroll depth, heatmaps, feedback.
          </>
        }
      />
      <Prose>
        <h2>Why the ChatGPT canvas has no publish button</h2>
        <p>
          A canvas renders inside a sandbox. It looks like a finished page on
          your screen, but there&apos;s no &quot;publish&quot; control and no
          public URL behind it — the canvas only exists inside your ChatGPT
          session. The one sharing option, a chatgpt.com share link, shares the
          whole <strong>conversation</strong> — every prompt, revision, and false
          start — not the standalone page you built. So the HTML that looked done
          has nowhere to live once you want to send just that to someone.
        </p>
        <p>
          The fix is to lift the HTML out of the canvas into a single
          self-contained file, then publish that file. ilolink is the step that
          turns it into a URL served like any web page, with the reading captured
          on the other side.
        </p>

        <h2>How to publish ChatGPT HTML</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            Ask ChatGPT for <strong>one self-contained HTML file</strong> — a
            single file with its CSS inline, not a project split across assets.
          </li>
          <li>
            <strong>Copy the HTML out of the canvas</strong> — select all of it,
            or use the canvas copy control, so you have the full markup.
          </li>
          <li>
            Paste it, or drop the <code>.html</code> file, into the composer at{" "}
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
          <code>vbscript:</code> URLs are dropped, and by default no arbitrary
          JavaScript runs. A static landing-page mockup renders exactly as
          designed — the CSS is kept. By default an interactive JS app is shown{" "}
          <strong>frozen</strong> to its static state rather than executing; if
          you mark the doc <strong>trusted</strong> at publish time it runs
          as-is inside a sandboxed frame on that isolated origin. The cap is 2 MB
          per doc. For
          the wider view of getting AI output onto the web, see{" "}
          <a href="/guides/share-ai-output">share AI output as a real link</a> and{" "}
          <a href="/guides/best-way-to-share-ai-html">
            the best way to share AI-generated HTML
          </a>
          .
        </p>

        <h2>What you learn after sharing</h2>
        <p>
          This is the part ChatGPT doesn&apos;t give you. Once the link is out,
          ilolink shows you how the page was actually read — all cookieless, from
          a rotating visitor hash, with no fingerprint and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Views</strong> — total, plus approximate unique views
            (uniques are approximate by design).
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
        history or rollback yet. If the HTML changes, you publish a new doc and
        share the new link. Sanitizing is strict by default: an interactive
        canvas app renders frozen, not running — unless you mark the doc trusted,
        in which case it runs sandboxed on the isolated origin.
      </Callout>

      <Faq
        items={[
          {
            q: "Does the chatgpt.com share link do this?",
            a: "No. A chatgpt.com share link shares the whole conversation — every prompt and revision — not a standalone page. To publish just the page, copy the HTML out of the canvas into one self-contained file and paste or drop that into ilolink.",
          },
          {
            q: "Will my interactive canvas app run?",
            a: "Not by default. Untrusted AI HTML is sanitized on ingest, so an interactive app is shown frozen to its static state. But if you mark the doc trusted at publish time, it runs as-is inside a sandboxed, opaque-origin frame on the isolated render origin — so its own scripts execute while still walled off from cookies, storage, and other docs. A static landing-page mockup keeps its CSS and renders exactly as designed.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. You paste the HTML, or drop a file up to 2 MB, and get a link at no cost. No account and no login.",
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

      <Cta sub="Copy your ChatGPT HTML in, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop for ChatGPT, Claude, or Gemini output: publish it as a page, then see how it was read.",
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
