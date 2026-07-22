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
  title: "Free HTML hosting: what free actually costs — ilolink",
  description:
    "Free HTML hosting often means expiring links, small size caps, or watermarks. ilolink publishes HTML free — no account, no forced expiry, analytics included, 2 MB per doc.",
  alternates: { canonical: "/guides/free-html-hosting" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/free-html-hosting",
            headline: "Free HTML hosting: what free actually costs",
            description:
              "What free HTML hosting usually costs, what ilolink includes free, and the honest limits — so you can pick the right host for the job.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Free HTML hosting", path: "/guides/free-html-hosting" },
        ]}
      />
      <PageHeader
        title="Free HTML hosting: what free actually costs"
        lead={
          <>
            &quot;Free&quot; HTML hosting often means expiring links, small size
            caps, or a watermark on your page. ilolink publishes HTML free — no
            account, no forced expiry, cookieless analytics included — capped at
            2 MB per doc. Read each host&apos;s current terms before you rely on
            one.
          </>
        }
      />
      <Prose>
        <h2>What &quot;free&quot; usually costs</h2>
        <p>
          Free is rarely free of trade-offs — it just moves the cost somewhere
          you notice later. Across free and quick-drop HTML hosts, a few
          patterns show up often enough to check for:
        </p>
        <ul>
          <li>
            <strong>Expiring links.</strong> Some hosts delete free uploads
            after a window, or keep the link alive only while the account stays
            active.
          </li>
          <li>
            <strong>Size caps.</strong> Free tiers frequently limit file size or
            total storage, which bites the moment your page carries images.
          </li>
          <li>
            <strong>Branding.</strong> A footer badge, a watermark, or an
            interstitial before your page loads is a common way free gets paid
            for.
          </li>
          <li>
            <strong>Ads or upsell walls.</strong> A banner on your content, or a
            &quot;remove this with Pro&quot; prompt in front of readers.
          </li>
        </ul>
        <p>
          None of that makes those hosts wrong — the exact rules live in each
          host&apos;s current terms and change over time, so read the version in
          front of you rather than trusting a blog post (this one included). The
          point is only that &quot;free&quot; is a headline, not a spec.
        </p>

        <h2>What ilolink includes free</h2>
        <p>
          ilolink&apos;s free path is the whole product, not a stripped tier.
          You paste Markdown or HTML — or drop a file or image — and get a{" "}
          <code>ilolink.com/&lt;slug&gt;</code> link. What comes with it:
        </p>
        <ul>
          <li>
            <strong>No account.</strong> Publishing is accountless; control over
            a doc is a per-doc manage token kept in your browser.
          </li>
          <li>
            <strong>Permanent by default.</strong> Links don&apos;t expire on a
            timer. Expiry is an opt-in visibility mode you set per doc, alongside
            public, unlisted, and password.
          </li>
          <li>
            <strong>Analytics included.</strong> Cookieless, aggregate metrics —
            total and approximate unique views, average time on page, a
            0/25/50/75/100% scroll-depth funnel, top referrers, countries,
            device class, and 30 days of daily views.
          </li>
          <li>
            <strong>Heatmaps and feedback.</strong> Live click and scroll
            heatmaps by device, plus reactions, short notes, and threaded
            anchored comments.
          </li>
          <li>
            <strong>Safe hosting.</strong> Untrusted AI HTML is sanitized on
            ingest and every doc is served isolated on{" "}
            <code>view.ilolink.com</code> under a strict Content-Security-Policy,
            over HTTPS on Cloudflare&apos;s edge.
          </li>
        </ul>
        <p>
          The analytics are aggregate by design — a rotating visitor hash, no
          cookies, no fingerprint, no per-person identity or cross-site
          tracking. You see how the page was read, not who read it.
        </p>

        <h2>The honest limits</h2>
        <p>
          Free doesn&apos;t mean it does everything. Here&apos;s where a plain
          static host may fit your job better.
        </p>

        <Callout title="What ilolink won't do">
          <ul>
            <li>
              <strong>2 MB per doc.</strong> A hard cap. Fine for pages, reports,
              and mockups; not for heavy asset bundles.
            </li>
            <li>
              <strong>Interactive JS is frozen to static.</strong> Scripts are
              dropped and interactive JavaScript is frozen to its rendered state
              — CSS is kept, forms are inert. A live app won&apos;t stay live.
            </li>
            <li>
              <strong>No media hosting.</strong> Audio and video hosting
              isn&apos;t shipped. ilolink is for documents and images.
            </li>
            <li>
              <strong>No custom domains.</strong> Your link lives on{" "}
              <code>ilolink.com</code>. If you need your own domain, a dev static
              host is the better tool.
            </li>
          </ul>
          <p>
            If any of those is a hard requirement, a developer-oriented static
            host — the kind that serves raw files under your own domain — will
            likely suit you better.
          </p>
        </Callout>

        <h2>When a plain free host is enough</h2>
        <p>
          If all you need is a URL — you have a working directory of files, you
          want it under your own domain, your JavaScript has to keep running, or
          you genuinely don&apos;t care who read it — then a plain static host
          does the job, and ilolink&apos;s extras are weight you won&apos;t use.
        </p>
        <p>
          Reach for ilolink when the reading matters: when you want the page up
          in one paste, safe to hand a stranger, permanent without an account,
          and honest about how it landed. That&apos;s the trade — you give up
          custom domains and live scripts; you get analytics, heatmaps, and
          feedback with no tier to buy.
        </p>
      </Prose>

      <Faq
        items={[
          {
            q: "Is ilolink really free?",
            a: "Yes — publishing HTML, Markdown, and images is free, and it's accountless. There's no pricing tier to buy for the features described here.",
          },
          {
            q: "Do the free links expire?",
            a: "No. Links are permanent by default — there's no timer and no free-tier deletion. Expiry is an opt-in visibility mode you set per doc, not something that kicks in on its own.",
          },
          {
            q: "What's the size limit?",
            a: "2 MB per doc — a hard cap. It's plenty for pages, reports, and mockups, but not for heavy asset bundles or embedded media.",
          },
          {
            q: "Is there branding or a watermark on my page?",
            a: "Your doc is served on its own isolated view.ilolink.com origin. The link lives on ilolink.com, but the page content is yours — no watermark laid over it and no ads inserted into it.",
          },
        ]}
      />

      <Cta sub="Publish your HTML free." />

      <RelatedLinks
        links={[
          {
            path: "/guides/best-way-to-share-ai-html",
            title: "The best way to share AI-generated HTML",
            blurb:
              "Static hosts, quick-drop hosts, and ilolink compared — including which ones expire free links or add branding.",
          },
          {
            path: "/guides/do-links-expire",
            title: "Do shared links expire?",
            blurb:
              "Why ilolink links are permanent by default, and how the opt-in expiring mode works.",
          },
        ]}
      />
    </Article>
  );
}
