// The header nav, in one place.
//
// Modernist redesign, Aug 2026: the pill treatment is gone. The DS nav is flat
// text on the ground — links in ink, hover moves the COLOUR to the accent (the
// system's one hover idiom for links), the current page sits in the accent, and
// nothing gains a background or moves. Structure comes from the header's own
// 2px bottom rule (border-b-2 border-divider in the layouts), not from the
// items. Focus is the DS's square 2px accent outline, which the global
// :focus-visible rule in globals.css already draws — the classes here only
// clear Tailwind's ring remnants where a component used to set them.
//
// This lives in its own module because the product has THREE separate headers —
// the app shell, the marketing chrome, and the landing page — plus two client
// islands (SignOutButton, NavAuth) that render into them. They were independent
// copies of the same markup, which is exactly why the first pass at an earlier
// fix landed on one header and left the other two behind. Deliberately plain
// strings with no imports: a client island can use these without dragging any
// server code into the browser bundle, which an export from the app layout
// would have done.

const NAV_BASE =
  "px-1.5 py-1.5 text-sm transition-colors duration-150 sm:px-2 " +
  "hover:text-accent focus-visible:text-accent";

// A nav item that supplies its own text colour (the accent "Sign in", say).
export const NAV_ITEM = NAV_BASE;

// The ordinary case: a secondary-weight destination.
export const NAV_LINK = `${NAV_BASE} text-ink-soft`;

// The wordmark is not a nav item — it reads as the brand: Archivo 800 in ink,
// like the DS .nav-brand. Hover keeps the one idiom (colour to accent).
export const NAV_WORDMARK =
  "text-[17px] font-extrabold tracking-tight text-ink " +
  "transition-colors duration-150 hover:text-accent";

// A phone-width nav can no longer fit on one line, so it wraps within itself
// instead of overflowing the viewport.
export const NAV_ROW =
  "flex flex-wrap items-center justify-end gap-x-2 gap-y-1 sm:gap-x-4";
