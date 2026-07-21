import type { Metadata } from "next";
import { JsonLd, article, softwareApplication } from "@/lib/seo/jsonld";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Prose,
  Callout,
  ComparisonTable,
  Faq,
  Cta,
  RelatedLinks,
} from "../../_components/content";

export const metadata: Metadata = {
  title: "tiiny.host alternative with analytics — ilolink",
  description:
    "Like drag-and-drop HTML hosting but want to see how many people opened the page and how far they read? ilolink is a drop-in with cookieless aggregate analytics, heatmaps, and feedback.",
  alternates: { canonical: "/alternatives/tiiny-host" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/alternatives/tiiny-host",
            headline: "tiiny.host alternative with analytics",
            description:
              "A tiiny.host alternative for people who want drag-and-drop HTML hosting plus built-in cookieless view analytics, heatmaps, and reader feedback — no account.",
            datePublished: "2026-07-22",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Alternatives", path: "/alternatives/tiiny-host" },
          {
            name: "tiiny.host alternative",
            path: "/alternatives/tiiny-host",
          },
        ]}
      />
      <PageHeader
        title="A tiiny.host alternative with analytics"
        lead={
          <>
            If you like drag-and-drop HTML hosting but want to see how many
            people opened the page and how far they read, ilolink is a drop-in:
            paste HTML or Markdown, or drop a file, get a link — with cookieless
            aggregate analytics, heatmaps, and reader feedback built in.
          </>
        }
      />
      <Prose>
        <h2>Why look for an alternative?</h2>
        <p>
          A pure host gets you a link and stops there. You drag in a file,
          you get a URL, you send it — and then nothing. You can&apos;t tell
          whether the page landed: how many people opened it, how far down they
          read, where they clicked, or whether they bounced in two seconds. For a
          one-off file that&apos;s fine. For anything you actually care about — a
          pitch, a proposal, a spec, a design mockup — the link is only the first
          half of the job.
        </p>
        <p>
          tiiny.host is a well-known drag-and-drop static host for HTML and
          single files, with a free tier and paid plans. Details change, so check
          their current terms — but the core trade-off is stable: it&apos;s a host,
          not an analytics tool. No built-in view metrics, no heatmaps, no reader
          feedback, and free links can carry limits. If you want to know what
          happened after you shared, you&apos;d bolt on a separate analytics stack.
        </p>

        <h2>What to look for in an alternative</h2>
        <p>
          If the reason you&apos;re switching is &quot;I want to see how the page
          did,&quot; use this checklist:
        </p>
        <ul>
          <li>
            <strong>Built-in view analytics</strong> — total views, approximate
            unique views, average time on page, and a scroll funnel, without
            wiring up a third-party tag.
          </li>
          <li>
            <strong>Heatmaps</strong> — where readers actually click and how far
            they scroll, split by device.
          </li>
          <li>
            <strong>Reader feedback</strong> — a way for people to react or leave
            a note without creating an account.
          </li>
          <li>
            <strong>Safe handling of AI HTML</strong> — if you&apos;re pasting
            markup a chatbot wrote, it should be sanitized, not trusted blindly.
          </li>
          <li>
            <strong>Link permanence</strong> — the link shouldn&apos;t quietly
            expire on you unless you asked it to.
          </li>
        </ul>

        <h2>How ilolink covers it</h2>
        <p>
          Each checklist item maps to something that ships today, on the free,
          accountless publish flow:
        </p>
        <ComparisonTable
          columns={["What you want", "tiiny.host", "ilolink"]}
          highlightCol={2}
          rows={[
            [
              "Setup",
              "Drag a file, get a link",
              "Paste or drop a file, get a link",
            ],
            [
              "View analytics",
              "None built in (varies)",
              "Views, approx. uniques, avg time",
            ],
            [
              "Scroll funnel",
              "None",
              "0 / 25 / 50 / 75 / 100%",
            ],
            ["Heatmaps", "None", "Click + scroll maps, by device"],
            [
              "Reader feedback",
              "None",
              "Reactions, notes, threaded comments",
            ],
            [
              "Handles messy AI HTML safely",
              "Varies",
              "Sanitized under default-src 'none'",
            ],
            [
              "Free link permanence",
              "Can carry limits (varies)",
              "Permanent; expiry is opt-in",
            ],
          ]}
          caption="Competitor specifics change — verify current caps, pricing, and limits on tiiny.host before you decide."
        />
        <p>
          The analytics are cookieless by design: no cookie banner, no
          fingerprint, no visitor profile. Uniques come from a rotating visitor
          hash, so they&apos;re approximate on purpose. You get views, approximate
          uniques, average time on page, the 0/25/50/75/100% scroll funnel,
          referrers, countries, device class, and a 30-day daily trend — plus
          click and scroll heatmaps and reader reactions, notes, and comments
          anchored to a point or passage on the doc. Every page is served from the
          isolated <code>view.ilolink.com</code> render origin under a strict CSP,
          so pasting HTML a chatbot wrote is safe by default.
        </p>

        <Callout title="Be honest about the trade-offs">
          <p>
            ilolink caps each doc at 2 MB of raw body or file. Interactive
            JavaScript is frozen to static on ingest — layout and CSS render, but
            scripts don&apos;t run, so a live React app won&apos;t stay
            interactive. And there are no custom domains yet; your link lives under{" "}
            <code>ilolink.com/&lt;slug&gt;</code>. If you need a big upload, a live
            JS app, or your own domain, a pure host like tiiny.host may suit you
            better — and that&apos;s a fair reason to stay.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Is it really free?",
            a: "Yes — publishing is free and accountless. Paste or drop a file and get a link, no login and no card. There are no paid tiers to quote, so we won't invent pricing here.",
          },
          {
            q: "Do I need an account?",
            a: "No. There's no login. Ownership of a doc is a per-doc manage token kept in your browser, not a server account — so keep that link to manage the doc later.",
          },
          {
            q: "What analytics do I get?",
            a: "Total views, approximate unique views, average time on page, a 0/25/50/75/100% scroll funnel, referrers, countries, device class, and a 30-day daily trend — plus click and scroll heatmaps and reader reactions, notes, and comments. All cookieless.",
          },
          {
            q: "Is pasted AI HTML safe to share?",
            a: "Yes. Untrusted HTML is sanitized on ingest — javascript:, data:, and vbscript: URLs are dropped, scripts are frozen to static, forms are made inert — and every doc is served from view.ilolink.com under default-src 'none'. CSS is kept so mockups still look right.",
          },
        ]}
      />

      <Cta sub="Try it on a page you'd normally just host." />

      <RelatedLinks
        links={[
          {
            path: "/vs/tiiny-host",
            title: "ilolink vs tiiny.host",
            blurb:
              "The side-by-side: a pure static host versus a host that also shows you how the page was read.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "What you learn after you share: how many opened it, how far they read, where they clicked, and what they said.",
          },
        ]}
      />
    </Article>
  );
}
