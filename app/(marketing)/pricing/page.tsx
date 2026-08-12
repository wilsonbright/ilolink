// Pricing. Every number on this page is rendered from lib/billing/plans.ts —
// the same module Stripe Checkout reads its line item from and the same module
// the server-side entitlement checks read their limits from. Nothing here is
// retyped, so the page cannot drift from what a customer is actually charged or
// actually allowed to do.
//
// STATIC: this page is prerendered. It imports only plans.ts (pure) and pure UI
// components — no cookies(), no headers(), no env(), no D1, no searchParams.

import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, article } from "@/lib/seo/jsonld";
import { PLANS, formatPrice, type Plan } from "@/lib/billing/plans";
import {
  Article,
  Breadcrumbs,
  PageHeader,
  Prose,
  Callout,
  Faq,
  Cta,
  RelatedLinks,
} from "../_components/content";

// Built from PLANS, not retyped. Metadata is evaluated at build time and
// plans.ts is a pure module, so this stays statically prerenderable — and a
// price change cannot leave a stale figure in the search result, which is the
// one place nobody would think to look.
const T5 = formatPrice(PLANS.team5.priceCents);
const T10 = formatPrice(PLANS.team10.priceCents);

export const metadata: Metadata = {
  title: `ilolink pricing — free for one person, ${T5} once for a team of ${PLANS.team5.seats}`,
  description:
    `Free for one person, up to ${PLANS.free.docs} documents. Teams pay once, not ` +
    `monthly: ${T5} for ${PLANS.team5.seats} people, ${T10} for ${PLANS.team10.seats}. ` +
    `Readers never need an account.`,
  alternates: { canonical: "/pricing" },
};

// Ordered for display. Keys are checked against PLANS at compile time, so a new
// plan id added to plans.ts cannot silently go unlisted here without a type
// error somewhere in this file's usage.
const ORDER: Plan[] = [PLANS.free, PLANS.team5, PLANS.team10];

// Where a plan's button goes. Checkout is started by a teamspace owner from
// inside the teamspace, so paid plans point at /t rather than at a checkout URL
// this static page has no session to build.
function ctaFor(plan: Plan): { href: string; label: string } {
  return plan.priceCents === 0
    ? { href: "/publish", label: "Start publishing" }
    : { href: "/t", label: "Choose in your teamspace" };
}

function seatLine(plan: Plan): string {
  return plan.seats === 1 ? "1 seat" : `${plan.seats} seats`;
}

// The two headline numbers are rendered from plan.seats / plan.docs, which are
// the fields the server-side entitlement checks actually enforce. plan.features
// is hand-written prose that restates those same two numbers ("100 published
// documents", "5 teammates, including you"), so printing both duplicates every
// count on every card.
//
// Drop the bullets that lead with a number we have already shown. This is a
// display heuristic over authored copy, deliberately kept dumb: if the wording
// in plans.ts changes, the worst outcome is a bullet reappearing next to the
// stat row — never a number that disagrees with what Stripe charges, because
// the stat row does not come from these strings.
function extraFeatures(plan: Plan): string[] {
  return plan.features.filter(
    (f) => !f.startsWith(`${plan.docs} `) && !f.startsWith(`${plan.seats} `),
  );
}

