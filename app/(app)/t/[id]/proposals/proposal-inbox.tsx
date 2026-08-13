"use client";

// The pending-proposal list, client-side so a decision resolves in place rather
// than reloading a queue someone is working through one row at a time.
//
// Rows stay visible after a decision, labelled with what happened. Dropping them
// on approval would be tidier and worse: the reviewer loses the ability to
// confirm they clicked the row they meant to, and there is no undo behind it.

import Link from "next/link";
import { useState } from "react";
import type { ArtifactKind } from "@/lib/artifacts/kinds";
import { AGENT_CONTRIBUTION } from "@/lib/artifacts/store-core";
import { TAG_ACCENT } from "@/lib/ui/tags";

export interface ProposalView {
  versionId: string;
  kind: ArtifactKind;
  kindLabel: string;
  name: string;
  version: number;
  description: string;
  changelog: string | null;
  sourcePath: string | null;
  authorEmail: string | null;
  // Null when this proposal would create the artifact rather than revise one.
  replacesVersion: number | null;
  proposedOn: string;
  // 'agent_contribution' when an assistant filed this unprompted; null
  // otherwise. Carried this far because it changes what reviewing means.
  origin: string | null;
}

export function ProposalInbox({
  teamspaceId,
  canReview,
  items,
}: {
  teamspaceId: string;
  canReview: boolean;
  items: ProposalView[];
}) {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function decide(versionId: string, approve: boolean) {
    setBusy(versionId);
    setErrors((p) => ({ ...p, [versionId]: "" }));
    try {
      const res = await fetch(`/api/teamspaces/${teamspaceId}/proposals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          versionId,
          approve,
          note: notes[versionId]?.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrors((p) => ({
          ...p,
          [versionId]:
            data.error ?? "Could not record that decision. Try again.",
        }));
        return;
      }
      setResolved((p) => ({ ...p, [versionId]: approve ? "published" : "rejected" }));
    } catch {
      setErrors((p) => ({ ...p, [versionId]: "Network error. Try again." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {!canReview && (
        <p className="mb-6 border border-hairline bg-surface px-5 py-4 leading-relaxed text-ink-soft">
          An owner or admin has to approve these. Yours will go live as soon as
          one of them does — nothing is lost while it waits.
        </p>
      )}

      {/* Table idiom: uppercase header over a strong 2px rule, hairline rules
          between the rows it governs. */}
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-divider pb-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">
        <span>Proposal</span>
        <span>Proposed</span>
      </div>
      <ul>
        {items.map((p) => {
          const outcome = resolved[p.versionId];
          const error = errors[p.versionId];
          return (
            <li
              key={p.versionId}
              className="border-b border-hairline py-5 transition-colors duration-150 last:border-b-0 hover:bg-ink/5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  <Link
                    href={`/t/${teamspaceId}/skills/${encodeURIComponent(p.name)}?kind=${p.kind}&version=${p.version}`}
                    className="font-mono font-semibold text-ink transition-colors duration-150 hover:text-accent"
                  >
                    {p.name}
                  </Link>
                  <span className="ml-2 text-sm text-ink-faint">
                    {p.kindLabel}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink-faint">
                  {p.proposedOn}
                </span>
              </div>

              <p className="mt-1 leading-relaxed text-ink-soft">
                {p.description}
              </p>
              {p.changelog && (
                <p className="mt-1 leading-relaxed text-ink-soft">
                  {p.changelog}
                </p>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-faint">
                <span>
                  {p.replacesVersion == null
                    ? `new — would become v${p.version}`
                    : `v${p.replacesVersion} → v${p.version}`}
                </span>
                {/* Words, not an icon: a reviewer scanning the queue has to be
                    able to read what this is without learning a glyph. And it
                    is driven by the origin column rather than a prefix in the
                    changelog because a marker any member — or any artifacts_put
                    caller — could type would be forgeable, and a badge
                    reviewers learn to trust is worse than none. */}
                {p.origin === AGENT_CONTRIBUTION && (
                  <span className={TAG_ACCENT}>
                    Proposed by an AI assistant, unprompted
                  </span>
                )}
                {p.authorEmail && (
                  <span>
                    {p.origin === AGENT_CONTRIBUTION
                      ? `on behalf of ${p.authorEmail}`
                      : p.authorEmail}
                  </span>
                )}
                {p.sourcePath && <span className="font-mono">{p.sourcePath}</span>}
              </div>

              {outcome ? (
                <p className="mt-3 text-sm text-ink-soft">
                  {outcome === "published"
                    ? `Approved — v${p.version} is live.`
                    : "Rejected. It stays in the history, and the live version is unchanged."}
                </p>
              ) : (
                canReview && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={notes[p.versionId] ?? ""}
                      onChange={(ev) =>
                        setNotes((n) => ({
                          ...n,
                          [p.versionId]: ev.target.value,
                        }))
                      }
                      maxLength={500}
                      aria-label={`Note on ${p.name}`}
                      placeholder="Note (optional)"
                      className="min-w-0 flex-1 border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={() => decide(p.versionId, true)}
                      disabled={busy === p.versionId}
                      className="shrink-0 bg-accent px-4 py-2 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
                    >
                      {busy === p.versionId ? "Saving…" : "Approve"}
                    </button>
                    <button
                      onClick={() => decide(p.versionId, false)}
                      disabled={busy === p.versionId}
                      className="shrink-0 border border-divider px-4 py-2 text-sm font-extrabold text-ink transition-colors duration-150 hover:bg-ink/5 disabled:opacity-45"
                    >
                      Reject
                    </button>
                  </div>
                )
              )}

              {error && <p className="mt-2 text-sm text-ink">{error}</p>}
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-sm leading-relaxed text-ink-faint">
        Read the proposed version before you approve it — an artifact is text
        another agent will act on, and approving is what makes it team policy.
      </p>
    </div>
  );
}
