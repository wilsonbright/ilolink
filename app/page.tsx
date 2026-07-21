// Home = the composer. Get started immediately, no extra click. A tight hero,
// then the publish form itself, then a short honest list of what you get.
import Link from "next/link";
import { PublishForm } from "@/app/(app)/publish/publish-form";

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
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <p className="text-sm font-medium tracking-wide text-accent">ilolink</p>
        <Link
          href="/dashboard"
          className="text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
        >
          Your documents
        </Link>
      </header>

      <div className="mt-16 sm:mt-20">
        <h1 className="max-w-[20ch] text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
          Publish a document, get a link, and see how it landed.
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
          Paste Markdown or HTML, or drop a file. Cookieless analytics, heatmaps,
          and quiet feedback — no account needed.
        </p>
      </div>

      {/* The composer, right here. */}
      <PublishForm />

      <ul className="mt-24 grid gap-10 border-t border-hairline pt-12 sm:grid-cols-3 sm:gap-8">
        {VALUE.map((v) => (
          <li key={v.title}>
            <h2 className="text-sm font-medium text-ink">{v.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.body}</p>
          </li>
        ))}
      </ul>

      <footer className="mt-auto pt-16 text-sm text-ink-faint">
        Share what you wrote. See how it read.
      </footer>
    </main>
  );
}
