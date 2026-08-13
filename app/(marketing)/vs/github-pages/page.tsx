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

// GitHub's numbers here are quoted from its own limits page
// (docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits,
// read 2026-08-12): published sites "may be no larger than 1 GB", a SOFT 100 GB
// bandwidth limit per month and a SOFT limit of 10 builds per hour. Soft is
// stated as soft on purpose — reporting a soft cap as a hard wall would be the
// same kind of false precision this page is trying to avoid.
export const metadata: Metadata = {
  title: "ilolink vs GitHub Pages — no repo, no build, real analytics",
  description:
    "GitHub Pages needs a repo, a commit and a build. ilolink takes a file and returns a link, then shows views, scroll depth, heatmaps and reader comments.",
  alternates: { canonical: "/vs/github-pages" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/vs/github-pages",
            headline: "ilolink vs GitHub Pages",
            description:
              "GitHub Pages is free static hosting driven by a Git repository; ilolink publishes a single document straight from a file and measures how it was read.",
            datePublished: "2026-08-12",
          }),
          softwareApplication(),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/vs/github-pages" },
          { name: "ilolink vs GitHub Pages", path: "/vs/github-pages" },
        ]}
      />
      <PageHeader
        title="ilolink vs GitHub Pages"
        lead={
          <>
            GitHub Pages is free, durable static hosting for anyone happy to keep
            a repository. That repository is both its strength and its price: a
            commit, a branch setting and a build stand between your file and a
            URL. ilolink takes the file and gives you the link, then reports what
            readers did with it.
          </>
        }
      />
      <Prose>
        <h2>The real difference is the workflow, not the hosting</h2>
        <p>
          Serving a static page is a solved problem and both do it well. What
          differs is everything around it. On Pages you create or pick a repo,
          commit the file, choose a source branch, wait for the build, and get a
          URL under <code>github.io</code> or your own domain. Every update is
          another commit. That is excellent if the page is part of a project you
          are already versioning — and heavy if you just made one document and
          want to send it to someone this afternoon.
        </p>
        <p>
          ilolink has no repository and no build step. You paste Markdown or HTML
          or drop a PDF, .docx or CSV, and the link exists. There is nothing to
          configure because there is nothing to configure.
        </p>

        <h2>What GitHub Pages does not tell you</h2>
        <p>
          Pages ships no visitor analytics. Once the URL is out, GitHub does not
          report views, referrers, how far anyone scrolled, or whether the person
          you sent it to ever opened it. The usual fix is to bolt on a
          third-party analytics script, which means a cookie banner conversation,
          an extra vendor, and a script tag in a document you were trying to keep
          simple.
        </p>
        <p>ilolink treats that as the point of the product:</p>
        <ul>
          <li>
            <strong>Views and read-through</strong> — total and approximate unique
            views, average time on page, a 0/25/50/75/100% scroll funnel,
            referrers, countries, device class, 30-day trend. Cookieless, with no
            fingerprint and no visitor profile, so there is nothing to disclose.
          </li>
          <li>
            <strong>Heatmaps</strong> — click and scroll, split by device.
          </li>
          <li>
            <strong>Anchored feedback</strong> — reactions, private notes and
            threaded comments pinned to a point, region or line, and readers need
            no account to leave them.
          </li>
        </ul>

        <h2>The documented limits, quoted rather than paraphrased</h2>
        <p>
          GitHub&apos;s own limits page states that published Pages sites{" "}
          <em>&ldquo;may be no larger than 1 GB&rdquo;</em>, that sites have a{" "}
          <em>soft</em> bandwidth limit of 100&nbsp;GB per month, and a{" "}
          <em>soft</em> limit of 10 builds per hour. Soft means monitored rather
          than an automatic cut-off. Those ceilings are far above anything a
          single shared document needs — for a whole site, they are worth knowing.
          ilolink&apos;s equivalent constraint is per document: 15&nbsp;MB.
        </p>

        <h2>Where GitHub Pages is the better tool</h2>
        <ul>
          <li>
            <strong>A real, multi-page site</strong> — docs, a blog, a project
            site with relative links and assets. ilolink publishes one document
            per link and has no navigation concept.
          </li>
          <li>
            <strong>Version control as the source of truth</strong> — history,
            review, rollback and CI come free because the page <em>is</em> the
            repo. ilolink versions a document when you update it, but it is not
            Git.
          </li>
          <li>
            <strong>Custom domains</strong> — supported, with certificates.
            ilolink does not do custom domains yet.
          </li>
          <li>
            <strong>Permanence with zero cost</strong> — a public repo and a page
            that outlives your interest in it.
          </li>
        </ul>

        <ComparisonTable
          columns={["", "GitHub Pages", "ilolink"]}
          highlightCol={2}
          rows={[
            ["Getting a link", "Repo, commit, branch setting, build", "Paste or drop a file"],
            ["Prerequisites", "A GitHub account and a repository", "A free account"],
            [
              "Visitor analytics",
              "None built in — add a third-party script",
              "Included, cookieless",
            ],
            ["Scroll depth and heatmaps", "No", "Scroll funnel + click/scroll heatmaps"],
            ["Reader feedback", "No", "Reactions, notes, anchored comments"],
            [
              "Non-HTML formats",
              "Served as files, or built into HTML yourself",
              "Markdown, PDF, .docx, CSV rendered as a page",
            ],
            ["Size", "Published site no larger than 1 GB", "15 MB per document"],
            ["Bandwidth", "Soft 100 GB per month", "No published per-document cap"],
            ["Custom domain", "Yes", "Not yet"],
            [
              "Access control",
              "Public page (repo visibility varies by plan)",
              "Public, unlisted, private (teamspace members only), password, or expiring",
            ],
          ]}
          caption="GitHub figures quoted from its Pages limits page, read 2026-08-12; the bandwidth and build ceilings are soft limits, and plan details change."
        />

        <Callout title="A fair note">
          <p>
            GitHub Pages is one of the best free things on the internet and this
            is not a knock on it. If your document belongs beside code, put it
            there. ilolink exists for the other case: a one-off document, sent to
            people who will never see the repo, where the useful question is not
            &ldquo;is it online&rdquo; but &ldquo;did they read it&rdquo;.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Does GitHub Pages have analytics?",
            a: "No visitor analytics are built in. You would add a third-party script, which brings its own cookie and privacy considerations. ilolink includes cookieless views, approximate uniques, a scroll funnel, referrers and heatmaps on every document.",
          },
          {
            q: "How big can a GitHub Pages site be?",
            a: "GitHub documents that published sites may be no larger than 1 GB, with a soft bandwidth limit of 100 GB per month and a soft limit of 10 builds per hour. Soft means monitored rather than cut off automatically — check the current limits page before relying on any of it.",
          },
          {
            q: "Can I publish a PDF or a Word document?",
            a: "On Pages you can serve the file, but the reader downloads it rather than reading a page. ilolink turns a PDF into a page that opens in the browser and a .docx into clean HTML, with the same analytics as any other document.",
          },
          {
            q: "Do I need Git or a build step for ilolink?",
            a: "Neither. There is no repository and no build. You paste text or drop a file, and the link exists — which is also why there is nothing to misconfigure.",
          },
          {
            q: "Is ilolink free?",
            a: `${FREE_LINE} You need a free account to publish; readers never need one. ${TEAM_LINE}`,
          },
        ]}
      />

      <Cta sub="Skip the repo. Publish the document." />

      <RelatedLinks
        links={[
          {
            path: "/guides/best-way-to-share-ai-html",
            title: "The best way to share AI-generated HTML",
            blurb:
              "Static hosts, quick-drop hosts and ilolink compared — setup, link permanence, and what you learn after you send the link.",
          },
          {
            path: "/vs/netlify-drop",
            title: "ilolink vs Netlify Drop",
            blurb:
              "Drag-and-drop hosting with no repo at all — and the temporary password that catches people out.",
          },
        ]}
      />
    </Article>
  );
}
