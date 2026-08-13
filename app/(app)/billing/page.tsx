// /billing — what each teamspace you own is on, and the one step up from it.
//
// Plans are ONE-TIME payments recorded on the teamspace row itself (plan,
// plan_source, plan_updated_at — migration 0015). There is no receipts table
// and no stored receipt URL, so the purchases list below is derived from
// those rows and points at the receipt Stripe emailed rather than pretending
// a PDF exists somewhere.
//
// Owners only. Anyone can see their teamspace's plan on /t/<id>, but
// /api/billing/checkout refuses a non-owner, and a member has no purchase
// record of their own to look at — their owner does.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { listTeamspacesWithCounts } from "@/lib/teamspace/store";
import { countDocuments } from "@/lib/billing/entitlements";
import { env } from "@/lib/cf";
import {
  PLANS,
  PAID_PLAN_IDS,
  formatPrice,
  planFor,
  type Plan,
} from "@/lib/billing/plans";
import { UpgradeButton } from "./upgrade-button";
import { TAG_ACCENT } from "@/lib/ui/tags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing — ilolink",
  robots: { index: false, follow: false },
};

// The DS micro-label: 13px for section kickers, with a 12px ink-faint variant
// for table column headers.
const MICRO = "text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink";
const COL = "text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-faint";

function fmtDate(ms: number | null): string {
  if (!ms) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(ms);
}

// One line under the big plan figure: where the plan came from, and which
// teamspace it belongs to — the card has to say this itself because the page
// shows one card per owned teamspace.
function metaLine(
  plan: Plan,
  source: string,
  updatedAt: number | null,
  name: string,
): string {
  if (plan.id === "free") return `Free plan · ${name} teamspace`;
  if (source === "comp") {
    return `${updatedAt ? `Granted on ${fmtDate(updatedAt)}` : "Granted"} — no charge · ${name} teamspace`;
  }
  // Only a Stripe purchase gets to claim a payment happened. A paid plan whose
  // plan_source is 'default' (or anything else unrecognised) was set without a
  // payment record, and inventing one here would be a false receipt.
  if (source === "stripe") {
    return `${updatedAt ? `One-time payment on ${fmtDate(updatedAt)}` : "One-time payment"} · ${name} teamspace`;
  }
  return `${plan.label} plan · ${name} teamspace`;
}

