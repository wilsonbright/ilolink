// Landing. Zen, typography-led — one true sentence, one accent, one CTA, and a
// short honest list of what you get. No dashboard chrome, no marketing slop.
import Link from "next/link";

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
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-20">
      <header>
        <p className="text-sm font-medium tracking-wide text-accent">ilolink</p>
      </header>

      <div className="mt-24 sm:mt-32">
        <h1 className="max-w-[20ch] text-4xl font-semibold leading-[1.15] text-ink sm:text-5xl">
          Publish a document, get a link, and see how it landed.
        </h1>
        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
          Paste Markdown or HTML. Share the link. Watch how people read it —
          cookieless, with heatmaps and quiet feedback. Nothing that tracks a
          person from page to page.
        </p>

        <div className="mt-10">
          <Link
            href="/publish"
            className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-surface transition-opacity duration-150 hover:opacity-90"
          >
            Publish a document
          </Link>
        </div>
      </div>

      <ul className="mt-28 grid gap-10 border-t border-hairline pt-12 sm:mt-32 sm:grid-cols-3 sm:gap-8">
        {VALUE.map((v) => (
          <li key={v.title}>
            <h2 className="text-sm font-medium text-ink">{v.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.body}</p>
          </li>
        ))}
      </ul>

      <footer className="mt-auto pt-24 text-sm text-ink-faint">
        <Link
          href="/publish"
          className="transition-colors duration-150 hover:text-ink-soft"
        >
          Publish a document
        </Link>
      </footer>
    </main>
  );
}
