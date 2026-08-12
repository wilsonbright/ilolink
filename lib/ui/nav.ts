// The header nav pill, in one place.
//
// Design review, Aug 2026: the nav read as congested and its hover was a colour
// nudge you had to look for. The fix makes every nav item a pill — padding does
// the spacing, and hover fills the pill with accent-soft instead of shifting one
// text colour. The padding is always present, so nothing moves on hover. Shape
// and tint deliberately match the dashboard teamspace tabs rather than inventing
// a second style for the same "thing you can click".
//
// This lives in its own module because the product has THREE separate headers —
// the app shell, the marketing chrome, and the landing page — plus two client
// islands (SignOutButton, NavAuth) that render into them. They were independent
// copies of the same markup, which is exactly why the first pass at this fix
// landed on one header and left the other two behind. Deliberately plain
// strings with no imports: a client island can use these without dragging any
// server code into the browser bundle, which an export from the app layout
// would have done.

const NAV_BASE =
  "rounded-full px-2 py-1.5 text-sm transition-colors duration-150 sm:px-3 " +
  "hover:bg-accent-soft hover:text-ink " +
  "focus-visible:bg-accent-soft focus-visible:text-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// A nav item that supplies its own text colour (the accent "Sign in", say).
export const NAV_ITEM = NAV_BASE;

// The ordinary case: a secondary-weight destination.
export const NAV_LINK = `${NAV_BASE} text-ink-soft`;

// The wordmark is not a nav item — it stays bare text so it reads as the brand
// rather than as one more destination — but it still needs a visible focus ring,
// and a bare inline needs the offset to clear its own glyphs.
export const NAV_WORDMARK =
  "rounded-full text-sm font-medium tracking-wide text-accent " +
  "transition-colors duration-150 hover:text-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-4 focus-visible:ring-offset-canvas";

// Pills are wide enough that a phone-width nav can no longer fit on one line, so
// it wraps within itself instead of overflowing the viewport. The narrower px-2
// below sm keeps that wrap rare.
export const NAV_ROW =
  "flex flex-wrap items-center justify-end gap-x-1 gap-y-1 sm:gap-x-2";
