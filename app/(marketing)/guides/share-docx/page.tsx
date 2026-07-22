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
  title: "How to share a Word (.docx) document as a page — ilolink",
  description:
    "Drop a .docx into ilolink and it becomes a clean web page (up to 15 MB) with full read analytics — scroll depth, heatmaps, and comments.",
  alternates: { canonical: "/guides/share-docx" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-docx",
            headline: "How to share a Word (.docx) document as a page",
            description:
              "Upload a .docx to ilolink, it converts to a clean HTML page, and you get full read analytics — scroll depth, heatmaps, and comments.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share a Word (.docx) document as a web page",
            description:
              "Drop a .docx into ilolink, it converts the file to clean HTML, pick who can see it, and get a link with full read analytics.",
            steps: [
              {
                name: "Drop the .docx",
                text: "Drop your Word .docx into the composer at ilolink.com. No account, no login. The cap is 15 MB per file.",
              },
              {
                name: "ilolink converts it to clean HTML",
                text: "ilolink converts the Word document to clean HTML and renders it as a normal web page — text, headings, lists, and tables.",
              },
              {
                name: "Pick a visibility mode",
                text: "Choose public, unlisted, password-protected, or expiring. Expiry is opt-in.",
              },
              {
                name: "Get the link",
                text: "You get ilolink.com/<slug>. It redirects to an isolated render origin served under a strict CSP.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Share a Word doc", path: "/guides/share-docx" },
        ]}
      />
      <PageHeader
        title="How to share a Word (.docx) document as a page"
        lead={
          <>
            Drop a <code>.docx</code> into ilolink and it becomes a clean web
            page — up to 15 MB — with full read analytics: scroll depth,
            heatmaps, and comments. Because a Word doc is converted to a real
            HTML page, you get all of that, not just opens.
          </>
        }
      />
      <Prose>
        <h2>How to share a Word doc</h2>
        <p>The loop is short:</p>
        <ol>
          <li>
            Drop your <code>.docx</code> into the composer at{" "}
            <a href="/">ilolink.com</a>. No account needed. The cap is 15 MB per
            file.
          </li>
          <li>
            ilolink <strong>converts it to clean HTML</strong> and renders it as
            a normal web page — text, headings, lists, tables, and basic
            formatting.
          </li>
          <li>Pick a visibility mode — public, unlisted, password, or expiring.</li>
          <li>
            Get <code>ilolink.com/&lt;slug&gt;</code> and send it.
          </li>
        </ol>
        <p>
          The branded link 302-redirects to an isolated render origin,{" "}
          <code>view.ilolink.com</code>, served under a strict content-security
          policy. The doc renders as a real page, not a downloaded file, so the
          recipient taps a link and reads it on any device.
        </p>

        <h2>What you get that a PDF doesn&apos;t</h2>
        <p>
          This is the reason to send a Word doc as a page rather than a{" "}
          <a href="/guides/share-pdf">PDF</a>. A PDF is shown in the
          browser&apos;s native viewer, so analytics can only see that it was{" "}
          <em>opened</em> — no scroll depth, no heatmaps. A converted Word doc is
          a rendered HTML page, so you get the full read-side picture, all
          cookieless from a rotating visitor hash:
        </p>
        <ul>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see how far into the doc people get before they stop.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll, viewable by device
            class.
          </li>
          <li>
            <strong>Reactions and notes</strong> — quick reader feedback, no
            account needed.
          </li>
          <li>
            <strong>Comments</strong> — threaded, anchored to the doc, no login
            to leave one.
          </li>
        </ul>
        <p>
          You also get total and unique views (uniques are approximate), top
          referrers, countries, device class, and 30-day daily views. See{" "}
          <a href="/guides/reading-your-analytics">reading your analytics</a> for
          how to read it all.
        </p>

        <h2>How faithful is the conversion?</h2>
        <p>
          Honest answer: it keeps the substance, not every pixel. The conversion
          preserves text, headings, lists, tables, and basic formatting — bold,
          italics, links. Very complex layouts, footnotes, or embedded objects
          may simplify or drop. Multi-column magazine layouts, precise page
          positioning, and heavy templating flatten into a clean reading flow.
        </p>
        <p>
          Always open the result and check it before sharing. If your document
          leans on exact layout that must not move, keep it as a{" "}
          <a href="/guides/share-pdf">PDF</a> instead — you lose the scroll
          funnel and heatmaps, but the page fidelity is exact.
        </p>
      </Prose>

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version
        history or rollback yet. If the Word doc changes, you publish a new file
        and share the new link.
      </Callout>

      <Faq
        items={[
          {
            q: "What's the size limit?",
            a: "15 MB per .docx. That's the binary upload cap, shared with PDFs and images.",
          },
          {
            q: "Do I get scroll and heatmap analytics?",
            a: "Yes. A Word doc converts to a real HTML page, so you get the 0/25/50/75/100% scroll funnel, click and scroll heatmaps, reactions, and anchored comments. That's the difference from a PDF, which only shows opens.",
          },
          {
            q: "Will complex formatting survive?",
            a: "Mostly. Text, headings, lists, tables, and basic formatting carry over cleanly. Very complex layouts, footnotes, and embedded objects can simplify or drop — always check the rendered result before you share.",
          },
          {
            q: "Does someone need an account to view it?",
            a: "No. Readers just open ilolink.com/<slug> — no login, no signup. You don't need an account to publish either; ownership is a per-doc manage token kept in your browser.",
          },
        ]}
      />

      <Cta sub="Share a Word doc." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-pdf",
            title: "Share a PDF as a page",
            blurb:
              "Upload a PDF and share it inline under the access gate. You see opens, referrers, and countries — but not scroll depth or heatmaps.",
          },
          {
            path: "/guides/reading-your-analytics",
            title: "Reading your analytics",
            blurb:
              "How to read the scroll funnel, heatmaps, and comments your shared doc collects.",
          },
        ]}
      />
    </Article>
  );
}
