import type { Metadata } from "next";
import { JsonLd, article, softwareApplication } from "@/lib/seo/jsonld";
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
  title: "ilolink for consultants — ilolink",
  description:
    "Send client deliverables as a password-protected link, then see how they were read: scroll depth, time on page, and questions left as comments.",
  alternates: { canonical: "/for/consultants" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/consultants",
            headline: "ilolink for consultants",
            description:
              "Send client deliverables as a password-protected link — then see how they were read.",
            datePublished: "2026-07-22",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/consultants" },
          { name: "Consultants", path: "/for/consultants" },
        ]}
      />
      <PageHeader
        eyebrow="For consultants"
        title="Send client deliverables as a link, and see how they were read"
        lead={
          <>
            Send a proposal, report, or deck as a link with a password, not an
            attachment that bounces or renders oddly. Then see how the
            client engaged: scroll depth, time on page, and the questions they
            left as comments in the doc.
          </>
        }
      />

      <Prose>
        <h2>Send a deliverable as a clean link</h2>
        <p>
          Paste the Markdown or HTML, or drop the file, into the composer. You
          get <code>ilolink.com/&lt;slug&gt;</code> — a real web page the client
          opens in a browser. No 40&nbsp;MB email attachment that bounces, no PDF
          that renders differently on their machine, no &quot;can you re-send in
          another format.&quot; A proposal, a findings report, or a deck exported
          as one self-contained HTML file all become the same thing: a link.
        </p>
        <p>
          It&apos;s accountless — no login for you, none for the client. The link
          opens immediately. Ownership lives as a manage token in your browser,
          so you keep control of the doc without either of you creating an
          account. The cap is 2&nbsp;MB per doc.
        </p>

        <h2>Protect it</h2>
        <p>
          Client work isn&apos;t public. Set the deliverable to{" "}
          <strong>password</strong> so only the people you send the password to
          can open it, or <strong>unlisted</strong> so it&apos;s reachable only
          by the exact link. If an engagement or an offer has a shelf life, set{" "}
          <strong>expiring</strong> visibility and the link stops working after
          the date you pick. Expiry is opt-in — a link never expires unless you
          choose that.
        </p>

        <h2>See how the client engaged</h2>
        <p>
          The question after you send a proposal is always the same: did they
          actually read it? ilolink answers it with live, cookieless analytics —
          total views, approximate unique views, average time on page, and a
          scroll funnel at 0/25/50/75/100%. If views stall at 25% on a
          twelve-page report, the summary landed but the detail didn&apos;t. You
          also get click and scroll <strong>heatmaps</strong> by device, so you
          can see which section held attention.
        </p>
        <p>
          Better than a read receipt: the client can leave{" "}
          <strong>comments anchored to a point, region, or line</strong> of the
          doc, plus quick reactions — no account required. A question sits
          exactly where it came up, so your follow-up call has an agenda before
          it starts.
        </p>

        <h2>Keep every version as its own link</h2>
        <p>
          Be clear on one limit: published docs are immutable. There&apos;s no
          rollback or edit-in-place yet. When a deliverable changes, you publish
          the revision as a <strong>new link</strong> and send that. The upside
          is that v1 and v2 are distinct, permanent URLs with their own
          analytics — you can see the client re-read v2 without v1&apos;s numbers
          muddying it. Name your links so you can tell revisions apart.
        </p>
      </Prose>

      <Callout title="Where this isn't the right tool">
        <p>
          If you need a custom domain on the deliverable, a doc over 2&nbsp;MB, or
          to edit a page in place after sending, a general static host fits
          better — ilolink is built around a sanitized, tracked, accountless
          link, not a full CMS.
        </p>
      </Callout>

      <Faq
        items={[
          {
            q: "Can I password-protect a client doc?",
            a: "Yes. Set the doc's visibility to password, and only people who have the password can open it. You can also use unlisted (reachable only by the exact link) or expiring visibility for time-limited work.",
          },
          {
            q: "Can I see if the client read it?",
            a: "You get aggregate, approximate read-through — total views, approximate unique views, average time on page, and a scroll funnel at 0/25/50/75/100% — not per-person identity. Analytics are cookieless and there's no profile or fingerprint, so it's engagement signal, not a named read receipt.",
          },
          {
            q: "Does the link expire?",
            a: "Only if you choose expiring visibility and set a date. Expiry is opt-in — by default a link stays live until you decide otherwise.",
          },
          {
            q: "How do I send a revised version?",
            a: "Publish the revision as a new link and send that. Docs are immutable, so there's no rollback yet — but each version keeps its own permanent URL and its own analytics.",
          },
        ]}
      />

      <Cta sub="Send your next deliverable as a tracked link." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full walkthrough: paste or drop AI output, pick a visibility mode, get a link.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "What you can measure after you send: scroll funnel, time on page, heatmaps, comments.",
          },
          {
            path: "/guides/do-links-expire",
            title: "Do ilolink links expire?",
            blurb:
              "How expiring visibility works, and why expiry is opt-in.",
          },
          {
            path: "/guides/markdown-to-web-page",
            title: "Turn Markdown into a web page",
            blurb:
              "Paste a Markdown report and publish it as a clean, shareable page.",
          },
        ]}
      />
    </Article>
  );
}
