// Chrome for the marketing/content surface (guides, legal). Nests in the root
// layout, so no <html>/<body> here — just a quiet header and a footer that
// carries the internal links search engines follow. Same restraint as the app
// shell; the point is that a guide feels like the product, not an ad for it.
import Link from "next/link";
import { PILLARS, LEGAL } from "@/lib/seo/site";
import { IloMark } from "@/lib/ui/logo";
import { NAV_LINK, NAV_ROW, NAV_WORDMARK } from "@/lib/ui/nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Sticky, and full-width like the landing header (its exact treatment:
          top-0, translucent canvas, backdrop blur). The old max-w-2xl inner
          matched the guides' reading column but read as "floating inside" on
          any page wider than it — /trending's tables made that visible. The
          bar now spans the landing WRAP width on every marketing page; the
          content below keeps whatever measure it chooses. */}
      <header className="sticky top-0 z-20 border-b-2 border-divider bg-canvas/85 backdrop-blur">
        {/* Same flat nav as the app shell (lib/ui/nav.ts). This header was left
            behind by the first pass at the Aug 2026 design review, so a guide
            page hovered differently from the product it is a guide for. */}
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 sm:px-10 lg:px-[72px]">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 ${NAV_WORDMARK}`}
          >
            <IloMark size={13} className="self-center text-accent" />
            ilolink
          </Link>
          <nav className={NAV_ROW}>
            <Link href="/guides" className={NAV_LINK}>
              Guides
            </Link>
            <Link href="/trending" className={NAV_LINK}>
              Trending
            </Link>
            <Link href="/" className={NAV_LINK}>
              Publish
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t-2 border-divider">
        {/* Same WRAP as the header — the chrome frames the page edge-to-edge
            even when the content column between them is narrow. */}
        <div className="mx-auto w-full max-w-[1200px] px-6 py-12 sm:px-10 lg:px-[72px]">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
                Guides
              </p>
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
              <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
                Product
              </p>
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
                  {/* Points at /mcp, not /connect: /connect redirects a
                      signed-out reader to /signin, and this footer is on
                      pages people read before they have an account. */}
                  <Link
                    href="/mcp"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Connect to Claude, ChatGPT &amp; more
                  </Link>
                </li>
                <li>
                  <Link
                    href="/trending"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Trending this week
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
                <li>
                  <Link
                    href="/help"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Help center
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
                Legal
              </p>
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