// Dynamic width, so inline style rather than the landing page's static width
// classes — Tailwind cannot see a percentage computed at request time.
function UsageBar({
  label,
  used,
  cap,
}: {
  label: string;
  used: number;
  cap: number;
}) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 100;
  const full = used >= cap;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="uppercase tracking-[0.06em] text-ink-faint">
          {label}
        </span>
        <span className="whitespace-nowrap font-extrabold tabular-nums text-ink">
          {used} of {cap}
        </span>
      </div>
      {/* aria-hidden: the "N of M" text above already carries the number. */}
      <div aria-hidden className="h-3 w-full bg-surface">
        <div
          className={`h-3 ${full ? "bg-accent-strong" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const user = await currentUser();
  if (!user) redirect("/signin?next=%2Fbilling");

  const teamspaces = await listTeamspacesWithCounts(user.id);
  const owned = teamspaces.filter((t) => t.role === "owner");

  // countDocuments, not the list's document_count: the cap meters LIVE
  // documents (unpublished ones give the slot back), and this page is where
  // that cap is read against a number. Same pair /t/<id> shows.
  const e = env() as unknown as { DB: D1Database };
  const docCounts = await Promise.all(
    owned.map((t) => countDocuments(e.DB, t.id)),
  );
  const spaces = owned.map((t, i) => ({
    row: t,
    plan: planFor(t.plan),
    docsUsed: docCounts[i],
  }));

  const anyPaid = spaces.some((s) => s.plan.id !== "free");
  // Same predicate as the plan cards (plan.id !== 'free'), so a paid plan can
  // never show a paid card above and "everything you own is on the free plan"
  // below. How the plan arrived is the amount column's problem, not a filter.
  const purchases = spaces
    .filter((s) => s.plan.id !== "free")
    .sort(
      (a, b) => (b.row.plan_updated_at ?? 0) - (a.row.plan_updated_at ?? 0),
    );

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      <div className="pb-5">
        <h1 className="ml-[-0.058em] text-[clamp(32px,3.6vw,44px)] leading-none text-ink">
          Billing
        </h1>
        <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-[26px] text-ink-soft">
          {anyPaid
            ? "You paid once. Nothing recurs, nothing expires, and no card is kept on file — this page is a record, not a subscription to manage."
            : "Publishing is free for one person. A paid plan is a single one-time payment — nothing recurs, nothing expires, and no card is kept on file."}
        </p>
      </div>

      {owned.length === 0 && (
        <p className="border-t-2 border-divider pt-5 leading-relaxed text-ink-soft">
          You don&rsquo;t own a teamspace, so there is nothing to bill here.
          Plans belong to a teamspace and are bought by its owner.
        </p>
      )}

      {spaces.map(({ row, plan, docsUsed }) => {
        const paid = plan.id !== "free";
        const seatsUsed = row.member_count;
        // Only a genuine step up — same rule as upgrade.tsx: the current tier
        // would take money and change nothing, and a smaller one could cut a
        // team below the people already in it.
        const nextId = PAID_PLAN_IDS.find(
          (pid) => PLANS[pid].seats > plan.seats,
        );
        const next = nextId ? PLANS[nextId] : null;
        const seatsFull = seatsUsed >= plan.seats;
        return (
          <section
            key={row.id}
            className="mt-7 grid items-stretch gap-7 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
          >
            <div
              className={`border-2 px-6 py-7 ${paid ? "border-accent" : "border-divider"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3.5">
                <p className={MICRO}>Current plan</p>
                {paid && (
                  <span className={`${TAG_ACCENT} whitespace-nowrap`}>
                    Paid once — yours forever
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-[clamp(30px,3vw,40px)] leading-none text-ink">
                {plan.label} — {formatPrice(plan.priceCents)}
              </h2>
              <p className="mt-2 text-sm leading-[22px] text-ink-faint">
                {metaLine(plan, row.plan_source, row.plan_updated_at, row.name)}
              </p>
              <div className="mt-7 grid gap-3.5">
                <UsageBar
                  label="Published documents"
                  used={docsUsed}
                  cap={plan.docs}
                />
                <UsageBar label="Teammates" used={seatsUsed} cap={plan.seats} />
              </div>
              <p className="mt-5 text-sm leading-[22px] text-ink-soft">
                Uploads are capped at 15 MB per document on every plan.
              </p>
            </div>

            <div className="flex flex-col border-2 border-divider px-6 py-7">
              <p className={MICRO}>Need more room?</p>
              {next ? (
                <>
                  <h2 className="mt-4 text-[26px] text-ink">
                    {next.label} — {formatPrice(next.priceCents)}, once
                  </h2>
                  <p className="mb-5 mt-2.5 text-[14.5px] leading-6 text-ink-soft">
                    {next.seats} teammates and {next.docs} published documents.{" "}
                    {seatsFull
                      ? paid
                        ? `All ${plan.seats} of your seats are taken — moving up is another one-time payment, and your ${formatPrice(plan.priceCents)} purchase stays on record below.`
                        : "A personal teamspace is just you — a team plan is what lets you invite anyone, as one payment that never expires."
                      : "Moving up is one more payment, not a subscription — it never expires."}
                  </p>
                  <div className="mt-auto">
                    <UpgradeButton
                      teamspaceId={row.id}
                      plan={next.id}
                      label={`Upgrade once — ${formatPrice(next.priceCents)}`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-4 text-[26px] text-ink">
                    This is the largest plan
                  </h2>
                  <p className="mt-2.5 text-[14.5px] leading-6 text-ink-soft">
                    Need more than {plan.seats} seats or {plan.docs} documents
                    in {row.name}?{" "}
                    <a
                      href="mailto:hello@sacca.ai"
                      className="text-accent-strong underline"
                    >
                      Get in touch
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          </section>
        );
      })}

      {owned.length > 0 && (
        <div className="mt-10">
          <p className={`${MICRO} mb-2.5`}>Purchases &amp; receipts</p>
          {purchases.length === 0 ? (
            <p className="border-t-2 border-divider pt-3.5 text-sm text-ink-faint">
              No purchases yet — everything you own is on the free plan.
            </p>
          ) : (
            <>
              <div className={`grid grid-cols-[110px_minmax(0,1fr)_auto] gap-x-5 border-t-2 border-divider py-3 ${COL}`}>
                <span>Date</span>
                <span>Item</span>
                <span className="text-right">Amount</span>
              </div>
              {purchases.map((s) => (
                <div
                  key={s.row.id}
                  className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-baseline gap-x-5 border-t border-hairline py-3.5 text-[14.5px] text-ink"
                >
                  <span className="tabular-nums">
                    {fmtDate(s.row.plan_updated_at)}
                  </span>
                  <span>
                    {s.plan.label} — one-time plan, {s.row.name} teamspace
                  </span>
                  <span
                    className={`whitespace-nowrap text-right font-extrabold ${
                      s.row.plan_source === "stripe" ? "tabular-nums" : ""
                    }`}
                  >
                    {s.row.plan_source === "stripe"
                      ? formatPrice(s.plan.priceCents)
                      : s.row.plan_source === "comp"
                        ? "Granted — no charge"
                        : "No payment on record"}
                  </span>
                </div>
              ))}
              {/* The prototype offers "Download PDF" here. Nothing stores a
                  receipt URL (see the header comment), so the honest version
                  is where the receipt actually went. */}
              <p className="mt-5 max-w-[62ch] text-sm leading-6 text-ink-faint">
                Stripe emailed your receipt when you paid — there&rsquo;s no
                stored copy to download here.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
