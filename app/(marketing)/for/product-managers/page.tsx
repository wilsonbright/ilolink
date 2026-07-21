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
  title: "ilolink for product managers — ilolink",
  description:
    "Share a PRD, spec, or update as a clean link, then see if stakeholders read it: scroll depth, time on page, and where they clicked. No cookies, no accounts.",
  alternates: { canonical: "/for/product-managers" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/product-managers",
            headline: "ilolink for product managers",
            description:
              "Share a PRD, spec, or status update as a clean link and see whether stakeholders actually read it — scroll depth, time on page, and where they clicked.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/product-managers" },
          { name: "Product managers", path: "/for/product-managers" },
        ]}
      />
      <PageHeader
        title="ilolink for product managers"
        lead={
          <>
            Share a PRD, spec, or update as a clean link, then see whether
            stakeholders read it: scroll depth, time on page, and where
            they clicked. No cookies, no accounts, no sign-in wall between them
            and the doc.
          </>
        }
      />
      <Prose>
        <h2>The problem: you don&apos;t know if anyone read the spec</h2>
        <p>
          You send the PRD as an email attachment or a doc link, and then you
          guess. Did engineering read past the goals? Did the exec stop at the
          summary? A file attachment gives you nothing. A shared doc tells you
          who has edit access, not who read to the end. So you re-explain the
          same spec in standup, in Slack, in the review — because you have no
          signal that it landed the first time.
        </p>

        <h2>Share it as a page</h2>
        <p>
          Paste the Markdown or HTML — from ChatGPT, Claude, or your own editor —
          or drop a file, into the composer at <a href="/">ilolink.com</a>. You
          get <code>ilolink.com/&lt;slug&gt;</code>, a normal web page that opens
          in any browser. No login for you, no login for the reader. Pick how
          visible it is:
        </p>
        <ul>
          <li>
            <strong>Public</strong> or <strong>unlisted</strong> for a wider
            audience.
          </li>
          <li>
            <strong>Password</strong> for an internal spec you don&apos;t want
            circulating.
          </li>
          <li>
            <strong>Expiring</strong> if you want it to lapse — expiry is
            opt-in, never forced on you.
          </li>
        </ul>
        <p>
          The link redirects to an isolated render origin under a strict content
          security policy, and pasted HTML is sanitized on the way in, so a
          shared spec is safe to hand around. The cap is 2 MB per doc.
        </p>

        <h2>See if it landed</h2>
        <p>
          Once the link is out, ilolink shows you how the page was actually read —
          cookieless, from a rotating visitor hash, with no fingerprint and no
          personal profile:
        </p>
        <ul>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see how far people got — whether the exec stopped at the
            summary or the team read through to the rollout plan.
          </li>
          <li>
            <strong>Average time on page</strong> — a quick skim reads
            differently from a real review.
          </li>
          <li>
            <strong>Click heatmap</strong>, by device, showing what drew
            attention on the spec.
          </li>
          <li>
            <strong>Anchored comments</strong> — threaded feedback pinned to a
            point, region, or text on the doc, so notes land in place instead of
            in a separate thread.
          </li>
        </ul>
        <p>
          There&apos;s more on the read side — total and approximate unique
          views, referrers, countries, device class, 30-day daily views, plus
          scroll heatmaps and reader reactions. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>{" "}
          for the full picture, or open{" "}
          <a href="/dashboard">your documents</a> after you publish one.
        </p>

        <h2>Common uses</h2>
        <ul>
          <li>
            <strong>PRDs and specs</strong> — and confirmation the team read to
            the requirements, not just the intro.
          </li>
          <li>
            <strong>Launch notes</strong> — see which sections stakeholders
            opened.
          </li>
          <li>
            <strong>Status updates</strong> — one link a week; watch the
            read-through instead of chasing replies.
          </li>
          <li>
            <strong>Research summaries</strong> — share findings and see which
            parts got attention.
          </li>
        </ul>
      </Prose>

      <Callout title="What this is not">
        It won&apos;t tell you <strong>who</strong> read the spec. Analytics are
        cookieless and aggregate — unique views are approximate by design, and
        there&apos;s no per-person identity or profile. You learn how the doc was
        read, not which named reader read it. Docs are also immutable: revise the
        spec and you publish a new link.
      </Callout>

      <Faq
        items={[
          {
            q: "Can I see WHO read it?",
            a: "No. Analytics are cookieless and aggregate. Unique views are approximate, built from a rotating visitor hash with no fingerprint and no personal profile — so you see how far and how long people read, not which named person did it.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing is free — paste Markdown or HTML, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "Can I password-protect an internal spec?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Use a password for internal PRDs you don't want circulating, and keep expiry off unless you want the link to lapse.",
          },
          {
            q: "Do stakeholders need an account to read it?",
            a: "No. The link opens as a normal web page in any browser — no sign-in wall between a reader and the doc, and no account for you either.",
          },
        ]}
      />

      <Cta sub="Share your next spec and watch the read-through." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop: paste Markdown or HTML, pick visibility, get a link, and see how it was read.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "The full read-side picture: cookieless views, the scroll funnel, heatmaps, reactions, and anchored comments.",
          },
          {
            path: "/guides/markdown-to-web-page",
            title: "Turn Markdown into a web page",
            blurb:
              "Paste a Markdown spec and get a clean, shareable page — the fastest path for a PRD.",
          },
        ]}
      />
    </Article>
  );
}
