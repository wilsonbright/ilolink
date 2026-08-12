"use client";

// Sign-out must be a POST — a GET endpoint can be fired by any <img> tag on any
// page, so a link would let a third-party site log people out at will.

import { NAV_LINK } from "@/lib/ui/nav";

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
  // The same pill as the header's nav links. It used to be a hand-copy of that
  // class string, because importing from app/(app)/layout.tsx would have pulled
  // a server component (and the session with it) into this client island —
  // lib/ui/nav.ts is plain strings with no imports, so it crosses that boundary
  // safely and the copy no longer has to be kept in sync by hand.
  return (
    <button onClick={signOut} className={NAV_LINK}>
      Sign out
    </button>
  );
}
