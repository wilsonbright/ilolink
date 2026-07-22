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
  title: "How to read your share analytics — ilolink",
  description:
    "Read your ilolink dashboard: views vs approximate uniques, the scroll-depth funnel, heatmaps, and feedback — cookieless, aggregate, and what good looks like.",
  alternates: { canonical: "/guides/reading-your-analytics" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/reading-your-analytics",
            headline: "How to read your share analytics",
            description:
              "A guide to reading ilolink's cookieless dashboard: views vs approximate uniques, the scroll-depth funnel, click and scroll heatmaps, referrers, and reader feedback.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          {
            name: "Reading your analytics",
            path: "/guides/reading-your-analytics",
          },
        ]}
      />
      <PageHeader
        title="How to read your share analytics"
        lead={
          <>
            After you share, your dashboard shows views, unique views, a
            scroll-depth funnel, heatmaps, and feedback. Here&apos;s how to read
            each one and what &quot;good&quot; looks like — all cookieless and
            approximate, aggregate rather than per-person.
          </>
        }
      />
      <Prose>
        <h2>Views vs unique views</h2>
        <p>
          <strong>Views</strong> is every open — one reader who reloads your link
          four times counts as four. <strong>Unique views</strong> is the
          approximate number of people behind those opens. Uniques are{" "}
          <strong>approximate by design</strong>: ilolink derives a rotating
          visitor hash to tell readers apart for a short window — no cookies, no
          fingerprint, no profile — and because the hash rotates, the count is a
          close estimate, not a headcount. A wide gap between views and uniques
          means people are coming back, which is a good sign for a proposal or
          spec; a near-1:1 ratio means one-and-done reads.
        </p>

        <h2>The scroll-depth funnel</h2>
        <p>
          Scroll-depth is bucketed at <strong>0/25/50/75/100%</strong>, so read
          it like a funnel. A <strong>cliff at 25%</strong> means the opening
          lost them — the top of the page didn&apos;t earn the next scroll.
          Steady decline down to 100% is normal; a sudden drop at one bucket
          points at the section right before it. Pair the funnel with{" "}
          <strong>average time on page</strong>: high time plus a shallow funnel
          means readers are stuck early, while low time plus a deep funnel means
          they skimmed straight to the end. The two together tell you where to
          cut or tighten.
        </p>

        <h2>Heatmaps</h2>
        <p>
          You get two kinds — <strong>click</strong> and <strong>scroll</strong>{" "}
          — and can view each <strong>by device</strong>, because a layout that
          works on desktop can bury your call to action on a phone. Hot zones
          show where attention and taps land. A <strong>cold zone</strong> tells
          you a section got ignored — it&apos;s either too far down the page or
          not pulling the eye, so move it up or make it earn attention. Watch the
          click map for taps on things that aren&apos;t links: that&apos;s
          readers expecting something to be interactive.
        </p>

        <h2>Referrers, countries, devices</h2>
        <p>
          <strong>Top referrers</strong> show where opens came from — a Slack
          share, an email, a link in a doc. <strong>Countries</strong> and{" "}
          <strong>device class</strong> tell you roughly who&apos;s reading and
          on what. Read all three as <strong>directional, not exact</strong>:
          referrers depend on what the sending app passes along, and country and
          device are coarse buckets, not precise attribution. They&apos;re for
          spotting a pattern — &quot;most reads are mobile&quot; or &quot;this
          took off in one channel&quot; — not for counting.
        </p>

        <h2>Feedback and comments</h2>
        <p>
          Readers can <strong>react</strong> or leave a <strong>short note</strong>{" "}
          without making an account — the friction is deliberately near zero, so
          you actually hear back. <strong>Comments are threaded and anchored</strong>{" "}
          to the doc, so a reply sits next to what it responds to instead of
          floating in a separate inbox. Because feedback lives in the same place
          as the numbers, the quantitative drop-off and the qualitative why sit
          side by side — the funnel shows where readers left, the notes often say
          why.
        </p>
      </Prose>
      <Callout title="Read it as directional">
        Cookieless means approximate. The visitor hash rotates for privacy, so
        every number is an estimate and every breakdown is aggregate — never
        per-person. Don&apos;t over-index on small counts: five views tell you
        little, and a two-point move in a scroll bucket is noise. Look for
        shape and trend across the 30-day view, not single figures.
      </Callout>
      <Faq
        items={[
          {
            q: "Are the numbers exact?",
            a: "No. They're approximate and aggregate by design — the visitor hash rotates for privacy, so uniques are estimates and every breakdown is a rough total rather than a precise count.",
          },
          {
            q: "Do you use cookies?",
            a: "No. Analytics run on a rotating visitor hash — no cookies, no fingerprint, and no cross-site profile.",
          },
          {
            q: "Can I see who read it?",
            a: "No. Everything is aggregate, not per-person. You see counts, funnels, and coarse breakdowns — never an individual reader's identity.",
          },
          {
            q: "What does the 30-day view show?",
            a: "Daily views across the last 30 days, so you can see when a link got attention and whether interest is holding or fading. Read the trend, not any single day.",
          },
        ]}
      />
      <Cta sub="See it on your own doc." />
      <RelatedLinks
        links={[
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "The full tour of what ilolink measures after you share — cookieless views, scroll, heatmaps, and threaded feedback.",
          },
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "Paste Markdown or HTML, or drop a file, and get a shareable ilolink.com link — no account.",
          },
        ]}
      />
    </Article>
  );
}
