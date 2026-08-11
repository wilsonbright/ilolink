"use client";

// Sign-out must be a POST — a GET endpoint can be fired by any <img> tag on any
// page, so a link would let a third-party site log people out at will.

export function SignOutButton() {
  async function signOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }).catch(() => {});
    // Full load: every RSC payload above us was rendered signed-in.
    window.location.assign("/signin");
  }
  // Deliberately the same pill as the header's nav links (app/(app)/layout.tsx)
  // and not imported from it — that file is a server component that pulls in
  // the session, so reaching into it from this client island would drag server
  // code into the browser bundle. If the nav pill changes, change it here too.
  return (
    <button
      onClick={signOut}
      className="rounded-full px-2 py-1.5 text-sm text-ink-soft transition-colors duration-150 hover:bg-accent-soft hover:text-ink focus-visible:bg-accent-soft focus-visible:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-3"
    >
      Sign out
    </button>
  );
}
