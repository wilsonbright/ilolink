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
  title: "What ilolink does — ilolink",
  description:
    "A scannable tour: publish anything an AI made as a link, then see how it was read — cookieless analytics, heatmaps, reactions, and anchored comments.",
  alternates: { canonical: "/guides/capabilities" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/capabilities",
            headline: "What ilolink does",
            description:
              "A product tour of ilolink: publish AI output as a link, then read cookieless analytics, click and scroll heatmaps, reactions, and anchored comments.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Capabilities", path: "/guides/capabilities" },
        ]}
      />
      <PageHeader
        title="What ilolink does"
        lead={
          <>
            ilolink gives you a link for anything an AI made, then shows you who
            read it: cookieless analytics, click and scroll heatmaps, reactions,
            and anchored comments. No account. Paste or drop a file, get{" "}
            <code>ilolink.com/&lt;slug&gt;</code>, served isolated on
            Cloudflare&apos;s edge.
          </>
        }
      />
      <Prose>
        <h2>Publish anything an AI made</h2>
        <p>
          Paste Markdown or HTML, or drop a file — up to 2 MB per doc — and get a
          link in seconds. No account, no setup. Images work: an AI-generated
          picture embedded in a doc, or hosted on its own. What you publish is
          sanitized on ingest and served isolated on a separate render origin,{" "}
          <code>view.ilolink.com</code>, so a doc you didn&apos;t write
          can&apos;t run code on a domain readers trust.
        </p>
        <p>
          The look survives the cleanup. CSS is kept, so a landing-page mockup, a
          styled report, or a pricing table renders exactly as designed —
          that&apos;s the whole point of publishing AI output as a page. By
          default, what gets frozen is behavior: interactive JavaScript is frozen
          to static, so the markup and CSS show at the state they shipped in, but
          scripts, click handlers, and fetch calls don&apos;t run. For most AI
          output that static render is what you wanted anyway. If you mark an HTML
          doc as trusted at publish time, it runs as-is inside a sandboxed frame
          on the isolated origin.
        </p>

        <h2>See how it was read</h2>
        <p>
          Every doc gets live analytics without cookies. There&apos;s no cookie,
          no fingerprint, no cross-site profile — just a rotating visitor hash —
          and the numbers stay aggregate, never per-person. You get:
        </p>
        <ul>
          <li>
            <strong>Total views</strong> and <strong>approximate uniques</strong>{" "}
            (approximate is the honest word — no cookie means no exact count).
          </li>
          <li>
            <strong>Average time</strong> on the page and a{" "}
            <strong>scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you see how far people actually got.
          </li>
          <li>
            <strong>Referrers</strong>, <strong>countries</strong>, and{" "}
            <strong>device class</strong> — where readers came from and what they
            read on.
          </li>
          <li>
            <strong>30-day daily views</strong>, so a link&apos;s pickup over
            time is visible at a glance.
          </li>
        </ul>

        <h2>Heatmaps</h2>
        <p>
          Live click and scroll heatmaps show where attention landed — which
          parts of the page got clicked, and how far down people read before they
          left. Both split by device, because a mockup that reads well on desktop
          can lose the phone. It&apos;s the visual version of the scroll funnel:
          not just <em>how many</em> reached the bottom, but <em>where</em> the
          drop-off happened.
        </p>

        <h2>Feedback and comments</h2>
        <p>
          Readers can react and leave a short note without making an account, so
          you get a signal instead of silence. Beyond quick reactions,{" "}
          <strong>threaded anchored comments</strong> attach to a specific spot
          in the doc — a line, a section — so feedback points at the exact thing
          it&apos;s about instead of &quot;third paragraph, ish.&quot; No reader
          login required; the friction that usually kills feedback is gone.
        </p>

        <h2>Control who sees it</h2>
        <p>
          Four visibility modes, set per doc:
        </p>
        <ul>
          <li>
            <strong>Public</strong> — anyone with the link, listed openly.
          </li>
          <li>
            <strong>Unlisted</strong> — anyone with the link, but not surfaced.
          </li>
          <li>
            <strong>Password</strong> — the link opens only with the passphrase.
          </li>
          <li>
            <strong>Expiring</strong> — the link stops working after a date you
            set. Expiry is opt-in: links are permanent unless you choose
            otherwise.
          </li>
        </ul>
        <p>
          Everything is served over HTTPS on Cloudflare&apos;s global edge. See{" "}
          <a href="/guides/where-hosted">where docs are hosted</a> for the full
          picture.
        </p>

        <h2>What&apos;s coming</h2>
        <p>
          Being clear about the line between live and roadmap, so you don&apos;t
          plan around things that aren&apos;t here:
        </p>
        <ul>
          <li>
            <strong>Per-format metrics</strong> — per-slide, per-PDF-page, and
            spreadsheet-level breakdowns are roadmap, not live.
          </li>
          <li>
            <strong>Media hosting and its metrics</strong> — audio and video
            hosting, and watch-through or listen-through numbers, aren&apos;t
            shipped.
          </li>
        </ul>
        <p>
          What&apos;s live today is everything above: publishing, cookieless
          analytics, heatmaps, reactions and notes, anchored comments, and the
          four visibility modes.
        </p>
      </Prose>

      <Callout title="Live today, in one line">
        A link for any AI output (Markdown, HTML, images, files; sanitized,
        isolated, CSS kept, JS frozen to static) plus cookieless views and
        approximate uniques, avg time, a 0 / 25 / 50 / 75 / 100% scroll funnel,
        referrers, countries, devices, 30-day daily views, click and scroll
        heatmaps, reactions with notes, and threaded anchored comments. Public,
        unlisted, password, or expiring — expiry opt-in.
      </Callout>

      <Faq
        items={[
          {
            q: "Do I need an account?",
            a: "No. Paste Markdown or HTML, or drop a file up to 2 MB, and you get an ilolink.com/<slug> link. Publishing and reading analytics are accountless, and readers don't need an account to react or comment.",
          },
          {
            q: "Does the analytics use cookies?",
            a: "No cookies, no fingerprint, no cross-site profile. Uniques are approximate by design because there's no cookie to count exactly, and every number stays aggregate — never per-person.",
          },
          {
            q: "Will my styled landing page render, or just plain text?",
            a: "It renders styled. CSS is kept, so mockups, reports, and pricing tables look as designed. By default interactive JavaScript is frozen — the layout and styling show, but scripts and handlers don't run. If you mark the doc as trusted at publish time, its scripts run inside a sandboxed frame on the isolated origin.",
          },
          {
            q: "What isn't live yet?",
            a: "Per-format metrics (per-slide, per-PDF-page, spreadsheet), and audio/video hosting with watch-through or listen-through numbers, are roadmap. Everything else on this page — publishing, cookieless analytics, heatmaps, reactions, and anchored comments — is live.",
          },
        ]}
      />

      <Cta sub="Publish your first doc." />

      <RelatedLinks
        links={[
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "The full read side: what each metric means, how the heatmaps work, and how anchored comments attach.",
          },
          {
            path: "/guides/quick-start",
            title: "Quick start",
            blurb:
              "Paste or drop, pick who can see it, and get a sanitized link in seconds.",
          },
        ]}
      />
    </Article>
  );
}
