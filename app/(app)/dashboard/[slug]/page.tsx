"use client";

// Per-document detail. Ownership is a teamspace; pre-accounts docs still prove
// it with the per-doc manage
// token this browser stored at publish time — not a session. If the token isn't
// here, this browser can't manage the doc, and we say so plainly (no data leak).
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getEntry, removeFromHistory, type HistoryEntry } from "@/lib/history";
import { StatsView } from "@/app/(app)/dashboard/stats-view";
import { HeatmapView } from "@/app/(app)/dashboard/heatmap-view";

export default function DocumentDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  // localStorage is client-only; resolve after mount. `undefined` = still
  // loading, `null` = looked and found nothing.
  const [entry, setEntry] = useState<HistoryEntry | null | undefined>(undefined);

  useEffect(() => {
    setEntry(getEntry(slug));
  }, [slug]);

  return (
    <section>
      <Link
        href="/dashboard"
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
          <h1 className="mt-6 text-2xl text-ink">
            {entry.title || "Untitled"}
          </h1>
          <a
            href={entry.url}
            className="mt-1 inline-block text-sm text-ink-soft transition-colors duration-150 hover:text-accent"
            target="_blank"
            rel="noopener noreferrer"
          >
            {entry.url}
          </a>

          <div className="mt-10">
            <StatsView slug={entry.slug} token={entry.manageToken} />
          </div>

          <div className="mt-16 border-t-2 border-divider pt-10">
            <HeatmapView slug={entry.slug} token={entry.manageToken} />
          </div>

          <DangerZone slug={entry.slug} token={entry.manageToken} />
        </>
      )}
    </section>
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
      <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink-faint">
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
