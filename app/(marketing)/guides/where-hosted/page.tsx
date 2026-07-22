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
  title: "Where your shared docs live — ilolink",
  description:
    "Your published pages are served from Cloudflare's global edge over HTTPS, isolated on view.ilolink.com under a strict CSP. Measurement is cookieless — no fingerprint, no profile.",
  alternates: { canonical: "/guides/where-hosted" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/where-hosted",
            headline: "Where your shared docs live",
            description:
              "Published pages are served from Cloudflare's global edge over HTTPS, isolated on view.ilolink.com under a strict CSP. Measurement is cookieless — no fingerprint, no personal profile.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Where hosted", path: "/guides/where-hosted" },
        ]}
      />
      <PageHeader
        title="Where your shared docs live"
        lead={
          <>
            Your published pages are served from Cloudflare&apos;s global edge
            over HTTPS, isolated on <code>view.ilolink.com</code> under a strict
            content-security policy. Measurement is cookieless — a rotating
            visitor hash, no fingerprint, no personal profile, no cross-site
            tracking.
          </>
        }
      />
      <Prose>
        <h2>Where the pages are served</h2>
        <p>
          Every published doc is served from{" "}
          <strong>Cloudflare&apos;s global edge over HTTPS</strong>. Your{" "}
          <code>ilolink.com/&lt;slug&gt;</code> link redirects to the isolated
          render origin, and the page is delivered from the edge location
          closest to whoever opens it — so a reader gets it fast wherever they
          are, and encrypted every time.
        </p>
        <p>
          The content itself is immutable once published: to change a page, you
          publish a new one. There&apos;s no version rollback or history — the
          doc you shared is the doc your readers see.
        </p>

        <h2>Why a separate origin (view.ilolink.com)?</h2>
        <p>
          AI-generated HTML is untrusted input. Serving it on its own origin,{" "}
          <code>view.ilolink.com</code>, keeps it walled off from the ilolink
          app — a page can never reach the dashboard, your manage tokens, or
          another doc. That isolation is the whole point of the split.
        </p>
        <p>On top of the separate origin, two things happen:</p>
        <ul>
          <li>
            <strong>A strict CSP.</strong> Rendered docs run under{" "}
            <code>default-src &apos;none&apos;</code> — nothing loads unless
            it&apos;s explicitly allowed.
          </li>
          <li>
            <strong>Sanitized by default.</strong> Scripts are dropped,
            interactive JavaScript is frozen to static, forms are made inert, and
            your CSS is kept — so what renders is the layout and styling, with
            nothing executable behind it. If you mark an HTML doc as trusted at
            publish time, it&apos;s kept as-is and its own scripts run, sandboxed
            in an opaque-origin frame on this same isolated origin — still walled
            off from cookies, storage, and other docs.
          </li>
        </ul>

        <h2>What&apos;s measured, and how privately</h2>
        <p>
          Analytics are <strong>cookieless</strong>. To approximate unique
          visitors, ilolink uses a <strong>rotating visitor hash</strong> — not
          a cookie, not a device fingerprint, and not something that follows a
          reader across sites. Because the hash rotates, unique counts are{" "}
          <strong>approximate by design</strong>, and everything reported is an
          aggregate, never a per-person identity.
        </p>
        <p>
          That means no cookie banner on your pages, no cross-site profile built
          from your readers, and no way — for you or for us — to point at a row
          and say who it was.
        </p>

        <h2>What is and isn&apos;t collected</h2>
        <p>
          <strong>Collected</strong> (all aggregate):
        </p>
        <ul>
          <li>total views and approximate unique views;</li>
          <li>average time on page and a scroll-depth funnel (0/25/50/75/100%);</li>
          <li>click and scroll heatmaps, broken out by device class;</li>
          <li>top referrers, countries, and 30-day daily views.</li>
        </ul>
        <p>
          <strong>Not collected:</strong>
        </p>
        <ul>
          <li>no cookies;</li>
          <li>no device fingerprint;</li>
          <li>no personal profiles and no cross-site tracking;</li>
          <li>no per-person identity — you see totals, never individuals.</li>
        </ul>
        <p>
          For what each of those numbers means and how to read them, see{" "}
          <a href="/guides/reading-your-analytics">reading your analytics</a>.
          The full <a href="/privacy">privacy</a> page has the details.
        </p>
      </Prose>

      <Callout title="The short version">
        Pages live on Cloudflare&apos;s global edge over HTTPS, isolated on{" "}
        <code>view.ilolink.com</code> under a strict CSP. What you learn about
        readers is aggregate and cookieless — never a name.
      </Callout>

      <Faq
        items={[
          {
            q: "Do you set cookies?",
            a: "No. Analytics are cookieless — uniques are approximated with a rotating visitor hash, so there's no cookie on your published pages and no cookie banner to add.",
          },
          {
            q: "Where is my page hosted?",
            a: "On Cloudflare's global edge over HTTPS. Your link redirects to the isolated render origin, and the page is served from the edge location closest to each reader.",
          },
          {
            q: "Is my content isolated?",
            a: "Yes. Every doc is served on a separate origin, view.ilolink.com, under a strict content-security policy (default-src 'none'). By default scripts are dropped and interactive JS is frozen to static; if you mark a doc trusted, its scripts run sandboxed in an opaque-origin frame on that same isolated origin.",
          },
          {
            q: "Can you tell who read my page?",
            a: "No. Everything reported is aggregate — views, scroll depth, countries, device class, referrers. There's no per-person identity and no cross-site profile.",
          },
        ]}
      />

      <Cta sub="Publish one and see for yourself." />

      <RelatedLinks
        links={[
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps, and feedback",
            blurb:
              "What ilolink measures once a page is live — views, scroll funnels, heatmaps, reactions, and anchored comments.",
          },
          {
            path: "/privacy",
            title: "Privacy",
            blurb:
              "The cookieless approach in full — what's collected, what isn't, and why measurement stays aggregate.",
          },
        ]}
      />
    </Article>
  );
}
