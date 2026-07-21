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
  title: "Analytics, heatmaps & feedback for shared docs — ilolink",
  description:
    "After you share an ilolink you see views, approximate uniques, scroll-depth, click heatmaps, and reader feedback — all cookieless, no fingerprint, no profile.",
  alternates: { canonical: "/guides/analytics-heatmaps-feedback" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/analytics-heatmaps-feedback",
            headline: "Analytics, heatmaps & feedback for shared docs",
            description:
              "How to read ilolink's cookieless analytics: views vs approximate uniques, the scroll-depth funnel, click and scroll heatmaps, and threaded reader feedback.",
            datePublished: "2026-07-21",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          {
            name: "Analytics, heatmaps & feedback",
            path: "/guides/analytics-heatmaps-feedback",
          },
        ]}
      />
      <PageHeader
        title="Analytics, heatmaps & feedback for shared docs"
        lead={
          <>
            After you share an ilolink, you see who opened it, how far they read,
            where they clicked, and what they said. It runs cookieless — a
            rotating visitor hash, no fingerprint, no cross-site profile.
          </>
        }
      />
      <Prose>
        <h2>What gets measured, and how privately?</h2>
        <p>
          Every open is counted without a cookie. ilolink derives a{" "}
          <strong>rotating visitor hash</strong> to tell one reader apart from
          another for a short window — there is no fingerprint, no cross-site
          tracking, and no personal profile stored anywhere. Because the hash
          rotates, <strong>unique views are approximate by design</strong>. You
          get total views, approximate uniques, average time on page,
          scroll-depth, top referrers, countries, device class, and 30-day daily
          views.
        </p>

        <h2>Views vs unique views</h2>
        <p>
          <strong>Views</strong> is every time the page was opened — one person
          who reopens the link three times is three views.{" "}
          <strong>Unique views</strong> is the approximate number of people
          behind those opens. The gap between them tells you something: a large
          view-to-unique ratio means people are coming back, which is a good
          sign for a proposal or a spec. A ratio near 1:1 means one-and-done
          reads. Treat the unique number as a close estimate, not a headcount.
        </p>

        <h2>The scroll-depth funnel</h2>
        <p>
          Scroll-depth is bucketed at <strong>0/25/50/75/100%</strong>. Read it
          like a funnel: if 90% of readers pass 25% but only 30% reach 75%, the
          drop-off is in the middle of the page — the part they abandon is where
          you lost them. Pair it with average time on page. High time plus a
          shallow funnel means people are stuck early; low time plus a deep
          funnel means they skimmed to the end. Both are signals about where to
          cut or tighten.
        </p>

        <h2>Heatmaps</h2>
        <p>
          Heatmaps come in two kinds — <strong>click</strong> and{" "}
          <strong>scroll</strong> — and you can view each{" "}
          <strong>by device</strong>, because a layout that works on desktop can
          bury your call to action on mobile. Hot zones show where attention and
          clicks land; cold zones show what got ignored. If the section you care
          about is cold, it is either too far down or not pulling the eye. Check
          the click map for taps on things that are not links — that is a sign
          readers expected something to be interactive.
        </p>

        <h2>Feedback and comments</h2>
        <p>
          Readers can react or leave a short note without making an account —
          the friction is deliberately near zero, so you actually hear back.{" "}
          <strong>Comments are threaded and anchored to the doc</strong>, so a
          reply sits next to what it responds to instead of floating in a
          separate inbox. You see reactions, notes, and comment threads in the
          same place as the analytics, so quantitative drop-off and qualitative
          why sit side by side.
        </p>

        <h2>Where it&apos;s going</h2>
        <p>
          Today the metrics are format-neutral — they work the same whether you
          shared Markdown, HTML, or a mockup. The direction is{" "}
          <strong>format-aware</strong> measurement: per-slide view time once
          slides ship, per-page read depth for PDFs, and watch- or
          listen-through once media hosting exists. None of that is live yet.
          When the formats and media land, the analytics grow to match them —
          until then, assume only what is described above.
        </p>
      </Prose>
      <Callout title="What's not live yet">
        Per-slide time, per-PDF-page depth, and video/audio completion are the
        plan, not the product. Media hosting hasn&apos;t shipped, so any
        format-specific read metric is direction only — the live analytics are
        the cookieless views, uniques, scroll, heatmaps, and feedback covered
        above.
      </Callout>
      <Faq
        items={[
          {
            q: "Do you use cookies?",
            a: "No. Analytics run on a rotating visitor hash — no cookies, no fingerprint, and no cross-site profile.",
          },
          {
            q: "Are unique view counts exact?",
            a: "No. Uniques are approximate by design. The visitor hash rotates for privacy, so the count is a close estimate rather than a precise headcount.",
          },
          {
            q: "Can readers comment or react without an account?",
            a: "Yes. Reactions, short notes, and threaded comments all work with no reader login — that low friction is the point.",
          },
          {
            q: "Where is the data processed?",
            a: "On Cloudflare's edge, globally over HTTPS, and cookielessly. There is no server-side account tied to a reader.",
          },
        ]}
      />
      <Cta sub="See it on your own doc." />
      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "Paste Markdown or HTML, or drop a file, and get a shareable ilolink.com link — no account.",
          },
          {
            path: "/guides/best-way-to-share-ai-html",
            title: "The best way to share AI-generated HTML",
            blurb:
              "How ilolink sanitizes untrusted AI HTML and serves it under a strict CSP on view.ilolink.com.",
          },
        ]}
      />
    </Article>
  );
}
