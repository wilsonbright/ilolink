import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import { Article, Breadcrumbs, PageHeader, Prose, Callout, Faq } from "../_components/content";

export const metadata: Metadata = {
  title: "Terms of service — ilolink",
  description:
    "Plain-language terms for ilolink: publish lawful content, don't abuse the service, hosting and links are provided as-is, and you keep your content.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/terms",
            headline: "Terms of service",
            description:
              "Plain-language terms for using ilolink: lawful content, no abuse, as-is hosting, you keep your content.",
            datePublished: "2026-07-21",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Terms", path: "/terms" },
        ]}
      />
      <PageHeader
        title="Terms of service"
        lead={
          <>
            Use ilolink to publish lawful content and don&apos;t abuse the service. You keep
            your content; we just host it. Links and hosting are provided as-is, with no
            guaranteed uptime. There&apos;s no account to close &mdash; ownership is a manage token
            in your browser.
          </>
        }
      />
      <Prose>
        <p>
          <strong>Short version.</strong> Paste or upload lawful content, keep it under 2 MB
          per doc, and don&apos;t use ilolink to attack, deceive, or harm anyone. What you
          publish stays yours. The service comes with no warranty and can change. These full
          terms sit on top of that summary. Also see our{" "}
          <a href="/acceptable-use">acceptable use policy</a> and{" "}
          <a href="/privacy">privacy policy</a>.
        </p>

        <h2>Using ilolink</h2>
        <p>
          ilolink is accountless. You paste Markdown or HTML, or drop a file, and get a link
          at ilolink.com/&lt;slug&gt;. There&apos;s no login and no server-side account: control
          over a doc is a per-doc manage token stored in your browser. Keep that token safe.
          If you lose it, you lose the ability to edit or unpublish that doc, and we can&apos;t
          recover it for you.
        </p>

        <h2>Your content and ownership</h2>
        <p>
          You keep all rights to what you publish. By publishing, you grant ilolink the
          limited permission needed to store, sanitize, and serve your content so the link
          works. Untrusted HTML is sanitized on ingest and interactive scripts are frozen to
          static output &mdash; that&apos;s a safety step, not a claim on your work. You&apos;re
          responsible for having the right to publish whatever you post.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Don&apos;t publish content that&apos;s illegal, infringing, deceptive, or built to harm
          readers or the service. The specifics live in the{" "}
          <a href="/acceptable-use">acceptable use policy</a>, which forms part of these
          terms. We may remove content or disable a link that breaks those rules.
        </p>

        <h2>Availability and changes</h2>
        <p>
          ilolink runs on Cloudflare&apos;s edge over HTTPS, but we don&apos;t promise any specific
          uptime, and docs are currently immutable (one version, no rollback). We may change,
          suspend, or discontinue features, and we may update these terms. Material changes
          will be dated here.
        </p>

        <h2>Disclaimer and liability</h2>
        <p>
          The service, your links, and hosting are provided &quot;as-is&quot; and &quot;as-available,&quot;
          without warranties of any kind. To the extent the law allows, ilolink isn&apos;t liable
          for indirect or consequential damages, or for lost content, arising from your use of
          the service.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms, or need to flag content? Use the{" "}
          <a href="/report">report page</a>. Service status is posted at{" "}
          <a href="/status">status</a>.
        </p>
      </Prose>

      <Callout title="Draft — not yet legally reviewed">
        This is a plain-language placeholder written to match how ilolink actually works. It
        hasn&apos;t been reviewed by a lawyer and isn&apos;t final legal language. Treat it as a good-faith
        description of the terms, not the finished contract.
      </Callout>

      <Faq
        items={[
          {
            q: "Do I need an account to agree to these terms?",
            a: "No. ilolink is accountless. Publishing a doc means you accept these terms; control over that doc is a manage token kept in your browser, not a login.",
          },
          {
            q: "Who owns what I publish?",
            a: "You do. You grant ilolink only the permission needed to store, sanitize, and serve your content so the link works.",
          },
          {
            q: "Is there any uptime guarantee?",
            a: "No. Hosting runs on Cloudflare's edge over HTTPS, but links and hosting are provided as-is with no promised uptime.",
          },
          {
            q: "What are the content limits?",
            a: "Up to 2 MB per doc (raw body or file), and content must be lawful and follow the acceptable use policy.",
          },
        ]}
      />
    </Article>
  );
}
