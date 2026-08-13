"use client";

// The notifications feed. Fetches GET /api/notifications on mount and renders
// the rows in the divider-row idiom; "Mark all read" posts the read-all action
// and refetches, then tells the nav island so its unread badge doesn't sit
// stale until the next navigation.

import { useCallback, useEffect, useState } from "react";

type Notification = {
  id: string;
  kind: string;
  // Both come off LEFT JOINs server-side (lib/notifications/store.ts): a
  // deleted actor or an unpublished doc arrives as null, not a string.
  actorLabel: string | null;
  docSlug: string | null;
  docTitle: string | null;
  commentExcerpt: string | null;
  createdAt: number | string;
  readAt: number | string | null;
};

// created_at is stored as epoch ms (migration 0016); accept an ISO string too
// so a serializer change upstream degrades to a date rather than "NaN ago".
function timeAgo(v: number | string): string {
  const t = typeof v === "number" ? v : Date.parse(v);
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}

export function NotificationsList() {
  const [rows, setRows] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // Read-all outcome for the sr-only live region below: the rows losing their
  // unread styling is a silent event for a screen reader (same announcement
  // pattern as VisibilityControl in dashboard/[slug]/page.tsx).
  const [announce, setAnnounce] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { notifications?: Notification[] };
      setRows(data.notifications ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    setBusy(true);
    setAnnounce("");
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });
      if (res.ok) {
        // The nav island caches its unread count; this event asks it to
        // refetch (see app/(app)/nav-links.tsx).
        window.dispatchEvent(new Event("ilo:notifications:read"));
        await load();
        setAnnounce("All notifications marked read");
      } else {
        setAnnounce("Couldn’t mark notifications read");
      }
    } catch {
      setAnnounce("Couldn’t mark notifications read");
    } finally {
      setBusy(false);
    }
  }

  if (failed) {
    return (
      <p className="text-sm text-ink-faint">
        Couldn&rsquo;t load notifications.{" "}
        <button
          onClick={() => void load()}
          className="text-accent-strong underline"
        >
          Try again
        </button>
      </p>
    );
  }

  if (rows === null) {
    return <p className="text-sm text-ink-faint">Loading&hellip;</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        Nothing here yet — when a teammate mentions you in a comment, it lands
        on this page.
      </p>
    );
  }

  const hasUnread = rows.some((n) => n.readAt == null);

  return (
    <div>
      <div className="flex justify-end pb-4">
        <button
          onClick={() => void markAllRead()}
          disabled={busy || !hasUnread}
          className="border border-divider px-4 py-2 text-sm font-extrabold text-ink transition-colors duration-150 hover:bg-ink/5 disabled:opacity-45"
        >
          {busy ? "Marking…" : "Mark all read"}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {announce}
        </span>
      </div>
      <ul>
        {rows.map((n) => {
          const unread = n.readAt == null;
          return (
            <li
              key={n.id}
              // Unread carries the marker: a 2px accent left rule on a wash
              // ground. Read rows keep the same rule slot (transparent) and
              // padding, so the text edge doesn't jump when a row flips state.
              className={`border-t-2 border-divider border-l-2 py-5 pl-4 ${
                unread
                  ? "border-l-accent bg-accent-wash"
                  : "border-l-transparent"
              }`}
            >
              <p className="text-[15px] leading-6 text-ink">
                {/* A deleted actor LEFT JOINs to null — say "Someone". */}
                <span className="font-extrabold">
                  {n.actorLabel ?? "Someone"}
                </span>{" "}
                mentioned you in{" "}
                {/* /private/<slug>, NOT /dashboard/<slug>: a mention points at
                    the DOCUMENT, and the dashboard page is its analytics. The
                    app's /private route redirects a signed-in member to the
                    published page correctly for every visibility, so it is
                    the one link that works without knowing visibility here.
                    A plain <a>, not next/link: prefetching a redirect route
                    would mint view-gate tokens for every row on the page.
                    An unpublished doc LEFT JOINs to a null slug — there is
                    nothing to link, so it renders as plain text. */}
                {n.docSlug ? (
                  <a
                    href={`/private/${n.docSlug}`}
                    className="font-extrabold text-accent-strong hover:underline"
                  >
                    {n.docTitle ?? n.docSlug}
                  </a>
                ) : (
                  <span className="font-extrabold">a removed document</span>
                )}
              </p>
              <p className="mt-1 max-w-[72ch] text-sm leading-6 text-ink-soft">
                {n.commentExcerpt ?? "comment removed"}
              </p>
              <p className="mt-1 text-[13px] tabular-nums text-ink-faint">
                {timeAgo(n.createdAt)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
