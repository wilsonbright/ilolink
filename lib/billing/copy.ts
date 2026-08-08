// Marketing copy about price, derived from lib/billing/plans.ts.
//
// Every pricing sentence on a marketing page comes from here. No page retypes a
// dollar figure, a seat count, or a document cap — if plans.ts changes, every
// page changes with it, and the copy cannot drift away from what Checkout
// charges and what the server enforces.
//
// PURE, like plans.ts: no bindings, no env(). These strings are imported by
// statically prerendered marketing pages and by `metadata` exports.
//
// Wording rules baked in on purpose:
//   - The paid plans are ONE-TIME payments. Never "subscription", "per month",
//     "/mo", "/year", or "renews".
//   - Free is strictly solo. Inviting anyone at all requires a paid plan, so no
//     sentence here calls team use free.
//   - Readers never need an account; publishing needs a free one.

import { PLANS, formatPrice } from "./plans";

/** The free plan's published-document cap, for inline use in prose. */
export const FREE_DOC_COUNT = PLANS.free.docs;

/** "$9 for 5 people or $19 for 10" — the price clause, no leading article. */
export const TEAM_PRICE_SHORT = `${formatPrice(PLANS.team5.priceCents)} for ${
  PLANS.team5.seats
} people or ${formatPrice(PLANS.team10.priceCents)} for ${PLANS.team10.seats}`;

/** "Publishing is free for one person, up to 3 published documents." */
export const FREE_LINE = `Publishing is free for one person, up to ${PLANS.free.docs} published documents.`;

/** Same fact, phrased to open an answer to "Is it free?". */
export const FREE_LINE_YES = `Yes, for one person — free for up to ${PLANS.free.docs} published documents.`;

/**
 * "Inviting teammates takes a paid plan: a one-time $9 for 5 people or $19 for
 * 10, paid once and kept forever."
 */
export const TEAM_LINE = `Inviting teammates takes a paid plan: a one-time ${TEAM_PRICE_SHORT}, paid once and kept forever.`;

/** Shorter form, for answers that are already long. */
export const TEAM_LINE_SHORT = `Inviting teammates takes a paid plan — a one-time ${TEAM_PRICE_SHORT}.`;

/** The full, honest answer to "is it free?" — the free plan and the paid ones. */
export const FREE_AND_TEAMS = `${FREE_LINE} ${TEAM_LINE}`;
