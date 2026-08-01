"use client";

// Create a shared teamspace, then land straight on its settings page.
//
// The redirect target is deliberate: /t/<id> is where the invite form lives, and
// naming an org is almost never the goal in itself — inviting someone is. Going
// anywhere else would make "add my team" a two-step hunt.

import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_NAME = 60;

export interface CopySource {
  id: string;
  name: string;
  skillCount: number;
}

export function CreateTeamspace({ sources }: { sources: CopySource[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/teamspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, copySkillsFrom: copyFrom || null }),
      });
      const data = (await res.json()) as {
        error?: string;
        teamspace?: { id: string };
      };
      if (!res.ok || !data.teamspace) {
        setError(data.error ?? "Could not create the teamspace.");
        return;
      }
      // refresh() so the layout nav picks up the new teamspace behind the push.
      router.push(`/t/${data.teamspace.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      // Only clear busy on failure: on success the route change unmounts this.
      setBusy(false);
      return;
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="ts-name" className="block text-sm text-ink-soft">
        Name a new teamspace
      </label>
      <div className="flex gap-2">
        <input
          id="ts-name"
          type="text"
          required
          maxLength={MAX_NAME}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Design"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create"}
        </button>
      </div>

      {/* Skills are hard-scoped per teamspace, so a new one starts with none.
          Offering the copy here is the only moment it is cheap — afterwards it
          means re-writing each skill by hand. */}
      {sources.length > 0 && (
        <div>
          <label htmlFor="ts-copy" className="block text-sm text-ink-soft">
            Start with a copy of another teamspace&rsquo;s skills
          </label>
          <select
            id="ts-copy"
            value={copyFrom}
            onChange={(e) => setCopyFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink transition-colors duration-150 focus:border-accent focus:outline-none"
          >
            <option value="">Don&rsquo;t copy — start empty</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.skillCount}{" "}
                {s.skillCount === 1 ? "skill" : "skills"})
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-ink">{error}</p>}
    </form>
  );
}
