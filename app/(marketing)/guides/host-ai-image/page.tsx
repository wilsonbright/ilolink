import type { Metadata } from "next";
import { JsonLd, article, howTo } from "@/lib/seo/jsonld";
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
  title: "How to host and share an AI-generated image — ilolink",
  description:
    "Embed an AI-generated image in a small HTML or Markdown doc, publish it on ilolink for a link, then see who opened it, from where, on what device.",
  alternates: { canonical: "/guides/host-ai-image" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/host-ai-image",
            headline: "How to host and share an AI-generated image",
            description:
              "Put an AI-generated image in a small HTML or Markdown doc, publish it on ilolink, get a link, and see who opened it — views, referrers, devices, and comments.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Host and share an AI-generated image with ilolink",
            description:
              "Embed your AI image in a small HTML or Markdown doc and publish it to a shareable ilolink URL with built-in analytics.",
            steps: [
              {
                name: "Save the image file",
                text: "Save the image your model generated (PNG, JPG, or WebP). If it's a large render, compress it so the whole doc stays under the 2 MB cap.",
              },
              {
                name: "Put it in a small doc",
                text: "Drop the file into ilolink directly, or wrap it in a one-line doc: an <img src> tag in HTML, or ![alt](image) in Markdown, with an optional caption.",
              },
              {
                name: "Paste or drop into ilolink",
                text: "Open the composer at the ilolink home page and paste the HTML or Markdown, or drop the image file. No login is required.",
              },
              {
                name: "Set visibility and publish",
                text: "Choose public, unlisted, password, or an opt-in expiry, then publish to get an ilolink.com/<slug> link that redirects to the isolated view.ilolink.com render origin.",
              },
              {
                name: "Share the link and watch analytics",
                text: "Send the link. In the dashboard, see total views, approximate uniques, referrers, countries, device class, and reader comments — all cookieless.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Host an AI image", path: "/guides/host-ai-image" },
        ]}
      />
      <PageHeader
        title="How to host and share an AI-generated image"
        lead={
          <>
            Put your AI-generated image in a small HTML or Markdown doc, publish
            it on ilolink, and get a link. Then see who opened it — views,
            referrers, countries, and device class — with no account and no
            cookies.
          </>
        }
      />
      <Prose>
        <h2>How do I turn an image into a shareable page?</h2>
        <p>
          You have an image file, not a page — so wrap it in a small doc and
          publish that. Two ways, both under a minute:
        </p>
        <ul>
          <li>
            <strong>HTML</strong> — a single{" "}
            <code>&lt;img src=&quot;...&quot;&gt;</code> tag, optionally with a
            caption and a little CSS. ilolink keeps the CSS, so a framed,
            captioned image renders the way you laid it out.
          </li>
          <li>
            <strong>Markdown</strong> — one line:{" "}
            <code>![alt text](image-url)</code>, plus a heading or caption if you
            want. It renders in a clean reading shell.
          </li>
          <li>
            <strong>Just the file</strong> — drop the image straight into the
            composer and ilolink builds the page around it.
          </li>
        </ul>
        <p>
          Mind the <strong>2 MB per-doc cap</strong> — it covers the raw body or
          file. AI renders are often big, so compress large PNGs (or export as
          WebP) before you publish. One image comfortably fits; a gallery of
          full-resolution renders may not.
        </p>

        <h2>How to publish an AI image</h2>
        <ol>
          <li>
            Save the image your model gave you. If it&apos;s a heavy render,
            compress it so the doc stays under 2 MB.
          </li>
          <li>
            Put it in a small doc — an <code>&lt;img&gt;</code> in HTML, a
            Markdown image, or just the file itself — with an optional caption.
          </li>
          <li>
            Open the{" "}
            <a href="/">composer</a> and paste the HTML or Markdown, or drop the
            file. No login.
          </li>
          <li>
            Pick visibility — public, unlisted, password, or an opt-in expiry —
            and publish. You get an <code>ilolink.com/&lt;slug&gt;</code> link
            that 302-redirects to the isolated <code>view.ilolink.com</code>{" "}
            render origin under a strict CSP.
          </li>
          <li>
            Share the link. Track it in your{" "}
            <a href="/dashboard">dashboard</a> — ownership is a per-doc manage
            token kept in your browser, so keep that tab or device.
          </li>
        </ol>

        <h2>What you see after sharing</h2>
        <p>
          Once the link is out, ilolink shows you how it landed — all cookieless,
          no fingerprint, no personal profile:
        </p>
        <ul>
          <li>
            <strong>Total views</strong> and <strong>approximate uniques</strong>{" "}
            (uniques are approximate by design), plus 30-day daily views.
          </li>
          <li>
            <strong>Referrers</strong> — where opens came from, so you can tell a
            Slack share from a tweet.
          </li>
          <li>
            <strong>Countries</strong> and <strong>device class</strong> — is
            your render being viewed on phones, where you should check it looks
            right small.
          </li>
          <li>
            <strong>Comments and reactions</strong> — threaded, anchored to the
            doc, no account needed to leave one.
          </li>
        </ul>
        <p>
          One honest note: <strong>scroll depth matters less for a single
          image</strong>. The 0/25/50/75/100% funnel is built for long pages;
          for a one-image doc, views, referrers, devices, and feedback are the
          signals worth watching. For the full breakdown of every metric, see the{" "}
          <a href="/guides/analytics-heatmaps-feedback">
            analytics, heatmaps &amp; feedback
          </a>{" "}
          guide.
        </p>

        <Callout title="What ilolink won't do with an image">
          <p>
            No audio or video hosting — media isn&apos;t shipped, so this is for
            still images embedded in a doc. Docs are immutable: to change the
            image you publish a new one. The 2 MB cap is firm, so compress before
            you upload rather than after you hit it.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "What image formats work?",
            a: "Common web image formats — PNG, JPG, WebP, GIF, SVG — embedded in an HTML or Markdown doc, or dropped in as a file. CSS is kept, so a captioned or framed layout renders as you built it.",
          },
          {
            q: "Is there a size limit?",
            a: "Yes — 2 MB per doc, covering the raw body or file. AI renders are often large, so compress big PNGs or export as WebP before publishing.",
          },
          {
            q: "Does someone need an account to view the image?",
            a: "No. Anyone with the link opens it — no login, no account. It renders from the isolated view.ilolink.com origin under a strict CSP.",
          },
          {
            q: "Is it free?",
            a: "Yes. Publishing is free and accountless — paste or drop the image and get a link. There are no paid tiers to quote.",
          },
        ]}
      />

      <Cta sub="Publish your image and see who opens it." />

      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The full loop for turning ChatGPT, Claude, or Gemini output — HTML, Markdown, files, images — into a page anyone can open.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "What you learn after you share: views, referrers, devices, heatmaps, and reader feedback — all cookieless.",
          },
        ]}
      />
    </Article>
  );
}
