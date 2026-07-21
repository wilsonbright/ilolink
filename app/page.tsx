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
              href="/guides"
              className="transition-colors duration-150 hover:text-ink"
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

      <footer className="mt-auto border-t border-hairline pt-12">
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
