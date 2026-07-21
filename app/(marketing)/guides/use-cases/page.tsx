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
  title: "What people share with ilolink — ilolink",
  description:
    "Specs, PRDs, prototypes, client reports, data tables, one-pagers — what people publish with ilolink and the analytics question each one answers once you send the link.",
  alternates: { canonical: "/guides/use-cases" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/use-cases",
            headline: "What people share with ilolink",
            description:
              "Common things people publish with ilolink — PRDs, status updates, prototypes, client proposals, research summaries, one-pagers, data tables — and the live analytics question each one answers.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Use cases", path: "/guides/use-cases" },
        ]}
      />
      <PageHeader
        title="What people share with ilolink"
        lead={
          <>
            Specs, PRDs, prototypes, client reports, data tables, one-pagers —
            the things people paste into ilolink and send. For each, there&apos;s
            one question the analytics answer after the link goes out: did they
            actually read it, and where did they stop?
          </>
        }
      />
      <Prose>
        <p>
          Most of what lands here started as AI output — a draft from Claude or
          ChatGPT, a mockup, a table — that needed to become a link someone
          could open. What follows is the pattern across the ones people share
          most, paired with the live metric that answers the question you have
          after you hit send. One honest caveat up front:{" "}
          <strong>the analytics are aggregate and approximate</strong>. They
          tell you what the room did, not which named person did what.
        </p>

        <h3>PRD or product spec</h3>
        <p>
          Product managers send a spec to engineering, design, and a couple of
          stakeholders and want to know: did they read it, or did it die in the
          scroll? The <strong>scroll-depth funnel (0/25/50/75/100%)</strong>{" "}
          answers it — if everyone clears 25% but the requirements at 70% never
          get seen, that&apos;s where alignment breaks. Approximate uniques tell
          you roughly how many of the group opened it at all.
        </p>

        <h3>Launch notes or status update</h3>
        <p>
          You post the weekly update and wonder how far the team actually got
          before tabbing away. <strong>Average time on page</strong> plus the
          scroll funnel show whether people read to the decisions at the bottom
          or bailed after the summary. A shallow funnel on a long update is a
          signal to lead with the part that matters.
        </p>

        <h3>Design prototype or mockup</h3>
        <p>
          Designers share a clickable mockup or a static comp and want to know
          where attention went. The <strong>click heatmap</strong> shows what
          people tapped — including taps on things that aren&apos;t links, which
          means they expected interaction there. <strong>Anchored comments</strong>{" "}
          sit next to the element they&apos;re about, so feedback lands on the
          button, not in a separate thread.
        </p>

        <h3>Client proposal or report</h3>
        <p>
          The question every consultant has after sending a proposal: did the
          client read it, and did anything raise a question? <strong>Scroll
          depth and time on page</strong> tell you whether it was read or just
          opened; <strong>threaded comments and reactions</strong> capture the
          questions without a reply-all chain. Set it to{" "}
          <strong>password or unlisted</strong> so it stays between you and the
          client.
        </p>

        <h3>AI landing-page mockup</h3>
        <p>
          You had an AI generate a landing page and want to know which sections
          held attention before you build the real thing. The{" "}
          <strong>scroll heatmap by device</strong> shows how far down people got
          and where they slowed; the click map shows which call to action pulled
          taps. A hero that runs hot and a pricing section that stays cold is a
          layout note, not a guess.
        </p>

        <h3>Research summary or findings</h3>
        <p>
          Share a synthesis of user interviews or a lit review and the question
          is whether people engaged or skimmed. <strong>Average time on page</strong>{" "}
          against document length is the tell — a dense summary read in ten
          seconds wasn&apos;t read. The scroll funnel shows whether the
          recommendations at the end got seen or the conclusion got skipped.
        </p>

        <h3>One-pager or pitch</h3>
        <p>
          A one-pager lives or dies on whether it gets opened and read all the
          way through. <strong>Approximate uniques</strong> tell you reach;{" "}
          <strong>scroll to 100%</strong> tells you completion. If people open it
          and stop at 40%, the ask below that line never landed — move it up.
        </p>

        <h3>Data table or CSV as a page</h3>
        <p>
          You turn a table or exported CSV into a readable page and mostly want
          to confirm it was opened at all. <strong>Total views and approximate
          uniques</strong> answer that; time on page hints at whether anyone
          actually worked through the rows or glanced and left. It&apos;s a
          low-ceremony way to know a number reached the people who needed it.
        </p>

        <h3>Reading the numbers honestly</h3>
        <p>
          Across all of these, the metrics are <strong>aggregate and
          approximate</strong>. Uniques come from a rotating visitor hash — no
          cookie, no fingerprint, no profile — so they estimate how many people,
          not who. You can see that a proposal was read to the end; you
          can&apos;t see that <em>Dana</em> read it to the end. That&apos;s the
          trade, and it&apos;s the same trade on every page above.
        </p>
      </Prose>
      <Callout title="Aggregate, not per-person">
        Every metric here is about the group, by design. Scroll depth, time on
        page, uniques, heatmaps — they tell you what readers did in aggregate,
        approximately. If you need to know that a specific named person opened a
        document, ilolink is the wrong tool: it deliberately doesn&apos;t build
        that profile.
      </Callout>
      <Faq
        items={[
          {
            q: "Can I see which client read it?",
            a: "No. Analytics are aggregate and approximate — a rotating visitor hash with no cookie, fingerprint, or profile. You can tell that a document was read and how far, but not which named person read it.",
          },
          {
            q: "Can I keep it private?",
            a: "Yes. Set the link to unlisted so it's not discoverable, or add a password so only people with it can open the page. You can also set an optional expiry.",
          },
          {
            q: "Does the same analytics work for every format?",
            a: "Yes. Views, approximate uniques, time on page, the scroll funnel, heatmaps, and feedback are format-neutral — they work the same whether you shared Markdown, HTML, a mockup, or a table.",
          },
        ]}
      />
      <Cta sub="Share yours." />
      <RelatedLinks
        links={[
          {
            path: "/for/consultants",
            title: "ilolink for consultants",
            blurb:
              "Send a client proposal as a private link and see whether it was read — password or unlisted, with comments in one place.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "How to read the scroll funnel, click and scroll heatmaps, and threaded feedback after you share a link.",
          },
        ]}
      />
    </Article>
  );
}
