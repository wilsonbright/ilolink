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
  title: "ilolink for teachers — ilolink",
  description:
    "Share a handout, lesson, or reading as a link and see how far the class got — in aggregate, never per student. No student accounts, no cookies, no profiles.",
  alternates: { canonical: "/for/teachers" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/for/teachers",
            headline: "ilolink for teachers",
            description:
              "Share a handout, lesson, or reading as a link and see how far the class got — in aggregate, never per student. Cookieless, with no student accounts or profiles.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "For", path: "/for/teachers" },
          { name: "Teachers", path: "/for/teachers" },
        ]}
      />
      <PageHeader
        title="ilolink for teachers"
        lead={
          <>
            Share a handout, lesson, or reading as a link and see how far the
            class got — in aggregate, never per student. No accounts for
            students, no cookies, no personal profiles. Just a page they open
            and read.
          </>
        }
      />
      <Prose>
        <h2>Share a handout or lesson as a page</h2>
        <p>
          Paste the Markdown or HTML — from your own notes, a lesson planner, or
          an AI draft — or drop a file into the composer at{" "}
          <a href="/">ilolink.com</a>. You get{" "}
          <code>ilolink.com/&lt;slug&gt;</code>, a normal web page that opens in
          any browser. Students just open the link. No account for them, no
          account for you, no sign-in wall between a student and the reading.
        </p>
        <p>
          Post the link in your LMS, a class chat, or an email. The cap is 2 MB
          per doc, it&apos;s served over HTTPS on a global edge, and pasted HTML
          is sanitized on the way in, so a page is safe to hand to a whole
          class.
        </p>

        <h2>See engagement without surveilling students</h2>
        <p>
          Once the link is out, ilolink shows you how the page was read — and
          only in aggregate. It is <strong>cookieless</strong>: no cookies, no
          fingerprint, no login, and no personal profile. It <em>cannot</em>{" "}
          identify an individual student, and there is no per-student view
          anywhere in the product. What you see is the class as a whole:
        </p>
        <ul>
          <li>
            <strong>Scroll funnel</strong> bucketed at 0 / 25 / 50 / 75 / 100%,
            so you learn how far the class got — did most reach the last
            question, or stop halfway?
          </li>
          <li>
            <strong>Total views</strong> and an <strong>approximate</strong>{" "}
            unique count — approximate by design, built from a rotating visitor
            hash, never a named roster.
          </li>
          <li>
            <strong>Average time on page</strong> — a quick skim reads
            differently from a real attempt.
          </li>
        </ul>
        <p>
          Every number is aggregate and anonymous. You learn how the reading
          landed for the group, not which student read what. For the full read
          side, see{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps, and feedback
          </a>{" "}
          or open <a href="/dashboard">your documents</a> after you publish one.
        </p>

        <h2>Keep it controlled</h2>
        <p>
          Pick how visible each page is when you publish:
        </p>
        <ul>
          <li>
            <strong>Unlisted</strong> — the link works for anyone you give it to,
            but it isn&apos;t listed or indexed.
          </li>
          <li>
            <strong>Password</strong> — hand one password to a specific class so
            the reading stays with them.
          </li>
          <li>
            <strong>Expiring</strong> — for timed material like a quiz sheet or a
            deadline reading, set it to lapse. Expiry is opt-in; nothing expires
            unless you choose it.
          </li>
        </ul>
        <p>
          Docs are immutable — one version per link. Fix a typo or update a
          worksheet and you publish a fresh link, so an old copy never quietly
          changes under students who already opened it. You manage and delete
          from the same browser you published in.
        </p>
      </Prose>

      <Callout title="No per-student tracking, ever">
        ilolink is cookieless and aggregate. Unique views are approximate, from
        a rotating visitor hash with no fingerprint and no profile — so you see
        how far and how long the class read, and there is no way, anywhere, to
        tell which student did it.
      </Callout>

      <Faq
        items={[
          {
            q: "Can I see which student read it?",
            a: "No. ilolink is cookieless and aggregate — it cannot identify individual students, and there is no per-student view in the product. You see how far the class got and how long they spent, never which named student read what.",
          },
          {
            q: "Do students need an account?",
            a: "No. The link opens as a normal web page in any browser. There's no sign-in wall between a student and the reading, and no account for you either.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing is free — paste Markdown or HTML, or drop a file up to 2 MB, and get a link at no cost.",
          },
          {
            q: "Can I limit a page to one class?",
            a: "Yes. Make it unlisted so it isn't listed, or password-protect it and hand the password to that class. For timed material, set an opt-in expiry so the link lapses.",
          },
        ]}
      />

      <Cta sub="Share your next handout." />

      <RelatedLinks
        links={[
          {
            path: "/guides/markdown-to-web-page",
            title: "Turn Markdown into a web page",
            blurb:
              "Paste a Markdown handout or reading and get a clean, shareable page — the fastest path for class material.",
          },
          {
            path: "/guides/reading-your-analytics",
            title: "Reading your analytics",
            blurb:
              "What the aggregate numbers mean: views, the scroll funnel, and time on page — and why none of it identifies a student.",
          },
        ]}
      />
    </Article>
  );
}
