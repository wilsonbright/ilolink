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
  title: "My file is too large — ilolink help",
  description:
    "ilolink caps each document at 2 MB. If yours is over, compress or resize embedded images, drop unused assets, or paste only the part you want to share.",
  alternates: { canonical: "/help/file-too-large" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/help/file-too-large",
            headline: "My file is too large",
            description:
              "ilolink caps each document at 2 MB. Compress or resize embedded images, strip unused assets, or paste only the section you want to share.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "File too large", path: "/help/file-too-large" },
        ]}
      />
      <PageHeader
        title="My file is too large"
        lead={
          <>
            ilolink caps each document at 2 MB. If yours is over, compress or
            resize the embedded images, remove unused assets, or paste only the
            part you want to share. The images are almost always what pushed you
            over.
          </>
        }
      />
      <Prose>
        <h2>The limit</h2>
        <p>
          <strong>2 MB per doc.</strong> That&apos;s the whole raw body — the
          Markdown or HTML you paste, or the file you drop, counting every
          inline image and asset baked into it. Not a page, not a project: one
          document, 2 MB. Most write-ups, specs, and HTML pages sit well under
          it, so if you&apos;re over, something heavy is embedded.
        </p>

        <h2>Why there&apos;s a cap</h2>
        <p>
          Two reasons, both in your favor. Every doc is served from{" "}
          <a href="/guides/where-hosted">Cloudflare&apos;s global edge</a>, and a
          small document loads fast from anywhere — a multi-megabyte page
          doesn&apos;t. And every doc is sanitized on ingest before it&apos;s
          published; keeping bodies bounded keeps that pass quick and
          predictable. The cap is what makes a paste-and-share link feel instant.
        </p>

        <h2>How to get under it</h2>
        <p>Work down this list — the first one usually does it:</p>
        <ul>
          <li>
            <strong>Compress or resize images before embedding.</strong> A
            full-resolution photo or screenshot is often 1–4 MB on its own. Drop
            it to a sensible display width and re-export as compressed JPEG or
            WebP before it goes into the doc.
          </li>
          <li>
            <strong>Strip large <code>data:</code> URI images and link them
            instead.</strong> If your HTML has a giant{" "}
            <code>data:image/png;base64,…</code> blob inline, that single string
            can be the whole 2 MB. Host the image somewhere on{" "}
            <code>https</code> and reference it by URL — the doc drops to a few
            kilobytes. See{" "}
            <a href="/guides/host-ai-image">how to host an AI image</a>.
          </li>
          <li>
            <strong>Paste the key section, not the whole thing.</strong> If
            you&apos;re sharing one part of a long document, share that part.
            A tight page also reads better and its{" "}
            <a href="/guides/analytics-heatmaps-feedback">scroll and heatmap
            data</a>{" "}
            is more useful.
          </li>
          <li>
            <strong>Remove unused assets.</strong> Fonts you don&apos;t use,
            duplicated images, dead markup — clear them out.
          </li>
          <li>
            <strong>Big media stays out for now.</strong> Audio and video
            hosting isn&apos;t supported yet; you can&apos;t get a 40 MB clip
            under the cap by trimming. Link to where it already lives instead.
          </li>
        </ul>
      </Prose>

      <Callout title="The honest note on media">
        ilolink hosts documents, not media files. There&apos;s no audio or video
        hosting today — that&apos;s on the roadmap, not live. If your doc is
        heavy because of embedded media, the fix isn&apos;t compression; it&apos;s
        linking out to where the media is already hosted.
      </Callout>

      <Faq
        items={[
          {
            q: "What's the exact cap?",
            a: "2 MB per doc. That's the raw body — the pasted Markdown or HTML, or the dropped file — including every inline image and asset in it.",
          },
          {
            q: "Can I host a video?",
            a: "Not yet. Audio and video hosting is on the roadmap, not live. Publish your page and link out to where the video already lives.",
          },
          {
            q: "Why is my HTML file so big?",
            a: "Usually embedded data: URI images. A single inline base64 image can be one to several megabytes. Host the image on https and link it instead of embedding it, and the file shrinks to a few kilobytes.",
          },
          {
            q: "Does the cap count images separately?",
            a: "No. It's the whole document body as one number. Inline images count against the same 2 MB as your text, which is why they're the usual culprit when you're over.",
          },
        ]}
      />

      <Cta sub="Trim it and publish." />

      <RelatedLinks
        links={[
          {
            path: "/help/images-dont-load",
            title: "My images don't load",
            blurb:
              "Relative paths and http images break under the CSP. Use absolute https or data: URIs — and why linking images also keeps you under the cap.",
          },
          {
            path: "/guides/requirements",
            title: "What you need to share an AI output",
            blurb:
              "The honest checklist: a file or pasted text under 2 MB. No account, no server, no build step.",
          },
        ]}
      />
    </Article>
  );
}
