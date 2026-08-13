"use client";

// The per-row controls on /dashboard: view count, analytics, open, preview,
// copy URL, move.
//
// /dashboard itself stays a server component — this island is the only client
// code on the page. The Analytics link needs no browser, but it lives here so
// the whole action line renders as one cluster.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MoveTarget } from "@/lib/teamspace/move-targets";
import { PreviewOverlay } from "./preview-overlay";

// No per-control focus ring: the global :focus-visible rule draws the DS's
// square 2px accent outline.
const LINK = "text-ink-faint transition-colors duration-150 hover:text-ink";

export function DocumentRowActions({
  docId,
  slug,
  title,
  moveTargets,
}: {
  docId: string;
  slug: string;
  title: string;
  moveTargets: MoveTarget[];
}) {
  const router = useRouter();
  const [views, setViews] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // After paint, never before: the server-rendered list must not wait on this.
  // Counts come from a Durable Object keyed per document, so there is no batched
  // query available — one request per row, in parallel, is the cheapest shape.
  useEffect(() => {
    let live = true;
    fetch(`/api/counts?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ views?: number }>) : null))
      .then((d) => {
        if (live && d && typeof d.views === "number") setViews(d.views);
      })
      .catch(() => {
        // Leave it unset. A row with no number reads as "not loaded"; a 0 would
        // read as "nobody came", and only one of those is honest.
      });
    return () => {
      live = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const copy = useCallback(async () => {
    const url = `${window.location.origin}/${slug}`;
    try {
      // Undefined outside a secure context, so this genuinely can be absent.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement("textarea");
        el.value = url;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        if (!ok) throw new Error("execCommand refused");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Never a silent no-op — say the link so it can be copied by hand.
      setError(url);
    }
  }, [slug]);

  const move = useCallback(
    async (teamspaceId: string) => {
      setMoving(true);
      setError(null);
      try {
        const res = await fetch("/api/documents/move", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ documentId: docId, teamspaceId }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error || "That move didn't go through.");
          return;
        }
        setMenuOpen(false);
        // Moving changes the tab counts and which tab this row belongs to, so
        // re-derive both on the server rather than patching state here.
        router.refresh();
      } catch {
        setError("That move didn't go through.");
      } finally {
        setMoving(false);
      }
    },
    [docId, router],
  );

  return (
    <>
      {views !== null && (
        <span className="text-[13px] leading-6 tabular-nums text-ink-faint">
          {views} {views === 1 ? "view" : "views"}
        </span>
      )}

      <span className="ml-auto flex flex-wrap items-center gap-x-3.5 text-[13px]">
        {/* The row title already links here, but the title reads as "the
            document" while this names what is behind the click. */}
        <Link
          href={`/dashboard/${slug}`}
          aria-label={`Analytics for ${title}`}
          className="text-accent-strong transition-colors duration-150 hover:text-ink"
        >
          Analytics
        </Link>

        <a
          href={`/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${title}`}
          className={LINK}
        >
          Open
        </a>

        <button
          type="button"
          onClick={() => setPreviewing(true)}
          aria-label={`Preview ${title}`}
          className={LINK}
        >
          Preview
        </button>

        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Link copied" : `Copy link to ${title}`}
          className={
            copied
              ? "text-accent-strong transition-colors duration-150"
              : LINK
          }
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        {/* The button's label swap is a silent event for a screen reader, so
            announce it — same pattern as connect/copy-field.tsx. The failure
            path is already announced: it renders the URL into the role="alert"
            line below. */}
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Link copied" : ""}
        </span>

        {moveTargets.length > 0 && (
          <span className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Move ${title} to another teamspace`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={`${LINK} disabled:opacity-45`}
              disabled={moving}
            >
              Move
            </button>
            {menuOpen && (
              <div role="menu"
                className="absolute right-0 z-20 mt-1 min-w-48 border-2 border-divider bg-surface py-1 shadow-lg">
                <p className="px-3 py-1.5 text-xs text-ink-faint">
                  Move to — the link stays the same
                </p>
                {moveTargets.map((t) => (
                  <button key={t.id} type="button" role="menuitem"
                    onClick={() => move(t.id)} disabled={moving}
                    className="block w-full px-3 py-1.5 text-left text-sm text-ink-soft transition-colors duration-150 hover:bg-accent-soft hover:text-ink focus-visible:bg-accent-soft focus-visible:text-ink disabled:opacity-45">
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </span>
        )}
      </span>

      {error && (
        <p role="alert" className="basis-full text-[13px] text-ink">
          {error}
        </p>
      )}

      {previewing && (
        <PreviewOverlay slug={slug} title={title} onClose={() => setPreviewing(false)} />
      )}
    </>
  );
}
