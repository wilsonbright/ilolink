// Chrome for the marketing/content surface (guides, legal). Nests in the root
// layout, so no <html>/<body> here — just a quiet header and a footer that
// carries the internal links search engines follow. Same restraint as the app
// shell; the point is that a guide feels like the product, not an ad for it.
import Link from "next/link";
import { PILLARS, LEGAL } from "@/lib/seo/site";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm font-medium tracking-wide text-accent transition-colors duration-150 hover:text-ink"
          >
            ilolink
          </Link>
          <nav className="flex items-center gap-5 text-sm text-ink-soft">
            <Link
              href="/guides"
              className="transition-colors duration-150 hover:text-ink"
            >
              Guides
            </Link>
            <Link
              href="/"
              className="transition-colors duration-150 hover:text-ink"
            >
              Publish
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-2xl px-6 py-12">
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
                    href="/"
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
        </div>
      </footer>
    </div>
  );
}
