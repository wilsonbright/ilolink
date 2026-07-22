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
  title: "What you need to share an AI output — ilolink",
  description:
    "The honest checklist: just the output. A file or pasted text — Markdown, HTML, an image — under 2 MB. No account, no server, no repo, no build step.",
  alternates: { canonical: "/guides/requirements" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/requirements",
            headline: "What you need to share an AI output",
            description:
              "The only requirement is the output itself — a file or pasted text under 2 MB. No account, no server, no repo, no build step.",
            datePublished: "2026-07-22",
          }),
          howTo({
            name: "Prepare your AI output for sharing",
            description:
              "Get an AI output ready to publish on ilolink: have the file or text, keep it under 2 MB, and flatten anything that needs a build.",
            steps: [
              {
                name: "Grab the output",
                text: "Copy the text or save the file — Markdown, HTML, .txt, .csv, .json, or an image. That's the only thing you need.",
              },
              {
                name: "Flatten anything that needs a build",
                text: "If it's framework source with a package.json, run your build first and take the static HTML it produces. Interactive JS gets frozen to static on ingest, so export to static HTML if you can.",
              },
              {
                name: "Keep it under 2 MB",
                text: "The cap is 2 MB per doc. If it's bigger, trim it or share the key part.",
              },
              {
                name: "Paste or drop it in",
                text: "Paste the text or drop the file into the composer at ilolink.com and get ilolink.com/<slug>. No account to publish or to view.",
              },
            ],
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Requirements", path: "/guides/requirements" },
        ]}
      />
      <PageHeader
        title="What you need to share an AI output"
        lead={
          <>
            Just the output. A file or pasted text — Markdown, HTML, an image —
            no server, no repo, no build step, and no account to publish or to
            view. Paste it or drop it at <a href="/">ilolink.com</a> and you get
            a link.
          </>
        }
      />
      <Prose>
        <h2>What you need</h2>
        <p>One thing: the output itself. That means either</p>
        <ul>
          <li>
            a file — <code>.md</code>, <code>.html</code>, <code>.txt</code>,{" "}
            <code>.csv</code>, <code>.json</code>, or an image, or
          </li>
          <li>text you paste straight into the composer — Markdown or HTML.</li>
        </ul>
        <p>
          Keep it under <strong>2 MB per doc</strong>. That&apos;s the whole
          requirement. You paste or drop it at <a href="/">ilolink.com</a> and
          get <code>ilolink.com/&lt;slug&gt;</code>, which redirects to an
          isolated render origin served under a strict content-security policy.
          Untrusted AI HTML is sanitized on ingest: scripts are dropped,
          interactive JS is frozen to static, and your CSS is kept.
        </p>

        <h2>What you don&apos;t need</h2>
        <p>None of the usual publishing overhead applies:</p>
        <ul>
          <li>
            <strong>No account.</strong> No signup, no login — to publish or to
            view. Ownership is a per-doc manage token kept in your browser.
          </li>
          <li>
            <strong>No server</strong> to run and no hosting to configure.
          </li>
          <li>
            <strong>No repo</strong>, no <code>git</code>, nothing to deploy.
          </li>
          <li>
            <strong>No build step</strong> and no framework toolchain — no{" "}
            <code>npm install</code>, no bundler, no CLI.
          </li>
        </ul>

        <h2>What won&apos;t work (and the fix)</h2>
        <p>Three things don&apos;t publish as-is. Each has a one-line fix:</p>
        <ul>
          <li>
            <strong>Framework source with a package.json.</strong> A React or
            Next project directory isn&apos;t a page. Run your{" "}
            <strong>build first</strong> and share the static HTML it produces.
          </li>
          <li>
            <strong>Interactive JS.</strong> By default, scripts are frozen to
            static on ingest, so anything driven by JavaScript won&apos;t run —
            unless you mark the doc <strong>trusted</strong> at publish time, in
            which case it runs as-is inside a sandboxed frame on the isolated
            origin. Otherwise, export or build to <strong>static HTML</strong>{" "}
            and the layout, styling, and content come through.
          </li>
          <li>
            <strong>Oversized files.</strong> Over 2 MB won&apos;t upload —{" "}
            <strong>trim it or share the key part</strong>.
          </li>
        </ul>
        <p>
          If you&apos;re starting cold, the{" "}
          <a href="/guides/quick-start">quick-start</a> walks the whole publish
          in a minute. For the full list of what&apos;s in and out of scope, see{" "}
          <a href="/guides/limitations">limitations</a>.
        </p>
      </Prose>

      <Callout title="The short version">
        If it&apos;s a file or some text under 2 MB, you can share it right now.
        If it needs a build to become a page, build it to static HTML first.
      </Callout>

      <Faq
        items={[
          {
            q: "Do I need an account?",
            a: "No. You don't need an account to publish or to view. Ownership of a doc is a manage token kept in your browser, not a login.",
          },
          {
            q: "What's the size limit?",
            a: "2 MB per doc. That covers most write-ups, specs, HTML pages, and inline images. If it's bigger, trim it or share the key part.",
          },
          {
            q: "Can I publish a React app?",
            a: "Not the source directory. Build it to a static HTML file first, then share that. By default, interactive JS is frozen to static on ingest, so anything JS-driven won't run — unless you mark the doc trusted at publish time, which runs its scripts as-is inside a sandboxed frame on the isolated origin. Static HTML renders fully either way.",
          },
          {
            q: "What file types can I share?",
            a: "A .md, .html, .txt, .csv, or .json file, or an image — or paste Markdown or HTML straight into the composer.",
          },
        ]}
      />

      <Cta sub="Try it now." />

      <RelatedLinks
        links={[
          {
            path: "/guides/quick-start",
            title: "Quick-start: publish in a minute",
            blurb:
              "Paste or drop your output, pick who can see it, and get a link — the whole loop, start to finish.",
          },
          {
            path: "/guides/limitations",
            title: "Limitations: what's in and out of scope",
            blurb:
              "The honest boundaries — the 2 MB cap, frozen JS, no version rollback, and what's on the roadmap.",
          },
        ]}
      />
    </Article>
  );
}
