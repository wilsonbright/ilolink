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
} from "../_components/content";

export const metadata: Metadata = {
  title: "Privacy policy — ilolink",
  description:
    "ilolink is cookieless and accountless. Analytics use a rotating visitor hash — no fingerprint, no personal profile. We collect as little as possible.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/privacy",
            headline: "Privacy policy",
            description:
              "How ilolink handles data: cookieless, accountless, anonymous analytics from a rotating visitor hash.",
            datePublished: "2026-07-21",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ]}
      />
      <PageHeader
        title="Privacy policy"
        lead={
          <>
            ilolink is cookieless and accountless. There is no login. Analytics
            come from a rotating visitor hash — no fingerprint, no personal
            profile, uniques approximate by design. We collect as little as
            possible to run the service.
          </>
        }
      />

      <Callout title="Draft — not yet legally reviewed">
        <p>
          This is a plain-language placeholder that describes how the product
          actually works today. It has not been through legal review and is not
          a final legal document. When counsel signs off, this page will be
          replaced with the reviewed version. Nothing here creates a contract;
          see the <a href="/terms">terms</a> for that.
        </p>
      </Callout>

      <Prose>
        <h2>The short version</h2>
        <ul>
          <li>
            <strong>No cookies.</strong> We set no cookies on readers or
            publishers. Nothing to consent to, nothing to reject.
          </li>
          <li>
            <strong>No accounts.</strong> You never sign up. Ownership of a doc
            is a per-doc manage token kept in your browser, not a server-side
            account tied to your identity.
          </li>
          <li>
            <strong>Anonymous, approximate analytics.</strong> Reader stats are
            derived from a rotating visitor hash. There is no fingerprint and no
            personal profile. Unique-view counts are approximate on purpose.
          </li>
          <li>
            <strong>Hosted on Cloudflare&apos;s edge.</strong> The service runs
            on Cloudflare globally over HTTPS. Docs render under a strict CSP on
            an isolated origin, <code>view.ilolink.com</code>.
          </li>
          <li>
            <strong>Publishers see aggregates only.</strong> As a publisher you
            see counts, averages, funnels, heatmaps, and anonymous reader
            reactions and comments — never a named identity behind a view.
          </li>
        </ul>

        <h2>What we collect</h2>
        <p>
          <em>Placeholder — pending legal review.</em> We aim to collect the
          minimum needed to publish a doc and report how it was read:
        </p>
        <ul>
          <li>
            <strong>The document you publish.</strong> The Markdown, HTML, or
            file you paste or drop, up to 2 MB per doc. Untrusted AI HTML is
            sanitized on ingest before it is stored or served.
          </li>
          <li>
            <strong>Visibility settings you choose.</strong> Public, unlisted,
            password, or an opt-in expiry.
          </li>
          <li>
            <strong>Anonymous read events.</strong> For each view: a rotating
            visitor hash, approximate country, device class, referrer, time on
            page, and scroll depth bucketed at 0/25/50/75/100%. Heatmap data is
            click and scroll position, not identity.
          </li>
          <li>
            <strong>Reader feedback and comments.</strong> Reactions, short
            notes, and threaded comments readers choose to leave. These are tied
            to the doc, not to an account.
          </li>
        </ul>

        <h2>How analytics work</h2>
        <p>
          <em>Placeholder — pending legal review.</em> Instead of cookies or a
          device fingerprint, we compute a short-lived <strong>rotating
          visitor hash</strong> and use it to approximate unique views. Because
          the hash rotates and carries no stable identifier, the same person may
          be counted more than once across time — that is why uniques are
          labelled approximate everywhere they appear. We do not build a profile
          of any reader and do not track people across other sites. Analytics,
          heatmaps, feedback, and comments are all cookieless. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            how the analytics work
          </a>{" "}
          for the product detail.
        </p>

        <h2>Cookies</h2>
        <p>
          <em>Placeholder — pending legal review.</em> We do not use cookies for
          analytics, advertising, or tracking. Any storage in your browser is
          limited to what the app needs to function — for example, keeping your
          per-doc manage token so you can return to a doc you published from{" "}
          <a href="/dashboard">your documents</a>. There is no cross-site
          tracking and no third-party advertising cookies.
        </p>

        <h2>Data processors</h2>
        <p>
          <em>Placeholder — pending legal review.</em> The service runs on{" "}
          <strong>Cloudflare</strong>, which provides edge compute, storage, and
          network delivery. Cloudflare processes requests to serve your doc and
          record anonymous read events on our behalf. Their handling of that
          data is governed by their own terms and privacy commitments. We will
          list any additional processors here as the product grows.
        </p>

        <h2>Your rights (GDPR / CCPA)</h2>
        <p>
          <em>Placeholder — pending legal review.</em> Because we hold no
          accounts and build no personal profiles, there is little personal data
          tied to you to begin with. Where applicable law gives you rights to
          access, correct, or delete personal data, you can{" "}
          <a href="/report">reach us through the report channel</a> and we will
          act on valid requests. Publishers can delete a doc they control using
          its manage token, which removes the doc and its associated analytics.
          This section will be expanded with formal request procedures during
          legal review.
        </p>

        <h2>Contact</h2>
        <p>
          <em>Placeholder — pending legal review.</em> For privacy questions,
          data requests, or to report abuse of a published doc, use the{" "}
          <a href="/report">report channel</a>. Acceptable use of the service is
          covered in the <a href="/acceptable-use">acceptable-use policy</a>,
          and the full service terms live at <a href="/terms">terms</a>.
        </p>
      </Prose>

      <Faq
        items={[
          {
            q: "Does ilolink use cookies?",
            a: "No. The service is cookieless. Analytics come from a rotating visitor hash rather than cookies, so there is no tracking cookie to consent to or reject.",
          },
          {
            q: "Do I need an account, and do you have my personal data?",
            a: "There is no account. Ownership of a doc is a per-doc manage token kept in your browser, so there is no server-side identity profile tied to you.",
          },
          {
            q: "Can a publisher see who read their doc?",
            a: "No. Publishers see aggregate and anonymous data — counts, approximate uniques, average time, scroll funnel, heatmaps, and anonymous reactions and comments — never a named reader.",
          },
          {
            q: "Is this the final privacy policy?",
            a: "No. This is a plain-language placeholder that matches how the product works today. It has not been through legal review and will be replaced with the reviewed version.",
          },
        ]}
      />

      <Cta sub="No account, no cookies. Paste a doc and get a link." />
    </Article>
  );
}
