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
  return (
    <button
      onClick={signOut}
      className="text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
    >
      Sign out
    </button>
  );
}
