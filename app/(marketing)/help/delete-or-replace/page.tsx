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
    "ilolink docs are immutable. To change the content, publish a new doc and share the new link. To take one down, delete it from your dashboard on the publishing browser.",
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
              "ilolink docs are immutable. To change the content, publish a new doc for a new link. To take one down, delete it from the dashboard on the browser you published from.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Delete a published ilolink doc",
            description:
              "Remove a published document so its link 404s, using the per-doc manage token stored in the browser you published from.",
            steps: [
              {
                name: "Open the publishing browser",
                text: "Use the same browser and device you published the doc from. The per-doc manage token is stored there — there is no account to sign into.",
              },
              {
                name: "Open your dashboard",
                text: "Go to your dashboard. It lists the docs you published from this browser, each with its manage token.",
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
            delete it from your dashboard. The manage token lives in the browser
            you published from — no account.
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
          Open your <a href="/dashboard">dashboard</a> on the browser and device
          you published from. The per-doc manage token is stored there — no
          account, no login — so that browser is what proves the doc is yours.
          Find the doc, delete it, and the link starts returning a 404. Deletion
          is how you take a page down for good; there&apos;s no unpublish that
          keeps the slug alive.
        </p>

        <h2>If you published from another device</h2>
        <p>
          Without that browser&apos;s manage token, you can&apos;t manage or
          delete the doc — a different device simply doesn&apos;t hold the token
          that authorizes it. That&apos;s the accountless trade-off: no email, no
          password, nothing to phish, but also nothing to recover from a fresh
          browser. If you still have the original browser, use it. If you
          cleared its storage or lost the device, the token is gone with it.
        </p>
      </Prose>

      <Callout title="Publishing from a browser you'll keep">
        Because the manage token lives in the browser, publish from one you
        control and won&apos;t wipe — not a shared or incognito window — if you
        expect to delete or replace the doc later. Incognito discards the token
        the moment you close it.
      </Callout>

      <Faq
        items={[
          {
            q: "Can I edit a doc in place?",
            a: "No. Docs are immutable — one version, fixed at publish. To change the content you republish: publish a new doc, get a new link, and share that instead.",
          },
          {
            q: "Where's my delete button?",
            a: "In your dashboard, opened on the same browser and device you published from. The per-doc manage token is stored in that browser, so that's where the doc shows up and where you can delete it.",
          },
          {
            q: "I lost the device — can I still delete the doc?",
            a: "Not without the manage token. It lives only in the browser you published from, and there's no account to recover it through. If that browser or device is gone, so is the ability to manage that doc.",
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
              "The honest checklist: a file or pasted text under 2 MB, no account — and the browser that holds your manage token.",
          },
        ]}
      />
    </Article>
  );
}
