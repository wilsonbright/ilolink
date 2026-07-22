"use client";

// Rotate-token control for a ChatGPT workspace dashboard. On rotate, the old
// connector URL dies and a new one is issued — the user must update ChatGPT.
import { useState } from "react";

export function RotateToken({ workspaceId }: { workspaceId: string }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ connector_url: string; dashboard_url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function rotate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/connect/rotate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data = (await res.json()) as { connector_url: string; dashboard_url: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Rotation failed.");
      setResult({ connector_url: data.connector_url, dashboard_url: data.dashboard_url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rotation failed.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">Token rotated. Update ChatGPT with the new URL:</p>
        <code className="block truncate rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink">
          {result.connector_url}
        </code>
        <p className="text-sm text-ink-faint">
          New dashboard:{" "}
          <a href={result.dashboard_url} className="text-accent hover:underline">
            {result.dashboard_url}
          </a>{" "}
          — bookmark it. The old links no longer work.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">Rotate connector token</p>
      <p className="mt-1 text-sm text-ink-faint">
        If your connector URL leaked, rotate it. The current URL will stop working immediately.
      </p>
      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="mt-3 text-sm text-accent transition-colors duration-150 hover:text-ink"
        >
          Rotate token
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-ink-soft">Rotate now? This breaks the old URL.</span>
          <button
            type="button"
            onClick={rotate}
            disabled={busy}
            className="text-sm font-medium text-[#b3261e] hover:text-[#8f1d18] disabled:opacity-50 dark:text-[#f2827a]"
          >
            {busy ? "Rotating…" : "Confirm rotate"}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            disabled={busy}
            className="text-sm text-ink-faint hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-[#b3261e]">{error}</p> : null}
    </div>
  );
}
