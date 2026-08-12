// What a published document is allowed to reveal in a link preview.
//
// Separate from `noindex`, which the content worker already sets for unlisted
// documents, because the two directives answer to different consumers: a search
// engine obeys <meta name="robots">, while Slack, iMessage, X and LinkedIn read
// only the og:/twitter: tags and ignore robots directives entirely. Before this
// module, an unlisted document was hidden from Google and quoted in full by
// every chat app its link was pasted into (SECURITY-AUDIT-2026-07-23.md:274).
//
// Pure and data-only so it is testable without a worker, a fetch, or a D1
// binding — the same split lib/seo/robots.ts uses.
//
// Relative import, not "@/": the content worker is the caller and its tsconfig
// has no path alias, so a shared module that uses one fails `tsc -p
// content-worker` while passing the app's typecheck.
import type { Visibility } from "../types";

/** Shown instead of the document's own title where the title must not leak. */
export const GENERIC_PREVIEW_TITLE = "A document shared on ilolink";

/**
 * Shown instead of a body excerpt. Identical to the fallback the content worker
 * already used for documents with no derivable description, so a suppressed
 * preview is indistinguishable from an ordinary one — it does not advertise
 * that there is something here worth guessing at.
 */
export const GENERIC_PREVIEW_DESCRIPTION =
  "Shared on ilolink — see how people read it: views, scroll depth, and comments.";

/**
 * May a preview quote the document's body?
 *
 * Only for `public`. The excerpt is ~180 characters of body text that nobody
 * chose to quote, and an unfurler stores it server-side for as long as it likes:
 * it outlives an `expiring` document's expiry and an unpublish, and it survives
 * in the cache of every channel the link was ever pasted into.
 */
export function mayQuoteBody(visibility: Visibility): boolean {
  return visibility === "public";
}

/**
 * May a preview show the document's own title?
 *
 * Deliberately more permissive than `mayQuoteBody`, and this is the one real
 * judgment call here:
 *
 * - `public` — yes, it is listed on purpose.
 * - `unlisted` — yes. The link IS the audience, and pasting it into a channel to
 *   get a titled card is the ordinary flow; a card reading "A document shared on
 *   ilolink" would read as broken. It still loses the body excerpt above, which
 *   is the part that quotes content rather than naming it.
 * - `password` — no. The body sits behind a secret the unfurler does not have,
 *   so a titled card would tell a whole channel what the gated document is
 *   called while still refusing them the contents.
 * - `expiring` — no. The point of the tier is that the content stops being
 *   available, and a cached card does not expire with it.
 *
 * To make unlisted stricter, move it to the second group — that is the whole
 * change, and the test in test/doc-preview.test.ts pins the current answer per
 * tier so the flip is deliberate rather than accidental.
 */
export function mayShowTitle(visibility: Visibility): boolean {
  return visibility === "public" || visibility === "unlisted";
}
