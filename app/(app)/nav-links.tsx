"use client";

// The five signed-in destinations, with the current one marked.
//
// A tiny client island so the server-rendered app header can know where it is:
// usePathname() only exists in the browser, and the layout itself must stay a
// server component. The current page sits in the accent with aria-current
// (the DS nav idiom — colour moves, nothing gains a background), matched by
// LONGEST path prefix so /t/<id> marks Teamspaces while /dashboard/<slug>
// still marks Documents. Signed-out headers don't render this — they keep
// plain links, because there is no "current" among links that all leave.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEM, NAV_LINK } from "@/lib/ui/nav";

const DESTINATIONS = [
  { href: "/dashboard", label: "Documents" },
  { href: "/t", label: "Teamspaces" },
  { href: "/billing", label: "Billing" },
  { href: "/connect", label: "Connect" },
  { href: "/publish", label: "Publish" },
] as const;

export function NavLinks() {
  const pathname = usePathname() ?? "";
  // Longest matching prefix wins, so nesting can never mark two links at once.
  const active = DESTINATIONS.filter(
    (d) => pathname === d.href || pathname.startsWith(`${d.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {DESTINATIONS.map((d) => {
        const current = d.href === active;
        return (
          <Link
            key={d.href}
            href={d.href}
            aria-current={current ? "page" : undefined}
            // NAV_ITEM, not NAV_LINK, when supplying the accent: NAV_LINK
            // already carries text-ink, and stacking two colour utilities
            // leaves the winner to stylesheet order.
            className={current ? `${NAV_ITEM} text-accent` : NAV_LINK}
          >
            {d.label}
          </Link>
        );
      })}
    </>
  );
}
