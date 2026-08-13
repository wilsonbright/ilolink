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
//
// THEMING: markdown/JSON/CSV renderings carry no styling of their own, so in a
// dark app the preview used to flash a light rectangle. For those payloads a
// <style> restating the app tokens is prepended into the srcdoc — the values
// are read from the live custom properties at render time, so dark app means
// dark preview with nothing hardcoded here. Author-styled HTML (its own
// <style>/inline styles or a full document shell — trusted docs, exported
// pages) is left exactly as authored. The API sends no source_type, so which
// is which is sniffed from the payload; see isThemeable.

import { useCallback, useEffect, useRef, useState } from "react";

// Should this payload get the app theme? True only for the pipeline's own
// unstyled renderings; anything the author styled stays untouched.
//   - A full document shell means trusted/exported HTML: hands off.
//   - The pipeline's JSON/CSV tables (lib/publish/formats.ts renderJson /
//     renderCsv) DO carry inline styles, but only ours — recognized by their
//     generated prefixes. Their var(--surface,…)/var(--hairline,…) fallbacks
//     are what the injected :root block feeds.
//   - Any other <style> tag or style= attribute is authored styling: hands off.
//   - What remains is a bare fragment — markdown-it output — which themes.
function isThemeable(html: string): boolean {
  const head = html.trimStart().slice(0, 200).toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) return false;
  if (head.startsWith('<pre style="white-space:pre-wrap')) return true;
  if (head.startsWith('<div style="overflow-x:auto;"><table')) return true;
  // Sniff a COPY with code-block contents emptied out first: a markdown doc
  // whose fenced code merely QUOTES a <style> tag or a style= attribute is
  // still the pipeline's own unstyled rendering, and matching on the raw
  // payload misclassified it as author-styled. The tags themselves stay, so
  // a real style= on a <pre>/<code> element still reads as authored.
  const stripped = html
    .replace(/(<pre\b[^>]*>)[\s\S]*?(<\/pre>)/gi, "$1$2")
    .replace(/(<code\b[^>]*>)[\s\S]*?(<\/code>)/gi, "$1$2");
  if (/<style[\s>]/i.test(stripped)) return false;
  if (/\sstyle\s*=/i.test(stripped)) return false;
  return true;
}

// The app tokens, restated for the srcdoc document. Resolved from the live
// custom properties at call time — a dark scheme hands over its dark values —
// so no color literal ever appears here. The :root block feeds the fallback
// vars the pipeline's JSON/CSV markup already references.
function appThemeStyle(): string {
  if (typeof document === "undefined") return "";
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const canvas = v("--color-canvas");
  const ink = v("--color-ink");
  const inkSoft = v("--color-ink-soft");
  const hairline = v("--color-hairline");
  const accentStrong = v("--color-accent-strong");
  if (!canvas || !ink) return "";
  return `<style>
  :root { --surface: ${canvas}; --hairline: ${hairline}; }
  body { background: ${canvas}; color: ${ink}; }
  a { color: ${accentStrong}; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid ${hairline}; padding: 0.3rem 0.6rem; text-align: left; }
  blockquote { color: ${inkSoft}; border-left: 2px solid ${hairline}; margin-left: 0; padding-left: 1rem; }
  hr { border: 0; border-top: 1px solid ${hairline}; }
</style>`;
}

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
  // srcDoc bakes the RESOLVED token hexes at render time (appThemeStyle), so
  // an OS scheme flip while the overlay is open would leave the preview in the
  // stale scheme. Count flips; the counter keys the iframe below, so a flip
  // recomputes the srcdoc with the freshly resolved values.
  const [schemeFlips, setSchemeFlips] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSchemeFlips((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
          <p className="truncate text-sm font-extrabold text-ink">{title}</p>
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
            key={schemeFlips}
            title={`Preview of ${title}`}
            srcDoc={
              isThemeable(doc.html)
                ? appThemeStyle() + doc.html
                : doc.html
            }
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
