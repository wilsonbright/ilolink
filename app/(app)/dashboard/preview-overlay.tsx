"use client";

// A quick look at a published document without leaving the list.
//
// SECURITY — the sandbox here is load-bearing, and is copied deliberately from
// heatmap-view.tsx rather than reinvented: sandbox="allow-same-origin" with NO
// allow-scripts. The content worker serves author HTML, and for trusted=1
// documents it serves arbitrary author JavaScript by design (lib/sanitize/csp.ts).
// This overlay renders inside ilolink.com, an authenticated origin holding the
// session cookie. Adding allow-scripts here would run a document author's code
// in that origin. It must never be added.

import { useCallback, useEffect, useRef } from "react";

export function PreviewOverlay({
  slug,
  title,
  onClose,
}: {
  slug: string;
  title: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Whatever was focused when the overlay opened — the row's preview button —
  // so closing returns the keyboard where it was rather than dumping it at the
  // top of the document.
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    // The page behind must not scroll while the overlay is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      returnTo.current?.focus?.();
    };
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Keep Tab inside the dialog. Without this the keyboard walks off into the
      // dashboard behind, which is inert to the eye but not to the keyboard.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 sm:p-8"
      onClick={onClose}
      onKeyDown={onKeyDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${title}`}
        // The backdrop closes on click; the panel must not, or every click
        // inside the preview would dismiss it.
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-hairline bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-3">
          <p className="truncate text-sm font-medium text-ink">{title}</p>
          <div className="flex shrink-0 items-center gap-x-1">
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-2 py-1 text-sm text-accent transition-colors duration-150 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Open
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-md px-2 py-1 text-sm text-ink-soft transition-colors duration-150 hover:bg-accent-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Close
            </button>
          </div>
        </div>
        {/* Not allow-scripts. See the header comment — this is the whole point. */}
        <iframe
          src={`/${slug}`}
          title={`Preview of ${title}`}
          sandbox="allow-same-origin"
          className="h-full w-full flex-1 bg-canvas"
        />
      </div>
    </div>
  );
}
