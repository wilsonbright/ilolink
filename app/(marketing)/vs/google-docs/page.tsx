import type { Metadata } from "next";
import { JsonLd, article, softwareApplication } from "@/lib/seo/jsonld";
import { FREE_LINE, TEAM_LINE } from "@/lib/billing/copy";
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

// Google's behaviour here is taken from its own "Publish a file from Google
// Drive" help page (support.google.com/docs/answer/183965, read 2026-08-12):
// publishing produces a shareable URL, a document publishes as "a version with
// no toolbar", spreadsheet viewers "can't view or edit formulas", and "any
// changes you make to the original document will be updated in the published
// version". That page documents no view counts or visitor analytics.
export const metadata: Metadata = {
  title: "ilolink vs Google Docs publish to web",
  description:
    "Publish to the web gives a Google Doc a public URL that keeps mirroring your edits — and no view counts. ilolink adds read-through, heatmaps and feedback.",
  alternates: { canonical: "/vs/google-docs" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/vs/google-docs",
            headline: "ilolink vs Google Docs publish to web",
            description:
              "Google Docs can publish a document to a public URL that mirrors later edits but reports nothing about readers; ilolink publishes a stable version and measures how it was read.",
            datePublished: "2026-08-12",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/vs/google-docs" },
          {
            name: "ilolink vs Google Docs publish to web",
            path: "/vs/google-docs",
          },
        ]}
      />
      <PageHeader
        title="ilolink vs Google Docs publish to web"
        lead={
          <>
            <em>File → Share → Publish to the web</em> turns a Google Doc into a
            public page in two clicks, and it is free. What it never tells you is
            whether the page was opened, by how many people, or how far down they
            got. ilolink publishes the same document as a measured link — and
            leaves the writing to Google.
          </>
        }
      />
      <Prose>
        <h2>What publishing to the web actually does</h2>
        <p>
          Google&apos;s help page describes the result plainly: publishing creates
          a shareable URL, and a document is published as{" "}
          <em>&ldquo;a version with no toolbar&rdquo;</em>. For a spreadsheet,
          viewers can see values and formatting but{" "}
          <em>&ldquo;can&apos;t view or edit formulas&rdquo;</em>. Presentations
          publish view-only or full-screen.
        </p>
        <p>
          The behaviour people most often miss is the sync:{" "}
          <em>
            &ldquo;Any changes you make to the original document will be updated in
            the published version&rdquo;
          </em>
          . A published Doc is a live window onto the file you are still editing.
          That is excellent for a page that must stay current and awkward for a
          proposal you sent last Tuesday — a half-finished edit is public the
          moment you make it.
        </p>
        <p>
          An ilolink document is a published <em>version</em>. What you sent stays
          what they see until you deliberately update it, which is what you want
          when someone might quote the document back to you.
        </p>

        <h2>The missing half: nobody tells you it was read</h2>
        <p>
          Google&apos;s publish documentation says nothing about view counts or
          visitor analytics, because there are none. You can see comments and
          suggestions from named collaborators inside the document — but for a
          published URL sent to a client, the file is silent. You end up asking
          &ldquo;did you get a chance to look at it?&rdquo;, which is the question
          the tooling should have answered.
        </p>
        <p>ilolink answers it, without identifying anyone:</p>
        <ul>
          <li>
            <strong>Views and approximate uniques</strong>, average time on page,
            and a 0/25/50/75/100% scroll funnel — so &ldquo;opened&rdquo; is
            distinguishable from &ldquo;read to the end&rdquo;.
          </li>
          <li>
            <strong>Click and scroll heatmaps</strong>, split by device.
          </li>
          <li>
            <strong>Referrers, countries and device class</strong> — how far the
            link travelled after you sent it.
          </li>
          <li>
            <strong>Reader feedback with no account</strong> — reactions, private
            notes and threaded comments anchored to a point, region or line. No
            Google account, no sign-in wall, nothing to join.
          </li>
          <li>
            <strong>Access tiers</strong> — public, unlisted, password, or
            expiring, chosen per document.
          </li>
        </ul>

        <h2>Where Google Docs wins outright</h2>
        <ul>
          <li>
            <strong>Writing and real-time collaboration.</strong> ilolink has no
            editor at all. Write in Docs; publish through ilolink when it matters
            whether the document landed.
          </li>
          <li>
            <strong>Named comments and suggestions</strong> among colleagues who
            all have accounts — a review workflow ilolink is not trying to
            replace.
          </li>
          <li>
            <strong>Always-current pages</strong>, where the live mirror is the
            feature rather than the hazard.
          </li>
          <li>
            <strong>Free, ubiquitous, already in your organisation.</strong> Not a
            small thing.
          </li>
        </ul>

        <ComparisonTable
          columns={["", "Google Docs publish to web", "ilolink"]}
          highlightCol={2}
          rows={[
            ["Getting a public link", "File → Share → Publish to the web", "Paste the text or drop the file"],
            ["Reader needs an account", "No", "No"],
            ["View count", "None", "Views and approximate uniques"],
            ["Read-through", "None", "0/25/50/75/100% scroll funnel, time on page"],
            ["Heatmaps", "None", "Click + scroll, by device"],
            [
              "Feedback from a reader with no account",
              "No — comments need a Google account",
              "Reactions, notes, anchored threaded comments",
            ],
            [
              "After you edit the original",
              "Published page updates automatically",
              "Stays the published version until you update it",
            ],
            [
              "Formats",
              "Docs, Sheets, Slides (formulas hidden)",
              "Markdown, HTML, PDF, .docx, CSV rendered as a page",
            ],
            ["Access control", "Published or not", "Public, unlisted, password, or expiring"],
            ["Editing", "Full collaborative editor", "None — publish what you wrote elsewhere"],
          ]}
          caption="Google rows quoted from its publish-to-the-web help page, read 2026-08-12. Verify current behaviour before relying on any detail."
        />

        <Callout title="A fair note">
          <p>
            This is not a case of one tool replacing the other. Google Docs is
            where the document gets written and argued over; the gap is what
            happens after you paste the link into an email. If you never need to
            know whether it was read, publish to the web and keep your workflow —
            it is free and it works.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Can I see how many people viewed a published Google Doc?",
            a: "Google's publish-to-the-web documentation describes no view counts or visitor analytics for a published file. Inside the document you can see named collaborators' comments, but a public URL reports nothing about who opened it.",
          },
          {
            q: "Does a published Google Doc change when I edit the original?",
            a: "Yes. Google's help page states that any changes you make to the original are updated in the published version, and the update may take a few minutes. An ilolink document is a published version instead — it changes only when you update it deliberately.",
          },
          {
            q: "Can readers comment on an ilolink document without signing in?",
            a: "Yes. Reactions, private notes and threaded comments anchored to a point, region or line, with no account and no sign-in wall. That is the main reason an external client actually leaves feedback rather than replying by email.",
          },
          {
            q: "Should I stop using Google Docs?",
            a: "No. It has an editor and ilolink does not. Write and collaborate in Docs, then publish the finished document through ilolink when you want a stable link and want to know how it was read.",
          },
          {
            q: "Is ilolink free?",
            a: `${FREE_LINE} You need a free account to publish; readers never need one. ${TEAM_LINE}`,
          },
        ]}
      />

      <Cta sub="Publish the finished draft and see how far people read." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-docx",
            title: "How to share a Word (.docx) document as a page",
            blurb:
              "Turn a .docx into a clean web page with full read analytics — scroll depth, heatmaps and comments.",
          },
          {
            path: "/vs/notion",
            title: "ilolink vs Notion public pages",
            blurb:
              "The same live-mirror publishing model, and the same blind spot about anonymous readers.",
          },
        ]}
      />
    </Article>
  );
}
