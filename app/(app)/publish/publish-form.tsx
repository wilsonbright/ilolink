"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SignInForm } from "@/app/(app)/signin/signin-form";
import type { SourceType, Visibility } from "@/lib/types";
import type { PublishTarget } from "@/lib/teamspace/publish-target";
import {
  defaultVisibilityFor,
  shouldShowTeamspacePicker,
} from "@/lib/teamspace/publish-target";
import { addToHistory } from "@/lib/history";

// Cloudflare Turnstile, run HIDDEN: the widget verifies silently and only shows
// UI if an interactive challenge is actually required (appearance below).
// For production, inject an INVISIBLE-mode sitekey via env; the fallback is
// Cloudflare's documented invisible always-pass test key ("...BB").
const TURNSTILE_SITEKEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || "1x00000000000000000000BB";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// The composer. One column, progressive disclosure: settings stay hidden
// until asked for. Paste OR drop a file; visibility reveals only the field
// its mode needs; the custom link hides behind a disclosure.
// ─────────────────────────────────────────────────────────────────────────

interface PublishResult {
  slug: string;
  url: string;
  manageToken: string;
  // Tag name → count of elements the sanitizer dropped. Absent when nothing
  // was removed. Surfaced on the share card so a page never quietly loses
  // pieces of itself, which is what a tester hit: "some components are missing
  // from the published file", with nothing anywhere saying so.
  removed?: Record<string, number>;
}

const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Anyone with the link. May be listed." },
  { value: "unlisted", label: "Unlisted", hint: "Only people you send the link to." },
  {
    value: "private",
    label: "Private",
    // The share link is not enough on its own: members prove who they are at
    // ilolink.com/private/<slug>, which forwards them to the page. This copy
    // is for a SHARED teamspace; a personal destination has no "members" to
    // speak of, so the hint render below swaps in a personal variant.
    hint: "Teamspace members only. The share link signs members in through ilolink.com.",
  },
  { value: "password", label: "Password", hint: "Opens only with a password you set." },
  { value: "expiring", label: "Expiring", hint: "Stops working after a date you choose." },
];

