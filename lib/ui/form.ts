// The app-surface input idiom, in one place.
//
// A 1px divider border on surface is the DS .input's own spec — the same
// sanction that lets .btn-secondary sit at 1px divider while everything else
// structural runs 2px. Before this existed, three forms each hand-rolled the
// field (border-2 on canvas here, hairline on surface there) and drifted apart.
//
// Focus keeps the pre-existing border-to-accent move; the global :focus-visible
// rule in globals.css draws the square 2px accent outline on top of it. Width
// and flex behaviour stay at the call site (w-full, flex-1, shrink-0) because
// the three forms genuinely lay their fields out differently. Deliberately a
// plain string with no imports, like lib/ui/nav.ts, so client islands can use
// it without pulling server code into the browser bundle.

export const FIELD_INPUT =
  "border border-divider bg-surface px-3 py-2 text-[15px] text-ink " +
  "placeholder:text-ink-faint transition-colors duration-150 " +
  "focus:border-accent focus:outline-none";
