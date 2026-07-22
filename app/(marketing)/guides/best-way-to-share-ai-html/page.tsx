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
  title: "The best way to share AI-generated HTML — ilolink",
  description:
    "Compare static hosts, quick-drop hosts, and ilolink for sharing AI HTML. Every option gets you a link; ilolink also shows views, scroll depth, heatmaps, and feedback.",
  alternates: { canonical: "/guides/best-way-to-share-ai-html" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/best-way-to-share-ai-html",
            headline: "The best way to share AI-generated HTML",
            description:
              "Static hosts, quick-drop hosts, and ilolink compared for sharing AI-generated HTML — setup, free-link permanence, and what you learn after you send the link.",
            datePublished: "2026-07-21",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          {
            name: "Best way to share AI HTML",
            path: "/guides/best-way-to-share-ai-html",
          },
        ]}
      />
      <PageHeader
        title="The best way to share AI-generated HTML"
        lead={
          <>
            You have two kinds of options: plain static hosts (GitHub Pages,
            Netlify Drop, Cloudflare Pages, tiiny.host) or ilolink. The static
            hosts get you a link. ilolink gets you a link plus a record of what
            happened after you shared it.
          </>
        }
      />
      <Prose>
        <h2>What are you actually choosing between?</h2>
        <p>
          Three buckets, each with a real trade-off:
        </p>
        <ul>
          <li>
            <strong>Developer static hosts</strong> — GitHub Pages, Netlify Drop,
            Cloudflare Pages. Free, with full control over the output. The cost
            is a repo, a build, or a deploy step, plus you own the config. Good
            fit if you already work in that toolchain.
          </li>
          <li>
            <strong>Quick-drop hosts</strong> — tiiny.host and similar. Paste or
            drag a file, get a link in seconds. Fast, but free links can expire
            and free-tier size caps tend to be small, so check the current terms
            before you rely on one.
          </li>
          <li>
            <strong>ilolink</strong> — also a drop-in: paste HTML or Markdown, or
            drop a file, get a link. The difference is what comes after — view
            and scroll analytics, click and scroll heatmaps, and reader feedback
            on the same page, with no account.
          </li>
        </ul>
        <p>
          None of these is wrong. The question is whether a link is the whole job
          or just the first half of it.
        </p>

        <h2>How do the options compare?</h2>
        <p>
          Cells below are honest trade-offs, not a scoreboard. Where a specific
          competitor number would be a guess, it says <code>varies</code> — go
          read their current pricing page.
        </p>
        <ComparisonTable
          columns={["", "Static hosts", "Quick drop hosts", "ilolink"]}
          highlightCol={3}
          rows={[
            [
              "Setup",
              "Repo / build / deploy",
              "Paste or drag a file",
              "Paste or drop a file",
            ],
            [
              "Free link permanence",
              "Permanent while hosted",
              "Can expire (varies)",
              "Permanent; expiry is opt-in",
            ],
            [
              "Analytics",
              "None (bring your own)",
              "Basic counts (varies)",
              "Views, approx. uniques, scroll depth",
            ],
            ["Heatmaps", "None", "Rare (varies)", "Click + scroll maps"],
            [
              "Reader feedback",
              "None",
              "Rare (varies)",
              "Reactions, notes, comments",
            ],
            [
              "Handles messy AI HTML safely",
              "You review it",
              "Varies",
              "Sanitized under default-src 'none'",
            ],
            ["File cap", "Large (varies)", "Small on free (varies)", "2 MB per doc"],
          ]}
          caption="Specifics change — verify current caps and pricing on each host before you decide."
        />

        <Callout title="Be honest about ilolink's limits">
          <p>
            ilolink caps each doc at 2 MB of raw body or file. By default,
            interactive JavaScript apps are frozen to static on ingest — the
            layout and CSS render, but scripts don&apos;t run, so a live React app
            won&apos;t stay interactive unless you mark the doc trusted, which
            runs it as-is inside a sandboxed frame on the isolated origin. Media
            hosting (audio, video) isn&apos;t shipped. There
            are no custom domains and no paid tiers to quote. If you need any of
            those, a static host is the better fit.
          </p>
        </Callout>

        <h2>So which should you pick?</h2>
        <p>
          Pick a raw static host if you want a repo, full control over the build,
          and you don&apos;t care who read the page — you just need it online. In
          return for the setup, you get permanent hosting and no size cap to
          speak of.
        </p>
        <p>
          Pick ilolink if you want the page live in seconds <strong>and</strong>{" "}
          you want to see how it landed — who opened it, how far they scrolled
          (bucketed at 0/25/50/75/100%), where they clicked, and what they said.
          The link is the same shape; you just also get the second half of the
          job. Every doc is served from the isolated <code>view.ilolink.com</code>{" "}
          origin under a strict CSP, so pasting AI HTML you didn&apos;t write is
          safe by default.
        </p>
      </Prose>

      <Faq
        items={[
          {
            q: "Do ilolink links expire?",
            a: "No — links are permanent by default. Expiry is an opt-in visibility mode you can turn on per doc, alongside public, unlisted, and password. It's a choice, not a free-tier penalty.",
          },
          {
            q: "Is there a free tier?",
            a: "Publishing is free and accountless — paste or drop a file and get a link, no login. There are no paid tiers to quote, so we won't invent pricing here.",
          },
          {
            q: "Can it host a whole framework app?",
            a: "Not by default. Interactive JavaScript is frozen to static on ingest, so a live React or Vue app won't run — build it to a static HTML file first, then share that. But if you mark the doc trusted at publish time, it runs as-is inside a sandboxed frame on the isolated origin.",
          },
          {
            q: "Is pasted AI HTML safe to share?",
            a: "Yes. Untrusted HTML is sanitized on ingest — javascript:, data:, and vbscript: URLs are dropped, forms are made inert — and every doc is served from view.ilolink.com under default-src 'none'. CSS is kept so mockups still look right.",
          },
        ]}
      />

      <Cta sub="See the difference on your own doc." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop for turning ChatGPT, Claude, or Gemini output into a page anyone can open.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "What you learn after you share: who opened it, how far they read, where they clicked, and what they said.",
          },
        ]}
      />
    </Article>
  );
}
