"use client";

// Create or edit one skill. Shared by the new-skill and edit routes so the
// validation rules and the wording cannot drift between them.
//
// Posts to the same endpoint the importer uses, which posts to the same
// putSkill() the MCP tool uses — one write path, one audit trail.

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface SkillEditorProps {
  teamspaceId: string;
  // Absent when creating.
  initial?: {
    name: string;
    description: string;
    body: string;
    version: number;
  };
}

export function SkillEditor({ teamspaceId, initial }: SkillEditorProps) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [changelog, setChangelog] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teamspaces/${teamspaceId}/skills`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          body,
          changelog: changelog || (editing ? "Edited in the browser." : "Created in the browser."),
          // Send the version we loaded so a teammate's edit in between is
          // refused rather than silently overwritten. Same contract as
          // skills_put's if_version.
          ifVersion: initial?.version ?? null,
        }),
      });
      const data = (await res.json()) as { error?: string; name?: string };
      if (!res.ok) {
        setError(
          res.status === 409
            ? `${data.error ?? "This skill changed while you were editing."} Reload to see the current version.`
            : (data.error ?? "Could not save that skill."),
        );
        return;
      }
      router.push(
        `/t/${teamspaceId}/skills/${encodeURIComponent(data.name ?? name)}`,
      );
      router.refresh();
      return;
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <label htmlFor="sk-name" className="block text-sm text-ink-soft">
          Name
        </label>
        <input
          id="sk-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          // Locked while editing: the name is the retrieval key agents type
          // from memory, and changing it would orphan every reference without
          // leaving a trace. Archive and re-create instead.
          readOnly={editing}
          placeholder="commit-style"
          className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 font-mono text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none read-only:text-ink-faint"
        />
        <p className="mt-1 text-sm text-ink-faint">
          {editing
            ? "The name is fixed — agents retrieve by it."
            : "Lowercase, digits and single hyphens."}
        </p>
      </div>

      <div>
        <label htmlFor="sk-desc" className="block text-sm text-ink-soft">
          Description
        </label>
        <input
          id="sk-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={500}
          placeholder="Use when writing a commit message in this repo"
          className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
        />
        <p className="mt-1 text-sm text-ink-faint">
          This is the line other agents match on, so write <em>when to use it</em>
          {" "}rather than what it contains.
        </p>
      </div>

      <div>
        <label htmlFor="sk-body" className="block text-sm text-ink-soft">
          Instructions
        </label>
        <textarea
          id="sk-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={18}
          placeholder={"# Commit style\n\nImperative mood, no trailing period."}
          className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 font-mono text-sm leading-relaxed text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
        />
      </div>

      {editing && (
        <div>
          <label htmlFor="sk-log" className="block text-sm text-ink-soft">
            What changed (optional)
          </label>
          <input
            id="sk-log"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            maxLength={200}
            placeholder="Tightened the publishing rule"
            className="mt-1 w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !name.trim() || !description.trim() || !body.trim()}
          className="rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : editing ? "Save new version" : "Create skill"}
        </button>
        {editing && (
          <span className="text-sm text-ink-faint">
            Saving creates version {(initial?.version ?? 0) + 1}.
          </span>
        )}
      </div>

      {error && <p className="text-sm text-ink">{error}</p>}
    </form>
  );
}
