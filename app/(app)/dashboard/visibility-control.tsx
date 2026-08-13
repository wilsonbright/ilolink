"use client";

// The visibility tag, upgraded to a select where the viewer may actually change
// it. Used in two places on purpose: beside the h1 on a document's own page,
// and on every row of the library list — changing who can open a document is
// the edit people reach for most, and making them open the document first was
// three clicks for a one-word change.
//
// The server is the authority either way: PATCH /api/documents/meta re-derives
// membership and refuses password/expiring transitions. `canChange` here only
// decides whether to render a control that will work or a plain tag, so nobody
// is offered a select that 403s on first use.

import { useCallback, useId, useState } from "react";
import { addToHistory, getEntry } from "@/lib/history";
import { TAG_OUTLINE } from "@/lib/ui/tags";

// What the select may set. Password and expiring need inputs (a password, a
// deadline) that only the composer collects, so both stay republish-only and
// this list stays three plain words.
export const CHANGEABLE_VISIBILITIES = ["public", "unlisted", "private"] as const;

export function VisibilityControl({
  slug,
  visibility,
  canChange,
  onChanged,
}: {
  slug: string;
  visibility: string;
  canChange: boolean;
  // Let a caller keep its own copy in step (the list rows re-render from
  // server data that will not refetch on its own).
  onChanged?: (next: string) => void;
}) {
  // Local override after an optimistic change; the prop stays untouched.
  const [override, setOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [announce, setAnnounce] = useState("");
  const id = useId();

  const current = override ?? visibility;
  const locked = current === "password" || current === "expiring";

  const change = useCallback(
    async (next: string) => {
      const prev = override ?? visibility;
      if (next === prev) return;
      // Optimistic: show the new value immediately, revert on failure — and say
      // which happened, because the select's own value change is silent for a
      // screen reader (same announcement pattern as connect/copy-field.tsx).
      setOverride(next);
      setSaving(true);
      setAnnounce("");
      try {
        const res = await fetch("/api/documents/meta", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, visibility: next }),
        });
        if (!res.ok) throw new Error();
        setAnnounce(`Visibility changed to ${next}`);
        onChanged?.(next);
        // Keep the localStorage snapshot honest too, so a reload before the
        // meta fetch lands doesn't flash the old value.
        const e = getEntry(slug);
        if (e) addToHistory({ ...e, visibility: next });
      } catch {
        setOverride(prev);
        setAnnounce("Couldn’t change visibility — still " + prev);
      } finally {
        setSaving(false);
      }
    },
    [onChanged, override, slug, visibility],
  );

  if (!canChange || locked) {
    return (
      <span
        className={TAG_OUTLINE}
        // Password/expiring have extra inputs neither surface collects, so the
        // tag says where the change actually happens.
        title={
          locked
            ? "Password and expiry settings change when you republish the document."
            : undefined
        }
      >
        {current}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center">
      <label htmlFor={id} className="sr-only">
        Visibility
      </label>
      <select
        id={id}
        value={current}
        disabled={saving}
        onChange={(e) => void change(e.target.value)}
        className={`${TAG_OUTLINE} cursor-pointer bg-canvas transition-colors duration-150 hover:bg-accent-wash disabled:opacity-45`}
      >
        {CHANGEABLE_VISIBILITIES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </span>
  );
}
