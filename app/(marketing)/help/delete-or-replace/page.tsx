import type { Metadata } from "next";
import { JsonLd, article, howTo } from "@/lib/seo/jsonld";
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
  title: "Delete or replace a published doc — ilolink help",
  description:
    "ilolink docs are immutable. To change the content, publish a new doc and share the new link. To take one down, delete it from your dashboard.",
  alternates: { canonical: "/help/delete-or-replace" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/help/delete-or-replace",
            headline: "How to delete or replace a published doc",
            description:
              "ilolink docs are immutable. To change the content, publish a new doc for a new link. To take one down, delete it from the dashboard in your ilolink account.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Delete a published ilolink doc",
            description:
              "Remove a published document so its link 404s, from the dashboard in the free account you published with.",
            steps: [
              {
                name: "Sign in to your account",
                text: "Sign in with the free account you published from. Documents belong to your teamspace, so any device works.",
              },
              {
                name: "Open your dashboard",
                text: "Go to your dashboard. It lists every doc in your teamspace, each with its own controls.",
              },
              {
                name: "Delete the doc",
                text: "Find the doc and delete it. The link stops resolving and starts returning a 404.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "Delete or replace", path: "/help/delete-or-replace" },
        ]}
      />
      <PageHeader
        title="How to delete or replace a published doc"
        lead={
          <>
            ilolink docs are immutable: to change the content you publish a new
            doc, which gives you a new link to share. To take one down, you
            delete it from your dashboard — signed in with the free account you
            published from, on any device.
          </>
        }
      />
      <Prose>
        <h2>Why there&apos;s no edit button</h2>
        <p>
          Every doc is one version — fixed at publish time. There&apos;s no edit
          in place, on purpose. A link that never changes content is a link you
          can trust: what someone opened yesterday is what they see today, and
          the <a href="/guides/best-way-to-share-ai-html">sanitize pass</a> that
          makes untrusted AI HTML safe runs once, on ingest, against a body that
          can&apos;t shift under it afterward. Immutable is what keeps every{" "}
          <code>ilolink.com/&lt;slug&gt;</code> stable and safe.
        </p>

        <h2>To replace the content</h2>
        <p>
          You don&apos;t edit — you republish. The flow is short:
        </p>
        <ol>
          <li>
            <strong>Publish a new doc</strong> with the updated content — paste
            the new Markdown or HTML, or drop the new file.
          </li>
          <li>
            <strong>You get a new link.</strong> It&apos;s a different slug from
            the old one; the two docs are unrelated as far as the system is
            concerned.
          </li>
          <li>
            <strong>Share the new link</strong> wherever you shared the old one.
          </li>
          <li>
            <strong>Optionally delete the old doc</strong> so its link 404s and
            nobody lands on the stale version.
          </li>
        </ol>
        <p>
          The new doc starts its own{" "}
          <a href="/guides/analytics-heatmaps-feedback">analytics, heatmaps,
          and feedback</a>{" "}
          from zero — the old doc&apos;s numbers don&apos;t carry over, because
          it&apos;s a separate page.
        </p>

        <h2>To delete a doc</h2>
        <p>
          Open your <a href="/dashboard">dashboard</a>, signed in with the free
          account you published from. Docs belong to your teamspace, not to one
          browser, so signing in is what proves the doc is yours. Find the doc,
          delete it, and the link starts returning a 404. Deletion
          is how you take a page down for good; there&apos;s no unpublish that
          keeps the slug alive.
        </p>

        <h2>If you published from another device</h2>
        <p>
          It doesn&apos;t matter which one. Your docs live in your teamspace, so
          they show up in the dashboard on any device you sign in on — laptop,
          phone, a browser you&apos;ve never used before. Clearing site data or
          losing the machine you published from doesn&apos;t cost you the doc;
          sign in again and it&apos;s there. Only the account that owns the
          teamspace — or a teammate in it — can delete or replace anything.
        </p>
      </Prose>

      <Callout title="Publish from an account you'll keep">
        Because docs belong to the account that published them, sign in with one
        you&apos;ll keep using — not a throwaway address — if you expect to
        delete or replace the doc later. The browser doesn&apos;t matter; the
        account does.
      </Callout>

      <Faq
        items={[
          {
            q: "Can I edit a doc in place?",
            a: "No. Docs are immutable — one version, fixed at publish. To change the content you republish: publish a new doc, get a new link, and share that instead.",
          },
          {
            q: "Where's my delete button?",
            a: "In your dashboard, once you're signed in with the account you published from. Every doc in your teamspace is listed there, so that's where you delete it.",
          },
          {
            q: "I lost the device — can I still delete the doc?",
            a: "Yes. Docs belong to your teamspace, not to one browser, so sign in on any other device and the doc is in your dashboard waiting to be deleted.",
          },
          {
            q: "Does deleting free up the old link?",
            a: "Deleting makes the old link 404 — it stops resolving. It doesn't move the content anywhere; the new version lives at its own new slug from the moment you republish.",
          },
        ]}
      />

      <Cta sub="Republish to change it; delete to take it down." />

      <RelatedLinks
        links={[
          {
            path: "/help/link-shows-404",
            title: "My link shows a 404",
            blurb:
              "A deleted or expired doc returns a 404 — plus the other reasons a slug stops resolving and how to tell them apart.",
          },
          {
            path: "/guides/requirements",
            title: "What you need to share an AI output",
            blurb:
              "The honest checklist: a file or pasted text under 15 MB, and a free account to publish it from.",
          },
        ]}
      />
    </Article>
  );
}
