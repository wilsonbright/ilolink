"use client";

// Teamspace picker + approve. Posts to /api/auth/mcp-approve, which returns the
// URL back into the MCP worker; the browser follows it to finish the grant.
//
// A plain form POST rather than fetch, so the redirect chain is the browser's
// own and no token ever passes through client JS.

import { useState } from "react";

export function ApproveForm({
  req,
  sig,
  teamspaces,
}: {
  req: string;
  sig: string;
  teamspaces: { id: string; name: string; isPersonal: boolean }[];
}) {
  const [teamspaceId, setTeamspaceId] = useState(teamspaces[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      method="POST"
      action="/api/auth/mcp-approve"
      onSubmit={() => setBusy(true)}
      className="space-y-4"
    >
      <input type="hidden" name="req" value={req} />
      <input type="hidden" name="sig" value={sig} />

      {teamspaces.length > 1 && (
        <div>
          <label
            htmlFor="teamspace"
            className="mb-1.5 block text-sm text-ink-soft"
          >
            Publish into
          </label>
          <select
            id="teamspace"
            name="teamspace"
            value={teamspaceId}
            onChange={(e) => setTeamspaceId(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink transition-colors duration-150 focus:border-accent focus:outline-none"
          >
            {teamspaces.map((t) => (
              <option key={t.id} value={t.id}>
                {t.isPersonal ? `${t.name} (just you)` : t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {teamspaces.length === 1 && (
        <input type="hidden" name="teamspace" value={teamspaceId} />
      )}

      <button
        type="submit"
        disabled={busy || !teamspaceId}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Connecting…" : "Approve"}
      </button>
    </form>
  );
}
