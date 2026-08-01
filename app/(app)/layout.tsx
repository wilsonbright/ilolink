// App shell for the creator surface. Nests inside the root layout, so no
// <html>/<body> here — just a quiet header over the routed content.
//
// The header is session-aware: signed out it offers a way in, signed in it
// shows who you are and where your teamspaces live.
//
// This used to render one link per shared teamspace and hide the concept
// entirely from anyone who had none. That was a closed loop: the only way to
// get a shared teamspace is to create one, and the only page that creates one
// was the page you could not see. A single link to /t breaks it, and it drops
// the per-render teamspace query the old nav needed.
import Link from "next/link";
import { currentUser } from "@/lib/auth/current-user";
import { SignOutButton } from "./sign-out";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
          <Link
            href={user ? "/dashboard" : "/"}
            className="text-sm font-medium tracking-wide text-accent transition-colors duration-150 hover:text-ink"
          >
            ilolink
          </Link>
          <nav className="flex items-center gap-4">
            {user && (
              <Link
                href="/t"
                className="text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
              >
                Teamspaces
              </Link>
            )}
            <Link
              href="/publish"
              className="text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              Publish
            </Link>
            {user ? (
              <>
                <span
                  className="hidden text-sm text-ink-faint sm:inline"
                  title={user.email}
                >
                  {user.email}
                </span>
                <SignOutButton />
              </>
            ) : (
              <Link
                href="/signin"
                className="text-sm text-accent transition-colors duration-150 hover:text-ink"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
    </div>
  );
}
