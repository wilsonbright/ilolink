// The app-surface tag idiom, in one place.
//
// The DS .tag proper is 11px type with 3px/10px padding. These run 13px on a
// 24px line — a deliberate legibility bump over the DS spec, because the app
// surfaces set tags inline against 15px body copy where 11px reads as lint.
// Same geometry otherwise: 10px side padding, square corners, no radius.
//
// Accent-colored text at this size must be accent-strong, never raw accent —
// that contrast rule is why the variants are frozen here instead of re-derived
// at each call site. Deliberately plain strings with no imports, like
// lib/ui/nav.ts: a client island can use these without dragging any server
// code into the browser bundle.

export const TAG_BASE = "inline-flex items-center px-2.5 text-[13px] leading-6";
export const TAG_OUTLINE = `${TAG_BASE} border border-accent text-accent-strong`;
export const TAG_ACCENT = `${TAG_BASE} bg-accent-wash text-accent-strong`;
export const TAG_NEUTRAL = `${TAG_BASE} bg-surface text-ink-soft`;
