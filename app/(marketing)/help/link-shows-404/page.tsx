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
  title: "My link shows 404 or expired — ilolink help",
  description:
    "A share link 404s for three reasons: it was an expiring link past its date, the doc was deleted or unpublished, or the URL has a typo. Here's how to tell which.",
  alternates: { canonical: "/help/link-shows-404" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/help/link-shows-404",
            headline: "My link shows 404 or expired",
            description:
              "A share link stops working for three reasons: it was an expiring link past its date, the doc was deleted or unpublished, or the URL has a typo. Unlisted links still open for anyone with the exact address.",
            datePublished: "2026-07-22",
          }),
        ]}
      />

      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "Link shows 404", path: "/help/link-shows-404" },
        ]}
      />

      <PageHeader
        title="My link shows 404 or expired"
        lead={
          <>
            A share link stops working for three reasons: it was an expiring
            link past the date you set, the doc was unpublished or deleted, or
            the URL has a typo in the slug. Unlisted links aren&apos;t affected
            &mdash; they still open for anyone with the exact address.
          </>
        }
      />

      <Prose>
        <h2>It expired</h2>
        <p>
          If you chose the <strong>expiring</strong> visibility when publishing,
          the link stops working after the date you set &mdash; that&apos;s the
          point of it. Expiry is opt-in, so this only applies if you picked it.
          There&apos;s no way to extend an expired doc in place: publish a{" "}
          <strong>new</strong> doc to share the content again. See{" "}
          <a href="/guides/do-links-expire">do links expire</a> for the details.
        </p>

        <h2>It was deleted or unpublished</h2>
        <p>
          If you removed the doc from your dashboard, its link 404s from that
          point on. Because the manage token lives in the browser you published
          from, deletes happen from that same browser or device &mdash; check
          whether you (or someone with access to that dashboard) took it down.
          A deleted doc is gone; there&apos;s no undelete.
        </p>

        <h2>The URL is wrong</h2>
        <p>
          Check the slug for a typo. A single wrong or dropped character in{" "}
          <code>ilolink.com/&lt;slug&gt;</code> lands on a page that was never
          published, which 404s. Copy the link straight from your dashboard
          rather than retyping it.
        </p>
        <p>
          <strong>Unlisted is not deleted.</strong> An unlisted doc is hidden
          from listings and search, but it opens normally for anyone who has the
          exact link. If an unlisted link 404s, the cause is one of the two
          above &mdash; expiry or deletion &mdash; not the unlisted setting.
        </p>

        <h2>How to bring it back</h2>
        <p>
          Docs are immutable &mdash; one version, no rollback or history &mdash;
          so there&apos;s no way to restore a deleted or expired doc at its old
          address. To share the content again, <strong>publish a new doc</strong>
          . Paste the same Markdown or HTML, or drop the file in, and you get a
          fresh <code>ilolink.com/&lt;slug&gt;</code> link. It&apos;s a new URL,
          so update wherever you shared the old one.
        </p>
      </Prose>

      <Callout title="Quick check">
        Expiring link past its date, doc deleted from the dashboard, or a typo
        in the slug. Unlisted links still open with the exact address &mdash;
        unlisted never causes a 404 on its own.
      </Callout>

      <Faq
        items={[
          {
            q: "Do links expire by default?",
            a: "No. Expiry is opt-in. A link only stops on a date if you chose the expiring visibility when you published; otherwise it stays live.",
          },
          {
            q: "Can I undelete a doc or extend an expired one?",
            a: "No. Docs are immutable with no rollback or undelete. To share the content again, publish a new doc — you'll get a new link.",
          },
          {
            q: "Does unlisted mean the page is hidden or 404s?",
            a: "No. Unlisted keeps a doc out of listings and search, but it opens normally for anyone with the exact link. Unlisted never causes a 404 by itself.",
          },
          {
            q: "The link worked yesterday — what changed?",
            a: "Either it hit its expiry date, or the doc was deleted or unpublished from the dashboard in the browser it was published from. Republish to share it again.",
          },
        ]}
      />

      <Cta sub="Publish a fresh doc, get a new link, and see aggregate opens and scroll depth." />

      <RelatedLinks
        links={[
          {
            path: "/guides/do-links-expire",
            title: "Do links expire?",
            blurb:
              "Expiry is opt-in. How the expiring visibility works and when a link stops opening.",
          },
          {
            path: "/help/delete-or-replace",
            title: "Delete or replace a doc",
            blurb:
              "Docs are immutable, so replacing means publishing a new one. How to delete from the browser you published from.",
          },
        ]}
      />
    </Article>
  );
}
