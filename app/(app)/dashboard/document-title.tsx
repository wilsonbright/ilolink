"use client";

// The document title on a /dashboard row, editable in place.
//
// Titles have been INSERT-only since launch — every publish path derives one and
// nothing could ever change it. So a badly-derived title was permanent, and two
// publishes of the same document left two rows with identical names and no way
// to tell them apart.
//
// The pencil sits next to the title rather than in the row's icon cluster: the
// input replaces the title, so the control and the thing it changes have to live
// in one client component. Putting the trigger in the cluster would mean lifting
// the whole row into client state to coordinate two islands, which is a lot of
// JavaScript to move a button four inches.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_TITLE } from "@/lib/publish/title";

function IconPencil() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M11.5 2.5a1.77 1.77 0 0 1 2.5 2.5L5.5 13.5 2 14l.5-3.5Z" />
    </svg>
  );
}

export function DocumentTitle({
  docId,
  slug,
  title,
}: {
  docId: string;
  slug: string;
  title: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const cancel = useCallback(() => {
    setEditing(false);
    setError(null);
    setValue(title ?? "");
  }, [title]);

  const save = useCallback(async () => {
    // Nothing typed, or nothing changed — close rather than spend a request.
    if (value.trim() === (title ?? "").trim()) {
      cancel();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: docId, title: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "That rename didn't go through.");
        return;
      }
      setEditing(false);
      // Re-render from the server so the row, and anything else showing this
      // title, agree — rather than patching one copy of it here.
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }, [cancel, docId, router, title, value]);

  if (!editing) {
    return (
      <span className="flex min-w-0 items-baseline gap-2">
        <Link
          href={`/dashboard/${slug}`}
          className="truncate font-semibold text-ink transition-colors duration-150 hover:text-accent"
        >
          {title || slug}
        </Link>
        <button
          type="button"
          onClick={() => setEditing(true)}
          // "Add" when there is nothing to change: every publish path derives a
          // title, so this is the legacy-null case rather than the common one.
          aria-label={title ? `Rename ${title}` : `Add a title to ${slug}`}
          title={title ? "Rename" : "Add a title"}
          // Always visible on small screens, hover-revealed from sm up. A touch
          // device has no hover at all, so a purely hover-revealed control is
          // one that phone users can never reach. Keyboard focus reveals it at
          // every width.
          className="shrink-0 p-1 text-ink-faint opacity-100 transition duration-150 hover:bg-accent-soft hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
        >
          <IconPencil />
        </button>
      </span>
    );
  }

  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <label htmlFor={`title-${docId}`} className="sr-only">
          Title
        </label>
        <input
          id={`title-${docId}`}
          ref={inputRef}
          value={value}
          maxLength={MAX_TITLE}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          // Blur saves rather than discards: clicking away from a field you have
          // just typed into should not silently throw the typing away.
          onBlur={() => void save()}
          className="w-full min-w-0 border border-hairline bg-surface px-2 py-1 font-semibold text-ink transition-colors duration-150 focus:border-accent focus:outline-none"
        />
      </span>
      {error ? (
        <span role="alert" className="mt-1 block text-sm text-ink">
          {error}
        </span>
      ) : (
        <span className="mt-1 block text-sm text-ink-faint">
          Enter to save, Esc to cancel. Only changes how it appears here — the
          published page keeps its own heading.
        </span>
      )}
    </span>
  );
}
