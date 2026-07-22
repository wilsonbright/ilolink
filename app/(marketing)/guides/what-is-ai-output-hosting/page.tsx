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
  title: "What is AI output hosting? — ilolink",
  description:
    "AI output hosting is publishing what a chatbot produced — HTML, Markdown, a file, an image — as a standalone web page anyone can open, and measuring how it's read.",
  alternates: { canonical: "/guides/what-is-ai-output-hosting" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/what-is-ai-output-hosting",
            headline: "What is AI output hosting?",
            description:
              "AI output hosting is publishing what a chatbot produced — HTML, Markdown, a file, or an image — as a standalone web page anyone can open, and, with ilolink, measuring how it's read.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          {
            name: "What is AI output hosting",
            path: "/guides/what-is-ai-output-hosting",
          },
        ]}
      />
      <PageHeader
        title="What is AI output hosting?"
        lead={
          <>
            AI output hosting is publishing what a chatbot produced — HTML,
            Markdown, a file, or an image — as a standalone web page anyone can
            open. With ilolink you get ilolink.com/&lt;slug&gt; for it, and you
            measure how it&apos;s read.
          </>
        }
      />
      <Prose>
        <h2>What counts as AI output?</h2>
        <p>
          Anything a chatbot hands back that you&apos;d want someone else to see.
          In practice that&apos;s four shapes:
        </p>
        <ul>
          <li>
            <strong>HTML pages</strong> — a landing-page mockup, a one-pager, a
            styled report ChatGPT, Claude, or Gemini rendered for you.
          </li>
          <li>
            <strong>Markdown docs</strong> — a spec, a brief, release notes, a
            memo the model wrote as formatted text.
          </li>
          <li>
            <strong>Images</strong> — a diagram, a chart, a generated graphic.
          </li>
          <li>
            <strong>Files</strong> — a document you exported or downloaded from
            the chat.
          </li>
        </ul>
        <p>
          The common thread: the model produced something finished-looking, but
          it&apos;s trapped in the chat. Hosting is the step that gets it out.
        </p>

        <h2>Why isn&apos;t the raw output shareable as-is?</h2>
        <p>
          Because the place the chatbot renders it isn&apos;t a public web page,
          and the export options don&apos;t give you one either:
        </p>
        <ul>
          <li>
            A <strong>ChatGPT canvas</strong> renders inside a sandbox in the
            chat UI. It looks done, but there&apos;s no publish button — nothing
            that turns it into a URL.
          </li>
          <li>
            A <strong>chatgpt.com share link</strong> shares the{" "}
            <em>conversation</em> — your prompts and the whole back-and-forth —
            not the standalone page you built.
          </li>
          <li>
            A <strong>raw .html file</strong> doesn&apos;t render when you email
            it. The recipient downloads a file and, at best, opens local markup
            in a browser tab; often it just sits in Downloads.
          </li>
        </ul>
        <p>
          So the artifact that looked ready on your screen has nowhere to live
          the moment you want to send it to a client, a teammate, or a group
          chat.
        </p>

        <h2>Where hosting fits</h2>
        <p>
          Hosting is the missing step between &quot;the model made it&quot; and
          &quot;someone opened it.&quot; It turns the output into a normal web
          page: you paste the Markdown or HTML, or drop the file, and get{" "}
          <code>ilolink.com/&lt;slug&gt;</code> — a real link anyone opens in any
          browser, no account. The branded link 302-redirects to an isolated
          render origin, <code>view.ilolink.com</code>, that serves the doc under
          a strict content-security policy. Untrusted AI HTML is sanitized on the
          way in — scripts don&apos;t run, interactive JavaScript is frozen to
          its static state, and the CSS is kept, so a static mockup renders as
          designed. That&apos;s the default; if you deliberately mark an HTML doc
          as trusted at publish time, it&apos;s served as-is and its own scripts
          run — sandboxed in an opaque-origin frame on that same isolated origin.
        </p>
        <p>
          The part that makes it <em>hosting for AI output</em> specifically, not
          just a file drop: it closes the loop. Once the link is out, ilolink
          shows how the page was actually read — cookieless views, approximate
          uniques, average time, a scroll funnel bucketed at 0 / 25 / 50 / 75 /
          100%, click and scroll heatmaps, reactions, notes, and threaded
          comments. You publish the thing, then you see whether it landed. For
          the reasons to bother, see{" "}
          <a href="/guides/why-host-ai-output">why host AI output</a>; for the
          step-by-step, see <a href="/guides/quick-start">the quick start</a>.
        </p>
      </Prose>

      <Callout title="The short version">
        Web hosting stores files on a server. AI output hosting is narrower: take
        one thing a chatbot produced, make it a page that safely renders, and
        measure how it&apos;s read. That last half — the reading — is the point.
      </Callout>

      <Faq
        items={[
          {
            q: "Is AI output hosting the same as web hosting?",
            a: "Not quite. Web hosting is general — you rent a server and put files or an app on it. AI output hosting is a narrow slice: you take one artifact a chatbot made, publish it as a page that renders safely under a strict CSP, and get read analytics back. No server config, no build step.",
          },
          {
            q: "Do I need to know how to code?",
            a: "No. You paste Markdown or HTML, or drop a file, and get a link. There's no account, no deploy step, and nothing to configure. If the chatbot gave you the output, you can host it.",
          },
          {
            q: "Is it free?",
            a: "Yes — publishing is free. You paste the HTML or Markdown, or drop a file up to 2 MB, and get a link at ilolink.com/<slug> at no cost.",
          },
          {
            q: "What can't it host?",
            a: "It hosts one self-contained document up to 2 MB, not a multi-file project or an app that needs a running server. By default, interactive JavaScript is frozen to static rather than executed — unless you mark the HTML doc as trusted at publish time, in which case its scripts run inside a sandboxed frame on the isolated origin — and there's no audio or video hosting.",
          },
        ]}
      />

      <Cta sub="Paste what your chatbot made, pick who can see it, and get a link you can actually send." />

      <RelatedLinks
        links={[
          {
            path: "/guides/why-host-ai-output",
            title: "Why host AI output at all?",
            blurb:
              "The reasons the chat window falls short — and what a real link plus read analytics gets you.",
          },
          {
            path: "/guides/share-ai-output",
            title: "Share anything an AI made, as a real link",
            blurb:
              "The pillar guide: turn ChatGPT, Claude, or Gemini output into a page and see how it was read.",
          },
        ]}
      />
    </Article>
  );
}
