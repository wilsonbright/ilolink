"use client";

// The in-iframe composer. Talks to its host page only via postMessage, and
// always with an explicit targetOrigin — never "*", which would let any page
// that framed us read the message.

import { useEffect, useRef, useState } from "react";

const CONTENT_ORIGIN = "https://view.ilolink.com";

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

  // Report our height so the host can size the frame to the content instead of
  // guessing. Sent to both possible hosts: documents are served directly from
  // the content origin and also reverse-proxied under the apex.
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
  }, [done, error]);

  if (!email) {
    return (
      <div className="p-3 text-sm text-ink-soft">
        <a
          href={`/signin?next=${encodeURIComponent("/dashboard")}`}
          target="_blank"
          rel="noopener"
          className="text-accent underline"
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
          }}
          className="text-accent underline"
        >
          Write another
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doc,
          body: text,
          parentId,
          anchor: anchor ? safeParse(anchor) : null,
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
      <textarea
        ref={boxRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Add a comment…"
        className="w-full resize-y rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs text-ink-faint">as {email}</span>
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
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
