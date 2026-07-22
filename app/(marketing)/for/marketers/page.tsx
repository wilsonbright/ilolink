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
  title: "ilolink for marketers — ilolink",
  description:
    "Publish a landing-page mockup or campaign page as a link and see where attention went — click and scroll heatmaps, cookieless, no account.",
  alternates: { canonical: "/for/marketers" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/marketers",
            headline: "ilolink for marketers",
            description:
              "Publish a landing-page mockup or campaign page as a link and see where attention went.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/marketers" },
          { name: "Marketers", path: "/for/marketers" },
        ]}
      />
      <PageHeader
        eyebrow="For marketers"
        title="Publish a page as a link, and see where attention went"
        lead={
          <>
            Publish a landing-page mockup or campaign page as a link and see
            where attention went with click and scroll heatmaps — no account,
            cookieless, and safe to share AI-generated HTML that&apos;s
            sanitized on the way in.
          </>
        }
      />

      <Prose>
        <h2>Share a landing page or mockup</h2>
        <p>
          Drop an HTML mockup or an AI-generated page into the composer and you
          get <code>ilolink.com/&lt;slug&gt;</code> — a real page a stakeholder
          opens in a browser, not a screenshot in a deck. Your CSS is kept, so
          the layout and type look the way you built them. Inline{" "}
          <code>&lt;style&gt;</code> and Google Fonts render. The cap is
          2&nbsp;MB per doc, and it&apos;s accountless — no login for you or the
          people you send it to.
        </p>
        <p>
          One honest limit up front: untrusted HTML is sanitized on ingest, and
          interactive JavaScript is <strong>frozen to static</strong>. Buttons,
          carousels, and form submits render but won&apos;t run — you&apos;re
          shipping a static preview of the page, not a working app. That&apos;s
          the right shape for a mockup or a message test, and it&apos;s why the
          link is safe to hand around.
        </p>

        <h2>See what drew attention</h2>
        <p>
          Once it&apos;s live, you get live, cookieless analytics: total views,
          approximate unique views, average time on page, referrers, countries,
          and device class. The <strong>scroll funnel</strong> at
          0/25/50/75/100% shows where people dropped — if a campaign page loses
          half its readers before the offer, you can see it. Click and scroll{" "}
          <strong>heatmaps</strong> by device show which headline, image, or
          call to action actually pulled the cursor and where the eye stopped.
        </p>

        <h2>A/B the message</h2>
        <p>
          Want to test two headlines or two hero layouts? Publish each version
          as its own link and compare read-through, time on page, and heatmaps
          side by side. Be clear on the limit: there&apos;s no built-in split
          testing and no traffic splitter — ilolink won&apos;t route visitors
          for you. You send version A to one group and version B to another,
          then compare the numbers <strong>manually</strong>. Because each doc
          is immutable with its own permanent URL and its own analytics, the two
          reads never bleed into each other.
        </p>

        <h2>Keep drafts unlisted</h2>
        <p>
          A page in review isn&apos;t ready for the public. Set it to{" "}
          <strong>unlisted</strong> so it&apos;s reachable only by the exact
          link you share, or <strong>password</strong> so only people with the
          password get in. If a launch page should stop working after a date,
          set <strong>expiring</strong> visibility — expiry is opt-in, so a link
          never expires unless you choose it. You manage or delete the doc from
          the dashboard in the browser you published from.
        </p>
      </Prose>

      <Callout title="Where this isn't the right tool">
        <p>
          If the page needs live interactivity, a custom domain, or a form that
          actually collects submissions, a general host fits better — ilolink is
          built around a sanitized, tracked, accountless link, and interactive
          JS is frozen to static.
        </p>
      </Callout>

      <Faq
        items={[
          {
            q: "Do interactive elements work?",
            a: "No — interactive JavaScript is frozen to static on ingest. The layout and CSS render, so the page looks right, but buttons, sliders, and form submits won't run. It's a static preview, which is what makes the link safe to share.",
          },
          {
            q: "Can I see who clicked?",
            a: "No. Heatmaps and analytics are aggregate and cookieless — total views, approximate uniques, a scroll funnel, and click/scroll heatmaps by device — never per-person identity. There's no profile, cookie, or fingerprint, so you get attention signal, not names.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing a page, sharing the link, and reading the analytics and heatmaps are free. It's accountless, so there's nothing to sign up for.",
          },
        ]}
      />

      <Cta sub="Publish a page and watch the heatmap." />

      <RelatedLinks
        links={[
          {
            path: "/guides/host-ai-image",
            title: "Host an AI-generated image as a page",
            blurb:
              "Turn a generated image or visual mockup into a shareable, tracked link.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "What you can measure after you publish: scroll funnel, time on page, heatmaps, comments.",
          },
        ]}
      />
    </Article>
  );
}
