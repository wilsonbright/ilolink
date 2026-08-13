"use client";

// The in-iframe composer. Talks to its host page only via postMessage, and
// always with an explicit targetOrigin — never "*", which would let any page
// that framed us read the message.

import { useEffect, useRef, useState } from "react";

const CONTENT_ORIGIN = "https://view.ilolink.com";

// A teamspace member who can be @mentioned. /api/mentions/candidates answers
// {"members":[]} for signed-out readers and non-members, so for them the "@"
// flow below simply never opens — the composer looks exactly as it always did.
type Candidate = { id: string; label: string };

// The "@token" the caret is inside, if any: an "@" at a token boundary (start
// of text or after whitespace, so email addresses don't trigger), followed by
// at least one character, with no newline or second "@" before the caret.
function mentionContext(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const upto = text.slice(0, caret);
  const at = upto.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(upto[at - 1]!)) return null;
  const query = upto.slice(at + 1);
  if (query.length < 1 || /[\n@]/.test(query)) return null;
  return { start: at, query };
}

export function EmbeddedComposer({
  doc,
  parentId,
  anchor,
  email,
}: {
  doc: string;
  parentId: string | null;
  anchor: string | null;
  email: string | null;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Mention state. `picked` remembers every candidate ever inserted; the
  // honest un-mention rule lives at submit time (see there). `dismissedAt`
  // pins Escape to the token it dismissed, so the list doesn't pop straight
  // back open on the next keystroke of the same token.
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [mention, setMention] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [picked, setPicked] = useState<Candidate[]>([]);

  const filtered = mention
    ? candidates.filter((c) =>
        c.label.toLowerCase().includes(mention.query.toLowerCase()),
      )
    : [];
  const open =
    mention !== null && mention.start !== dismissedAt && filtered.length > 0;
  const active = Math.min(activeIdx, Math.max(0, filtered.length - 1));

  // One candidates fetch per composer. Errors are deliberately swallowed:
  // no candidates just means no mention UI, which is also the correct state
  // for readers outside the teamspace.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    fetch(`/api/mentions/candidates?doc=${encodeURIComponent(doc)}`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ members?: Candidate[] }>)
          : { members: [] as Candidate[] },
      )
      .then((d) => {
        if (!cancelled) setCandidates(d.members ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [doc, email]);

  // Report our height so the host can size the frame to the content instead of
  // guessing. Sent to both possible hosts: documents are served directly from
  // the content origin and also reverse-proxied under the apex.
  //
  // `open` is a dep because the mention list is absolutely positioned — it
  // grows document scrollHeight without resizing <html>, so the observer alone
  // would never fire and the host frame would clip the dropdown.
  useEffect(() => {
    const send = () => {
      const h = document.documentElement.scrollHeight;
      for (const target of [CONTENT_ORIGIN, window.location.origin]) {
        window.parent.postMessage({ type: "ilo:comment:height", height: h }, target);
      }
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [done, error, open]);

  if (!email) {
    return (
      <div className="p-3 text-sm text-ink-soft">
        <a
          href={`/signin?next=${encodeURIComponent("/dashboard")}`}
          target="_blank"
          rel="noopener"
          className="text-accent-strong underline"
        >
          Sign in
        </a>{" "}
        to comment with your name.
      </div>
    );
  }

  if (done) {
    return (
      <div className="p-3 text-sm text-ink-soft">
        Posted as {email}.{" "}
        <button
          onClick={() => {
            setDone(false);
            setText("");
            setPicked([]);
            setMention(null);
          }}
          className="text-accent-strong underline"
        >
          Write another
        </button>
      </div>
    );
  }

  // Recompute the mention token from the live textarea — called on change AND
  // on selection moves, since arrowing out of a token must close the list.
  function syncMention(el: HTMLTextAreaElement) {
    const ctx = mentionContext(el.value, el.selectionStart ?? el.value.length);
    if (!ctx || ctx.start !== mention?.start || ctx.query !== mention?.query) {
      setActiveIdx(0);
    }
    setMention(ctx);
    if (!ctx || ctx.start !== dismissedAt) setDismissedAt(null);
  }

  function pick(c: Candidate) {
    if (!mention) return;
    const end = mention.start + 1 + mention.query.length;
    const before = text.slice(0, mention.start);
    const inserted = `@${c.label} `;
    setText(before + inserted + text.slice(end));
    setPicked((prev) =>
      prev.some((p) => p.id === c.id) ? prev : [...prev, c],
    );
    setMention(null);
    const pos = before.length + inserted.length;
    requestAnimationFrame(() => {
      const el = boxRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[active];
      if (c) pick(c);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (mention) setDismissedAt(mention.start);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // The honest un-mention rule: an id is sent only while its "@label" text
    // is still present in the body — deleting the inserted text drops the
    // mention. A plain substring check, not token parsing: good enough for a
    // 4000-char box, and the server re-validates membership and caps at 10
    // regardless of what we send.
    const mentions = picked
      .filter((p) => text.includes(`@${p.label}`))
      .map((p) => p.id)
      .slice(0, 10);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doc,
          body: text,
          parentId,
          anchor: anchor ? safeParse(anchor) : null,
          ...(mentions.length > 0 ? { mentions } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not post that.");
        return;
      }
      setDone(true);
      for (const target of [CONTENT_ORIGIN, window.location.origin]) {
        window.parent.postMessage({ type: "ilo:comment:posted" }, target);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="p-3">
      {/* The textarea itself carries the combobox ARIA (ARIA 1.2): focus
          lives in the textarea, so a role/aria-activedescendant on a wrapper
          div would be silent to assistive tech. The list is a plain
          positioned box under the field — the iframe is small, so no caret
          tracking. */}
      <div className="relative">
        <textarea
          ref={boxRef}
          role="combobox"
          aria-expanded={open}
          aria-controls="mention-listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[active]
              ? `mention-option-${filtered[active].id}`
              : undefined
          }
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            syncMention(e.target);
          }}
          onSelect={(e) => syncMention(e.currentTarget)}
          onKeyDown={onKeyDown}
          rows={3}
          maxLength={4000}
          placeholder="Add a comment…"
          className="w-full resize-y border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
        />
        {open && (
          <ul
            id="mention-listbox"
            role="listbox"
            aria-label="Mention a teammate"
            className="absolute left-0 right-0 top-full z-10 max-h-44 overflow-y-auto border-2 border-divider bg-canvas"
          >
            {filtered.map((c, i) => (
              <li
                key={c.id}
                id={`mention-option-${c.id}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: click fires after blur has already
                // collapsed the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                // The active cue needs more than a hue shift (wash vs canvas
                // is ~1.02:1): a 2px accent left rule marks it structurally.
                // The transparent rule on the rest keeps the text edge still.
                className={`cursor-pointer border-l-2 px-3 py-1.5 text-sm ${
                  i === active
                    ? "border-accent bg-accent-wash text-accent-strong"
                    : "border-transparent text-ink"
                }`}
              >
                {c.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs text-ink-faint">as {email}</span>
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="shrink-0 bg-accent px-3 py-1.5 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
        >
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-ink">{error}</p>}
    </form>
  );
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
