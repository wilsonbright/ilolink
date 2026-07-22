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
  title: "Share a ChatGPT or Claude HTML page in a minute — ilolink",
  description:
    "The fastest path: copy the AI's output, paste or drop it into ilolink, pick who can see it, get a link — then open your dashboard and watch the first view land.",
  alternates: { canonical: "/guides/quick-start" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/quick-start",
            headline: "Share a ChatGPT or Claude HTML page in under a minute",
            description:
              "Copy one self-contained AI output, paste or drop it into ilolink.com, pick a visibility mode, and get a link — then watch views and scroll land in your dashboard.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share an AI HTML page with ilolink",
            description:
              "Turn one self-contained AI output into a shareable page at ilolink.com/<slug> and watch the first views come in.",
            steps: [
              {
                name: "Get one self-contained output",
                text: "Ask the AI for a single self-contained file — HTML with its CSS inline, or Markdown — not a folder of assets. One file, under 2 MB.",
              },
              {
                name: "Paste or drop it into ilolink",
                text: "Paste the Markdown or HTML, or drop the file, into the composer at ilolink.com. No account and no login.",
              },
              {
                name: "Pick a visibility mode",
                text: "Choose public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
              },
              {
                name: "Copy your link",
                text: "You get ilolink.com/<slug>. It 302-redirects to an isolated render origin, view.ilolink.com, served under a strict CSP. Copy it and send it.",
              },
              {
                name: "Open your dashboard and watch",
                text: "Open your dashboard. As people read, views, approximate uniques, and the scroll funnel come in live — cookieless, no personal profile.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Quick start", path: "/guides/quick-start" },
        ]}
      />
      <PageHeader
        title="Share a ChatGPT or Claude HTML page in under a minute"
        lead={
          <>
            The fastest path: copy the AI&apos;s output, paste or drop it into{" "}
            <a href="/">ilolink</a>, pick who can see it, and get a link. Then
            open your <a href="/dashboard">dashboard</a> and watch the first view
            land — no account, nothing to install.
          </>
        }
      />
      <Prose>
        <h2>How do I publish an AI page fast?</h2>
        <p>
          Five steps, most of them a paste and a click:
        </p>
        <ol>
          <li>
            Get <strong>one self-contained output</strong> from the AI — a single
            HTML file with its CSS inline, or a block of Markdown. One file, not a
            project split across assets. The cap is <strong>2 MB</strong> per doc.
          </li>
          <li>
            <strong>Paste it, or drop the file,</strong> into the composer at{" "}
            <a href="/">ilolink.com</a>. There&apos;s no account and no login —
            you land straight on the composer.
          </li>
          <li>
            <strong>Pick a visibility mode</strong> — public, unlisted,
            password-protected, or expiring. Expiry is opt-in.
          </li>
          <li>
            <strong>Copy your link.</strong> You get{" "}
            <code>ilolink.com/&lt;slug&gt;</code>. Send it anywhere.
          </li>
          <li>
            <strong>Open your <a href="/dashboard">dashboard</a></strong> and
            watch views and scroll come in as people read.
          </li>
        </ol>
        <p>
          The branded link 302-redirects to an isolated render origin,{" "}
          <code>view.ilolink.com</code>, where the doc is served under a strict
          content-security policy (<code>default-src &apos;none&apos;</code>).
          Untrusted AI HTML is sanitized on the way in: scripts and{" "}
          <code>javascript:</code> URLs are dropped, and no arbitrary JavaScript
          runs. Your CSS is kept, so a static landing-page mockup renders exactly
          as designed. An interactive JS app is shown <strong>frozen</strong> to
          its static state rather than executing. For the wider view, see{" "}
          <a href="/guides/share-ai-output">share AI output as a real link</a>,
          and check <a href="/guides/requirements">what ilolink accepts</a> before
          you paste.
        </p>

        <h2>What you get back</h2>
        <p>
          The link is only half of it. Once the page is out, ilolink shows you how
          it was actually read — all cookieless, from a rotating visitor hash,
          with no fingerprint and no personal profile:
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
            <strong>Heatmaps</strong> — live click and scroll maps, by device
            class.
          </li>
          <li>
            <strong>Feedback</strong> — reactions, short notes, and threaded
            comments anchored to the doc.
          </li>
          <li>
            <strong>Context</strong> — average time, top referrers, countries,
            device class, and 30-day daily views.
          </li>
        </ul>
        <p>
          That&apos;s the loop: publish, share, and see how it landed. The full
          read-side picture is in{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>
          .
        </p>
      </Prose>

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version history
        or rollback yet. If the output changes, you publish a new doc and share
        the new link. Analytics are aggregate, never per-person.
      </Callout>

      <Faq
        items={[
          {
            q: "Do I need an account?",
            a: "No. ilolink is accountless — you land on the composer, paste or drop your file, and get a link. No sign-up and no login.",
          },
          {
            q: "How long does it take?",
            a: "Under a minute. Most of the work is a paste and a click: paste the output, pick a visibility mode, and copy the link.",
          },
          {
            q: "Can I password-protect it?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
          {
            q: "Does an interactive app stay interactive?",
            a: "No. Untrusted AI HTML is sanitized on ingest and no arbitrary JavaScript runs, so an interactive app is shown frozen to its static state. Static CSS-styled pages render exactly as designed.",
          },
        ]}
      />

      <Cta sub="Publish your first doc." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop for ChatGPT, Claude, or Gemini output: publish it as a page, then see how it was read.",
          },
          {
            path: "/guides/requirements",
            title: "What ilolink accepts",
            blurb:
              "Formats, the 2 MB cap, and what sanitizing does before you paste — so your first publish just works.",
          },
        ]}
      />
    </Article>
  );
}
