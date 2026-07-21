// App shell for the creator surface. Nests inside the root layout, so no
// <html>/<body> here — just a quiet header over the routed content. Accountless:
// no session, no sign-out; the browser's local history is the only "account".
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium tracking-wide text-accent transition-colors duration-150 hover:text-ink"
          >
            ilolink
          </Link>
          <Link
            href="/publish"
            className="text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
          >
            Publish
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
