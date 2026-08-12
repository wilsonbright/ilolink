// Validation for a document's dashboard title.
//
// Titles have been INSERT-only since launch: every publish path derives one and
// nothing has ever updated it. That left two problems the owner could not fix —
// a derived title that reads badly, and duplicates (publishing the same doc
// twice yields two rows with identical names and no way to tell them apart).
//
// Pure, so the rules are testable without a request — same as the other
// lib-level helpers this codebase tests directly.

// No length limit existed anywhere: the column is plain TEXT with no CHECK, and
// neither publish path validates. 200 is chosen to match extractTitle's
// slice in lib/sanitize/html.ts, which is the longest value publish itself can
// already store — so a rename cannot produce a title longer than something the
// system already accepts.
export const MAX_TITLE = 200;

export type TitleResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function normalizeTitle(raw: string): TitleResult {
  if (typeof raw !== "string") {
    return { ok: false, error: `Enter a title of 1–${MAX_TITLE} characters.` };
  }
  // Collapse first, then measure. A title is one line in a list, so a pasted
  // heading carrying newlines has to become one line — and measuring after the
  // collapse means padding cannot smuggle a long title past the limit, nor can
  // runs of spaces push an otherwise fine title over it.
  const value = raw.replace(/\s+/g, " ").trim();
  if (value.length === 0 || value.length > MAX_TITLE) {
    return { ok: false, error: `Enter a title of 1–${MAX_TITLE} characters.` };
  }
  return { ok: true, value };
}
