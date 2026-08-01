// Parse a SKILL.md file into the fields the registry needs.
//
// Deliberately NOT a YAML parser. Skill frontmatter in practice is a handful of
// `key: value` lines, and pulling in a YAML library to read them would mean
// running a general-purpose parser over untrusted uploaded files for no gain.
// Anything this does not understand is ignored rather than rejected, so a file
// with extra keys still imports.
//
// Pure string work — no bindings, no I/O — so the import rules are unit-testable.

export interface ParsedSkillFile {
  name: string | null;
  description: string | null;
  body: string;
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Strips one layer of matching quotes, which is all frontmatter writers use.
function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2) {
    const a = t[0];
    if ((a === '"' || a === "'") && t[t.length - 1] === a) {
      return t.slice(1, -1);
    }
  }
  return t;
}

export function parseSkillFile(text: string): ParsedSkillFile {
  // Strip a UTF-8 BOM: editors add it, and it would stop the fence matching at
  // position 0 and silently turn the whole frontmatter block into body text.
  const src = text.replace(/^﻿/, "");
  const m = FENCE.exec(src);
  if (!m) return { name: null, description: null, body: src.trim() };

  const fields = new Map<string, string>();
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i <= 0) continue;
    fields.set(line.slice(0, i).trim().toLowerCase(), unquote(line.slice(i + 1)));
  }

  return {
    name: fields.get("name") || null,
    description: fields.get("description") || null,
    body: src.slice(m[0].length).trim(),
  };
}

// A filename is the fallback identity when frontmatter has no `name`.
// Handles both `commit-style.md` and the `commit-style/SKILL.md` layout that
// Claude Code plugins use, where the basename carries no information.
export function skillNameFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const file = parts[parts.length - 1] ?? "";
  const base = file.replace(/\.(md|markdown|txt)$/i, "");
  const candidate =
    base.toLowerCase() === "skill" && parts.length >= 2
      ? parts[parts.length - 2]
      : base;
  return slugifySkillName(candidate);
}

// Best-effort coercion to the kebab-case the registry requires. Import should
// not fail because a file was called "Commit Style.md" — but the result still
// goes through isValidSkillName() before it is written, so anything this cannot
// rescue is reported rather than mangled into a wrong name.
export function slugifySkillName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// The description is what other agents match on, so an empty one is a real
// problem rather than a cosmetic one. When a file has none, take the first
// meaningful line of the body so the skill is at least findable, and let the
// UI show that it was inferred.
export function inferDescription(body: string): string | null {
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("---")) continue;
    return line.slice(0, 300);
  }
  return null;
}
