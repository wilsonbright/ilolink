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
  title: "Glossary: AI output, artifacts, static hosting & GEO — ilolink",
  description:
    "Plain, quotable definitions for the words around sharing AI output: AI output, artifact, canvas, static hosting, sanitization, CSP, GEO, heatmaps, and more.",
  alternates: { canonical: "/glossary" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/glossary",
            headline:
              "Glossary: AI output, artifacts, static hosting & GEO",
            description:
              "One-sentence definitions for the vocabulary around sharing AI output as a real web page — accurate to how ilolink actually behaves.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Glossary", path: "/glossary" },
        ]}
      />
      <PageHeader
        title="Glossary"
        lead={
          <>
            Plain, one-line definitions for the words around sharing AI output:
            AI output, artifact, canvas, static hosting, self-contained HTML,
            sanitization, CSP, cookieless analytics, scroll depth, heatmaps,
            unique views, visibility modes, edge hosting, GEO, and anchored
            comments. Each is a quotable single sentence.
          </>
        }
      />
      <Prose>
        <p>
          Terms that touch how ilolink works match its real behavior:
          sanitization strips scripts and freezes JavaScript to a static
          snapshot, analytics stay cookieless and approximate, and rendering
          happens on an isolated origin under a strict policy.
        </p>

        <h3>AI output</h3>
        <p>
          Anything a chatbot produces for you to keep or send — Markdown, HTML,
          a code block, a file, or an image — as opposed to the throwaway chat
          around it.
        </p>

        <h3>Artifact (Claude)</h3>
        <p>
          Claude&apos;s name for a self-contained piece of work it renders
          beside the chat — a document, an app, or an HTML mockup — that you
          often want to share as its own page.
        </p>

        <h3>Canvas (ChatGPT)</h3>
        <p>
          ChatGPT&apos;s side-panel workspace for editing a document or code in
          place, producing output you can copy out and publish elsewhere.
        </p>

        <h3>Static hosting</h3>
        <p>
          Serving a fixed page whose files don&apos;t change per request and run
          no server-side logic, which is exactly what a shared piece of AI
          output needs.
        </p>

        <h3>Self-contained HTML file</h3>
        <p>
          A single HTML document that carries its own CSS and assets inline, so
          it renders on its own without pulling in external scripts or
          stylesheets.
        </p>

        <h3>Sanitization</h3>
        <p>
          Cleaning untrusted markup before it&apos;s served — ilolink drops
          scripts and JavaScript, freezes interactive behavior to a static
          snapshot, and keeps the CSS so the page still looks right.
        </p>

        <h3>Content Security Policy (CSP)</h3>
        <p>
          An HTTP header that tells the browser what a page is allowed to load
          and run; ilolink serves shared pages under a strict{" "}
          <code>default-src &apos;none&apos;</code> policy on an isolated render
          origin.
        </p>

        <h3>Cookieless analytics</h3>
        <p>
          Measuring readership without setting a cookie or building a
          fingerprint — ilolink uses a short-lived rotating visitor hash, so
          there is no cross-site profile.
        </p>

        <h3>Scroll depth</h3>
        <p>
          How far down the page a reader got, bucketed at 0/25/50/75/100%, read
          like a funnel to see where attention drops off.
        </p>

        <h3>Heatmap</h3>
        <p>
          A visual overlay of where readers clicked or how far they scrolled,
          with hot zones showing attention and cold zones showing what got
          ignored.
        </p>

        <h3>Unique views (approximate)</h3>
        <p>
          An estimate of how many separate people opened a page — approximate by
          design, because the privacy-preserving visitor hash rotates rather
          than pinning anyone down.
        </p>

        <h3>Visibility mode</h3>
        <p>
          The access setting on a shared page — public, unlisted, password, or
          expiring — that controls who can open it and for how long.
        </p>

        <h3>Edge hosting</h3>
        <p>
          Serving a page from data centers close to each reader instead of one
          central server, so it loads fast worldwide; ilolink runs on
          Cloudflare&apos;s edge.
        </p>

        <h3>GEO (generative engine optimization)</h3>
        <p>
          Shaping content so AI answer engines can find, quote, and cite it
          accurately — the generative-search counterpart to traditional SEO.
        </p>

        <h3>Anchored comment</h3>
        <p>
          A reader&apos;s note attached to a specific spot in the shared
          document and threaded there, so a reply sits next to what it responds
          to instead of in a separate inbox.
        </p>

        <h2>Further reading</h2>
        <ul>
          <li>
            <a
              href="https://web.dev/explore/learn-core-web-vitals"
              target="_blank"
              rel="noopener noreferrer"
            >
              Core Web Vitals
            </a>{" "}
            — the load, interactivity, and layout-stability metrics behind a
            fast page.
          </li>
          <li>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP"
              target="_blank"
              rel="noopener noreferrer"
            >
              Content Security Policy (MDN)
            </a>{" "}
            — how the CSP header restricts what a page may load and run.
          </li>
          <li>
            <a
              href="https://developers.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudflare docs
            </a>{" "}
            — the edge network and platform ilolink serves pages from.
          </li>
          <li>
            <a
              href="https://docs.anthropic.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Anthropic / Claude docs
            </a>{" "}
            — reference for Claude and its artifacts.
          </li>
          <li>
            <a
              href="https://platform.openai.com/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAI docs
            </a>{" "}
            — reference for ChatGPT and its canvas.
          </li>
        </ul>
      </Prose>
      <Faq
        items={[
          {
            q: "Why are unique views only approximate?",
            a: "The visitor hash rotates for privacy, so the count is a close estimate rather than an exact headcount. That trade keeps analytics cookieless and profile-free.",
          },
          {
            q: "What happens to JavaScript in shared AI HTML?",
            a: "It is removed. Scripts are dropped and interactive behavior is frozen to a static snapshot, while the CSS is kept so the page still looks right.",
          },
          {
            q: "What does GEO mean here?",
            a: "Generative engine optimization — writing content so AI answer engines can find, quote, and cite it accurately, the way SEO targets traditional search.",
          },
        ]}
      />
      <Cta sub="Share a piece of AI output and see these terms in action." />
      <RelatedLinks
        links={[
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "Paste Markdown or HTML, or drop a file, and get a shareable ilolink.com link — no account.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "Views, approximate uniques, scroll-depth, click heatmaps, and reader feedback — all cookieless.",
          },
        ]}
      />
    </Article>
  );
}
