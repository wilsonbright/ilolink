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
  title: "Do shared links expire? ilolink link permanence — ilolink",
  description:
    "No — ilolink links don't expire by default; they're permanent. Expiry is an opt-in visibility mode you set per doc, not a free-tier penalty.",
  alternates: { canonical: "/guides/do-links-expire" },
};

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/guides/do-links-expire",
            headline: "Do shared links expire? ilolink link permanence",
            description:
              "ilolink links are permanent by default. Expiry exists only as an opt-in visibility mode you turn on per doc — not a free-tier penalty.",
            datePublished: "2026-07-22",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Do links expire?", path: "/guides/do-links-expire" },
        ]}
      />
      <PageHeader
        title="Do shared links expire?"
        lead={
          <>
            No. ilolink links don&apos;t expire by default — they&apos;re
            permanent. Expiry is an opt-in visibility mode you turn on per doc,
            the same way you&apos;d set a password: a choice you make, not a
            penalty that kicks in on a free tier.
          </>
        }
      />
      <Prose>
        <h2>Do ilolink links expire?</h2>
        <p>
          No — not by default. When you publish, the link{" "}
          <code>ilolink.com/&lt;slug&gt;</code> stays live and keeps redirecting
          to the rendered doc. There is no automatic timer, no &quot;free links
          last 7 days&quot; rule, and no quiet deletion. A doc you published last
          year opens the same way today.
        </p>
        <p>
          Ownership works without an account: publishing is accountless, and
          control over a doc is a per-doc manage token kept in your browser.
          Keeping the link is the default state — you have to take an action to
          change it.
        </p>

        <h2>When would a link expire?</h2>
        <p>
          Only if you choose it. Expiring is one of ilolink&apos;s visibility
          modes, alongside public, unlisted, and password:
        </p>
        <ul>
          <li>
            <strong>Public</strong> — anyone with the link can open it.
          </li>
          <li>
            <strong>Unlisted</strong> — reachable only by the exact link.
          </li>
          <li>
            <strong>Password</strong> — the reader has to enter a password.
          </li>
          <li>
            <strong>Expiring</strong> — you set an expiry, and after it the link
            stops resolving. Opt-in, per doc, set by you.
          </li>
        </ul>
        <p>
          If you never turn on the expiring mode, the doc simply stays up. Expiry
          is there for the cases where you <em>want</em> a link to go away — a
          time-boxed proposal, a preview you&apos;d rather not leave floating
          around — not as a default you have to fight.
        </p>

        <h2>How is this different from free hosts?</h2>
        <p>
          Many free or quick-drop hosts expire links on their free tier, or cap
          how many you can keep, or delete inactive uploads after a window — the
          exact rule lives in their terms and changes over time, so read the
          current version before you rely on one. The point isn&apos;t that
          those hosts are wrong; it&apos;s that on some of them link permanence
          is a paid feature.
        </p>
        <p>
          On ilolink, permanence is the default and expiry is the exception you
          opt into. There&apos;s no free-tier clock counting down on your doc.
        </p>

        <h2>Where the docs are hosted</h2>
        <p>
          Published docs run on Cloudflare&apos;s edge, served over HTTPS from
          the isolated <code>view.ilolink.com</code> render origin. We won&apos;t
          quote an uptime number — no honest one-liner covers a real service —
          but you can check the <a href="/status">status page</a>. Permanent
          means we don&apos;t expire your link; it doesn&apos;t mean any service
          is up 100% of the time.
        </p>
      </Prose>

      <Callout title="The short version">
        <p>
          Links are permanent by default. The only way a link expires is if you
          set the expiring visibility mode on that specific doc. Docs are also
          currently immutable — there&apos;s no version rollback — so what you
          publish is what stays live until you take it down.
        </p>
      </Callout>

      <Faq
        items={[
          {
            q: "Do ilolink links expire?",
            a: "No — links are permanent by default. There's no automatic timer and no free-tier deletion. A doc stays live at its link until you choose otherwise.",
          },
          {
            q: "When would a link actually expire?",
            a: "Only if you turn on the expiring visibility mode for that doc. It's opt-in and set per doc, alongside public, unlisted, and password — a deliberate choice, not a default.",
          },
          {
            q: "Is permanence a paid feature like on some hosts?",
            a: "No. Many free or quick-drop hosts expire or cap free links — check their terms. On ilolink, keeping the link is the default and expiry is the exception you opt into. Publishing is free and accountless.",
          },
          {
            q: "Where are the docs hosted, and are they always up?",
            a: "Docs run on Cloudflare's edge over HTTPS from view.ilolink.com. Permanent means we don't expire your link; it doesn't promise 100% uptime. See the status page for current service status.",
          },
        ]}
      />

      <Cta sub="Publish a doc and keep the link as long as you want." />

      <RelatedLinks
        links={[
          {
            path: "/guides/best-way-to-share-ai-html",
            title: "The best way to share AI-generated HTML",
            blurb:
              "Static hosts, quick-drop hosts, and ilolink compared — including which ones expire free links.",
          },
          {
            path: "/guides/limitations",
            title: "What ilolink can't do (yet)",
            blurb:
              "The honest list of current limits — size caps, frozen JavaScript, immutable docs, no media hosting.",
          },
        ]}
      />
    </Article>
  );
}
