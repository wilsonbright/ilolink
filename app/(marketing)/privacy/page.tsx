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
    "Readers are never tracked and never sign in. Analytics use a rotating visitor hash — no fingerprint, no profile. Publishers give us an email and nothing more.",
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
              "How ilolink handles data: no reader cookies, no reader accounts, anonymous analytics from a rotating visitor hash.",
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
            Readers are never tracked and never asked to sign in. Analytics
            come from a rotating visitor hash — no fingerprint, no personal
            profile, uniques approximate by design. Publishing needs an
            account, for which we store an email address and nothing more.
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
            <strong>No cookies for readers.</strong> Opening a published page
            sets nothing on your device — nothing to consent to, nothing to
            reject. Signed-in publishers have one session cookie, which is
            strictly necessary to keep you signed in and is never used for
            tracking or advertising.
          </li>
          <li>
            <strong>Readers never need an account.</strong> Anyone with a link
            can open a page, and can react or leave a comment without signing
            in. Publishing requires an account: we store your email address so
            you can sign in and so teammates can share documents with you. No
            password is ever set, and we ask for nothing else.
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
            file you paste or drop, up to 15 MB per doc. By default, uploaded
            HTML is sanitized on ingest before it is stored or served. If you
            explicitly mark a document as trusted at publish time, it is stored
            and served unsanitized inside a sandboxed frame on the isolated
            origin; you are responsible for content you publish as trusted.
          </li>
          <li>
            <strong>Visibility settings you choose.</strong> Public, unlisted,
            private (teamspace members only),
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
          heatmaps, and feedback never involve a cookie. Comments do not either,
          unless you choose to sign in so your name appears beside them. See{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            how the analytics work
          </a>{" "}
          for the product detail.
        </p>

        <h2>Cookies</h2>
        <p>
          <em>Placeholder — pending legal review.</em> We use no cookies for
          analytics, advertising, or tracking, and there are no third-party
          cookies at all.
        </p>
        <p>
          Reading a published page sets nothing on your device. If you sign in
          to publish, we set one strictly necessary session cookie so you stay
          signed in between visits. It is host-locked to ilolink.com, is never
          sent to the domain that serves published documents, and carries no
          information about you beyond an opaque random value.
        </p>

        <h2>What we store about you</h2>
        <p>
          <em>Placeholder — pending legal review.</em> If you have an account we
          store your <strong>email address</strong> — needed to sign you in and
          to let teammates share documents with you — and an optional display
          name if you set one. We never set or store a password.
        </p>
        <p>
          Each active sign-in also records a session row: when it was created
          and last used, and a truncated one-way hash of the browser and IP it
          came from. Those hashes exist so you can recognise your own sessions
          and end them; they are not reversible and are not used to build a
          profile. Signing out deletes the session; there is a
          &ldquo;sign out everywhere&rdquo; that ends all of them at once.
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
          <em>Placeholder — pending legal review.</em> Because a publisher
          account holds only an email address and we build no personal profiles,
          there is little personal data tied to you to begin with. Where
          applicable law gives you rights to access, correct, or delete personal
          data, you can <a href="/report">reach us through the report channel</a>{" "}
          and we will act on valid requests. Publishers can delete a doc they
          control from their dashboard, which removes the doc and its associated
          analytics.
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
            a: "Not for readers — opening a published page sets nothing on your device, and analytics come from a rotating visitor hash rather than cookies. Signed-in publishers have one strictly necessary session cookie, which is never used for tracking or advertising. There is no third-party or advertising cookie anywhere. Reject.",
          },
          {
            q: "Do I need an account, and do you have my personal data?",
            a: "Readers do not. Publishing requires one, and we store an email address for it — no password, no profile, and nothing we did not need to sign you in and let teammates share with you.",
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

      <Cta sub="Readers never sign in and are never tracked. Paste a doc and get a link." />
    </Article>
  );
}
