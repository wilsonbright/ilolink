import type { Metadata } from "next";
import { JsonLd, article } from "@/lib/seo/jsonld";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Prose,
  Faq,
  Cta,
  RelatedLinks,
} from "../_components/content";

export const metadata: Metadata = {
  title: "ilolink FAQ — accounts, privacy, formats & limits",
  description:
    "Straight answers: no account needed, publishing is free, no cookies, publish Markdown/HTML/images/files up to 2 MB, and links don't expire unless you set them to.",
  alternates: { canonical: "/faq" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/faq",
            headline: "ilolink FAQ — accounts, privacy, formats & limits",
            description:
              "Common questions about ilolink: accounts, price, cookies, supported formats, size limits, expiry, passwords, editing, and safety of pasted AI HTML.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ]}
      />
      <PageHeader
        title="ilolink FAQ"
        lead={
          <>
            No, you don&apos;t need an account, and publishing is free. ilolink
            uses no cookies. Paste Markdown or HTML, or drop an image or file, up
            to 2 MB per doc. Links don&apos;t expire unless you set an expiry
            yourself.
          </>
        }
      />
      <Prose>
        <p>
          Short, honest answers to what people ask most. If something isn&apos;t
          here, the <a href="/guides">guides</a> and{" "}
          <a href="/glossary">glossary</a> go deeper, and <a href="/status">status</a>{" "}
          shows what&apos;s live right now.
        </p>
      </Prose>
      <Faq
        items={[
          {
            q: "Do I need an account?",
            a: "No. ilolink is accountless. Paste your Markdown or HTML, or drop a file, and you get an ilolink.com/<slug> link to share. You keep a private dashboard link for that doc.",
          },
          {
            q: "Is it free?",
            a: "Publishing is free.",
          },
          {
            q: "Do you use cookies or track readers?",
            a: "No cookies. Analytics are cookieless, built on a rotating visitor hash with no fingerprinting, no cross-site tracking, and no per-person profile. Unique counts are approximate by design and aggregate only.",
          },
          {
            q: "What can I publish?",
            a: "Markdown, HTML, images, and files. Slide decks (pptx), audio, and video hosting are not supported yet.",
          },
          {
            q: "How big can a doc be?",
            a: "Up to 2 MB per doc.",
          },
          {
            q: "Do links expire?",
            a: "Not by default. Expiry is opt-in, so you set it only if you want the link to stop working after a date.",
          },
          {
            q: "Can I password-protect a doc?",
            a: "Yes. Visibility options are public, unlisted, password-protected, and expiring.",
          },
          {
            q: "Can I edit a doc after publishing?",
            a: "Docs are immutable. To change one, publish a new doc and share the new link. There's no version rollback or edit history yet.",
          },
          {
            q: "Is pasted AI HTML safe to publish?",
            a: "Yes. On ingest we sanitize it: scripts and JavaScript are dropped, interactive JS is frozen to static, CSS is kept, and forms are made inert. Every doc is served on an isolated view.ilolink.com origin under a strict CSP with default-src 'none'.",
          },
          {
            q: "Will an interactive app or widget run on my page?",
            a: "No. Interactive JavaScript is frozen to static, so buttons, calculators, and app logic won't run. The layout, styling, and content render exactly as designed.",
          },
          {
            q: "Who can see my analytics?",
            a: "Only you, through the private dashboard link for that doc. Readers see the page, not the numbers.",
          },
          {
            q: "Can readers comment or react?",
            a: "Yes, and without an account. Readers can leave reactions, short notes, and threaded comments anchored to the page.",
          },
        ]}
      />
      <Cta sub="Publish your first doc." />
      <RelatedLinks
        links={[
          {
            path: "/guides/quick-start",
            title: "Quick start",
            blurb: "Paste, publish, and share a link in under a minute.",
          },
          {
            path: "/guides/limitations",
            title: "Limitations",
            blurb: "What ilolink does, what it doesn't, and what's on the roadmap.",
          },
        ]}
      />
    </Article>
  );
}
