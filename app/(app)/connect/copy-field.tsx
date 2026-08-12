"use client";

// A value plus a button that copies exactly that value.
//
// WHY THIS EXISTS: the connector URL used to be plain text inside a sentence,
// with the sentence's full stop flush against it — `<code>{url}</code>.` — and
// no way to copy it but by hand. A user selected the period along with the URL,
// connected to `https://mcp.ilolink.com/mcp.`, and burned four attempts on it:
// the OAuth flow completes happily with a bad path and only the first transport
// call fails, so the assistant reports "connected" and then "Disconnected".
//
// The worker now normalises that away (mcp-worker/src/canonical-path.ts), but
// the honest fix is to stop asking anyone to select a URL by hand. A button
// copies the string itself, so no punctuation can ride along.

import { useState } from "react";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable (insecure context, or permission denied).
      // Leave the label alone rather than claiming a copy that did not happen —
      // the value is selectable on screen either way.
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto border border-hairline bg-surface px-3 py-2 text-sm text-ink">
        {value}
      </code>
      {/* Filled rather than a hairline outline: at rest it used to be faint
          border + ink-soft label, which review read as a disabled control —
          on the one screen where copying is the whole point. The reserved
          width keeps it from jumping when the label becomes "Copied". */}
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="min-w-20 shrink-0 bg-accent px-3 py-2 text-center text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {/* The button's label changing from "Copy" to "Copied" is a silent event
          for a screen reader, so announce it. sr-only is absolutely positioned,
          which takes it out of the flex row entirely. */}
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? `Copied ${label} to clipboard` : ""}
      </p>
    </div>
  );
}
