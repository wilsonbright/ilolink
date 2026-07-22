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
  title: "Share a spreadsheet or CSV as a table — ilolink",
  description:
    "Paste CSV or TSV (or drop a .csv) and ilolink renders it as a clean table at ilolink.com/<slug> — with a link and a scroll funnel over the rows.",
  alternates: { canonical: "/guides/share-spreadsheet" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/share-spreadsheet",
            headline: "How to share a spreadsheet or CSV as a table",
            description:
              "Paste CSV or TSV into ilolink, get a clean HTML table at ilolink.com/<slug>, and see how far readers scroll through it.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Share a spreadsheet as a table",
            description:
              "Export a sheet to CSV, paste it into ilolink, and get a hosted table with a scroll-depth funnel.",
            steps: [
              {
                name: "Export your sheet to CSV",
                text: "In Excel, Google Sheets, or Numbers, use File → Export / Download as CSV. Native .xlsx and Sheets files aren't uploaded directly.",
              },
              {
                name: "Paste it (or drop the .csv)",
                text: "Paste the CSV or TSV into the composer at ilolink.com, or drop a .csv file. No account, no login.",
              },
              {
                name: "Let ilolink render the table",
                text: "ilolink detects the delimiters automatically and renders a clean HTML table with headers, rows, and columns.",
              },
              {
                name: "Pick a visibility mode",
                text: "Choose public, unlisted, password-protected, or expiring. Expiry is opt-in.",
              },
              {
                name: "Send the link",
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
          { name: "Share a spreadsheet", path: "/guides/share-spreadsheet" },
        ]}
      />
      <PageHeader
        title="Share a spreadsheet or CSV as a table"
        lead={
          <>
            Paste CSV or TSV — or drop a <code>.csv</code> — and ilolink renders
            it as a clean, readable table with a link at ilolink.com/&lt;slug&gt;.
            And because it&apos;s a real page, you see how far people scrolled
            through the rows.
          </>
        }
      />
      <Prose>
        <h2>How to share a spreadsheet</h2>
        <ol>
          <li>
            <strong>Export your sheet to CSV.</strong> In Excel, Google Sheets,
            or Numbers, use File → Export or Download as <code>.csv</code>.
          </li>
          <li>
            <strong>Paste it</strong> into the composer at{" "}
            <a href="/">ilolink.com</a> — or drop the <code>.csv</code> file. No
            account needed.
          </li>
          <li>
            ilolink <strong>detects the delimiters</strong> (comma or tab) and
            renders a clean HTML table with headers, rows, and columns.
          </li>
          <li>
            Pick a visibility mode — public, unlisted, password, or expiring.
          </li>
          <li>
            Get <code>ilolink.com/&lt;slug&gt;</code> and send it.
          </li>
        </ol>
        <p>
          The branded link 302-redirects to an isolated render origin,{" "}
          <code>view.ilolink.com</code>, served under a strict content-security
          policy (<code>default-src &apos;none&apos;</code>). The recipient taps
          the link and reads a real table on any device — nothing to download,
          no spreadsheet app to open.
        </p>

        <h2>Which files work?</h2>
        <p>
          CSV and TSV render as a table — that&apos;s the honest scope. If your
          data is a comma- or tab-separated file, or you can paste rows of it,
          ilolink turns it into a clean HTML table.
        </p>
        <ul>
          <li>
            <strong>Paste CSV or TSV</strong> — comma- or tab-separated text,
            detected automatically.
          </li>
          <li>
            <strong>Drop a <code>.csv</code> file</strong> — same result, a
            rendered table.
          </li>
          <li>
            <strong>Native <code>.xlsx</code> and Google Sheets are not uploaded
            directly.</strong> Export the sheet to CSV first, then paste or drop
            it. A single-tab export is cleanest; multiple sheets become multiple
            CSV files.
          </li>
        </ul>
        <p>
          If you have prose or a formatted document instead of tabular data, a{" "}
          <a href="/guides/share-docx">Word .docx</a> or{" "}
          <a href="/guides/markdown-to-web-page">Markdown</a> is the better path.
          This page is one of several under{" "}
          <a href="/guides/share-ai-output">share AI output</a>.
        </p>

        <h2>What analytics do you get?</h2>
        <p>
          Because the table is a real rendered HTML page, it gets standard page
          analytics — all cookieless, from a rotating visitor hash, with no
          fingerprint and no personal profile:
        </p>
        <ul>
          <li>
            <strong>Views and approximate uniques</strong> — how many times the
            table was opened.
          </li>
          <li>
            <strong>The scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 /
            100%, so you see how far down the table people got.
          </li>
          <li>
            <strong>Referrers, countries, device class,</strong> and 30-day daily
            views.
          </li>
        </ul>
        <p>
          One honest limit: there&apos;s <strong>no per-cell or per-row
          &quot;exploration&quot; metric</strong>. You get standard views plus
          scroll depth over the whole table — not a heatmap of which cells people
          looked at. See{" "}
          <a href="/guides/reading-your-analytics">reading your analytics</a> for
          how to read the numbers.
        </p>

        <h2>Keep it private</h2>
        <p>
          A table doesn&apos;t have to be public. Set the visibility when you
          publish:
        </p>
        <ul>
          <li>
            <strong>Unlisted</strong> — only people with the exact link reach it;
            it&apos;s not indexed or listed anywhere.
          </li>
          <li>
            <strong>Password</strong> — the reader types a password before the
            table renders.
          </li>
        </ul>
        <p>
          Expiring links are opt-in too, if you want the table to stop resolving
          after a date.
        </p>
      </Prose>

      <Callout title="One honest limit">
        Docs are immutable — one version per link. There&apos;s no version
        history or rollback yet. If the numbers change, export a fresh CSV,
        publish a new table, and share the new link.
      </Callout>

      <Faq
        items={[
          {
            q: "Can I upload an .xlsx?",
            a: "Not directly. Native Excel .xlsx and Google Sheets files aren't uploaded — export the sheet to CSV first, then paste it or drop the .csv. ilolink renders that as a table.",
          },
          {
            q: "How big can it be?",
            a: "Pasted or text CSV is capped at 2 MB per doc. The 15 MB cap is for binary uploads like PDF, DOCX, or images — not CSV.",
          },
          {
            q: "Can I see which cells people looked at?",
            a: "No. There's no per-cell or per-row exploration metric. You get standard page analytics — views, approximate uniques, and a scroll funnel over the table.",
          },
          {
            q: "Does someone need an account to view it?",
            a: "No. Readers just open ilolink.com/<slug> — no login, no signup. You don't need an account to publish either; ownership is a per-doc manage token kept in your browser.",
          },
        ]}
      />

      <Cta sub="Share a table." />

      <RelatedLinks
        links={[
          {
            path: "/guides/reading-your-analytics",
            title: "Reading your analytics",
            blurb:
              "What views, approximate uniques, and the scroll funnel actually mean — and how to read them.",
          },
          {
            path: "/guides/markdown-to-web-page",
            title: "Turn Markdown into a shareable web page",
            blurb:
              "Have prose instead of rows? Paste Markdown and get a clean reading page with the same scroll analytics.",
          },
        ]}
      />
    </Article>
  );
}
