"use client";

// Per-document detail. Ownership is a teamspace; pre-accounts docs still prove
// it with the per-doc manage
// token this browser stored at publish time — not a session. If the token isn't
// here, this browser can't manage the doc, and we say so plainly (no data leak).
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  addToHistory,
  getEntry,
  removeFromHistory,
  type HistoryEntry,
} from "@/lib/history";
import { StatsView } from "@/app/(app)/dashboard/stats-view";
import { HeatmapView } from "@/app/(app)/dashboard/heatmap-view";
import { TAG_OUTLINE } from "@/lib/ui/tags";
import { VisibilityControl } from "@/app/(app)/dashboard/visibility-control";

// Server-fresh document metadata (/api/documents/meta). The history entry's
// visibility is a snapshot from publish time, so once this loads it wins; it
// also carries who published the doc, which localStorage never knew.
interface DocMeta {
  visibility: string;
  creatorLabel: string | null;
  canChangeVisibility: boolean;
  // Whether the doc belongs to a teamspace — what decides if the members link
  // line below the public URL renders at all.
  teamspace: boolean;
  // Which teamspace, when the viewer is a member of it. Drives the back link.
  teamspaceId: string | null;
}

export default function DocumentDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // localStorage is client-only; resolve after mount. `undefined` = still
  // loading, `null` = looked and found nothing.
  const [entry, setEntry] = useState<HistoryEntry | null | undefined>(undefined);
  // null = not loaded (failed, still in flight, or not authorized) — the page
  // then renders exactly what it always did from the history entry alone.
  const [meta, setMeta] = useState<DocMeta | null>(null);

  useEffect(() => {
    setEntry(getEntry(slug));
  }, [slug]);

  // The layout's static title ("Document — ilolink") covers loading and the
  // no-entry state; once the history entry resolves, name the tab after the
  // document itself.
  useEffect(() => {
    if (entry) document.title = `${entry.title || "Untitled"} — ilolink`;
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    let alive = true;
    const q = new URLSearchParams({
      slug: entry.slug,
      token: entry.manageToken,
    }).toString();
    fetch(`/api/documents/meta?${q}`)
      .then((r) => (r.ok ? (r.json() as Promise<DocMeta>) : Promise.reject()))
      .then((m) => alive && setMeta(m))
      // Degrade to the history snapshot; the stats section reports its own
      // errors, so a second banner here would just be noise.
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [entry]);

  return (
    <section className="mx-auto w-full max-w-[1160px]">
      {/* Back to the tab this document actually lives in. A teamspace doc used
          to send you to Personal, which reads as the document having moved.
          The id arrives with the metadata fetch, so a click in the first
          moments still falls back to a bare /dashboard — correct, just less
          specific, and the dashboard resolves an unknown ?ts= the same way. */}
      <Link
        href={meta?.teamspaceId ? `/dashboard?ts=${meta.teamspaceId}` : "/dashboard"}
        className="text-sm text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        ← All documents
      </Link>

      {entry === undefined ? null : entry === null ? (
        <div className="mt-6 max-w-prose space-y-3">
          {/* This is the LEGACY path: documents published before accounts
              existed are unlocked by a per-doc token kept in the publishing
              browser. Documents published since belong to a teamspace and are
              reachable from any device you sign in on. The old copy stated the
              browser-key rule unconditionally, which is false for every
              document published since the accounts pivot — and it told people
              to go hunting for the wrong browser when signing in was the
              answer. */}
          <h1 className="text-2xl text-ink">
            Can&rsquo;t open these analytics
          </h1>
          <p className="leading-relaxed text-ink-soft">
            <span className="text-ink">/{slug}</span> isn&rsquo;t in a teamspace
            you&rsquo;re signed in to, and this browser doesn&rsquo;t hold the
            key for it either.
          </p>
          <p className="text-sm leading-relaxed text-ink-faint">
            If you published it recently, sign in with the account you used. If
            you published it before ilolink had accounts, its analytics are
            unlocked by the browser you published from — open it there, and you
            can add it to your account from your dashboard.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-3.5 pt-5">
            <h1 className="ml-[-0.058em] text-[clamp(30px,3.4vw,42px)] leading-none text-ink">
              {entry.title || "Untitled"}
            </h1>
            {/* Until the meta lands (or when it never does: signed out,
                legacy-token-only, or a mere share) this is the same read-only
                tag the page always drew, from the localStorage snapshot. */}
            <VisibilityControl
              slug={entry.slug}
              visibility={meta?.visibility ?? entry.visibility}
              canChange={!!meta?.canChangeVisibility}
            />
          </div>
          <PublicUrl url={entry.url} />
          {/* The members link: opening the doc through it signed in is what
              produces the Team readers receipts on the stats below. It works
              for every visibility (it just redirects members), so no
              conditional wording is needed. */}
          {meta?.teamspace ? (
            <PublicUrl
              url={`https://ilolink.com/private/${entry.slug}`}
              label="Members link"
            />
          ) : null}
          {meta?.creatorLabel ? (
            <p className="mt-1.5 text-sm text-ink-faint">
              Published by {meta.creatorLabel}
            </p>
          ) : null}

          <div className="mt-9">
            <StatsView slug={entry.slug} token={entry.manageToken} />
          </div>

          <div className="mt-12">
            <HeatmapView slug={entry.slug} token={entry.manageToken} />
          </div>

          <DangerZone slug={entry.slug} token={entry.manageToken} />
        </>
      )}
    </section>
  );
}

