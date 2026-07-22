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
  title: "My images don't load — ilolink help",
  description:
    "Images break when they use a relative path or http:. Use an absolute https:// URL or embed the image as a data: URI — dropping a file in does this for you.",
  alternates: { canonical: "/help/images-dont-load" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/help/images-dont-load",
            headline: "My images don't load",
            description:
              "Hosted images fail when they use a relative path or http:. Fix it with an absolute https:// URL, or embed the image as a data: URI — dropping the file into ilolink does this for you.",
            datePublished: "2026-07-22",
          }),
        ]}
      />

      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
          { name: "Images don't load", path: "/help/images-dont-load" },
        ]}
      />

      <PageHeader
        title="My images don't load"
        lead={
          <>
            Images break when they use a relative path (
            <code>src=&quot;./img.png&quot;</code>) or an <code>http:</code> URL.
            Point each image at an absolute <code>https://</code> URL, or embed
            it as a <code>data:</code> URI. Dropping an image file into ilolink
            does the data-URI part for you automatically.
          </>
        }
      />

      <Prose>
        <h2>Why it happens</h2>
        <p>
          Your published page is served on an isolated origin,{" "}
          <code>view.ilolink.com</code>, under a strict Content-Security-Policy.
          For images that policy is <code>img-src https: data:</code> — nothing
          else loads.
        </p>
        <ul>
          <li>
            A <strong>relative path</strong> like{" "}
            <code>src=&quot;./chart.png&quot;</code> or{" "}
            <code>src=&quot;images/logo.png&quot;</code> resolves against{" "}
            <code>view.ilolink.com</code>, which has no such file. It 404s.
          </li>
          <li>
            An <strong>http: image</strong> is blocked outright — the policy
            allows <code>https:</code> only.
          </li>
        </ul>
        <p>
          Nothing is wrong with your doc&apos;s HTML; the address the image
          points at just isn&apos;t reachable from the render origin.
        </p>

        <h2>The fix</h2>
        <p>Any one of these makes the image show up:</p>
        <ol>
          <li>
            <strong>Use an absolute https URL.</strong> Change{" "}
            <code>src=&quot;./chart.png&quot;</code> to the full address, e.g.{" "}
            <code>src=&quot;https://example.com/chart.png&quot;</code>. If the
            image already lives somewhere public over HTTPS, this is the whole
            fix.
          </li>
          <li>
            <strong>Drop the image file into the composer.</strong> ilolink
            inlines it as a <code>data:</code> URI, so the image travels inside
            the doc and always loads. Keep the whole doc under the 2 MB cap.
          </li>
          <li>
            <strong>Ask the AI to embed images as data URIs.</strong> Prompt for
            one self-contained HTML file with every image as a{" "}
            <code>data:</code> URI — no external files, no relative paths. Paste
            that and you&apos;re done.
          </li>
        </ol>

        <h2>AI-generated images</h2>
        <p>
          If the picture came out of a model and isn&apos;t hosted anywhere yet,
          the second option is usually easiest: save the file and drop it in.
          For a step-by-step on getting a model&apos;s image onto a shareable
          page, see{" "}
          <a href="/guides/host-ai-image">host an AI-generated image</a>.
        </p>
      </Prose>

      <Callout title="Quick reference">
        Allowed: <code>https://</code> and <code>data:</code> images. Blocked:
        relative paths (<code>./x.png</code>) and <code>http://</code>.
      </Callout>

      <Faq
        items={[
          {
            q: "Can I use a relative path like ./image.png?",
            a: "No. Relative paths resolve against view.ilolink.com, which holds no files from your doc, so the image 404s. Use an absolute https:// URL or embed the image as a data: URI.",
          },
          {
            q: "Do https:// images work?",
            a: "Yes. Images served over https:// load fine, as do data: URIs. Only http:// images and relative paths are blocked.",
          },
          {
            q: "How do I embed an image so it always loads?",
            a: "Drop the image file into the composer. ilolink inlines it as a data: URI that travels inside the doc, so it loads anywhere. Keep the whole doc under 2 MB.",
          },
          {
            q: "The image was fine in ChatGPT or Claude — why not here?",
            a: "In the chat window the image is a temporary attachment or a relative asset. Once published, only https:// and data: sources are reachable, so give each image an absolute https:// URL or embed it.",
          },
        ]}
      />

      <Cta sub="Paste your HTML or drop an image file — get a link and see who opens it." />

      <RelatedLinks
        links={[
          {
            path: "/help/html-looks-broken",
            title: "My HTML looks broken",
            blurb:
              "CDN stylesheets and scripts get stripped by the CSP. Publish one self-contained file with inline CSS.",
          },
          {
            path: "/guides/host-ai-image",
            title: "Host an AI-generated image",
            blurb:
              "Get a model's image onto a shareable page, then see who opened it and from where.",
          },
        ]}
      />
    </Article>
  );
}
