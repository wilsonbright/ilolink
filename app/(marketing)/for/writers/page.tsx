import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Prose,
  Faq,
  Cta,
  RelatedLinks,
} from "../../_components/content";

export const metadata: Metadata = {
  title: "ilolink for writers — ilolink",
  description:
    "Share a draft, essay, or newsletter as a clean link, see how far readers got with scroll depth and time on page, and collect reactions and comments in place.",
  alternates: { canonical: "/for/writers" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/writers",
            headline: "ilolink for writers",
            description:
              "Share a draft, essay, or newsletter as a clean reading link. See how far readers got with scroll depth and time on page, and collect reactions and anchored comments in place.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/writers" },
          { name: "Writers", path: "/for/writers" },
        ]}
      />
      <PageHeader
        title="ilolink for writers"
        lead={
          <>
            Share a draft, essay, or newsletter as a clean link and see how far
            readers got — scroll depth and time on page — plus the reactions and
            comments they leave in place. No account for you to publish, and none
            for your readers to respond.
          </>
        }
      />
      <Prose>
        <h2>Share a draft as a real page</h2>
        <p>
          Paste your <a href="/guides/markdown-to-web-page">Markdown</a> into the{" "}
          <a href="/">composer</a> and it renders in a clean reading shell — just
          your words, typeset for reading, at an{" "}
          <code>ilolink.com/&lt;slug&gt;</code> link. No doc attachment to
          download, no login wall, no app to install before someone can read the
          first line. They click, they read.
        </p>
        <p>
          HTML works too if you write in it, and files up to 2 MB. Ownership is a
          per-doc manage token kept in your browser, so there&apos;s nothing to
          sign up for. Docs are immutable — to post a revised draft you publish a
          new one, so an old link never quietly changes under a reader.
        </p>

        <h2>See how far they read</h2>
        <p>
          After you share, you get a <strong>scroll funnel</strong> —
          0/25/50/75/100% — and <strong>average time on page</strong>, so you can
          tell whether people finished the piece or dropped at the third
          section. If everyone stalls halfway, that&apos;s a signal about the
          middle, not a guess.
        </p>
        <p>
          The numbers are <strong>aggregate and approximate, never per-person</strong>.
          There are no cookies, no fingerprinting, and no profiles — just counts
          and averages across everyone who opened the link, alongside total
          views, approximate uniques, referrers, countries, device class, and
          30-day daily views. The full breakdown is in{" "}
          <a href="/guides/reading-your-analytics">reading your analytics</a>.
        </p>

        <h2>Collect feedback in place</h2>
        <p>
          Readers can leave <strong>reactions and short notes</strong> in a tap,
          or drop <strong>threaded anchored comments</strong> on the exact
          paragraph they&apos;re responding to. Instead of &quot;paragraph six
          feels off&quot; in a separate email, the note lives on paragraph six,
          with replies attached to it.
        </p>
        <p>
          None of this needs an account. Anyone with the link can react and
          comment, and it all renders from the isolated{" "}
          <code>view.ilolink.com</code> origin under a strict CSP.
        </p>

        <h2>Keep drafts private</h2>
        <p>
          A draft isn&apos;t a publication. Set the doc to{" "}
          <strong>unlisted</strong> so it&apos;s reachable only by the link, or
          add a <strong>password</strong> so only the readers you send it to can
          open it. Expiry is opt-in — a draft link stays live until you decide
          otherwise.
        </p>
      </Prose>

      <Faq
        items={[
          {
            q: "Can readers comment without an account?",
            a: "Yes. Anyone with the link can leave reactions, short notes, and threaded anchored comments on a specific paragraph — no login, no account. It all renders from the isolated view.ilolink.com origin under a strict CSP.",
          },
          {
            q: "Can I see who read it?",
            a: "No. Analytics are aggregate and approximate, never per-person. You get scroll depth, average time, view counts, approximate uniques, referrers, and countries — but no identities, no cookies, no fingerprinting, and no profiles.",
          },
          {
            q: "Can I revise a draft after sharing?",
            a: "Docs are immutable, so a shared link never changes under a reader. To post a revised draft you publish a new doc and share the new link. You can delete a doc from the dashboard on the browser that published it.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing is free and accountless — paste your Markdown and get a link. There are no paid tiers to quote.",
          },
        ]}
      />

      <Cta sub="Share your draft and watch the read-through." />

      <RelatedLinks
        links={[
          {
            path: "/guides/markdown-to-web-page",
            title: "Turn Markdown into a web page",
            blurb:
              "Paste Markdown and get a clean, typeset reading page at a shareable link — no export step, no attachment.",
          },
          {
            path: "/guides/reading-your-analytics",
            title: "Reading your analytics",
            blurb:
              "What the numbers mean after you share: scroll funnel, time on page, uniques, referrers, and countries — all cookieless and aggregate.",
          },
        ]}
      />
    </Article>
  );
}
