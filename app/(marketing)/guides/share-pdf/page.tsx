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
  title: "How to share a PDF as a link — ilolink",
  description:
    "Upload a PDF (up to 15 MB) to ilolink and get a link that opens it in the browser's PDF viewer at ilolink.com/<slug>. See that it was opened — views, not page depth.",
  alternates: { canonical: "/guides/share-pdf" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-pdf",
            headline: "How to share a PDF as a link",
            description:
              "Upload a PDF to ilolink, get a link that opens it in the browser's native PDF viewer at ilolink.com/<slug>, and see that it was opened.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share a PDF as a link",
            description:
              "Upload a PDF to ilolink, pick who can see it, and get a link that opens the file inline in the reader's browser.",
            steps: [
              {
                name: "Drop your PDF into ilolink",
                text: "Drop a PDF into the composer at ilolink.com. No account, no login. The cap is 15 MB per PDF.",
              },
              {
                name: "Pick a visibility mode",
                text: "Choose public, unlisted, password-protected, or expiring. Expiry is opt-in.",
              },
              {
                name: "Send the link",
                text: "You get ilolink.com/<slug>. It opens the PDF inline in the reader's own browser PDF viewer, nothing to download.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Share a PDF", path: "/guides/share-pdf" },
        ]}
      />
      <PageHeader
        title="How to share a PDF as a link"
        lead={
          <>
            Upload a PDF (up to 15 MB) and get a link that opens it in the
            reader&apos;s own browser PDF viewer at ilolink.com/&lt;slug&gt; — no
            account, no download. Honest up front: a PDF shows you that it was
            opened, not page-by-page read tracking.
          </>
        }
      />
      <Prose>
        <h2>How to share a PDF</h2>
        <p>Three steps:</p>
        <ol>
          <li>
            Drop your PDF into the composer at <a href="/">ilolink.com</a>. No
            account needed. The cap is <strong>15 MB</strong> per PDF.
          </li>
          <li>Pick a visibility mode — public, unlisted, password, or expiring.</li>
          <li>
            Get <code>ilolink.com/&lt;slug&gt;</code> and send it.
          </li>
        </ol>
        <p>
          When someone opens the link, ilolink serves the PDF full-bleed in an{" "}
          <code>&lt;iframe&gt;</code> pointed at their browser&apos;s{" "}
          <strong>native PDF viewer</strong> — the same one they&apos;d get
          opening any PDF on the web. It streams the raw bytes same-origin under
          the access gate, so the reader just opens your PDF inline at{" "}
          <code>ilolink.com/&lt;slug&gt;</code>. Nothing to download, no reader
          app to install. If your file is over the limit, see{" "}
          <a href="/help/file-too-large">file too large</a>.
        </p>

        <h2>What analytics do you get on a PDF?</h2>
        <p>
          You get the open-side analytics — all cookieless, from a rotating
          visitor hash, no fingerprint and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Views</strong> — that the PDF was opened, total and
            approximate uniques.
          </li>
          <li>
            <strong>Referrers</strong> — where the opens came from.
          </li>
          <li>
            <strong>Countries and device class</strong> — plus 30-day daily
            views.
          </li>
        </ul>
        <p>
          What you do <strong>not</strong> get on a PDF: the scroll-depth funnel
          and click/scroll heatmaps. Those live in ilolink&apos;s render layer,
          and the browser&apos;s native PDF viewer is a sealed box — ilolink
          can&apos;t see inside it, so there is no page-level read tracking or
          heatmap for a PDF. Page-by-page read depth is on the roadmap, not live.
          Full analytics on a rendered page are covered in{" "}
          <a href="/guides/reading-your-analytics">reading your analytics</a>.
        </p>

        <h2>Want full read analytics?</h2>
        <p>
          Share the document as a real page instead. If you upload a Word{" "}
          <code>.docx</code>, or paste Markdown or HTML, ilolink renders it as a
          normal web page — and a rendered page gets the whole stack: the{" "}
          <strong>scroll-depth funnel</strong> at 0 / 25 / 50 / 75 / 100%, click
          and scroll <strong>heatmaps</strong>, reactions, and threaded anchored{" "}
          <strong>comments</strong>. Two paths:
        </p>
        <ul>
          <li>
            <a href="/guides/share-docx">Share a Word .docx</a> — ilolink
            converts it to clean HTML and renders it as a page.
          </li>
          <li>
            <a href="/guides/markdown-to-web-page">
              Turn Markdown into a web page
            </a>{" "}
            — paste Markdown, get a styled reading page.
          </li>
        </ul>
        <p>
          Reach for a PDF when the exact page layout has to survive intact and
          you only need to know it was opened. Reach for HTML, Markdown, or a{" "}
          <code>.docx</code> when you want to see how far people actually read.
        </p>

        <h2>Keep it private</h2>
        <p>
          Every visibility mode works on a PDF. Set a{" "}
          <strong>password</strong> so only people with it can open the file,
          keep it <strong>unlisted</strong> so it&apos;s reachable only by the
          link, or make it <strong>expiring</strong> so it stops resolving after
          a date you set. Expiry is opt-in, not a default. See{" "}
          <a href="/guides/do-links-expire">do links expire</a> for how that
          works.
        </p>
      </Prose>

      <Callout title="One honest limit">
        A PDF shows you opens, not page depth. If page-by-page read tracking,
        heatmaps, or comments matter, share the document as HTML, Markdown, or a
        Word <code>.docx</code> instead — those render as a real page and get the
        full analytics stack.
      </Callout>

      <Faq
        items={[
          {
            q: "What's the size limit for a PDF?",
            a: "15 MB per PDF. That's the cap for binary uploads — PDFs, Word .docx, and images all share it. If your file is larger, see /help/file-too-large.",
          },
          {
            q: "Can I see which pages they read?",
            a: "Not yet. A PDF shows that it was opened — views, referrers, countries, devices — but not page-by-page read depth, because ilolink can't see inside the browser's native PDF viewer. For read depth, share the doc as HTML, Markdown, or a .docx.",
          },
          {
            q: "Can I password-protect a PDF?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Expiry is opt-in, not a default.",
          },
          {
            q: "Does the reader have to download the PDF?",
            a: "No. It opens inline in their own browser's PDF viewer at ilolink.com/<slug> — nothing to download and no reader app to install.",
          },
        ]}
      />

      <Cta sub="Share a PDF. Drop it in, pick who can see it, and get a link in seconds." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-docx",
            title: "Share a Word .docx as a page",
            blurb:
              "Upload a .docx and ilolink renders it as a real web page — with the full scroll funnel, heatmaps, and comments a PDF can't give you.",
          },
          {
            path: "/guides/reading-your-analytics",
            title: "Reading your analytics",
            blurb:
              "What each metric means: views, approximate uniques, referrers, countries, devices, and the scroll funnel on rendered pages.",
          },
        ]}
      />
    </Article>
  );
}
