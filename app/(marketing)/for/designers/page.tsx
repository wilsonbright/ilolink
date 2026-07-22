import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
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
  title: "ilolink for designers — ilolink",
  description:
    "Share a mockup or prototype as a link, collect anchored comments on the exact spot, and see where people looked with click and scroll heatmaps.",
  alternates: { canonical: "/for/designers" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/designers",
            headline: "ilolink for designers",
            description:
              "Share a prototype, mockup, or design doc as a link. Collect anchored comments on the exact spot and see where attention goes with click and scroll heatmaps.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/designers" },
          { name: "Designers", path: "/for/designers" },
        ]}
      />
      <PageHeader
        title="ilolink for designers"
        lead={
          <>
            Share a prototype, mockup, or design doc as a link and collect
            anchored comments on the exact spot people are reacting to — plus
            see where they actually looked with click and scroll heatmaps. No
            account for you or your reviewers, no cookies.
          </>
        }
      />
      <Prose>
        <h2>Share a mockup or prototype as a page</h2>
        <p>
          Drop an HTML mockup or an AI-generated landing page into the{" "}
          <a href="/">composer</a> and get an <code>ilolink.com/&lt;slug&gt;</code>{" "}
          link. Your CSS is kept, so the layout renders the way you built it —
          type, spacing, color, grid. No login; ownership is a per-doc manage
          token in your browser.
        </p>
        <p>
          One thing to know up front: <strong>by default, interactive JS is
          frozen to static</strong> on ingest. Uploaded markup is sanitized so
          nothing runs, which keeps the link safe to send — but it also means a
          click-through prototype won&apos;t click through, unless you mark the
          doc <strong>trusted</strong> at publish time, which serves it as-is
          inside a sandboxed frame on the isolated origin. Share a{" "}
          <strong>static or exported mockup</strong> (a single screen, a flat
          landing page, an exported frame) and it&apos;s ideal. The visual is
          exactly what you get feedback on.
        </p>

        <h2>Get feedback on the exact spot</h2>
        <p>
          Reviewers drop <strong>anchored comments</strong> on a point, a
          region, or a specific piece of text on the page — no account needed to
          leave one. Instead of &quot;the button feels off&quot; in a Slack
          thread with no context, the note lives on the button. Threaded replies
          keep the back-and-forth attached to the pixel it&apos;s about.
        </p>
        <p>
          You also get lightweight <strong>reactions and short notes</strong>,
          so a reviewer who just wants to say &quot;this header, yes&quot; can do
          it in a tap.
        </p>

        <h2>See where attention goes</h2>
        <p>
          Live <strong>click and scroll heatmaps</strong>, split by device
          class, show what people reached for and how far down they got. If
          everyone stops above your CTA, or taps a label that isn&apos;t a
          button, you&apos;ll see it — on desktop and on phones separately, since
          a layout that reads fine wide can fall apart small.
        </p>
        <p>
          Alongside the heatmaps you get the rest of the cookieless analytics:
          total views, approximate uniques (approximate by design), average time
          on page, a 0/25/50/75/100% scroll funnel, referrers, countries, and
          30-day daily views. The full breakdown is in the{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps &amp; feedback
          </a>{" "}
          guide.
        </p>

        <h2>Keep it private</h2>
        <p>
          A mockup isn&apos;t a public launch. Set the doc to{" "}
          <strong>unlisted</strong> so it&apos;s only reachable by the link, or
          add a <strong>password</strong> so only the people you send it to can
          open it. Expiry is opt-in — links don&apos;t vanish on you unless you
          set them to.
        </p>

        <Callout title="Where a static export falls short">
          <p>
            If the whole point is a working interactive prototype — hover states,
            multi-screen flows, live components — the frozen-to-static behavior
            means ilolink isn&apos;t the tool for the clickable demo itself.
            Export a static version for feedback, or keep the interactive build
            in your prototyping tool and use ilolink for the review artifact.
            Docs are also immutable: to change the mockup you publish a new one.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Will my interactive prototype run?",
            a: "Not by default — interactive JS is frozen to static on ingest, so click-throughs and live components won't run, and the layout and CSS render exactly as built. But if you mark the HTML doc as trusted at publish time, its scripts do run, sandboxed on the isolated origin. Otherwise, export a static version of the screen you want feedback on and share that.",
          },
          {
            q: "Do reviewers need an account?",
            a: "No. Anyone with the link can open the page and leave comments, reactions, or notes — no login, no account. It renders from the isolated view.ilolink.com origin under a strict CSP.",
          },
          {
            q: "Can they comment on a specific area?",
            a: "Yes. Comments are anchored to a point, a region, or a piece of text on the page, and threaded — so feedback stays attached to the exact spot it's about instead of floating in a chat.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing is free and accountless — paste or drop your mockup and get a link. There are no paid tiers to quote.",
          },
        ]}
      />

      <Cta sub="Share a mockup and collect comments in place." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop for turning ChatGPT, Claude, or Gemini output — HTML, Markdown, files, images — into a page anyone can open.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "What you learn after you share: views, referrers, devices, click and scroll heatmaps, and anchored feedback — all cookieless.",
          },
          {
            path: "/guides/host-ai-image",
            title: "Host and share an AI-generated image",
            blurb:
              "Wrap a render or exported frame in a small doc, publish it for a link, and see aggregate views and reach.",
          },
        ]}
      />
    </Article>
  );
}
