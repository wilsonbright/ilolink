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
  title: "ilolink vs tiiny.host — ilolink",
  description:
    "Both turn an HTML file into a link. tiiny.host is a pure static host; ilolink adds cookieless view analytics, heatmaps, and reader feedback.",
  alternates: { canonical: "/vs/tiiny-host" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/vs/tiiny-host",
            headline: "ilolink vs tiiny.host",
            description:
              "tiiny.host is a pure static host for HTML files; ilolink hosts the file too and adds cookieless analytics, heatmaps, and reader feedback plus opt-in expiry only.",
            datePublished: "2026-07-22",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/vs/tiiny-host" },
          { name: "ilolink vs tiiny.host", path: "/vs/tiiny-host" },
        ]}
      />
      <PageHeader
        title="ilolink vs tiiny.host"
        lead={
          <>
            Both turn an HTML file into a shareable link, no repo or build.
            tiiny.host is a pure static host; ilolink hosts the file too and adds
            cookieless analytics, click and scroll heatmaps, and reader feedback,
            plus no forced link expiry. Which you want depends on whether you want
            to see how the page landed after you sent it.
          </>
        }
      />
      <Prose>
        <h2>What&apos;s the same?</h2>
        <p>
          The core move is identical. You drop an HTML file, you get a link you
          can send anyone. No Git repo, no build step, no framework, no server to
          run. Paste or drag, share the URL, done. If all you need is a page on
          the internet in under a minute, either tool does that.
        </p>

        <h2>What ilolink adds</h2>
        <p>
          ilolink treats the link as the first half of the job. After you share
          it, you get:
        </p>
        <ul>
          <li>
            <strong>View analytics</strong> — total views, approximate unique
            views, average time on page, a 0/25/50/75/100% scroll funnel,
            referrers, countries, device class, and a 30-day daily trend.
            Cookieless, no fingerprint, no visitor profile; uniques are
            approximate by design.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll maps, split by device,
            so you can see where readers actually stopped and tapped.
          </li>
          <li>
            <strong>Reader feedback</strong> — reactions, short notes, and
            threaded comments anchored to a point, region, or text on the doc.
            No account for the reader either.
          </li>
          <li>
            <strong>Sanitized, isolated hosting</strong> — untrusted AI HTML is
            sanitized on ingest (javascript:, data:, and vbscript: URLs dropped,
            forms made inert, scripts frozen to static), then served from the
            isolated <code>view.ilolink.com</code> origin under a strict{" "}
            <code>default-src &apos;none&apos;</code> CSP. CSS is kept, so
            mockups still look right.
          </li>
          <li>
            <strong>Opt-in expiry only</strong> — links are permanent by
            default. Expiry is a visibility mode you turn on per doc, alongside
            public, unlisted, and password. It&apos;s never a free-tier penalty.
          </li>
        </ul>

        <h2>Where tiiny.host may fit better</h2>
        <p>
          tiiny.host is a solid pure host, and there are real cases where it wins:
        </p>
        <ul>
          <li>
            <strong>Custom domains</strong> — you can put a page on your own
            domain. ilolink serves from <code>ilolink.com/&lt;slug&gt;</code> and
            doesn&apos;t do custom domains yet.
          </li>
          <li>
            <strong>No 2 MB cap</strong> — ilolink caps each doc at 2 MB. A
            larger static bundle or a page with heavy embedded assets may need a
            plain host. Check tiiny.host&apos;s current size limits yourself.
          </li>
          <li>
            <strong>Its own paid features</strong> — tiiny.host has plans and
            capabilities that change over time. Verify current terms before you
            rely on any specific one.
          </li>
        </ul>

        <ComparisonTable
          columns={["", "tiiny.host", "ilolink"]}
          highlightCol={2}
          rows={[
            ["Setup", "Drag or paste a file", "Paste or drop a file"],
            [
              "Link permanence",
              "Free links may expire — varies, check current terms",
              "Permanent; expiry is opt-in",
            ],
            [
              "Analytics",
              "Pure host — varies, check current terms",
              "Views, approx. uniques, scroll funnel, 30-day trend",
            ],
            [
              "Heatmaps",
              "Not its focus — varies, check current terms",
              "Click + scroll, by device",
            ],
            [
              "Reader feedback",
              "Not its focus — varies, check current terms",
              "Reactions, notes, threaded comments",
            ],
            [
              "Handles messy AI HTML safely",
              "Varies — check current terms",
              "Sanitized under default-src 'none', isolated origin",
            ],
            [
              "Custom domain",
              "Yes — varies, check current terms",
              "Not yet",
            ],
            [
              "File cap",
              "Varies — check current terms",
              "2 MB per doc",
            ],
          ]}
          caption="Verify tiiny.host's current caps and pricing yourself — competitor specifics change."
        />

        <Callout title="A fair note">
          <p>
            tiiny.host is a genuinely good pure host, and its specifics change,
            so treat any exact cap or price you read as subject to their current
            terms. This page isn&apos;t a knock on it. ilolink&apos;s edge is the
            after-the-share layer — analytics, heatmaps, and feedback on the same
            page you published. If you only need the page online and don&apos;t
            need to see what readers did with it, a pure host is a fine choice.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Does tiiny.host have analytics?",
            a: "It's a pure static host, so view analytics and heatmaps aren't its focus — verify its current features yourself, but the core trade-off is that ilolink is built around what happens after you share the link and tiiny.host is built around serving the file.",
          },
          {
            q: "Is ilolink free?",
            a: "Publishing is free and accountless — paste or drop a file and get a link, no login. There are no paid tiers to quote, so we won't invent pricing here.",
          },
          {
            q: "Can ilolink use a custom domain?",
            a: "Not yet. Docs are served from ilolink.com/<slug>, which redirects to the isolated view.ilolink.com render origin. If a custom domain is a hard requirement, a pure host like tiiny.host is the better fit today.",
          },
          {
            q: "Is pasted AI HTML safe to share on ilolink?",
            a: "Yes. Untrusted HTML is sanitized on ingest — javascript:, data:, and vbscript: URLs are dropped, forms are made inert, scripts are frozen to static — and every doc is served under default-src 'none' on an isolated origin. CSS is kept so mockups still render.",
          },
        ]}
      />

      <Cta sub="Compare on your own doc." />

      <RelatedLinks
        links={[
          {
            path: "/guides/best-way-to-share-ai-html",
            title: "The best way to share AI-generated HTML",
            blurb:
              "Static hosts, quick-drop hosts, and ilolink compared — setup, link permanence, and what you learn after you send the link.",
          },
          {
            path: "/alternatives/tiiny-host",
            title: "tiiny.host alternatives",
            blurb:
              "Other ways to turn an HTML file into a link, and where each one fits.",
          },
        ]}
      />
    </Article>
  );
}
