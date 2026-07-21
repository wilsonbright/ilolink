import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import { Article, Breadcrumbs, PageHeader, Prose, Callout, Faq, Cta } from "../_components/content";

export const metadata: Metadata = {
  title: "Acceptable-use policy — ilolink",
  description:
    "What you can and can't host on ilolink, and how content is moderated. Scripts are stripped on ingest and every doc renders sandboxed on view.ilolink.com.",
  alternates: { canonical: "/acceptable-use" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/acceptable-use",
            headline: "Acceptable-use policy",
            description:
              "What you can and can't host on ilolink, and how content is moderated.",
            datePublished: "2026-07-21",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Acceptable use", path: "/acceptable-use" },
        ]}
      />
      <PageHeader
        title="Acceptable-use policy"
        lead={
          <>
            Host documents, mockups, and reports — not malware, phishing, or
            illegal content. Untrusted HTML is sanitized on ingest, so no
            scripts run and interactive apps are frozen to static, and every doc
            renders under a strict CSP on an isolated origin, view.ilolink.com.
          </>
        }
      />
      <Prose>
        <p>
          ilolink turns pasted Markdown or HTML into a shareable page. You are
          responsible for what you publish. This page covers what is allowed,
          what is not, and how we act on reports. It sits alongside the{" "}
          <a href="/terms">terms</a>.
        </p>

        <h2>What you can host</h2>
        <p>
          Anything you have the right to share and that is safe to open:
          landing-page mockups, design comps, docs, memos, reports, and other
          output from an AI chatbot or your own work. CSS is kept so mockups
          still look right. Uploads are capped at 2 MB per doc.
        </p>

        <h2>What's not allowed</h2>
        <ul>
          <li>
            <strong>Malware and phishing.</strong> No pages built to steal
            credentials, impersonate a login, install software, or trick a
            reader. Scripts never execute, but a static page can still deceive —
            that is banned regardless.
          </li>
          <li>
            <strong>Illegal content.</strong> No child sexual abuse material, no
            content that infringes copyright or trademark you don't hold, and
            nothing whose distribution breaks applicable law.
          </li>
          <li>
            <strong>Abuse and harm.</strong> No harassment, threats,
            doxxing, or incitement to violence. No spam or bulk deceptive
            content.
          </li>
        </ul>

        <h2>How moderation works</h2>
        <p>
          Publishing is accountless, so there is no upfront review — you paste,
          you get a link. The security model does the first pass automatically:
          on ingest we drop <code>javascript:</code>, <code>data:</code>, and{" "}
          <code>vbscript:</code> URLs, strip anything that would run JavaScript,
          make forms inert, and serve the result sandboxed under{" "}
          <code>default-src 'none'</code> on view.ilolink.com. That contains
          technical attacks, not deception or illegal content — those we act on
          after a report.
        </p>

        <h2>Reporting and takedown</h2>
        <p>
          Anyone can flag a page. Use <a href="/report">/report</a> with the
          ilolink.com link and a short reason. We review reports and remove docs
          that break this policy. We don't need to reach the publisher first —
          ownership is a manage token in a browser, not an account — so removal
          may be the only action available.
        </p>

        <h2>Enforcement</h2>
        <p>
          Confirmed violations get the doc taken down. Where a link points to a
          clear, ongoing threat, we may remove it before finishing a full
          review. We keep no personal profile of publishers or readers, so
          enforcement acts on documents, not identities.
        </p>
      </Prose>

      <Callout title="Draft — not yet legally reviewed">
        This policy is a working draft written for clarity, not a finished legal
        document. It hasn't been through legal review and may change. It doesn't
        create rights or obligations beyond the <a href="/terms">terms</a>.
      </Callout>

      <Faq
        items={[
          {
            q: "Do you review pages before they publish?",
            a: "No. Publishing is accountless and instant. The sanitizer strips scripts and sandboxes the render automatically on ingest; policy violations like phishing or illegal content are handled after a report.",
          },
          {
            q: "How do I report a page?",
            a: "Go to /report, paste the ilolink.com link, and give a short reason. We review and take down docs that break this policy.",
          },
          {
            q: "Can a hosted page run code against a reader?",
            a: "No. Every doc renders on the isolated origin view.ilolink.com under a strict CSP with default-src 'none', no JavaScript executes, and forms are inert. A static mockup can still try to deceive, which is why phishing is banned outright.",
          },
          {
            q: "What happens to a doc that breaks the rules?",
            a: "It gets removed. For a clear, ongoing threat we may take it down before finishing a full review.",
          },
        ]}
      />

      <Cta sub="Paste Markdown or HTML, get a link. No account." />
    </Article>
  );
}
