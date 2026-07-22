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
  title: "Report abuse or file a DMCA takedown — ilolink",
  description:
    "How to flag an abusive ilolink page or file a DMCA takedown: the URL, the issue, your contact, a good-faith statement, and what happens after you report.",
  alternates: { canonical: "/report" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/report",
            headline: "Report abuse or file a takedown",
            description:
              "How to report an abusive ilolink page or file a DMCA takedown, what to include, and what happens next.",
            datePublished: "2026-07-21",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Report", path: "/report" },
        ]}
      />
      <PageHeader
        title="Report abuse or file a takedown"
        lead={
          <>
            To flag a hosted page or file, email{" "}
            <a href="mailto:abuse@ilolink.com">abuse@ilolink.com</a> with the
            full <code>ilolink.com/&lt;slug&gt;</code> URL and what&rsquo;s
            wrong. For copyright, add a DMCA notice with your contact and a
            good-faith statement. We review, and remove pages that break the
            rules.
          </>
        }
      />

      <Callout title="Draft — not yet legally reviewed">
        This page describes our intended process. It is a working draft, not
        legal advice, and has not been reviewed by counsel. The contact address
        below is a placeholder while we finish setup.
      </Callout>

      <Prose>
        <h2>Report abusive content</h2>
        <p>
          Anyone can report a page — you don&rsquo;t need an account, and you
          don&rsquo;t need to be the publisher. Email{" "}
          <a href="mailto:abuse@ilolink.com">abuse@ilolink.com</a>{" "}
          <strong>(placeholder)</strong> and include:
        </p>
        <ul>
          <li>
            The full link, e.g. <code>ilolink.com/abc123</code>. One per report
            is easiest; a list is fine too.
          </li>
          <li>
            What&rsquo;s wrong — phishing, malware, spam, harassment,
            impersonation, or another violation of our{" "}
            <a href="/acceptable-use">acceptable use policy</a>.
          </li>
          <li>Anything that helps us verify it (a screenshot, a short note).</li>
        </ul>
        <p>
          Pages are served under a strict content policy on the isolated{" "}
          <code>view.ilolink.com</code> origin. By default uploaded HTML is
          sanitized on ingest and its scripts are frozen to static; a doc the
          publisher marks trusted runs its own scripts as-is, but sandboxed on
          that same isolated origin — so either way a report is about the{" "}
          <em>content</em> of a page, not code touching your machine.
        </p>

        <h2>File a DMCA takedown</h2>
        <p>
          If a hosted page copies work you own, send a takedown notice to{" "}
          <a href="mailto:abuse@ilolink.com">abuse@ilolink.com</a>{" "}
          <strong>(placeholder)</strong>. To be actionable, a notice should
          include:
        </p>
        <ol>
          <li>
            The <code>ilolink.com/&lt;slug&gt;</code> URL of the page you want
            removed.
          </li>
          <li>
            Identification of the copyrighted work, or a link to where the
            original lives.
          </li>
          <li>
            Your name, email, and mailing address so we can reach you and
            forward a counter-notice.
          </li>
          <li>
            A good-faith statement that you believe the use isn&rsquo;t
            authorized by the owner, its agent, or the law.
          </li>
          <li>
            A statement, under penalty of perjury, that the information is
            accurate and you&rsquo;re the owner or authorized to act on their
            behalf.
          </li>
          <li>Your physical or electronic signature.</li>
        </ol>

        <h2>What happens after you report</h2>
        <p>
          We acknowledge receipt, review the page against our policy, and act.
          Valid reports usually end in the page being removed or disabled;
          because docs are immutable and ownership is just a per-doc manage token
          in the publisher&rsquo;s browser, removal is the primary remedy. Where
          we can identify the publisher by their contact details, we tell them
          what was removed and why. Clear-cut phishing or malware comes down
          fast; genuine disputes take longer.
        </p>

        <h2>Counter-notice</h2>
        <p>
          If your page was removed over a copyright claim you believe is
          mistaken, you can send a counter-notice to{" "}
          <a href="mailto:abuse@ilolink.com">abuse@ilolink.com</a>{" "}
          <strong>(placeholder)</strong>. Include the URL that was removed, your
          contact details, and a statement, under penalty of perjury, that you
          have a good-faith belief the page was removed by mistake or
          misidentification. We forward valid counter-notices to the original
          reporter. If they don&rsquo;t pursue the matter, the page may be
          restored.
        </p>
      </Prose>

      <Faq
        items={[
          {
            q: "Do I need an account to report a page?",
            a: "No. ilolink is accountless. Email abuse@ilolink.com (placeholder) with the ilolink.com/<slug> URL and the issue — anyone can report, publisher or not.",
          },
          {
            q: "How fast is a page taken down?",
            a: "Clear phishing or malware is removed quickly once verified. Copyright and disputed cases take longer because we review the notice and, where possible, contact the publisher.",
          },
          {
            q: "What if my page was removed by mistake?",
            a: "Send a counter-notice to abuse@ilolink.com (placeholder) with the removed URL, your contact details, and a good-faith statement. We forward valid counter-notices to the original reporter.",
          },
        ]}
      />

      <Cta
        label="Read the acceptable use policy"
        href="/acceptable-use"
        sub="See what's allowed on ilolink before you report or publish."
      />
    </Article>
  );
}
