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
  title: "ilolink for founders — ilolink",
  description:
    "Share investor updates, pitches, and memos as a clean link, then see whether they were opened and how far they were read. Cookieless, no per-person identity.",
  alternates: { canonical: "/for/founders" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/founders",
            headline: "ilolink for founders",
            description:
              "Share investor updates, pitches, and memos as a clean link — then see whether they were opened and how far they were read.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/founders" },
          { name: "Founders", path: "/for/founders" },
        ]}
      />
      <PageHeader
        eyebrow="For founders"
        title="Share updates as a link, and see if they were read"
        lead={
          <>
            Share investor updates, pitches, and memos as a clean link, then see
            whether they were opened and how far they were read — scroll depth
            and time on page, cookieless, no per-person identity.
          </>
        }
      />

      <Prose>
        <h2>Send updates that you can measure</h2>
        <p>
          An email attachment and a shared doc link both tell you nothing after
          you hit send. You don&apos;t know if the monthly update was opened,
          skimmed, or ignored. Paste the Markdown or HTML, or drop the file, and
          you get <code>ilolink.com/&lt;slug&gt;</code> — a real web page an
          investor opens in a browser. It&apos;s accountless, opens immediately,
          and the cap is 2&nbsp;MB per doc. The difference from an attachment is
          that the link comes with signal.
        </p>
        <p>
          Ownership lives as a manage token in the browser you published from,
          so you keep control of the doc — change its visibility, delete it from
          the dashboard — without you or your investors creating an account.
        </p>

        <h2>See if it landed</h2>
        <p>
          After you send, ilolink shows live, cookieless analytics: total views,
          approximate unique views, average time on page, and a scroll funnel at
          0/25/50/75/100%. If a two-page update stalls at 25%, the headline
          landed but the asks below didn&apos;t. A click{" "}
          <strong>heatmap</strong> shows which numbers and sections held
          attention. It&apos;s aggregate and approximate — read-through across
          everyone who opened it, not a record of who individually read what.
        </p>

        <h2>Keep it private</h2>
        <p>
          A raise or a board memo isn&apos;t public. Set the doc to{" "}
          <strong>unlisted</strong> so it&apos;s reachable only by the exact
          link, or <strong>password</strong> so only people you send the
          password to can open it. If an update or an offer has a shelf life,
          set <strong>expiring</strong> visibility and the link stops working
          after the date you pick. Expiry is opt-in — a link never expires
          unless you choose that.
        </p>

        <h2>Common uses</h2>
        <p>
          Founders reach for this for monthly and quarterly{" "}
          <strong>investor updates</strong>, a <strong>pitch one-pager</strong>{" "}
          you send before a first call, a <strong>hiring brief</strong> for a
          key candidate, and <strong>launch memos</strong> to your list. Each is
          its own permanent link with its own analytics, so you can tell which
          update actually got read and which one needs a nudge.
        </p>
      </Prose>

      <Callout title="One thing to know">
        <p>
          Published docs are immutable — there&apos;s no edit-in-place or
          rollback yet. When an update changes, you publish the revision as a
          new link and send that. The upside: each version keeps its own URL and
          its own read-through, so v2&apos;s numbers stay clean.
        </p>
      </Callout>

      <Faq
        items={[
          {
            q: "Can I see which investor read it?",
            a: "No. Analytics are aggregate and approximate — total views, approximate unique views, average time on page, and a scroll funnel at 0/25/50/75/100% — not per-person identity. It's cookieless, with no profile or fingerprint, so you get read-through signal, not a named read receipt.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing a doc and seeing its analytics is free, and it's accountless — no login for you and none for the people you send the link to.",
          },
          {
            q: "Can I password-protect a sensitive update?",
            a: "Yes. Set the doc's visibility to password, and only people who have the password can open it. You can also use unlisted (reachable only by the exact link) or expiring visibility for time-limited updates.",
          },
          {
            q: "How do I send a revised update?",
            a: "Publish the revision as a new link and send that. Docs are immutable, so there's no rollback yet — but each version keeps its own permanent URL and its own analytics.",
          },
        ]}
      />

      <Cta sub="Share your next update and watch the read-through." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full walkthrough: paste or drop your content, pick a visibility mode, get a link.",
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