// A URL line with an inline copy action — the public URL, and (labelled) the
// members link on teamspace docs. Copy mirrors the dashboard row-action
// mechanism: clipboard API when the context is secure, hidden textarea +
// execCommand otherwise. On failure we say so rather than staying silent — the
// URL itself is right there to copy by hand.
function PublicUrl({ url, label }: { url: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = useCallback(async () => {
    try {
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
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1500);
  }, [url]);

  return (
    <p className="mt-2.5 text-sm tabular-nums">
      {label ? <span className="text-ink-faint">{label} · </span> : null}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-strong transition-colors duration-150 hover:text-ink"
      >
        {url}
      </a>
      <span className="text-ink-faint"> · </span>
      <button
        type="button"
        onClick={copy}
        className="text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        {state === "idle"
          ? "Copy"
          : state === "copied"
            ? "Copied"
            : "Couldn’t copy — grab the link by hand"}
      </button>
      {/* The button's own label swap is a silent event for a screen reader, so
          announce it — same pattern as connect/copy-field.tsx. sr-only is
          absolutely positioned, so it takes no room in the line. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied"
          ? "Link copied"
          : state === "failed"
            ? "Copy failed"
            : ""}
      </span>
    </p>
  );
}

// Destructive, irreversible, and off on its own at the bottom. Two-step confirm
// so a stray click can't unpublish. The manage token comes only from the
// browser-local history entry — never a URL, never re-fetched.
function DangerZone({ slug, token }: { slug: string; token: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents?slug=${encodeURIComponent(slug)}`,
        {
          method: "DELETE",
          headers: { authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error();
      removeFromHistory(slug);
      router.push("/dashboard");
    } catch {
      setDeleting(false);
      setError("Couldn’t delete this document. Please try again.");
    }
  }

  return (
    <div className="mt-16 border-t-2 border-divider pt-10">
      <h2 className="text-[13px] uppercase tracking-[0.08em] text-ink">
        Danger
      </h2>
      <div className="mt-4 max-w-prose space-y-3">
        <p className="text-sm text-ink-soft">
          Permanently unpublish this document. The link stops working and every
          view, reaction, and comment is erased. This can’t be undone.
        </p>

        {!armed ? (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:bg-accent-soft/40"
          >
            Delete document
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-ink">
              Really delete? This can’t be undone.
            </span>
            <button
              type="button"
              onClick={del}
              disabled={deleting}
              className="text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:bg-accent-soft/40 disabled:opacity-45"
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              disabled={deleting}
              className="text-sm text-ink-faint transition-colors duration-150 hover:text-ink disabled:opacity-45"
            >
              Cancel
            </button>
          </div>
        )}

        {error ? <p className="text-sm text-accent-strong">{error}</p> : null}
      </div>
    </div>
  );
}
