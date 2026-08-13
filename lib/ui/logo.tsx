// The ilolink mark: two square links, interlocked.
//
// A chain link made Modernist — two open squares (5-unit stroke on a 19-unit
// side, offset 8,8) woven over-under: at the top-right crossing square A's
// band runs over B's, at the bottom-left B's runs over A's, and the 2-unit
// notches cut from each "under" band are what make it read as a LINK instead
// of two rectangles. The whole figure has exact 180° rotational symmetry
// about (16,16). Everything is integer rectangles on a 32×32 grid under
// fill-rule evenodd, so corners stay square at any raster size.
//
// fill="currentColor" on purpose: chrome contexts colour it with text-accent
// (which the dark theme remaps in globals.css), so no hex lives here. The
// same six-rect path is restated literally in app/icon.svg (a standalone
// favicon file) and app/api/og/route.tsx (Satori renders from literals) —
// change the geometry in all three or none.
//
// The viewBox is CROPPED to the artwork (3 3 26 26) rather than the full 32×32
// grid the path is drawn on, so `size` means the size of the mark itself. With
// the padded box, an 18px request rendered a 14.6px mark floating in 3.4px of
// air — next to a 17px wordmark whose ink is 12.5px tall, that put the mark's
// bottom ~1.6px BELOW the baseline the text sits on, which is what read as
// misalignment. Cropped, `size` matches the mark to the wordmark's ink height
// (13 against 12.5) and plain items-center then lands it within 0.6px of the
// text's optical centre — measured, not guessed. Baseline alignment was the
// obvious-looking fix and is wrong: a flex item's baseline is its bottom
// margin edge, which hoisted the mark 5px clear of the text.
//
// app/icon.svg keeps the padded box on purpose: a favicon wants breathing
// room inside its own square.
export function IloMark({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="3 3 26 26"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 3H22V22H3ZM8 8H17V17H8ZM8 17H17V22H8ZM10 10H29V29H10ZM15 15H24V24H15ZM15 10H24V15H15Z"
      />
    </svg>
  );
}
