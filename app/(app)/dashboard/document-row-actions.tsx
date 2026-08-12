"use client";

// The per-row controls on /dashboard: view count, open, preview, copy URL, move.
//
// /dashboard itself stays a server component — this island is the only client
// code on the page, and it holds exactly the four things that need a browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MoveTarget } from "@/lib/teamspace/move-targets";
import { PreviewOverlay } from "./preview-overlay";

// 16px, currentColor, aria-hidden — the button around each one carries the
// label. Inline because this project has no icon library and will not gain one
// for four glyphs.
const ICON = "h-4 w-4";

function IconOpen() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-3" />
      <path d="M10 2h4v4M14 2 7.5 8.5" />
    </svg>
  );
}

function IconPreview() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5v-1A1.5 1.5 0 0 0 9 3H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 11h1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 8.5 3.5 3.5L13 5" />
    </svg>
  );
}

// A move glyph, deliberately not an ellipsis: the popover holds destinations,
// not a general actions menu, and an "..." would promise one this row lacks.
function IconMove() {
  return (
    <svg className={ICON} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 5.5h9M8.5 3 11 5.5 8.5 8" />
      <path d="M14 10.5H5M7.5 8 5 10.5 7.5 13" />
    </svg>
  );
}

const BTN =
  "rounded-md p-1.5 text-ink-faint transition-colors duration-150 " +
  "hover:bg-accent-soft hover:text-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

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
        <span className="tabular-nums">
          {views} {views === 1 ? "view" : "views"}
        </span>
      )}

      <span className="ml-auto flex items-center gap-x-0.5">
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${title}`}
          title="Open"
          className={BTN}
        >
          <IconOpen />
        </a>

        <button type="button" onClick={() => setPreviewing(true)}
          aria-label={`Preview ${title}`} title="Preview" className={BTN}>
          <IconPreview />
        </button>

        <button type="button" onClick={copy}
          aria-label={copied ? "Link copied" : `Copy link to ${title}`}
          title={copied ? "Copied" : "Copy link"}
          className={copied ? `${BTN} text-accent` : BTN}>
          {copied ? <IconCheck /> : <IconCopy />}
        </button>

        {moveTargets.length > 0 && (
          <span className="relative" ref={menuRef}>
            <button type="button" onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Move ${title} to another teamspace`}
              aria-expanded={menuOpen} aria-haspopup="menu"
              title="Move to teamspace" className={BTN} disabled={moving}>
              <IconMove />
            </button>
            {menuOpen && (
              <div role="menu"
                className="absolute right-0 z-20 mt-1 min-w-48 rounded-lg border border-hairline bg-surface py-1 shadow-lg">
                <p className="px-3 py-1.5 text-xs text-ink-faint">
                  Move to — the link stays the same
                </p>
                {moveTargets.map((t) => (
                  <button key={t.id} type="button" role="menuitem"
                    onClick={() => move(t.id)} disabled={moving}
                    className="block w-full px-3 py-1.5 text-left text-sm text-ink-soft transition-colors duration-150 hover:bg-accent-soft hover:text-ink focus-visible:bg-accent-soft focus-visible:text-ink focus-visible:outline-none disabled:opacity-50">
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </span>
        )}
      </span>

      {error && (
        <p role="alert" className="basis-full text-sm text-ink">
          {error}
        </p>
      )}

      {previewing && (
        <PreviewOverlay slug={slug} title={title} onClose={() => setPreviewing(false)} />
      )}
    </>
  );
}
