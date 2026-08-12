"use client";

// Session-aware nav for the statically-rendered landing page.
//
// Renders the signed-out state first and swaps once /api/auth/me answers. That
// ordering is deliberate: the overwhelming majority of landing-page visitors
// are signed out, so the common case is correct immediately and never flickers,
// and a returning user sees one quiet change rather than a layout jump.

import { useEffect, useState } from "react";
import Link from "next/link";
import { NAV_LINK } from "@/lib/ui/nav";

export function NavAuth() {
  const [state, setState] = useState<"unknown" | "out" | "in">("unknown");

  useEffect(() => {
    let live = true;
    fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ signedIn?: boolean }>)
      .then((d) => {
        if (live) setState(d?.signedIn ? "in" : "out");
      })
      .catch(() => {
        // Network failure: leave the signed-out affordance in place. Sign in
        // still works from there, so a failed probe costs nothing.
        if (live) setState("out");
      });
    return () => {
      live = false;
    };
  }, []);

  // Same flat nav item as every other header destination (lib/ui/nav.ts) —
  // this renders into the landing nav, so styling it any other way would leave
  // one item in that row hovering differently from its neighbours.
  if (state === "in") {
    return (
      <Link href="/dashboard" className={NAV_LINK}>
        Your documents
      </Link>
    );
  }

  return (
    <Link href="/signin" className={NAV_LINK}>
      Sign in
    </Link>
  );
}
