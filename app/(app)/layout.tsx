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

  // Design review, Aug 2026: the nav read as congested and its hover was a
  // colour nudge you had to look for. Both come from the same fix — every item
  // is now a pill, so the padding does the spacing and the hover fills that
  // pill with accent-soft instead of shifting one text colour. The padding is
  // always there, so nothing moves on hover. Shape and tint deliberately match
  // the dashboard teamspace tabs (rounded-full, bg-accent-soft) rather than
  // inventing a second style for the same "thing you can click".
  const navItem =
    "rounded-full px-2 py-1.5 text-sm transition-colors duration-150 sm:px-3 " +
    "hover:bg-accent-soft hover:text-ink " +
    "focus-visible:bg-accent-soft focus-visible:text-ink " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const navLink = `${navItem} text-ink-soft`;

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
          <Link
            href={user ? "/dashboard" : "/"}
            className="rounded-full text-sm font-medium tracking-wide text-accent transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
          >
            ilolink
          </Link>
          {/* Pills are wide enough that a phone-width nav can no longer fit on
              one line, so it wraps within itself instead of overflowing the
              viewport; the narrower px-2 below sm keeps that wrap rare. */}
          <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1 sm:gap-x-2">
            {user && (
              <Link href="/t" className={navLink}>
                Teamspaces
              </Link>
            )}
            {/* The marketing header offers "Connect", and signing in used to
                take it away: this nav had no link to /connect, /dashboard links
                only to /publish, and /t links only to /dashboard. The single
                remaining route in was a teamspace DETAIL page you had to
                already know to open. A tester reported exactly that — "after
                logging into the platform, it was difficult to find where to
                initiate the connection". */}
            {user && (
              <Link href="/connect" className={navLink}>
                Connect
              </Link>
            )}
            <Link href="/publish" className={navLink}>
              Publish
            </Link>
            {user ? (
              // Who you are and how to leave are not navigation, so they sit in
              // their own group behind a hairline rather than reading as two
              // more destinations. The rule only appears from sm up, where the
              // email is also visible — below that it would divide nothing.
              <span className="flex items-center gap-x-1 sm:ml-1 sm:gap-x-2 sm:border-l sm:border-hairline sm:pl-3">
                <span
                  className="hidden text-sm text-ink-faint sm:inline"
                  title={user.email}
                >
                  {user.email}
                </span>
                <SignOutButton />
              </span>
            ) : (
              <Link href="/signin" className={`${navItem} text-accent`}>
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
