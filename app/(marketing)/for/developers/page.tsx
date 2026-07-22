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
  title: "ilolink for developers — ilolink",
  description:
    "Share a README, API doc, changelog, or spec as a clean page — no repo, no build, no account — then see whether teammates actually read it.",
  alternates: { canonical: "/for/developers" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/developers",
            headline: "ilolink for developers",
            description:
              "Share a README, API doc, changelog, or spec as a clean page — no repo, no build, no account — then see whether teammates read it.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/developers" },
          { name: "Developers", path: "/for/developers" },
        ]}
      />
      <PageHeader
        title="ilolink for developers"
        lead={
          <>
            Share a README, API doc, changelog, or spec as a clean page — no
            repo, no build, no account — then see whether teammates actually
            read it. Paste Markdown or HTML, get a link, and watch the
            read-through instead of guessing.
          </>
        }
      />
      <Prose>
        <h2>Share docs without a repo or deploy</h2>
        <p>
          You have a doc, not a site. A README for a script, an API reference, a
          migration guide, release notes — the kind of thing that doesn&apos;t
          warrant a static-site generator, a PR, and a deploy just to hand
          someone a link. Paste the Markdown or HTML into the composer at{" "}
          <a href="/">ilolink.com</a>, or drop a file, and you get{" "}
          <code>ilolink.com/&lt;slug&gt;</code> — a normal web page in a clean
          reading shell. Code blocks keep their formatting and tables render as
          tables. No generator, no build step, no branch.
        </p>
        <ul>
          <li>
            <strong>Markdown</strong> — headings, lists, fenced code blocks, and
            tables render in a readable layout.
          </li>
          <li>
            <strong>HTML</strong> — paste it directly; inline CSS, Google Fonts,
            and https/data images work.
          </li>
          <li>
            <strong>Files</strong> — drop one, up to 2 MB per doc.
          </li>
        </ul>
        <p>
          One honest caveat: if your HTML doc carries interactive JavaScript, it
          is frozen to static on the way in. Scripts are dropped and don&apos;t
          run — the layout and CSS render, so an interactive widget shows as a
          visual preview, not a working control. For docs that&apos;s rarely a
          problem; prose, code, and tables are all static anyway.
        </p>

        <h2>See if the team read it</h2>
        <p>
          Once the link is out, ilolink shows how the page was actually read —
          cookieless, from a rotating visitor hash, with no fingerprint and no
          personal profile:
        </p>
        <ul>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see how far people got — whether they stopped at the
            overview or read through to the breaking-changes section.
          </li>
          <li>
            <strong>Time on page</strong> — a skim reads differently from
            someone who actually worked through the setup steps.
          </li>
        </ul>
        <p>
          These are aggregate and approximate by design — you learn how the doc
          was read, not which named teammate read it. There&apos;s more on the
          read side: total and approximate unique views, referrers, countries,
          device class, 30-day daily views, plus click and scroll heatmaps and
          reader reactions. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>{" "}
          for the full picture, or open{" "}
          <a href="/dashboard">your documents</a> after you publish one.
        </p>

        <h2>Get feedback in place</h2>
        <p>
          Reviewers can leave <strong>anchored comments</strong> pinned to the
          exact line or section — a threaded note on the specific code block or
          paragraph, not a separate thread where nobody can tell what &quot;the
          third bullet&quot; refers to. Reviewers don&apos;t need an account to
          comment, so feedback doesn&apos;t stall behind a sign-up.
        </p>

        <h2>Keep internal docs unlisted or password-protected</h2>
        <p>
          Not every doc is public. Pick the visibility that fits:
        </p>
        <ul>
          <li>
            <strong>Public</strong> or <strong>unlisted</strong> for docs you
            want to circulate freely.
          </li>
          <li>
            <strong>Password</strong> for an internal API doc or spec you
            don&apos;t want indexed or forwarded.
          </li>
          <li>
            <strong>Expiring</strong> if you want a link to lapse — expiry is
            opt-in, never forced on you.
          </li>
        </ul>
        <p>
          The link redirects to an isolated render origin under a strict content
          security policy, and pasted HTML is sanitized on the way in, so a
          shared doc is safe to hand around. Docs are immutable — revise the
          README and you publish a new link; delete from the dashboard on the
          browser you published from.
        </p>
      </Prose>

      <Callout title="What this is not">
        It won&apos;t tell you <strong>who</strong> read the doc. Analytics are
        cookieless and aggregate — unique views are approximate, built from a
        rotating visitor hash with no fingerprint and no per-person identity. And
        it&apos;s a reading shell, not a runtime: interactive JavaScript in an
        HTML doc is frozen to static, so it renders as a preview, not a running
        app.
      </Callout>

      <Faq
        items={[
          {
            q: "Does Markdown render code blocks?",
            a: "Yes. Fenced code blocks keep their formatting, and tables render as tables. Paste a Markdown README or API doc and it comes out in a clean reading layout.",
          },
          {
            q: "Can I see which teammate read it?",
            a: "No. Analytics are cookieless and aggregate. Unique views are approximate, built from a rotating visitor hash with no fingerprint and no personal profile — so you see how far and how long people read, not which named person did it.",
          },
          {
            q: "Is it free, and do I need an account?",
            a: "Yes, it's free and accountless. Paste Markdown or HTML, or drop a file up to 2 MB, and get a link at no cost — no sign-up for you and none for the people reading it.",
          },
          {
            q: "Can I keep an internal doc private?",
            a: "Yes. Visibility can be public, unlisted, password-protected, or expiring. Use a password for internal API docs or specs you don't want forwarded, and keep expiry off unless you want the link to lapse.",
          },
        ]}
      />

      <Cta sub="Publish a doc and watch the read-through." />

      <RelatedLinks
        links={[
          {
            path: "/guides/markdown-to-web-page",
            title: "Turn Markdown into a web page",
            blurb:
              "Paste a Markdown README or spec and get a clean, shareable page — the fastest path for a doc.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "The full read-side picture: cookieless views, the scroll funnel, heatmaps, reactions, and anchored comments.",
          },
        ]}
      />
    </Article>
  );
}
