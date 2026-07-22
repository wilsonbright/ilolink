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
  title: "ilolink for sales teams — ilolink",
  description:
    "Send a proposal or one-pager as a clean link, then time your follow-up by how it was read — opened, scroll depth, time on page. Cookieless and aggregate.",
  alternates: { canonical: "/for/sales" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/sales",
            headline: "ilolink for sales teams",
            description:
              "Send a proposal as a clean link, then time your follow-up by how it was read — cookieless and aggregate, not per-person surveillance.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/sales" },
          { name: "Sales teams", path: "/for/sales" },
        ]}
      />
      <PageHeader
        eyebrow="For sales teams"
        title="Send proposals as a tracked link, and time your follow-up"
        lead={
          <>
            Send a proposal or one-pager to a prospect as a clean link, then time
            your follow-up by how they engaged — did they open it, how far did
            they read. Cookieless and aggregate, not per-person surveillance.
          </>
        }
      />

      <Prose>
        <h2>Send proposals as a link, not an attachment</h2>
        <p>
          Paste the Markdown or HTML, or drop the file, into the composer. You
          get <code>ilolink.com/&lt;slug&gt;</code> — a real web page the prospect
          opens in the browser, on any device, with nothing to download. No
          attachment that trips a spam filter, no PDF that renders differently on
          their laptop, no &quot;can you re-send it in another format.&quot; A
          proposal, a pricing one-pager, or a deck exported as one
          self-contained HTML file all become the same thing: a link that
          renders anywhere.
        </p>
        <p>
          It&apos;s accountless — no login for you, none for the prospect. The
          link opens on the first click. Ownership lives as a manage token in the
          browser you published from, so you keep control of the doc without
          either side creating an account. The cap is 2&nbsp;MB per doc.
        </p>

        <h2>Read the engagement signal</h2>
        <p>
          The question after you send a proposal is always the same: did they
          open it, and did they actually read it? ilolink answers with live,
          cookieless analytics — total views, approximate unique views, average
          time on page, and a scroll funnel at 0/25/50/75/100%. If views stall at
          25% on a five-page proposal, the intro landed but the pricing
          didn&apos;t — so you follow up on the intro, not the number. Click and
          scroll <strong>heatmaps</strong> by device show which section held
          attention.
        </p>
        <p>
          This is directional, approximate signal — not individual identity. It
          tells you the deal is warm and where the interest sits, so you can time
          the next touch instead of guessing. Prospects can also leave{" "}
          <strong>reactions and anchored comments</strong> right on the doc, no
          account required, so a question sits exactly where it came up.
        </p>

        <h2>Protect and time-box it</h2>
        <p>
          A quote isn&apos;t public. Set the doc to <strong>password</strong> so
          only the people you send the password to can open it, or{" "}
          <strong>unlisted</strong> so it&apos;s reachable only by the exact link.
          If an offer has a shelf life, set <strong>expiring</strong> visibility
          and the link stops working after the date you pick — useful for a quote
          that&apos;s good through end of quarter. Expiry is opt-in: a link never
          expires unless you choose that.
        </p>

        <h2>Keep it honest</h2>
        <p>
          Be straight about what this is. The analytics are aggregate and
          approximate — a rotating visitor hash with no cookies, no fingerprint,
          and no profile. You <strong>cannot</strong> tell that a specific named
          person opened the link, and you shouldn&apos;t claim you can. Uniques
          are an estimate, not a headcount. It&apos;s engagement signal for
          timing your follow-up, not surveillance of an individual — and saying so
          plainly is why prospects are fine opening the link.
        </p>
      </Prose>

      <Callout title="Where this isn't the right tool">
        <p>
          If you need to know exactly which prospect opened a link, ilolink
          won&apos;t do that — it&apos;s aggregate and cookieless by design. For
          per-person send tracking tied to a named recipient, a sales-engagement
          tool fits better. ilolink is built around a clean, tracked, accountless
          link, not a per-contact CRM record.
        </p>
      </Callout>

      <Faq
        items={[
          {
            q: "Can I tell which prospect opened it?",
            a: "No. Analytics are aggregate and approximate — total views, approximate unique views, time on page, and a scroll funnel — with no cookies, fingerprint, or profile. It's engagement signal for timing your follow-up, not per-person identity, so you can't tell that a specific named person opened the link.",
          },
          {
            q: "Can I password-protect a quote?",
            a: "Yes. Set the doc's visibility to password, and only people who have the password can open it. You can also use unlisted (reachable only by the exact link) for a quote you don't want indexed or forwarded openly.",
          },
          {
            q: "Does the link expire?",
            a: "Only if you choose expiring visibility and set a date — handy for a quote that's good through a deadline. Expiry is opt-in; by default a link stays live until you decide otherwise.",
          },
          {
            q: "How do I send a revised proposal?",
            a: "Publish the revision as a new link and send that. Docs are immutable, so there's no edit-in-place — but each version keeps its own permanent URL and its own analytics, so v2's read-through doesn't get muddied by v1's.",
          },
        ]}
      />

      <Cta sub="Send your next proposal as a tracked link." />

      <RelatedLinks
        links={[
          {
            path: "/for/consultants",
            title: "ilolink for consultants",
            blurb:
              "Send client deliverables as a password-protected link, then see how they were read.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "What you can measure after you send: scroll funnel, time on page, heatmaps, comments.",
          },
        ]}
      />
    </Article>
  );
}