// A cheap, honest hint — not a parser. Enough to give history a readable name.
function deriveTitle(text: string, source: SourceType): string {
  const t = text.trim();
  if (source === "html") {
    const title = t.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const h1 = t.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    const raw = (title ?? h1 ?? "").replace(/<[^>]+>/g, "").trim();
    if (raw) return raw.slice(0, 120);
  } else {
    const heading = t.split(/\r?\n/).find((l) => l.trim().startsWith("#"));
    if (heading) return heading.replace(/^#+\s*/, "").trim().slice(0, 120);
  }
  const firstLine = t.split(/\r?\n/).find((l) => l.trim().length > 0);
  return firstLine ? firstLine.trim().slice(0, 120) : "Untitled";
}

// A cheap, honest hint — not a parser. Enough to label the source type.
function detectSource(text: string): SourceType {
  const head = text.trimStart().slice(0, 800).toLowerCase();
  if (!head) return "md";
  if (head.startsWith("<!doctype") || head.startsWith("<html")) return "html";
  if (/<(p|div|h[1-6]|body|article|section|span|table|ul|ol|main|header|footer)[\s>/]/.test(head)) {
    return "html";
  }
  return "md";
}

// `teamspaces` is empty for a signed-out visitor, in which case there is
// nothing to pick and /api/publish falls back to the personal teamspace as it
// always did.
//
// `discoverTeamspaces` is for the homepage composer. app/page.tsx is statically
// prerendered and may not read a session, so it cannot pass `teamspaces` as a
// prop — instead it passes this literal flag and the form fetches the list
// itself after mount, the same trick app/nav-auth.tsx uses for the nav. Every
// other caller (/publish) is a server component and passes real props.
export function PublishForm({
  teamspaces = [],
  initialTeamspaceId,
  discoverTeamspaces = false,
}: {
  teamspaces?: PublishTarget[];
  initialTeamspaceId?: string;
  discoverTeamspaces?: boolean;
} = {}) {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState<SourceType>("md");
  const [sourceLocked, setSourceLocked] = useState(false);
  // Opt-in: publish this HTML raw so its own scripts run (default off = sanitized).
  const [trusted, setTrusted] = useState(false);

  // Seeded from the destination, so arriving at /publish?ts=<a shared team>
  // opens on Private rather than flashing Public and then correcting itself.
  const [visibility, setVisibility] = useState<Visibility>(() =>
    defaultVisibilityFor(
      teamspaces.find((t) => t.id === initialTeamspaceId)?.personal ?? true,
    ),
  );
  // Once the publisher picks a visibility by hand, switching teamspace must
  // leave it alone. Not just politeness: they may have chosen Password and
  // typed one, and an auto-override would silently discard it. A ref, not
  // state — nothing renders from it, so it must not cause a re-render.
  const visibilityTouched = useRef(false);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [showSlug, setShowSlug] = useState(false);
  const [slug, setSlug] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  // Which teamspace the document lands in. Seeded from ?ts= (the /dashboard tab
  // you came from) and resolved server-side; the picker below can override it.
  const [teamspaceId, setTeamspaceId] = useState<string | undefined>(
    initialTeamspaceId,
  );
  // Filled in by the homepage fetch below; null means "haven't asked / not
  // asking", which is why props win until it resolves.
  const [discovered, setDiscovered] = useState<PublishTarget[] | null>(null);
  const targets = discovered ?? teamspaces;

  const [dragging, setDragging] = useState(false);
  // Depth counter so dragging over child nodes doesn't flicker the overlay:
  // dragenter/leave fire per element, so track nesting and only clear at zero.
  const dragDepth = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Publishing requires an account. Rather than sending the user away — which
  // would destroy the draft in this component's state, including a file of up
  // to 15 MB — a 401 renders the sign-in form inline. This is the entire reason
  // sign-in uses a 6-digit code rather than a magic link.
  const [needsAuth, setNeedsAuth] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onTurnstileToken = useCallback((t: string) => setTurnstileToken(t), []);

  const detected = useMemo(() => detectSource(content), [content]);
  useEffect(() => {
    if (!sourceLocked) setSource(detected);
  }, [detected, sourceLocked]);

  // Ask which teamspaces this browser may publish into. Only the homepage does
  // this; /publish already has the answer server-side.
  //
  // Two things it must NOT do. It must not touch `error` on failure — the form
  // still publishes perfectly well without a picker, since the route falls back
  // to the personal teamspace. And it must not set `signedIn`, which is the
  // inline-sign-in confirmation flag: setting it here would print "Signed in —
  // press Publish to continue." permanently for every returning visitor.
  const loadTeamspaces = useCallback(() => {
    let live = true;
    fetch("/api/teamspaces")
      .then((r) => r.json() as Promise<{ teamspaces?: PublishTarget[] }>)
      .then((d) => {
        if (live) setDiscovered(d?.teamspaces ?? []);
      })
      .catch(() => {
        if (live) setDiscovered([]);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!discoverTeamspaces) return;
    return loadTeamspaces();
  }, [discoverTeamspaces, loadTeamspaces]);

  // Which teamspace the document actually lands in, once the list is known.
  //
  // The late arrival of that list is deliberately a no-op for visibility:
  // listTeamspacesForUser orders is_personal DESC, so targets[0] is always the
  // personal teamspace and defaultVisibilityFor still says "public" when the
  // fetch resolves. The homepage composer therefore always *starts* Public and
  // only a deliberate change of destination can move it — nothing flips under
  // someone who already read the summary line.
  const selectedId = teamspaceId ?? targets[0]?.id;
  const selectedTarget = targets.find((t) => t.id === selectedId);
  const showTeamspacePicker = shouldShowTeamspacePicker(targets);

  const loadFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isImage =
      /^image\//.test(file.type) || /\.(png|jpe?g|gif|webp|svg)$/.test(name);
    const isBinary = /\.(pdf|docx)$/.test(name); // rendered server-side
    const isText =
      /\.(md|markdown|html?|txt|json|csv|tsv|log|ya?ml|xml)$/.test(name);
    if (
      !isImage &&
      !isBinary &&
      !isText &&
      file.type &&
      !file.type.startsWith("text/")
    ) {
      setError(
        "That file type isn't supported yet. Markdown, HTML, JSON, CSV, plain text, images, PDF, and DOCX work.",
      );
      return;
    }
    // One ceiling for every format. Text used to be capped at 2 MB while a PDF
    // of the same size published fine, which read as an arbitrary refusal.
    const cap = 15_000_000;
    if (file.size > cap) {
      const mb = Math.round(cap / 1_000_000);
      const actual = (file.size / 1_000_000).toFixed(1);
      // Say the actual size and the usual cause. An exported HTML page is
      // mostly its inlined base64 images, and "trim it down" gave no clue that
      // linking them instead is what makes the difference.
      setError(
        `That file is ${actual} MB, over the ${mb} MB limit.` +
          (isText
            ? " Exported pages are usually mostly inlined images — linking them instead of embedding them will shrink it a lot."
            : ""),
      );
      return;
    }
    setError(null);
    setFileName(file.name);
    setSourceLocked(false); // let detection re-run on the new content
    if (isImage || isBinary) {
      // Inline as a data URL; the server detects the type and renders it
      // (image → <img>, docx → HTML, pdf → native viewer).
      const reader = new FileReader();
      reader.onload = () => setContent(String(reader.result || ""));
      reader.readAsDataURL(file);
    } else {
      setContent(await file.text());
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      dragDepth.current += 1;
      setDragging(true);
    }
  }, []);

  const onDragLeave = useCallback(() => {
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }, []);

  const canSubmit = content.trim().length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Add some content first.");
      return;
    }
    if (visibility === "password" && !password.trim()) {
      setError("Set a password, or choose a different visibility.");
      return;
    }
    let expiresMs: number | null = null;
    if (visibility === "expiring") {
      const ms = expiresAt ? new Date(expiresAt).getTime() : NaN;
      if (!Number.isFinite(ms) || ms <= Date.now()) {
        setError("Pick an expiry date in the future.");
        return;
      }
      expiresMs = ms;
    }
    const wantSlug = showSlug ? slug.trim() : "";
    if (wantSlug && !/^[a-z0-9-]{3,32}$/.test(wantSlug)) {
      setError("A custom link is 3–32 characters: lowercase letters, numbers, and hyphens.");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the human check below.");
      return;
    }

    // Binary uploads (image/pdf/docx) carry no readable title in their data URL —
    // use the file name. Text formats derive a title from the content.
    const title = content.startsWith("data:")
      ? (fileName?.replace(/\.[^.]+$/, "") || "Document")
      : deriveTitle(content, source);

    setSubmitting(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          sourceType: source,
          visibility,
          title,
          turnstileToken,
          ...(visibility === "password" ? { password } : {}),
          ...(visibility === "expiring" ? { expiresAt: expiresMs } : {}),
          ...(wantSlug ? { customSlug: wantSlug } : {}),
          ...(source === "html" && trusted ? { trusted: true } : {}),
          // The wire name is `teamspace`, not `teamspaceId` — see readInput in
          // app/api/publish/route.ts. Omitting it entirely (signed out, or a
          // single teamspace) leaves the route on its personal-teamspace
          // default, which is the correct behaviour for both.
          ...(teamspaceId ? { teamspace: teamspaceId } : {}),
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const obj = (data ?? {}) as Record<string, unknown>;

      if (res.status === 401) {
        // Not signed in. Keep the draft exactly where it is and ask for an
        // account in place.
        setTurnstileToken("");
        window.turnstile?.reset();
        setNeedsAuth(true);
        setError(null);
        return;
      }

      if (!res.ok || obj.ok === false) {
        // A used/failed token can't be replayed — force a fresh human check.
        setTurnstileToken("");
        window.turnstile?.reset();
        setError(
          typeof obj.error === "string"
            ? obj.error
            : "Couldn't publish just now. Please try again.",
        );
        return;
      }

      const outSlug = typeof obj.slug === "string" ? obj.slug : "";
      const outUrl =
        typeof obj.url === "string"
          ? obj.url
          : outSlug
            ? `${window.location.origin}/${outSlug}`
            : "";
      if (!outUrl) {
        setError("Published, but no link came back. Check your dashboard.");
        return;
      }

      const manageToken = typeof obj.manageToken === "string" ? obj.manageToken : "";
      addToHistory({
        slug: outSlug,
        title,
        url: outUrl,
        visibility,
        publishedAt: Date.now(),
        manageToken,
      });

      const removed =
        obj.removed && typeof obj.removed === "object"
          ? (obj.removed as Record<string, number>)
          : undefined;

      setResult({ slug: outSlug, url: outUrl, manageToken, removed });
    } catch {
      setTurnstileToken("");
      window.turnstile?.reset();
      setError("Network hiccup. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setContent("");
    setFileName(null);
    setSourceLocked(false);
    // Back to the default for the teamspace still selected, not unconditionally
    // to public — `reset` is "Publish another", and the second document is
    // going to the same place as the first.
    visibilityTouched.current = false;
    setVisibility(defaultVisibilityFor(selectedTarget?.personal ?? true));
    setPassword("");
    setExpiresAt("");
    setShowSlug(false);
    setSlug("");
    setShowOptions(false);
    setError(null);
    setTurnstileToken("");
  }

  if (result) {
    return <ShareCard result={result} onAnother={reset} />;
  }

  // The composer has three looks: an empty field dressed as a dropzone, a chip
  // for binary uploads, and the plain textarea the moment there is text. Naming
  // the two conditions keeps the JSX below readable.
  const isFileUpload = content.startsWith("data:");
  const isEmpty = content.length === 0;

  return (
    <form onSubmit={onSubmit} className="mt-12 space-y-8">
      {/* Composer ─────────────────────────────────────────── */}
      {/* The panel mirrors the "Your document" panel in the landing prototype:
          a 2px divider frame, a title-bar strip over the dropzone, and a
          footer strip carrying the format tags and the Publish action. */}
      <section>
        <div className="border-2 border-divider bg-surface transition-colors duration-150 focus-within:border-accent">
          <div className="border-b-2 border-divider px-5 py-3">
            <label
              htmlFor="doc"
              className="block text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink"
            >
              Your document
            </label>
          </div>
          <div
            onDragEnter={onDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className="relative"
          >
          {dragging ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-start justify-center gap-2 border-2 border-dashed border-accent bg-accent-soft/85 px-5 text-left backdrop-blur-[1px]">
              <svg
                className="h-8 w-8 text-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 16V4" />
                <path d="m6 10 6-6 6 6" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              <p className="text-sm font-extrabold text-accent-strong">Drop your file to upload</p>
              <p className="text-xs text-ink-soft">
                PDF, DOCX, Markdown, HTML, images, JSON, CSV
              </p>
            </div>
          ) : null}
          {isEmpty && !dragging ? (
            // An empty field looked like a plain box with a sentence in it and
            // nobody read it as somewhere to drop a file. This is the dropzone
            // treatment painted OVER the textarea: it lets clicks through, so
            // clicking anywhere still puts the cursor in the field and
            // paste-to-publish — the core flow — is untouched. Only the picker
            // button opts back into pointer events.
            <div className="pointer-events-none absolute inset-0 flex flex-col items-start justify-center gap-2 px-5 text-left">
              <svg
                className="h-8 w-8 text-ink-faint"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 16V4" />
                <path d="m6 10 6-6 6 6" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              <p className="text-sm font-extrabold text-ink">
                Drag and drop your file here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="pointer-events-auto font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                >
                  click to choose a file
                </button>
              </p>
              <p id="doc-hint" className="text-xs text-ink-faint">
                You can also click anywhere below and paste Markdown or HTML
              </p>
            </div>
          ) : null}
          {isFileUpload ? (
            // Binary/data uploads: the content is a base64 data URL — never show
            // that wall of text. Show a friendly file chip instead.
            <div className="flex h-72 flex-col items-start justify-center gap-3 px-5 text-left">
              <div className="text-3xl" aria-hidden>
                {content.startsWith("data:application/pdf")
                  ? "📄"
                  : content.startsWith("data:image/")
                    ? "🖼️"
                    : "📝"}
              </div>
              <div className="max-w-full truncate font-extrabold text-ink">
                {fileName || "Uploaded file"}
              </div>
              <div className="text-sm text-ink-faint">
                {content.startsWith("data:application/pdf")
                  ? "PDF — renders in the native viewer"
                  : content.startsWith(
                        "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      )
                    ? "Word document — converted to a web page"
                    : content.startsWith("data:image/")
                      ? "Image"
                      : "File"}{" "}
                · ready to publish
              </div>
              <button
                type="button"
                onClick={() => {
                  setContent("");
                  setFileName(null);
                  setSourceLocked(false);
                }}
                className="text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink"
              >
                Remove
              </button>
            </div>
          ) : (
            <textarea
              id="doc"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              // No placeholder: while the field is empty the dropzone copy above
              // occupies the same space, and two sets of instructions on top of
              // each other is what made this box hard to read. Screen readers get
              // the same hint through aria-describedby.
              aria-describedby={isEmpty ? "doc-hint" : undefined}
              spellCheck={false}
              className="block h-72 w-full resize-y bg-transparent px-5 py-4 font-mono text-sm leading-relaxed text-ink focus:outline-none"
            />
          )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t-2 border-divider px-5 py-3">
            <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
              {[".md", ".html", ".pdf", ".docx", ".json", ".csv"].map((ext) => (
                <span
                  key={ext}
                  className="border border-accent px-2.5 py-0.5 text-[11px] text-accent-strong"
                >
                  {ext}
                </span>
              ))}
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center bg-accent px-8 py-3 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
            >
              {submitting ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>

        {/* One picker for both entry points — the button inside the empty
            dropzone and the replace link below open this same input. */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.html,.htm,.txt,.json,.csv,.tsv,.log,.yaml,.yml,.xml,.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.docx,text/*,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
            e.target.value = "";
          }}
        />

        {isEmpty ? (
          <div className="mt-3 space-y-1.5">
            <p className="text-sm text-ink-faint">Markdown or HTML</p>
            {/* Guidance for the empty state, which is the only place it helps:
                once something is in the box the format is already settled, and
                a full paragraph at the same size as the file name was exactly
                what made that cluster unreadable. */}
            <p className="text-xs leading-relaxed text-ink-faint">
              ilolink renders whatever your AI emits — Markdown, HTML, JSON, CSV,
              code, images, PDF, and DOCX. Auto-detected, no need to choose a
              format.
            </p>
          </div>
        ) : (
          // Loudest first: what you just did (the file name), then how it will be
          // read, then the quiet way to swap it. These three used to share one
          // size, weight and colour and read as a single undifferentiated line.
          <div className="mt-3 space-y-1.5">
            {fileName && (
              <span className="flex min-w-0 items-center gap-1.5">
                <svg
                  className="h-4 w-4 shrink-0 text-ink-faint"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v5h5" />
                </svg>
                <span className="truncate text-sm font-medium text-ink">
                  {fileName}
                </span>
              </span>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-2 text-ink-soft">
                {isFileUpload ? (
                  // Binary/data uploads render server-side by type — no md/html choice.
                  <span>
                    {content.startsWith("data:application/pdf")
                      ? "PDF — native viewer"
                      : content.startsWith(
                            "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                          )
                        ? "Word document"
                        : content.startsWith("data:image/")
                          ? "Image"
                          : "File"}
                  </span>
                ) : content.trim() ? (
                  <>
                    <span>Reading as {source === "md" ? "Markdown" : "HTML"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceLocked(true);
                        setSource((s) => (s === "md" ? "html" : "md"));
                      }}
                      className="font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                    >
                      switch to {source === "md" ? "HTML" : "Markdown"}
                    </button>
                  </>
                ) : (
                  <span>Markdown or HTML</span>
                )}
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-auto text-ink-faint transition-colors duration-150 hover:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
              >
                {fileName ? "Choose a different file" : "Choose a file"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Destination, status, and options ─────────────────── */}
      {/* Publish sits in the composer panel's footer strip so it's never */}
      {/* hunted for; everything optional collapses behind the Options */}
      {/* disclosure. */}
      <div className="space-y-4">
        {/* Deliberately NOT behind the Options disclosure. Until now the form
            sent no teamspace at all and every document silently landed in the
            personal teamspace; hiding the control that fixes that would just
            reproduce the same surprise one click deeper. Shown only when there
            is a real choice — a solo user still never meets the concept.

            On the homepage this appears a moment after load, once
            /api/teamspaces answers. It sits above the Publish button and below
            the textarea, so the caret never moves; only the button shifts, and
            only in the first fraction of a second. Reserving space for it
            instead would leave a permanent gap for the signed-out majority —
            the same trade app/nav-auth.tsx makes for the nav. */}
        {showTeamspacePicker && (
          <div>
            <label
              htmlFor="teamspace"
              className="mb-1.5 block text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink"
            >
              Publish into
            </label>
            <select
              id="teamspace"
              name="teamspace"
              value={selectedId}
              onChange={(e) => {
                const next = e.target.value;
                setTeamspaceId(next);
                // A shared teamspace defaults to private, personal to public —
                // unless the publisher has already said what they want.
                if (!visibilityTouched.current) {
                  setVisibility(
                    defaultVisibilityFor(
                      targets.find((t) => t.id === next)?.personal ?? true,
                    ),
                  );
                }
              }}
              className="w-full border border-hairline bg-surface px-3 py-2.5 text-ink transition-colors duration-150 focus:border-accent focus:outline-none sm:w-auto"
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsAuth && (
          <div className="border-2 border-divider bg-surface">
            <p className="border-b-2 border-divider px-5 py-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink">
              Sign in to publish
            </p>
            <div className="p-5">
            <p className="mb-4 text-sm leading-relaxed text-ink-soft">
              Your draft stays exactly as it is — we&rsquo;ll email you a code.
              Readers never need an account.
            </p>
            <SignInForm
              next="/publish"
              onSignedIn={() => {
                setNeedsAuth(false);
                setSignedIn(true);
                // There was no session when the page loaded, so the picker has
                // nothing in it. Without this the very first publish after
                // signing in lands in Personal whatever the user meant — the
                // exact surprise this control exists to remove. The sign-in
                // card is unmounting anyway, so the picker arriving is part of
                // one visual change rather than a second one.
                if (discoverTeamspaces) loadTeamspaces();
              }}
            />
            </div>
          </div>
        )}

        {signedIn && (
          <p className="text-sm text-ink-soft">
            Signed in — press Publish to continue.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-ink">
            {error}
          </p>
        )}
        <Turnstile onToken={onTurnstileToken} />
        {/* The submit button itself lives in the composer panel's footer strip
            above (prototype treatment); this row keeps only the disclosure. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            aria-expanded={showOptions}
            className="text-sm font-extrabold text-ink-soft transition-colors duration-150 hover:text-ink"
          >
            {showOptions ? "Hide options" : "Options"}
          </button>
        </div>
        <p className="text-sm text-ink-faint">
          Publishing as{" "}
          <span className="text-ink-soft">
            {VISIBILITY.find((v) => v.value === visibility)?.label}
          </span>
          {/* Name the destination in the summary too, so someone who never
              opens the picker still sees where the document is going. */}
          {showTeamspacePicker && (
            <>
              {" into "}
              <span className="text-ink-soft">{selectedTarget?.label}</span>
            </>
          )}
          {showSlug && slug.trim() ? ` at /${slug.trim()}` : ""}.
        </p>
      </div>

      {/* Options (collapsed by default) ───────────────────── */}
      {showOptions && (
      <div className="space-y-10 border-t-2 border-divider pt-8">
      {/* Visibility ───────────────────────────────────────── */}
      <section className="space-y-3">
        <span className="block text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink">
          Who can see it
        </span>
        <div
          role="radiogroup"
          aria-label="Visibility"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {VISIBILITY.map((opt) => {
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  // Any deliberate pick pins the choice, so a later change of
                  // teamspace cannot overwrite it (or a password already typed).
                  visibilityTouched.current = true;
                  setVisibility(opt.value);
                }}
                className={`border px-3 py-2 text-sm font-extrabold transition-colors duration-150 ${
                  active
                    ? "border-accent bg-accent text-canvas"
                    : "border-hairline bg-surface text-ink-soft hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-ink-faint">
          {/* Private into a personal teamspace has no teammates — claiming
              "Teamspace members only" there would promise an audience that
              doesn't exist. Same personal-default fallback as /api/publish:
              no picked target means the personal teamspace. */}
          {visibility === "private" && (selectedTarget?.personal ?? true)
            ? "Only you. Opening the link requires signing in."
            : VISIBILITY.find((v) => v.value === visibility)?.hint}
        </p>

        {/* Progressive disclosure: only the field this mode needs. */}
        {visibility === "password" && (
          <div className="pt-1">
            <label htmlFor="pw" className="sr-only">
              Password
            </label>
            <input
              id="pw"
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password"
              className="w-full max-w-sm border border-hairline bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
            />
          </div>
        )}
        {visibility === "expiring" && (
          <div className="pt-1">
            <label htmlFor="exp" className="sr-only">
              Expiry date and time
            </label>
            <input
              id="exp"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full max-w-sm border border-hairline bg-surface px-3.5 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none"
            />
          </div>
        )}
      </section>

      {/* Custom link (disclosure) ─────────────────────────── */}
      <section>
        {showSlug ? (
          <div className="space-y-2">
            <label
              htmlFor="slug"
              className="block text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink"
            >
              Custom link
            </label>
            <div className="flex max-w-md items-stretch overflow-hidden border border-hairline bg-surface transition-colors duration-150 focus-within:border-accent">
              <span className="flex select-none items-center pl-3.5 pr-1 text-sm text-ink-faint">
                /
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="my-launch-notes"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-transparent py-2 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
            <p className="text-sm text-ink-faint">
              3–32 characters: lowercase letters, numbers, hyphens. Leave the box
              to let us pick a short one.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSlug(true)}
            className="text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:bg-accent-soft/40"
          >
            Add a custom link
          </button>
        )}
      </section>

      {/* Trusted HTML (disclosure) — only meaningful for HTML source ────────── */}
      {source === "html" && (
        <section className="space-y-2">
          <label htmlFor="trusted" className="flex items-start gap-3">
            <input
              id="trusted"
              type="checkbox"
              checked={trusted}
              onChange={(e) => setTrusted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span className="text-sm">
              <span className="font-medium text-ink">
                Run this page&rsquo;s scripts (trusted HTML)
              </span>
              <span className="mt-0.5 block text-ink-faint">
                Keep interactive HTML working — buttons, tabs, toggles. The page
                is published <span className="text-ink-soft">as-is, not
                sanitized</span>, so only turn this on for HTML you wrote or
                trust. Leave off and scripts are stripped for safety.
              </span>
            </span>
          </label>
        </section>
      )}
      </div>
      )}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Turnstile — Cloudflare's cookieless human check. Loads the script once and
// renders a single widget; the token flows up via onToken and is spent on
// publish. Muted, on-brand, self-cleaning on unmount.
// ─────────────────────────────────────────────────────────────────────────

function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    let widgetId: string | undefined;
    let cancelled = false;
    let poll: number | undefined;

    const render = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      ref.current.replaceChildren();
      widgetId = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITEKEY,
        callback: (t) => onToken(t),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
        theme: "auto",
        // Stay hidden; only render UI if an interactive challenge is required.
        appearance: "interaction-only",
      });
    };

    if (window.turnstile) {
      render();
    } else if (!document.querySelector(`script[src="${SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      poll = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(poll);
          render();
        }
      }, 150);
    }

    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          /* widget already gone */
        }
      }
    };
  }, [onToken]);

  // No reserved height: interaction-only keeps this empty (0px) unless Turnstile
  // needs to show a challenge, at which point its own iframe sizes the box.
  return <div ref={ref} className="empty:hidden" />;
}

// ─────────────────────────────────────────────────────────────────────────
// The result: a quiet share card. Link, copy, and a scannable QR.
// ─────────────────────────────────────────────────────────────────────────

function ShareCard({
  result,
  onAnother,
}: {
  result: PublishResult;
  onAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  // Name the elements the way the person who wrote the page thinks of them,
  // not by tag. "3 scripts" is actionable; "3 <script>" reads like an error.
  const REMOVED_LABEL: Record<string, [string, string]> = {
    script: ["script", "scripts"],
    iframe: ["embedded frame", "embedded frames"],
    link: ["external stylesheet or font", "external stylesheets or fonts"],
    object: ["embedded object", "embedded objects"],
    embed: ["embedded object", "embedded objects"],
    canvas: ["canvas", "canvases"],
    video: ["video", "videos"],
    audio: ["audio clip", "audio clips"],
    meta: ["meta tag", "meta tags"],
    base: ["base tag", "base tags"],
    foreignobject: ["foreign object", "foreign objects"],
  };

  const removedParts = Object.entries(result.removed ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([tag, n]) => {
      const [one, many] = REMOVED_LABEL[tag] ?? [tag, `${tag} elements`];
      return `${n} ${n === 1 ? one : many}`;
    });

  return (
    <div className="mt-12">
      <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
        Published
      </p>
      <h2 className="mt-2 text-2xl text-ink">Your link is ready</h2>

      {/* Removal used to be entirely silent. A tester published a page, saw
          pieces of it missing, and had nothing to go on — the trusted-HTML
          option that would have kept them was off by default AND hidden behind
          a collapsed disclosure. Say what went, and say what to do about it. */}
      {removedParts.length > 0 && (
        <div className="mt-6 border-2 border-divider bg-surface p-4">
          <p className="text-sm text-ink">
            Removed for safety: {removedParts.join(", ")}.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
            Everything else published normally. If this page needs its scripts
            to work, publish it again with{" "}
            <span className="text-ink-soft">Run this page&rsquo;s scripts</span>{" "}
            turned on under Options — that keeps the page exactly as you wrote
            it, so only do it for HTML you trust.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          {/* Open and Copy are icons now — the pattern people already know from
              every other AI tool, and it stops two words of chrome competing
              with the link itself. Both keep an aria-label and a title so the
              meaning survives without the word. */}
          <div className="flex items-stretch overflow-hidden border-2 border-divider bg-surface transition-colors duration-150 focus-within:border-accent">
            <input
              readOnly
              value={result.url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-sm text-ink focus:outline-none"
              aria-label="Share link"
            />
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open the published page in a new tab"
              title="Open in a new tab"
              className="flex shrink-0 items-center border-l border-hairline px-3.5 text-ink-soft transition-colors duration-150 hover:bg-accent-soft hover:text-ink focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? "Link copied" : "Copy link"}
              title={copied ? "Copied" : "Copy link"}
              className="flex shrink-0 items-center border-l border-hairline px-3.5 text-accent transition-colors duration-150 hover:bg-accent-soft focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
            >
              {copied ? (
                // The word "Copied" was the only confirmation; with the label
                // gone the tick has to carry it, and it clears on the same
                // 1600 ms timer.
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m20 6-11 11-5-5" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>

          {/* A tick is no help to a screen reader, so announce the copy too. */}
          <p role="status" aria-live="polite" className="sr-only">
            {copied ? "Link copied to clipboard" : ""}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {/* Publishing another was a grey text link with less weight than the
                QR caption, so the most likely next action looked like the least
                likely one. It carries the same treatment as Publish itself. */}
            <button
              type="button"
              onClick={onAnother}
              className="inline-flex w-full items-center justify-start bg-accent px-8 py-3 text-left text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong focus:outline-2 focus:outline-offset-2 focus:outline-accent sm:w-auto"
            >
              Publish another
            </button>
            <a
              href="/dashboard"
              className="text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            >
              Your documents →
            </a>
          </div>
        </div>

        <div className="shrink-0">
          <QrCode text={result.url} />
          <p className="mt-2 text-center text-xs text-ink-faint">Scan to open</p>
        </div>
      </div>

      <Preview slug={result.slug} token={result.manageToken} />
    </div>
  );
}

// A live preview of the published page — the sanitized doc HTML in a sandboxed,
// script-free iframe. Switch device widths; the iframe renders at the device's
// real width and is scaled to fit, so desktop shows its full-resolution layout.
const DEVICES = [
  { key: "mobile", label: "Mobile", w: 390 },
  { key: "tablet", label: "Tablet", w: 834 },
  { key: "desktop", label: "Desktop", w: 1280 },
] as const;
type DeviceKey = (typeof DEVICES)[number]["key"];
const FRAME_H = 760; // rendered viewport height before scaling

function defaultDevice(): DeviceKey {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function Preview({ slug, token }: { slug: string; token: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [boxW, setBoxW] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDevice(defaultDevice()), []);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ slug, token }).toString();
    fetch(`/api/doc-html?${q}`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => alive && setHtml(t))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [slug, token]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBoxW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (failed) return null;

  // Only offer mobile/tablet if the doc actually has responsive CSS (width-based
  // media queries). A fixed-width page looks identical at every width, so we just
  // show it at desktop, full.
  const responsive =
    html != null && /@media[^{]*(?:max-width|min-width)/i.test(html);
  const effKey = responsive ? device : "desktop";
  const dev = DEVICES.find((d) => d.key === effKey) ?? DEVICES[2];
  // Never upscale a narrow device; scale a wide one down to fit the column.
  const scale = boxW ? Math.min(1, boxW / dev.w) : 1;
  const scaledW = Math.round(dev.w * scale);
  const scaledH = Math.round(FRAME_H * scale);

  return (
    <div className="mt-10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink">
          Preview
        </p>
        {responsive && (
          <div className="flex divide-x divide-hairline border border-hairline">
            {DEVICES.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDevice(d.key)}
                className={`px-2.5 py-1 text-xs font-extrabold transition-colors duration-150 ${
                  device === d.key
                    ? "bg-accent text-canvas"
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={boxRef}
        className="flex justify-center overflow-hidden border-2 border-divider bg-surface"
        style={{ height: html == null ? 288 : scaledH }}
      >
        {html == null ? (
          <div className="flex items-center text-sm text-ink-faint">
            Loading preview…
          </div>
        ) : (
          <div style={{ width: scaledW, height: scaledH, overflow: "hidden" }}>
            <iframe
              title="Published page preview"
              sandbox="allow-same-origin"
              srcDoc={html}
              style={{
                width: dev.w,
                height: FRAME_H,
                border: 0,
                // Literal white on purpose, not a theme token: this iframe
                // previews the PUBLISHED document, and the doc origin renders
                // on white regardless of this app's color scheme.
                background: "#fff",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        {dev.label} width, scaled to fit. Open the link for the full experience.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// QR code — dependency-free (byte mode, EC level M, versions 1–5). Enough for
// any share link; returns null past ~84 chars, and the card still shows a
// copyable URL. Ported from Nayuki's public-domain QR generator, trimmed.
// ─────────────────────────────────────────────────────────────────────────

export function QrCode({ text }: { text: string }) {
  const matrix = useMemo(() => qrBuildMatrix(text), [text]);
  if (!matrix) return null;

  const { size, modules } = matrix;
  const quiet = 4;
  const total = size + quiet * 2;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={148}
      height={148}
      role="img"
      aria-label="QR code for the share link"
      shapeRendering="crispEdges"
      className="border-2 border-divider"
    >
      <rect width={total} height={total} fill="var(--color-surface)" />
      <path d={d} fill="var(--color-ink)" />
    </svg>
  );
}

const ECC_M_PER_BLOCK: Record<number, number> = { 1: 10, 2: 16, 3: 26, 4: 18, 5: 24 };
const ECC_M_BLOCKS: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2 };

const getBit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function qrRawModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
  }
  return result;
}

function qrDataCodewords(ver: number): number {
  return Math.floor(qrRawModules(ver) / 8) - ECC_M_PER_BLOCK[ver] * ECC_M_BLOCKS[ver];
}

function qrAlignPositions(ver: number): number[] {
  if (ver === 1) return [];
  const size = ver * 4 + 17;
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

function rsDivisor(degree: number): number[] {
  const result: number[] = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result: number[] = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

// Encode text as byte-mode codewords for the smallest fitting version (1–5).
function qrEncode(text: string): { data: number[]; ver: number } | null {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 0;
  for (let v = 1; v <= 5; v++) {
    if (4 + 8 + 8 * bytes.length <= qrDataCodewords(v) * 8) {
      ver = v;
      break;
    }
  }
  if (ver === 0) return null;

  const cap = qrDataCodewords(ver);
  const bits: number[] = [];
  const append = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  append(0x4, 4); // byte mode
  append(bytes.length, 8); // char count (byte mode, versions 1–9)
  for (const b of bytes) append(b, 8);
  for (let i = 0; i < 4 && bits.length < cap * 8; i++) bits.push(0); // terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  const pad = [0xec, 0x11];
  for (let i = 0; codewords.length < cap; i++) codewords.push(pad[i % 2]);

  return { data: qrInterleave(codewords, ver), ver };
}

// Split into blocks, add Reed–Solomon ECC, and interleave (Nayuki's scheme).
function qrInterleave(data: number[], ver: number): number[] {
  const numBlocks = ECC_M_BLOCKS[ver];
  const eccLen = ECC_M_PER_BLOCK[ver];
  const rawCodewords = Math.floor(qrRawModules(ver) / 8);
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(eccLen);

  const blocks: number[][] = [];
  let k = 0;
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortLen - eccLen + (i < numShort ? 0 : 1);
    const dat = data.slice(k, k + datLen);
    k += datLen;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShort) dat.push(0); // padding slot for even interleaving
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortLen - eccLen || j >= numShort) result.push(blocks[j][i]);
    }
  }
  return result;
}

function qrBuildMatrix(text: string): { size: number; modules: boolean[][] } | null {
  const enc = qrEncode(text);
  if (!enc) return null;
  const { data, ver } = enc;
  const size = ver * 4 + 17;

  const modules: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const isFunc: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const set = (x: number, y: number, val: boolean) => {
    modules[y][x] = val;
    isFunc[y][x] = true;
  };

  // Timing patterns first, then finders overwrite the overlaps.
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const align = qrAlignPositions(ver);
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === align.length - 1) ||
        (i === align.length - 1 && j === 0)
      ) {
        continue; // overlaps a finder
      }
      const cx = align[i];
      const cy = align[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  const drawFormat = (mask: number) => {
    const fmt = (0 << 3) | mask; // EC level M has format bits 0
    let rem = fmt;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((fmt << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, getBit(b, i));
    set(8, 7, getBit(b, 6));
    set(8, 8, getBit(b, 7));
    set(7, 8, getBit(b, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, getBit(b, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, getBit(b, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, getBit(b, i));
    set(8, size - 8, true); // dark module
  };
  drawFormat(0); // reserve the format regions

  // Zigzag data placement over the non-function modules.
  let idx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let v = 0; v < size; v++) {
      for (let c = 0; c < 2; c++) {
        const x = right - c;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - v : v;
        if (!isFunc[y][x] && idx < data.length * 8) {
          modules[y][x] = getBit(data[idx >>> 3], 7 - (idx & 7));
          idx++;
        }
      }
    }
  }

  const maskCond = (m: number, x: number, y: number): boolean => {
    switch (m) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  };
  const applyMask = (m: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!isFunc[y][x] && maskCond(m, x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };
  const penalty = (): number => {
    let score = 0;
    for (let y = 0; y < size; y++) {
      let run = 1;
      for (let x = 1; x < size; x++) {
        if (modules[y][x] === modules[y][x - 1]) run++;
        else run = 1;
        if (run === 5) score += 3;
        else if (run > 5) score++;
      }
    }
    for (let x = 0; x < size; x++) {
      let run = 1;
      for (let y = 1; y < size; y++) {
        if (modules[y][x] === modules[y - 1][x]) run++;
        else run = 1;
        if (run === 5) score += 3;
        else if (run > 5) score++;
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
          score += 3;
        }
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
    const ratio = (dark / (size * size)) * 100;
    score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
    return score;
  };

  let bestMask = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m);
    drawFormat(m);
    const s = penalty();
    if (s < bestScore) {
      bestScore = s;
      bestMask = m;
    }
    applyMask(m); // undo
  }
  applyMask(bestMask);
  drawFormat(bestMask);

  return { size, modules };
}
