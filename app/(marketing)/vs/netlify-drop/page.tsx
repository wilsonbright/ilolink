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

// Competitor facts on this page come from Netlify's own Drop quickstart
// (docs.netlify.com/start/quickstarts/netlify-drop-quickstart/, read 2026-08-12):
// the temporary-password-until-claimed behaviour, the "under 50MB works best /
// files over 10MB may get stuck" guidance, and the netlify.app URL. Anything not
// documented there is hedged rather than guessed — pricing and add-ons move.
export const metadata: Metadata = {
  title: "ilolink vs Netlify Drop — hosting versus measured reading",
  description:
    "Netlify Drop deploys a folder to a netlify.app URL, password-protected until you claim it. ilolink publishes one document and shows how it was read.",
  alternates: { canonical: "/vs/netlify-drop" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/vs/netlify-drop",
            headline: "ilolink vs Netlify Drop",
            description:
              "Netlify Drop is drag-and-drop static hosting for a whole folder; ilolink publishes a single document and adds cookieless analytics, heatmaps and reader feedback.",
            datePublished: "2026-08-12",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/vs/netlify-drop" },
          { name: "ilolink vs Netlify Drop", path: "/vs/netlify-drop" },
        ]}
      />
      <PageHeader
        title="ilolink vs Netlify Drop"
        lead={
          <>
            Netlify Drop is the fastest way to put a <em>folder</em> on the
            internet: drag it in, get a <code>netlify.app</code> URL. ilolink
            publishes a single <em>document</em> and then tells you what happened
            to it — views, how far people read, where they clicked, what they
            said. The choice is really site versus document.
          </>
        }
      />
      <Prose>
        <h2>What&apos;s the same</h2>
        <p>
          Both skip the repo, the build and the server. You hand over a file and
          you get back a URL you can send to anyone, in well under a minute, and
          the reader needs no account to open it. If that is the whole job,
          either one does it.
        </p>

        <h2>The gotcha worth knowing about Drop</h2>
        <p>
          You can deploy without signing in — but Netlify&apos;s own quickstart
          is explicit about what you get:{" "}
          <em>
            &ldquo;If you drop without signing in, your project URL is protected
            with a temporary password until you claim it.&rdquo;
          </em>{" "}
          So the no-account path does not actually produce a link you can forward
          to a client and forget about. You claim it by logging in or signing up,
          at which point you have an account anyway.
        </p>
        <p>
          ilolink asks for the free account up front instead, and the link it
          gives you is immediately openable by anyone you send it to. Same total
          number of accounts; the difference is whether you discover that before
          or after you have pasted the URL into an email.
        </p>

        <h2>What ilolink adds</h2>
        <ul>
          <li>
            <strong>Read analytics, built in</strong> — views, approximate unique
            views, average time on page, a 0/25/50/75/100% scroll funnel,
            referrers, countries, device class and a 30-day trend. Cookieless, no
            fingerprint, no visitor profile. On Netlify, visitor analytics is a
            separate paid add-on rather than part of the drop.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll maps split by device, so
            &ldquo;they opened it&rdquo; becomes &ldquo;they stopped at the
            pricing section&rdquo;.
          </li>
          <li>
            <strong>Reader feedback with no reader account</strong> — reactions,
            private notes and threaded comments anchored to a point, a region or a
            line of the document.
          </li>
          <li>
            <strong>More than HTML</strong> — Markdown, HTML, PDF, .docx and
            CSV/TSV all become a readable page. Drop serves files; it does not
            turn a .docx into a web page.
          </li>
          <li>
            <strong>Access tiers per document</strong> — public, unlisted,
            password, or expiring. Links are permanent unless you choose expiry.
          </li>
        </ul>

        <h2>Where Netlify Drop is the better tool</h2>
        <p>Genuinely, and often:</p>
        <ul>
          <li>
            <strong>It hosts a whole site, not one page.</strong> A folder of
            HTML, CSS, JS and images with working relative links is exactly what
            Drop is for. ilolink is one document per link — no folders, no
            multi-page navigation.
          </li>
          <li>
            <strong>Bigger payloads.</strong> Netlify documents that deploys
            under 50&nbsp;MB work best and that individual files over 10&nbsp;MB
            may get stuck; ilolink caps a document at 15&nbsp;MB. For a heavy
            bundle, neither is generous, but Drop is built for the multi-file
            shape.
          </li>
          <li>
            <strong>Custom domains, and a real platform underneath.</strong>{" "}
            ilolink serves from <code>ilolink.com/&lt;slug&gt;</code> and has no
            custom domains yet. Netlify has domains, redirects, functions, build
            plugins and a CDN — if the thing you dropped is going to grow into an
            application, you are already in the right place.
          </li>
          <li>
            <strong>It runs a build for you</strong> when you are logged in,
            detecting the framework. ilolink has no build step at all, because it
            never needs one.
          </li>
        </ul>

        <ComparisonTable
          columns={["", "Netlify Drop", "ilolink"]}
          highlightCol={2}
          rows={[
            ["Unit of publishing", "A folder or zip — a site", "One document"],
            [
              "Link works immediately without an account",
              "No — temporary password until claimed",
              "Yes, once you publish",
            ],
            [
              "Read analytics",
              "Paid add-on, not part of Drop — verify current terms",
              "Included: views, approx. uniques, scroll funnel, 30-day trend",
            ],
            ["Heatmaps", "No", "Click + scroll, by device"],
            [
              "Reader feedback",
              "No",
              "Reactions, notes, anchored threaded comments",
            ],
            [
              "Non-HTML formats",
              "Served as files",
              "Markdown, PDF, .docx, CSV rendered as a page",
            ],
            [
              "Size guidance",
              "Under 50 MB per deploy; files over 10 MB may stick",
              "15 MB per document",
            ],
            ["Custom domain", "Yes", "Not yet"],
            ["Build step", "Optional, when logged in", "None, ever"],
          ]}
          caption="Netlify's figures are from its Drop quickstart, read 2026-08-12; plans and add-ons change, so verify current terms."
        />

        <Callout title="A fair note">
          <p>
            Netlify is infrastructure and Drop is its front door — it is very good
            at what it does, and if you need a site rather than a document it wins
            outright. ilolink is not trying to be a host with analytics bolted on;
            the analytics, the heatmap and the comment thread are the product, and
            the hosting is what makes them possible.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Can I use Netlify Drop without an account?",
            a: "You can deploy without one, but Netlify's own quickstart says the project URL is protected with a temporary password until you claim it — so it is not yet a link you can forward. Claiming it means signing up.",
          },
          {
            q: "Does Netlify Drop give me analytics?",
            a: "Not as part of Drop. Netlify sells visitor analytics as a separate add-on, and pricing changes, so check its current plans. ilolink includes views, approximate uniques, a scroll funnel, referrers and heatmaps with every published document.",
          },
          {
            q: "Which should I use for a multi-page site?",
            a: "Netlify Drop. It deploys a folder with working relative links, and ilolink is deliberately one document per link — there is no folder or navigation concept to publish.",
          },
          {
            q: "Is ilolink free?",
            a: `${FREE_LINE} You need a free account to publish; readers never need one. ${TEAM_LINE}`,
          },
        ]}
      />

      <Cta sub="Publish one document and watch how it reads." />

      <RelatedLinks
        links={[
          {
            path: "/guides/best-way-to-share-ai-html",
            title: "The best way to share AI-generated HTML",
            blurb:
              "Static hosts, quick-drop hosts and ilolink compared — setup, link permanence, and what you learn after you send the link.",
          },
          {
            path: "/vs/github-pages",
            title: "ilolink vs GitHub Pages",
            blurb:
              "The other free static host people reach for, and why a repo and a build step are the real cost.",
          },
        ]}
      />
    </Article>
  );
}
