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
      <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className="shrink-0 rounded-lg border border-hairline px-3 py-2 text-sm text-ink-soft transition-colors duration-150 hover:border-accent hover:text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