function PlanCard({ plan, featured }: { plan: Plan; featured?: boolean }) {
  const cta = ctaFor(plan);
  const paid = plan.priceCents > 0;
  return (
    <div
      className={`rounded-xl border bg-surface p-6 ${
        featured ? "border-accent/50" : "border-hairline"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-medium text-ink">{plan.label}</h3>
        <p className="text-2xl font-semibold text-ink">
          {formatPrice(plan.priceCents)}
          {paid && (
            <span className="ml-1.5 align-middle text-sm font-normal text-ink-faint">
              once
            </span>
          )}
        </p>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{plan.blurb}</p>

      <p className="mt-4 text-sm font-medium text-ink">
        {seatLine(plan)} · {plan.docs} published documents
      </p>
      {/* Only for paid plans: the free plan's own feature bullet already says
          "Just you — invites need a team plan", and repeating it here would
          reintroduce exactly the duplication extraFeatures() removes. */}
      {plan.seats > 1 && (
        <p className="mt-1 text-xs text-ink-faint">
          Seats include you, the owner.
        </p>
      )}

      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-soft">
        {extraFeatures(plan).map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden className="text-accent">
              ·
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={cta.href}
        className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity duration-150 hover:opacity-90 ${
          featured
            ? "bg-accent text-white"
            : "border border-hairline text-ink"
        }`}
      >
        {cta.label}
      </Link>

      {paid && (
        <p className="mt-3 text-center text-xs text-ink-faint">
          Paid once. Kept forever.
        </p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Article>
      <JsonLd
        data={[
          article({
            path: "/pricing",
            headline: "ilolink pricing — one-time payments, no subscription",
            description:
              `What ilolink costs: free for one person publishing up to ` +
              `${PLANS.free.docs} documents, and a one-time payment for team ` +
              `plans — ${T5} for ${PLANS.team5.seats} seats, ${T10} for ` +
              `${PLANS.team10.seats} seats.`,
            datePublished: "2026-08-08",
          }),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]}
      />
      <PageHeader
        title="Pricing"
        lead={
          <>
            Publishing is free for one person — {PLANS.free.docs} published
            documents, no card. To add teammates you buy a team plan once:{" "}
            {formatPrice(PLANS.team5.priceCents)} for {PLANS.team5.seats}{" "}
            people or {formatPrice(PLANS.team10.priceCents)} for{" "}
            {PLANS.team10.seats}. One payment, kept forever — there is nothing
            to renew and nothing to cancel.
          </>
        }
      />

      <Prose>
        <p>
          Readers never need an account to open a link you share. Publishing
          needs a free account. Every plan uploads up to{" "}
          <strong>15 MB per document</strong>.
        </p>
      </Prose>

      <section className="mt-10 grid gap-4">
        <h2 className="sr-only">Plans</h2>
        {ORDER.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            featured={plan.id === "team5"}
          />
        ))}
      </section>

      <Callout title="Inviting anyone requires a paid plan.">
        The {PLANS.free.label} plan is exactly{" "}
        {PLANS.free.seats === 1 ? "one seat" : `${PLANS.free.seats} seats`} —
        you. That is the only reason to pay us: the moment a second person needs
        to be in the teamspace, you buy {PLANS.team5.label} or{" "}
        {PLANS.team10.label}, once.
      </Callout>

      <Faq
        items={[
          {
            q: "Is this a subscription?",
            a: `No. Team plans are a one-time payment. You pay ${formatPrice(PLANS.team5.priceCents)} or ${formatPrice(PLANS.team10.priceCents)} a single time and the teamspace keeps that plan. There is no renewal, no billing period, and nothing to cancel.`,
          },
          {
            q: "What happens if I need more seats?",
            a: `You buy the larger plan once. ${PLANS.free.label} is ${PLANS.free.seats} seat, ${PLANS.team5.label} is ${PLANS.team5.seats} seats, and ${PLANS.team10.label} is ${PLANS.team10.seats} seats — each count includes you, the owner. If your teamspace is at its seat limit, an invite is refused until you move up a plan.`,
          },
          {
            q: "Do readers need an account?",
            a: "No. Anyone with the link can open a published document — no account, no login, no app. Accounts exist only for the people publishing and for teammates in a teamspace.",
          },
          {
            q: "What counts as a document?",
            a: `One published thing at one ilolink.com/<slug> link: a page you pasted, or a file you uploaded, up to 15 MB. Your plan counts live documents, so unpublishing one frees the slot. ${PLANS.free.label} allows ${PLANS.free.docs}, ${PLANS.team5.label} allows ${PLANS.team5.docs}, and ${PLANS.team10.label} allows ${PLANS.team10.docs}.`,
          },
          {
            q: "Is publishing on my own really free?",
            a: `Yes. The ${PLANS.free.label} plan costs nothing and needs no card: ${PLANS.free.docs} published documents for one person, with analytics and reader comments included.`,
          },
          {
            q: "Who pays — me or my teammates?",
            a: "The teamspace owner. Checkout is started from inside a teamspace, so the plan belongs to the teamspace rather than to an individual account. Teammates you invite don't pay anything.",
          },
        ]}
      />

      <Cta
        label="Start publishing"
        href="/publish"
        sub={`Free for one person, up to ${PLANS.free.docs} published documents.`}
      />

      <RelatedLinks
        links={[
          {
            path: "/faq",
            title: "FAQ",
            blurb:
              "Accounts, privacy, supported formats, expiry, and size limits.",
          },
          {
            path: "/guides/limitations",
            title: "Limitations",
            blurb:
              "What ilolink does, what it doesn't, and what's on the roadmap.",
          },
        ]}
      />
    </Article>
  );
}
