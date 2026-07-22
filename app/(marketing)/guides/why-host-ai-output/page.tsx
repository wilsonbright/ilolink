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
  title: "Why send an AI output as a real web page — ilolink",
  description:
    "A screenshot, the raw file, or a chat-share link each fall short when you share AI output. A hosted page fixes them — and shows whether it landed.",
  alternates: { canonical: "/guides/why-host-ai-output" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/why-host-ai-output",
            headline: "Why send an AI output as a real web page",
            description:
              "The three common ways to share AI output — a screenshot, the raw file, a chat-share link — each fall short. A hosted page fixes them and adds what none can: whether it landed.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Why host AI output", path: "/guides/why-host-ai-output" },
        ]}
      />
      <PageHeader
        title="Why send an AI output as a real web page"
        lead={
          <>
            Three common ways to share what an AI made all fall short — a
            screenshot loses interactivity, the raw file shows up as code, a
            chat-share link exposes the whole conversation. A hosted page fixes
            all three, and adds what none of them can: whether it actually
            landed.
          </>
        }
      />
      <Prose>
        <h2>Why not just send a screenshot?</h2>
        <p>
          A screenshot is the fastest option and the most lossy. It&apos;s a flat
          image, so nothing in it works — links aren&apos;t clickable, tables
          don&apos;t scroll, a mockup can&apos;t be poked at. It doesn&apos;t
          scale: text that&apos;s crisp on your monitor turns to mush on a phone
          or when someone zooms in. And it&apos;s invisible to search and to
          copy-paste — the recipient can&apos;t grab a line of the copy, a hex
          value, or a snippet of code out of a picture.
        </p>
        <p>
          For a quick &quot;look at this&quot; in a chat, fine. For anything a
          person needs to <strong>read, use, or respond to</strong>, an image is
          the wrong container.
        </p>

        <h2>Why not send the raw .html file?</h2>
        <p>
          The output is already an HTML file, so sending it feels natural — until
          it lands in an inbox. Most mail clients won&apos;t render an{" "}
          <code>.html</code> attachment inline; the recipient sees a download
          prompt, or opens it to a wall of markup. Non-technical people get stuck
          at &quot;what do I do with this?&quot; Technical people open it locally,
          where relative paths and assets may not resolve the way they did when
          the AI generated it.
        </p>
        <p>
          A file is a thing you have to handle. A link is a thing you just click.
        </p>

        <h2>Why isn&apos;t a chat-share link enough?</h2>
        <p>
          Sharing the conversation link is tempting because it&apos;s built in —
          but it shares the <strong>conversation</strong>, not the result. The
          recipient sees your prompts, your dead ends, the three revisions before
          the good one. That reads oddly to anyone non-technical, who just wanted
          the final page, not a transcript of how you got there. It also leaks
          more than you meant to: everything you typed on the way is now theirs
          to read.
        </p>
        <p>
          A chat share answers &quot;how was this made?&quot; when the question
          was &quot;here&apos;s the thing.&quot;
        </p>

        <h2>What does a hosted page do instead?</h2>
        <p>
          Paste the Markdown or HTML, or drop the file, and you get a normal web
          page at <code>ilolink.com/&lt;slug&gt;</code> that anyone opens in a
          browser — no download, no login, no conversation attached. It renders
          the way a page should: responsive on a phone, selectable text, working
          links. By default, pasted AI HTML is treated as untrusted and
          sanitized on ingest — scripts are dropped, interactive JavaScript is
          frozen to static, CSS is kept — and served from the isolated{" "}
          <code>view.ilolink.com</code> origin under a strict CSP, so a mockup
          you didn&apos;t write is still safe to send. If you mark an HTML doc as
          trusted at publish time, it&apos;s kept as-is and its own scripts run,
          contained inside a sandboxed frame on that same isolated origin.
        </p>
        <p>
          Then it adds the part a screenshot, a file, and a chat link all miss:
          proof it landed. Cookieless, aggregate analytics show total views,
          approximate uniques, average time, and how far people scrolled
          (bucketed at 0/25/50/75/100%). Click and scroll heatmaps show where
          attention went. Readers can leave reactions, notes, and anchored
          comments right on the page — no account on their end either.
        </p>
        <Callout title="What you don't get, honestly">
          <p>
            A hosted page isn&apos;t a full web host. Each doc caps at 2 MB, live
            JavaScript apps won&apos;t run by default (they&apos;re frozen to
            static unless you mark the doc trusted), and there&apos;s no audio or
            video hosting. Analytics are aggregate and
            cookieless — you see totals and approximate uniques, never a named
            list of who read it. If you need a running app or per-person
            tracking, this isn&apos;t that.
          </p>
        </Callout>
      </Prose>

      <Faq
        items={[
          {
            q: "Why not just send a screenshot?",
            a: "A screenshot is a flat image: links don't work, tables don't scroll, text turns to mush when zoomed, and nothing in it is searchable or copyable. It's fine for a quick 'look at this' but wrong for anything a person needs to read, use, or respond to.",
          },
          {
            q: "Isn't a chat share link enough?",
            a: "It shares the whole conversation — your prompts, revisions, and dead ends — not just the result. That reads oddly to non-technical recipients and leaks more than you meant to. A hosted page shows only the final output.",
          },
          {
            q: "Can people comment?",
            a: "Yes. Readers can leave reactions, short notes, and threaded comments anchored to a spot on the page — with no account required on their end.",
          },
          {
            q: "Do I need an account to publish?",
            a: "No. Publishing is accountless: paste Markdown or HTML, or drop a file, and get a link. Analytics, heatmaps, and feedback come with it.",
          },
        ]}
      />

      <Cta sub="Turn your next AI output into a link people can actually open." />

      <RelatedLinks
        links={[
          {
            path: "/guides/what-is-ai-output-hosting",
            title: "What is AI output hosting?",
            blurb:
              "The plain definition — what it means to turn a chatbot's HTML, Markdown, or file into a page anyone can open.",
          },
          {
            path: "/guides/analytics-heatmaps-feedback",
            title: "Analytics, heatmaps & feedback for shared docs",
            blurb:
              "The part a screenshot or file can't give you: who opened it, how far they read, where they clicked, and what they said.",
          },
        ]}
      />
    </Article>
  );
}
