import type { Metadata } from "next";
import { JsonLd, article, softwareApplication } from "@/lib/seo/jsonld";
import { FREE_LINE, TEAM_LINE } from "@/lib/billing/copy";
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

// The Notion claims here come from Notion's own analytics guide
// (notion.com/help/guides/get-insights-with-page-workspace-analytics, read
// 2026-08-12), which states that the viewer list "won't include anonymous
// viewers who aren't members or guests, but have seen your page online" while
// online views are still counted, and that workspace-level analytics is an
// Enterprise feature. It documents no scroll depth, heatmaps or referrers. Where
// Notion's behaviour is not documented, this page hedges instead of asserting.
export const metadata: Metadata = {
  title: "ilolink vs Notion public pages — who actually read it",
  description:
    "A published Notion page counts anonymous views but never says who read it or how far. ilolink adds scroll depth, heatmaps and anchored reader feedback.",
  alternates: { canonical: "/vs/notion" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/vs/notion",
            headline: "ilolink vs Notion public pages",
            description:
              "Notion publishes a page to the web and counts views; ilolink publishes a document and reports read-through, heatmaps and anchored feedback from readers with no account.",
            datePublished: "2026-08-12",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/vs/notion" },
          { name: "ilolink vs Notion", path: "/vs/notion" },
        ]}
      />
      <PageHeader
        title="ilolink vs Notion public pages"
        lead={
          <>
            Notion is where the document lives while you write it. Publishing to
            the web is a switch on the side of that — useful, and deliberately
            not the product. ilolink is the other half: it takes a finished
            document, gives it a link, and reports how the people you sent it to
            actually read it. Most teams end up using both.
          </>
        }
      />
      <Prose>
        <h2>What Notion gives you when you publish</h2>
        <p>
          A public URL on <code>notion.site</code>, no account needed to read it,
          and a page that keeps mirroring the document as you edit. For a living
          wiki, a public roadmap or an always-current handbook, that live mirror
          is exactly right, and nothing here beats it.
        </p>

        <h2>What its analytics can and cannot tell you</h2>
        <p>
          Notion&apos;s own analytics guide is clear about the boundary. Page
          analytics lists viewers, but{" "}
          <em>
            &ldquo;this list won&apos;t include anonymous viewers who aren&apos;t
            members or guests, but have seen your page online&rdquo;
          </em>{" "}
          — while those online views are still counted. So for a page you
          published to the world, you get a number and no more: the people you
          most want to know about are precisely the ones not in the list. The
          fuller workspace-level analytics is an Enterprise feature, and Notion
          documents no scroll depth, no heatmaps and no referrers at any tier.
        </p>
        <p>
          That is a reasonable place for a workspace tool to stop. It is also the
          exact gap ilolink is built in:
        </p>
        <ul>
          <li>
            <strong>Read-through, not just a view count</strong> — a
            0/25/50/75/100% scroll funnel and average time on page, so a
            twelve-section proposal tells you where attention ended.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll maps split by device.
          </li>
          <li>
            <strong>Referrers, countries and device class</strong> — how the link
            travelled after you sent it.
          </li>
          <li>
            <strong>Anchored feedback from anonymous readers</strong> — reactions,
            private notes and threaded comments pinned to a point, region or line.
            The reader needs no account and joins no workspace, which is the whole
            reason a client will actually leave one.
          </li>
          <li>
            <strong>Cookieless</strong> — no cookie, no fingerprint, no visitor
            profile, and uniques are approximate by design.
          </li>
        </ul>

        <h2>Publishing model: live mirror versus published version</h2>
        <p>
          This is the difference that decides which tool you want, and neither
          answer is better in general. A published Notion page tracks the document
          — fix a typo and the world sees the fix. An ilolink document is a
          published version: what you sent is what they see until you update it
          deliberately. If you are sending a proposal, a report or anything a
          client might quote back at you, that stability is the point. If you are
          maintaining a page that should always be current, the live mirror is.
        </p>

        <h2>Where Notion is clearly the better tool</h2>
        <ul>
          <li>
            <strong>Writing and collaborating</strong> — ilolink has no editor. It
            publishes what you already wrote, wherever you wrote it.
          </li>
          <li>
            <strong>Structure</strong> — databases, relations, views, nested pages
            and a whole public site of them. ilolink is one document per link.
          </li>
          <li>
            <strong>A living document</strong> — anything whose value is being
            up-to-date rather than being a fixed record.
          </li>
          <li>
            <strong>Internal readers you can name</strong> — inside a workspace,
            Notion knows exactly who opened what, and ilolink deliberately never
            identifies an anonymous reader.
          </li>
        </ul>

        <ComparisonTable
          columns={["", "Notion public page", "ilolink"]}
          highlightCol={2}
          rows={[
            ["Best at", "Writing and maintaining the document", "Sending a finished document and measuring it"],
            ["Reader needs an account", "No", "No"],
            [
              "Anonymous public readers in analytics",
              "Counted, but not listed",
              "Counted, and never identified by design",
            ],
            ["Scroll depth / read-through", "Not documented", "0/25/50/75/100% funnel + time on page"],
            ["Heatmaps", "Not documented", "Click + scroll, by device"],
            ["Referrers and countries", "Not documented", "Both, plus device class"],
            [
              "Feedback from a reader with no account",
              "Not the model — commenting belongs to the workspace",
              "Reactions, notes, anchored threaded comments",
            ],
            ["Published page updates", "Live mirror of the document", "A published version you update deliberately"],
            [
              "Formats",
              "Notion pages",
              "Markdown, HTML, PDF, .docx, CSV rendered as a page",
            ],
            ["Access control", "Published or not; workspace permissions", "Public, unlisted, private (teamspace members only), password, or expiring"],
          ]}
          caption="Notion rows reflect its own analytics guide, read 2026-08-12. 'Not documented' means exactly that — verify current features rather than taking this as a permanent absence."
        />

        <Callout title="A fair note">
          <p>
            Notion is a genuinely excellent place to write, and this page is not
            an argument for leaving it. The honest pattern is to write in Notion
            and publish through ilolink when it matters whether the document
            landed — export or paste the finished thing, send the ilolink URL, and
            read the scroll funnel afterwards.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Can I see who read my published Notion page?",
            a: "Not for anonymous readers. Notion's analytics guide states the viewer list won't include anonymous viewers who aren't members or guests, though their online views are still counted — so a publicly shared page gives you a number without names.",
          },
          {
            q: "Does ilolink tell me who read my document?",
            a: "No, and that is deliberate. Analytics are aggregate and cookieless — views, approximate uniques, scroll depth, referrers, countries, device class — with no visitor profile and no identity. What it adds over a view count is how far people read and where they clicked.",
          },
          {
            q: "Does Notion offer heatmaps or scroll depth?",
            a: "Its analytics documentation describes viewers and view counts, and does not document scroll depth, heatmaps or referrers. Check Notion's current help pages before treating that as fixed.",
          },
          {
            q: "Can I keep writing in Notion and still use ilolink?",
            a: "Yes, that is the common pattern. Export the page or paste its content as Markdown into ilolink when you want a stable, measurable link to send outside your workspace. Notion stays the place you write.",
          },
          {
            q: "Is ilolink free?",
            a: `${FREE_LINE} You need a free account to publish; readers never need one. ${TEAM_LINE}`,
          },
        ]}
      />

      <Cta sub="Send the finished document and see how it read." />

      <RelatedLinks
        links={[
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "What you learn after you share a link: who opened it, how far they read, where they clicked, and what they said.",
          },
          {
            path: "/vs/google-docs",
            title: "ilolink vs Google Docs publish to web",
            blurb:
              "The other place documents get published from — and the same missing question of whether anyone read it.",
          },
        ]}
      />
    </Article>
  );
}
