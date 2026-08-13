// App shell for the creator surface. Nests inside the root layout, so no
// <html>/<body> here — just a quiet header over the routed content.
//
// The header is session-aware: signed out it offers a way in, signed in it
// shows who you are and where your teamspaces live.
//
// CONTAINER CONTRACT: <main> provides only the horizontal gutter
// (px-[clamp(20px,4vw,56px)]) and vertical rhythm — NO max-width. Every page
// under app/(app)/ owns its own width: redesigned pages use
// mx-auto w-full max-w-[1160px] as their root, the rest keep their reading
// width (~max-w-3xl or narrower) themselves. The header's inner container is
// capped at the same 1160px so its edges line up with the widest pages.
//
// This used to render one link per shared teamspace and hide the concept
// entirely from anyone who had none. That was a closed loop: the only way to
// get a shared teamspace is to create one, and the only page that creates one
// was the page you could not see. A single link to /t breaks it, and it drops
// the per-render teamspace query the old nav needed.
import Link from "next/link";
import { currentUser } from "@/lib/auth/current-user";
import { IloMark } from "@/lib/ui/logo";
import { NAV_ITEM, NAV_LINK, NAV_ROW, NAV_WORDMARK } from "@/lib/ui/nav";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b-2 border-divider">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-[clamp(20px,4vw,56px)] py-4">
          <Link
            href={user ? "/dashboard" : "/"}
            className={`inline-flex items-center gap-2 ${NAV_WORDMARK}`}
          >
            <IloMark size={13} className="self-center text-accent" />
            ilolink
          </Link>
          <nav className={NAV_ROW}>
            {/* The wordmark also goes to /dashboard, but a wordmark is not a
                destination anyone reads as "my documents" — the library needs
                its own named entry like everything else here.

                The marketing header offers "Connect", and signing in used to
                take it away: this nav had no link to /connect, /dashboard links
                only to /publish, and /t links only to /dashboard. The single
                remaining route in was a teamspace DETAIL page you had to
                already know to open. A tester reported exactly that — "after
                logging into the platform, it was difficult to find where to
                initiate the connection".

                NavLinks is a client island so the current page can carry
                aria-current + the accent; signed out, only Publish applies and
                a plain server-rendered link does. */}
            {user ? (
              <NavLinks />
            ) : (
              <Link href="/publish" className={NAV_LINK}>
                Publish
              </Link>
            )}
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
              <Link href="/signin" className={`${NAV_ITEM} text-accent-strong`}>
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      {/* No max-width here — see the container contract in the header comment. */}
      <main className="px-[clamp(20px,4vw,56px)] py-12">{children}</main>
    </div>
  );
}
