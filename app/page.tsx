// Home = the composer. Get started immediately, no extra click. A sticky top
// bar keeps an obvious "Publish" action in view (users were hunting for it),
// a tight hero, then the publish form itself, then what you get.
import Link from "next/link";
import { PublishForm } from "@/app/(app)/publish/publish-form";
import { PILLARS, LEGAL } from "@/lib/seo/site";

const VALUE = [
  {
    title: "Privacy-first analytics",
    body: "Views and read-through, counted without cookies, fingerprints, or personal profiles.",
  },
  {
    title: "Heatmaps",
    body: "See which parts people actually read, and where they stop.",
  },
  {
    title: "Quiet feedback",
    body: "Readers can react or leave a note. No account, no friction.",
  },
];

export default function Home() {
  return (
    <>
      {/* Sticky bar: brand + nav + an unmissable Publish action. On this page
          Publish jumps to the composer below; the point is that "how do I
          publish?" is answered before the user scrolls. */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <p className="text-sm font-medium tracking-wide text-accent">ilolink</p>
          <nav className="flex items-center gap-4 text-sm text-ink-soft sm:gap-5">
            <Link
              href="/connect"
              className="transition-colors duration-150 hover:text-ink"
            >
              Connect
            </Link>
            <Link
              href="/guides"
              className="hidden transition-colors duration-150 hover:text-ink sm:inline"
            >
              Guides
            </Link>
            <Link
              href="/dashboard"
              className="hidden transition-colors duration-150 hover:text-ink sm:inline"
            >
              Your documents
            </Link>
            <a
              href="#compose"
              className="inline-flex items-center rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Publish
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 pb-8">
        <div className="mt-10 sm:mt-14">
          <h1 className="max-w-[20ch] text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
            Publish a document, get a link, and see how it landed.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            Paste Markdown or HTML, or drop a file. Cookieless analytics,
            heatmaps, and quiet feedback — no account needed.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a
              href="#compose"
              className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Start publishing
            </a>
            <Link
              href="/guides/share-ai-output"
              className="text-ink-soft underline-offset-2 transition-colors duration-150 hover:text-accent hover:underline"
            >
              First time? See how it works →
            </Link>
          </div>
        </div>

        {/* The composer, right here. Anchor target for the Publish actions;
            scroll-mt clears the sticky header. */}
        <div id="compose" className="scroll-mt-20">
          <PublishForm />
        </div>

      <ul className="mt-24 grid gap-10 border-t border-hairline pt-12 sm:grid-cols-3 sm:gap-8">
        {VALUE.map((v) => (
          <li key={v.title}>
            <h2 className="text-sm font-medium text-ink">{v.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.body}</p>
          </li>
        ))}
      </ul>

      {/* Publish straight from an AI chat via the MCP connector. This was buried
          in the footer; give it a real section — it's the fastest way to publish. */}
      <section className="mt-16 rounded-2xl border border-hairline bg-accent-soft/40 p-8 sm:p-10">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          New · MCP connector
        </p>
        <h2 className="mt-2 max-w-[24ch] text-2xl font-semibold leading-tight text-ink sm:text-3xl">
          Publish straight from your AI chat
        </h2>
        <p className="mt-4 max-w-[56ch] text-ink-soft">
          Add ilolink as a connector in{" "}
          <span className="text-ink">Claude</span>,{" "}
          <span className="text-ink">Grok</span>,{" "}
          <span className="text-ink">ChatGPT</span>, or any MCP-compatible
          assistant. Then just say <em>&ldquo;publish this as an ilolink page&rdquo;</em> —
          you get a share link and a private analytics dashboard without leaving
          the chat. No account, no copy-paste.
        </p>
        <ul className="mt-6 grid gap-3 text-sm text-ink-soft sm:grid-cols-3">
          <li className="rounded-lg border border-hairline bg-surface px-4 py-3">
            <span className="font-medium text-ink">Claude</span>
            <br />
            One-click — add connector, Authorize.
          </li>
          <li className="rounded-lg border border-hairline bg-surface px-4 py-3">
            <span className="font-medium text-ink">Grok</span>
            <br />
            Skills &amp; Connectors → add the URL.
          </li>
          <li className="rounded-lg border border-hairline bg-surface px-4 py-3">
            <span className="font-medium text-ink">ChatGPT</span>
            <br />
            Developer Mode → mint a workspace.
          </li>
        </ul>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link
            href="/connect"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
          >
            Connect an assistant →
          </Link>
          <span className="text-ink-faint">
            Works with any MCP-compatible assistant.
          </span>
        </div>
      </section>

      <footer className="mt-24 border-t border-hairline pt-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-ink">Guides</p>
            <ul className="mt-3 space-y-2 text-sm">
              {Object.values(PILLARS).map((p) => (
                <li key={p.path}>
                  <Link
                    href={p.path}
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/publish"
                  className="text-ink-soft transition-colors duration-150 hover:text-accent"
                >
                  Publish a doc
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-ink-soft transition-colors duration-150 hover:text-accent"
                >
                  Your documents
                </Link>
              </li>
              <li>
                <Link
                  href="/connect"
                  className="text-ink-soft transition-colors duration-150 hover:text-accent"
                >
                  Connect to Claude, Grok &amp; more
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-ink-soft transition-colors duration-150 hover:text-accent"
                >
                  All guides
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              {Object.values(LEGAL).map((l) => (
                <li key={l.path}>
                  <Link
                    href={l.path}
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-10 text-sm text-ink-faint">
          Share what you wrote. See how it read.
        </p>
      </footer>
      </main>
    </>
  );
}
