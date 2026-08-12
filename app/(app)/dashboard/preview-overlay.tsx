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
//
// WHY srcDoc AND NOT src={`/${slug}`}: the first version pointed the iframe at
// the live document URL and was dead on arrival in production — every published
// document is served with `frame-ancestors 'none'` and `X-Frame-Options: DENY`,
// so the browser refuses the frame outright ("ilolink.com refused to connect").
// That header is correct and stays: it is what stops a third-party site framing
// someone's document for clickjacking. The supported way in is /api/doc-html,
// which is gated on canRead by the same guard as the analytics routes, returns
// the sanitized body with `script-src 'none'`, and exists precisely to be
// rendered as srcdoc by the owner — which is how the heatmap has always done it.
//
// This was invisible locally: single-segment slugs rewrite to the content
// worker, which does not run under `next dev`, so the local iframe 404'd rather
// than being refused.

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [doc, setDoc] = useState<
    { state: "loading" } | { state: "ready"; html: string } | { state: "error" }
  >({ state: "loading" });
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

  useEffect(() => {
    let alive = true;
    setDoc({ state: "loading" });
    fetch(`/api/doc-html?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((html) => alive && setDoc({ state: "ready", html }))
      .catch(() => alive && setDoc({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [slug]);

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
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden border-2 border-divider bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-divider px-4 py-3">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <div className="flex shrink-0 items-center gap-x-1">
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:bg-accent-soft/40"
            >
              Open
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="px-2 py-1 text-sm text-ink-soft transition-colors duration-150 hover:bg-ink/5 hover:text-ink"
            >
              Close
            </button>
          </div>
        </div>
        {/* srcDoc, not src — and never allow-scripts. See the header comment;
            both halves of that are the whole point. */}
        {doc.state === "ready" ? (
          <iframe
            title={`Preview of ${title}`}
            srcDoc={doc.html}
            sandbox="allow-same-origin"
            className="h-full w-full flex-1 bg-canvas"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-sm text-ink-faint">
              {doc.state === "loading"
                ? "Loading preview…"
                : "That preview didn't load. Open the document instead."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
