"use client";

// Bulk-import skill files from a local checkout.
//
// Parsing happens in the browser and the result is SHOWN BEFORE ANYTHING IS
// WRITTEN. That review step is the point: these files become instructions the
// team's agents execute, and importing a directory is exactly when someone
// stops reading. Names coerced from filenames, missing descriptions, and files
// that would bump an existing skill's version are all called out by name first.
//
// Each accepted file is then posted to the same endpoint the editor uses, one
// at a time — sequentially rather than in parallel, so the per-user write limit
// is not tripped by a large import and so a failure halfway leaves a
// comprehensible partial state.

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  inferDescription,
  parseSkillFile,
  skillNameFromPath,
  slugifySkillName,
} from "@/lib/skills/frontmatter";
import { isValidSkillName } from "@/lib/skills/store-core";

interface Candidate {
  path: string;
  name: string;
  description: string;
  body: string;
  // Where the name and description came from, so review is honest about what
  // was in the file versus what we guessed.
  nameFromFile: boolean;
  descriptionInferred: boolean;
  problem: string | null;
  exists: boolean;
  status: "pending" | "saving" | "done" | "failed";
  result: string | null;
}

export function SkillImport({
  teamspaceId,
  existing,
}: {
  teamspaceId: string;
  existing: string[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  async function onFiles(list: FileList | null) {
    if (!list) return;
    setReadError(null);
    const known = new Set(existing);
    const out: Candidate[] = [];

    for (const file of Array.from(list)) {
      // webkitRelativePath is set when a directory was chosen, and it is the
      // only way to recover the `commit-style/SKILL.md` layout — the basename
      // alone would name every skill "skill".
      const path =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name;
      if (!/\.(md|markdown|txt)$/i.test(path)) continue;

      let text: string;
      try {
        text = await file.text();
      } catch {
        setReadError(`Could not read ${path}.`);
        continue;
      }

      const parsed = parseSkillFile(text);
      const nameFromFile = Boolean(parsed.name);
      const name = slugifySkillName(parsed.name ?? "") || skillNameFromPath(path);
      const inferred = !parsed.description;
      const description = parsed.description ?? inferDescription(parsed.body) ?? "";

      let problem: string | null = null;
      if (!name || !isValidSkillName(name)) {
        problem = "Could not work out a valid kebab-case name for this file.";
      } else if (!parsed.body.trim()) {
        problem = "This file has no content below its frontmatter.";
      } else if (!description) {
        problem = "No description, and none could be taken from the body.";
      }

      out.push({
        path,
        name,
        description,
        body: parsed.body,
        nameFromFile,
        descriptionInferred: inferred && !problem,
        problem,
        exists: known.has(name),
        status: "pending",
        result: null,
      });
    }

    if (out.length === 0) setReadError("No .md files found in that selection.");
    setItems(out);
  }

  async function importAll() {
    setBusy(true);
    const next = [...items];
    for (let i = 0; i < next.length; i++) {
      if (next[i].problem) continue;
      next[i] = { ...next[i], status: "saving" };
      setItems([...next]);
      try {
        const res = await fetch(`/api/teamspaces/${teamspaceId}/skills`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: next[i].name,
            description: next[i].description,
            body: next[i].body,
            changelog: `Imported from ${next[i].path}.`,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          version?: number;
          created?: boolean;
        };
        next[i] = res.ok
          ? {
              ...next[i],
              status: "done",
              result: data.created
                ? "created"
                : `updated to v${data.version ?? "?"}`,
            }
          : {
              ...next[i],
              status: "failed",
              result: data.error ?? "Failed.",
            };
      } catch {
        next[i] = { ...next[i], status: "failed", result: "Network error." };
      }
      setItems([...next]);
    }
    setBusy(false);
    router.refresh();
  }

  const importable = items.filter((i) => !i.problem);
  const done = items.filter((i) => i.status === "done").length;

  return (
    <div>
      <div className="mb-6 space-y-3">
        <div>
          <label htmlFor="sk-files" className="block text-sm text-ink-soft">
            Choose skill files
          </label>
          <input
            id="sk-files"
            type="file"
            multiple
            accept=".md,.markdown,.txt"
            onChange={(e) => onFiles(e.target.files)}
            className="mt-1 w-full text-sm text-ink-soft file:mr-3 file:border-0 file:bg-accent file:px-4 file:py-2 file:font-extrabold file:text-canvas"
          />
        </div>
        <p className="text-sm leading-relaxed text-ink-faint">
          Pick the <code className="text-ink-soft">.md</code> files directly, or
          use the directory picker below to take a whole{" "}
          <code className="text-ink-soft">skills/</code> folder including the{" "}
          <code className="text-ink-soft">name/SKILL.md</code> layout.
        </p>
        <div>
          <label htmlFor="sk-dir" className="block text-sm text-ink-soft">
            Or choose a folder
          </label>
          {/* webkitdirectory is non-standard but universally supported; React
              needs it spelled this way to reach the DOM attribute. */}
          <input
            id="sk-dir"
            type="file"
            onChange={(e) => onFiles(e.target.files)}
            {...({
              webkitdirectory: "",
              directory: "",
            } as Record<string, string>)}
            className="mt-1 w-full text-sm text-ink-soft file:mr-3 file:border file:border-solid file:border-divider file:bg-surface file:px-4 file:py-2 file:font-extrabold file:text-ink"
          />
        </div>
        {readError && <p className="text-sm text-ink">{readError}</p>}
      </div>

      {items.length > 0 && (
        <>
          {/* Table idiom: uppercase header over the strong rule, hairline rows. */}
          <h2 className="border-b-2 border-divider pb-2 text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">
            {items.length} file{items.length === 1 ? "" : "s"} — review before
            importing
          </h2>
          <ul className="mb-6">
            {items.map((it) => (
              <li
                key={it.path}
                className="border-b border-hairline py-4 transition-colors duration-150 last:border-b-0 hover:bg-ink/5"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono font-semibold text-ink">
                    {it.name || "—"}
                  </span>
                  <span className="shrink-0 text-sm text-ink-faint">
                    {it.status === "done"
                      ? it.result
                      : it.status === "failed"
                        ? it.result
                        : it.status === "saving"
                          ? "saving…"
                          : it.problem
                            ? "skipped"
                            : it.exists
                              ? "will add a version"
                              : "new"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-faint">{it.path}</p>
                {it.description && (
                  <p className="mt-1 leading-relaxed text-ink-soft">
                    {it.description}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-faint">
                  {!it.nameFromFile && !it.problem && (
                    <span>name taken from the filename</span>
                  )}
                  {it.descriptionInferred && (
                    <span>description taken from the first line</span>
                  )}
                </div>
                {it.problem && (
                  <p className="mt-1 text-sm text-ink">{it.problem}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <button
              onClick={importAll}
              disabled={busy || importable.length === 0}
              className="bg-accent px-4 py-2.5 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong disabled:opacity-45"
            >
              {busy
                ? `Importing… (${done}/${importable.length})`
                : `Import ${importable.length} skill${importable.length === 1 ? "" : "s"}`}
            </button>
            {items.length > importable.length && (
              <span className="text-sm text-ink-faint">
                {items.length - importable.length} skipped
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
