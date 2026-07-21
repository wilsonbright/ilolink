"use client";

// Accountless dashboard. There is no server-side list of "your" documents —
// ownership lives only in this browser. We render getHistory() from
// localStorage: what you published here, with the link and a way into stats.
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getHistory,
  removeFromHistory,
  type HistoryEntry,
} from "@/lib/history";

const VISIBILITY_LABEL: Record<string, string> = {
  public: "Public",
  unlisted: "Unlisted",
  password: "Password",
  expiring: "Expiring",
};

function formatDate(ms: number): string {
  if (!ms) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(ms);
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
      {VISIBILITY_LABEL[visibility] ?? visibility}
    </span>
  );
}

function DocCard({
  entry,
  onDeleted,
}: {
  entry: HistoryEntry;
  onDeleted: (slug: string) => void;
}) {
  // Two-step confirm, kept subtle: a hover-revealed muted link that expands
  // into an inline confirm so no single click can unpublish.
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  async function del() {
    setDeleting(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/documents?slug=${encodeURIComponent(entry.slug)}`,
        {
          method: "DELETE",
          headers: { authorization: `Bearer ${entry.manageToken}` },
        },
      );
      if (!res.ok) throw new Error();
      removeFromHistory(entry.slug);
      onDeleted(entry.slug);
    } catch {
      setDeleting(false);
      setError(true);
    }
  }

  return (
    <li className="group border-b border-hairline py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/dashboard/${entry.slug}`}
            className="text-lg font-medium text-ink transition-colors duration-150 hover:text-accent"
          >
            {entry.title || "Untitled"}
          </Link>
          <p className="mt-1 text-sm text-ink-faint">
            /{entry.slug} · Published {formatDate(entry.publishedAt)}
          </p>
        </div>
        <VisibilityBadge visibility={entry.visibility} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <a
          href={entry.url}
          className="text-ink-soft transition-colors duration-150 hover:text-accent"
          target="_blank"
          rel="noopener noreferrer"
        >
          View
        </a>
        <Link
          href={`/dashboard/${entry.slug}`}
          className="text-ink-soft transition-colors duration-150 hover:text-accent"
        >
          Stats &amp; comments
        </Link>

        {!armed ? (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="text-ink-faint opacity-0 transition-opacity duration-150 hover:text-[#b3261e] focus-visible:opacity-100 group-hover:opacity-100 dark:hover:text-[#f2827a]"
          >
            Delete
          </button>
        ) : (
          <span className="flex items-center gap-3">
            <span className="text-ink-soft">Really delete?</span>
            <button
              type="button"
              onClick={del}
              disabled={deleting}
              className="font-medium text-[#b3261e] transition-colors duration-150 hover:text-[#8f1d18] disabled:opacity-50 dark:text-[#f2827a] dark:hover:text-[#f6a49e]"
            >
              {deleting ? "Deleting…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              disabled={deleting}
              className="text-ink-faint transition-colors duration-150 hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-2 text-sm text-[#b3261e] dark:text-[#f2827a]">
          Couldn’t delete this document. Please try again.
        </p>
      ) : null}
    </li>
  );
}

export default function DashboardPage() {
  // localStorage is client-only; read after mount to avoid hydration mismatch.
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  function handleDeleted(slug: string) {
    // removeFromHistory already ran in the card; mirror it in state so the row
    // drops out without a reload.
    setEntries((prev) => (prev ? prev.filter((e) => e.slug !== slug) : prev));
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-ink">Your documents</h1>
        <Link
          href="/publish"
          className="text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          Publish
        </Link>
      </div>

      {entries === null ? null : entries.length === 0 ? (
        <div className="mt-10 max-w-prose space-y-3 text-ink-soft">
          <p>Nothing published from this browser yet.</p>
          <p className="text-sm text-ink-faint">
            ilolink has no accounts. Your published documents are remembered in{" "}
            <span className="text-ink-soft">this browser only</span> — clear its
            storage or switch devices and this list starts empty, though your
            links keep working.
          </p>
          <p>
            <Link
              href="/publish"
              className="text-accent underline-offset-2 hover:underline"
            >
              Publish your first document
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-6">
          {entries.map((entry) => (
            <DocCard key={entry.slug} entry={entry} onDeleted={handleDeleted} />
          ))}
        </ul>
      )}
    </section>
  );
}
