// Phase 0 landing placeholder. Real zen landing lands in Phase 1
// (built with the frontend-design skill + copy run through stop-slop).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-sm font-medium tracking-wide text-accent">ilolink</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink">
        Share what you wrote.
        <br />
        See how it landed.
      </h1>
      <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-soft">
        Paste a Markdown or HTML file, get a link, and watch how people actually
        read it — cookieless analytics, heatmaps, and quiet feedback. Nothing
        creepy.
      </p>
      <p className="mt-10 text-sm text-ink-faint">Phase 0 skeleton. Publishing flow next.</p>
    </main>
  );
}
