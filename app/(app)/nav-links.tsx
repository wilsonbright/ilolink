"use client";

// The six signed-in destinations, with the current one marked.
//
// A tiny client island so the server-rendered app header can know where it is:
// usePathname() only exists in the browser, and the layout itself must stay a
// server component. The current page sits in the accent with aria-current
// (the DS nav idiom — colour moves, nothing gains a background), matched by
// LONGEST path prefix so /t/<id> marks Teamspaces while /dashboard/<slug>
// still marks Documents. Signed-out headers don't render this — they keep
// plain links, because there is no "current" among links that all leave.
//
// Being an island also makes it the natural home for the unread-mentions
// badge on Notifications: one cheap count fetch, no layout change needed.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEM, NAV_LINK } from "@/lib/ui/nav";

const DESTINATIONS = [
  { href: "/dashboard", label: "Documents" },
  { href: "/t", label: "Teamspaces" },
  { href: "/billing", label: "Billing" },
  { href: "/connect", label: "Connect" },
  { href: "/notifications", label: "Notifications" },
  { href: "/publish", label: "Publish" },
] as const;

export function NavLinks() {
  const pathname = usePathname() ?? "";
  // Longest matching prefix wins, so nesting can never mark two links at once.
  const active = DESTINATIONS.filter(
    (d) => pathname === d.href || pathname.startsWith(`${d.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  // Unread mentions count. Fetched once on mount (the endpoint answers
  // {"count":0} on any failure of interest, and this island only renders
  // signed-in anyway), refetched on arrival at /notifications, and refetched
  // when that page broadcasts a read-all — otherwise the badge would hold a
  // stale count until the next navigation.
  const [unread, setUnread] = useState(0);
  const fetchedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetch("/api/notifications/unread")
        .then((r) =>
          r.ok ? (r.json() as Promise<{ count?: number }>) : { count: 0 },
        )
        .then((d) => {
          if (!cancelled) setUnread(d.count ?? 0);
        })
        .catch(() => {});
    };
    if (!fetchedOnce.current || pathname.startsWith("/notifications")) {
      fetchedOnce.current = true;
      refresh();
    }
    window.addEventListener("ilo:notifications:read", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("ilo:notifications:read", refresh);
    };
  }, [pathname]);

  return (
    <>
      {DESTINATIONS.map((d) => {
        const current = d.href === active;
        const showBadge = d.href === "/notifications" && unread > 0;
        return (
          <Link
            key={d.href}
            href={d.href}
            aria-current={current ? "page" : undefined}
            aria-label={
              showBadge ? `Notifications, ${unread} unread` : undefined
            }
            // NAV_ITEM, not NAV_LINK, when supplying the accent: NAV_LINK
            // already carries text-ink, and stacking two colour utilities
            // leaves the winner to stylesheet order.
            className={current ? `${NAV_ITEM} text-accent` : NAV_LINK}
          >
            {d.label}
            {showBadge && (
              // An 11px bold numeral on chrome — the same sanctioned
              // small-type deviation as button labels, not body copy, so the
              // 13px floor doesn't apply. Display caps at 9+. accent-strong,
              // not accent: canvas-on-accent is only 3.76:1 in light at this
              // size; accent-strong reads 6.41:1 light / 11.45:1 dark.
              <span
                aria-hidden
                className="ml-1 inline-block bg-accent-strong px-1 align-super text-[11px] font-extrabold leading-4 text-canvas"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
