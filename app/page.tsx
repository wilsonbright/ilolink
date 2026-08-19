// Home — Modernist rebuild (Aug 2026 design handoff).
//
// Built to the "ilolink Landing" prototype: registry-led hero, the connector
// story absorbed into the chat-lines split, a live composer inside #publish,
// static analytics mocks, six use cases, three plan cards, red poster banner.
// Strong 2px rules organise the page; zero radius; everything flush left.
//
// TRUTHFULNESS RULES FOR THIS FILE — an earlier version broke two of them:
//  - File uploads are .md, .html, .pdf and .docx ONLY. JSON, CSV and images are
//    pasted as text or a data URL. Old copy once promised "drop a file — a PDF,
//    a .docx, a spreadsheet, an image"; half of that was false. The composer
//    below is the real one, so its affordances cannot lie.
//  - A PDF is served inside an iframe, so read-depth and heatmaps cannot see
//    into it. Say so plainly instead of implying otherwise — the "one honest
//    limit" line under the analytics mocks does.
//  - Publishing needs an account; reading never does. Do not revive the old
//    "no account needed" line — it is true only of readers.
//  - Published URLs are ilolink.com/<slug> — there is no /d/ path. The chat
//    mock shows the real shape.
//  - Registry names are kind-scoped slugs from lib/artifacts/kinds — the kind
//    for a handoff is `session`, not `handoff`. The chat mock uses the real one.
//
// HARD CONSTRAINT: this page is statically prerendered (`○ /` in the build
// output). Nothing here may read a session, a cookie, or a binding. Session
// awareness comes only from the <NavAuth/> client island.
import type { Metadata } from "next";
import Link from "next/link";
import { PublishForm } from "@/app/(app)/publish/publish-form";
import { PILLARS, LEGAL } from "@/lib/seo/site";
import { IloMark } from "@/lib/ui/logo";
import { NAV_LINK, NAV_ROW, NAV_WORDMARK } from "@/lib/ui/nav";
import { NavAuth } from "@/app/nav-auth";
import { ARTIFACT_KINDS, KINDS } from "@/lib/artifacts/kinds";
import { PLANS, formatPrice } from "@/lib/billing/plans";

// Safe to import into a static page: lib/artifacts/kinds is pure data with no
// imports of its own — no bindings, no D1, nothing server-only to drag in.
// lib/billing/plans is pure for the same reason — see the header comment there.

// Title and description come from the root layout (SITE_TITLE/SITE_DESCRIPTION);
// only the canonical is declared here. It lives on the page rather than in the
// root layout because `alternates` is inherited wholesale by any segment that
// does not set its own — putting `canonical: "/"` in the layout would stamp it
// onto /signin, /dashboard and every other app route that declares no
// alternates of its own. This page was the ONLY one of the 58 in the sitemap
// with no canonical at all.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Design-system class fragments, named once. (See DESIGN-BRIEF / lib/ui/nav.ts;
// buttons per the DS: primary hovers to accent-strong, never opacity.)
const KICKER =
  "text-[13px] uppercase tracking-[0.08em] text-accent-strong font-extrabold";
const PANEL_TITLE =
  "text-[13px] uppercase tracking-[0.08em] font-extrabold text-ink";
const BTN_PRIMARY =
  "inline-flex items-center bg-accent px-5 py-2.5 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong";
const BTN_SECONDARY =
  "inline-flex items-center border border-divider px-5 py-2.5 text-sm font-extrabold text-ink transition-colors duration-150 hover:bg-ink/5";
const BTN_GHOST =
  "inline-flex items-center px-2 py-2.5 text-sm font-extrabold text-accent-strong transition-colors duration-150 hover:bg-accent-soft/40";
// One shared container so every section's measure lines up with the header's.
const WRAP = "mx-auto w-full max-w-[1200px] px-6 sm:px-10 lg:px-[72px]";

// What you say in chat, and what comes back. Static presentation copy from the
// prototype — with the URL and the registry slug corrected to the real shapes
// (see TRUTHFULNESS RULES above).
const CHAT_LINES = [
  {
    say: "Save this spec for the team.",
    result:
      "spec/checkout-refunds v3 — pushed to Acme teamspace, awaiting admin approval",
  },
  {
    say: "Check what we already have on commit conventions.",
    result: "skill/commit-style v5 by Dana, 12 Jun — read before starting",
  },
  {
    say: "Publish this as an ilolink page.",
    result: "ilolink.com/q3-pricing — link back, analytics behind it",
  },
  {
    say: "Save the handoff as a session transfer.",
    result:
      "session/billing-migration v1 — the next person picks up what was decided",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Connect an assistant once",
    copy: "Add ilolink as an MCP connector in Claude, ChatGPT, or your coding agent. You pick which teamspace it may write into — fixed for the life of the connection.",
  },
  {
    num: "02",
    title: "Push from any repo",
    copy: "The file's path already says what it is — .claude/skills is a skill, docs/decisions is a decision. Every write is a new version with an author and a note.",
  },
  {
    num: "03",
    title: "Teammates pull the same set",
    copy: "Anyone fetches it by name, from any repo, on any machine. What comes back names the author, the version and the date.",
  },
  {
    num: "04",
    title: "Review before it's policy",
    copy: "A member's push arrives as a proposal. An admin approves or rejects it — before anyone's agent starts obeying it.",
  },
];

// Read-through mock: static presentation data from the prototype. Widths are
// literal classes, not computed, so Tailwind can see them.
const FUNNEL = [
  { label: "Opened", pct: "100%", w: "w-full" },
  { label: "Halfway", pct: "74%", w: "w-[74%]" },
  { label: "Three quarters", pct: "58%", w: "w-[58%]" },
  { label: "Finished", pct: "41%", w: "w-[41%]" },
];

const USES = [
  {
    who: "Team lead standardising agents",
    what: "Agent definitions and runbooks in one reviewed place — how an agent behaves is something the team decided, not one person.",
  },
  {
    who: "Engineer with a house style",
    what: "Push commit conventions once. Every teammate's assistant reads the same rules in every repo.",
  },
  {
    who: "Anyone ending a long session",
    what: "Save the handoff as a session transfer. The next person — or model — picks up what's decided and what's open.",
  },
  {
    who: "Consultant sending a proposal",
    what: "The PDF as a link, not a 12 MB attachment. See whether the client opened it at all.",
  },
  {
    who: "PM circulating a spec",
    what: "Unlisted link, comments anchored to the disputed paragraph, revised in place — the link never changes.",
  },
  {
    who: "Founder sending an investor update",
    what: "One expiring link. Views, read depth, who came back — no tracking pixel, no cookie banner.",
  },
];

// The three tiers, in order. Every number on the pricing card — price, seats,
// documents, feature bullets — comes out of lib/billing/plans.ts, which is the
// same file the Checkout line item and the server-side limit checks read. No
// figure is retyped here, so this copy cannot drift away from what is enforced.
// The middle (team5) card is the featured one, per the prototype.
const PRICING = [PLANS.free, PLANS.team5, PLANS.team10];

// A 2px structural rule between major sections, inside the shared container.
function Rule() {
  return (
    <div className={WRAP}>
      <div className="border-t-2 border-divider" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* Sticky bar: brand + flat Modernist nav (lib/ui/nav.ts) + the one
          unmissable primary action. Structure comes from the header's own 2px
          rule, not from the items. */}
      <header className="sticky top-0 z-20 border-b-2 border-divider bg-canvas/85 backdrop-blur">
        <div
          className={`${WRAP} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3`}
        >
          <Link
            href="/"
            className={`inline-flex items-center gap-2 ${NAV_WORDMARK}`}
          >
            <IloMark size={13} className="self-center text-accent" />
            ilolink
          </Link>
          <nav className={NAV_ROW}>
            <Link href="#registry" className={`hidden sm:inline ${NAV_LINK}`}>
              Registry
            </Link>
            <Link href="#publish" className={`hidden sm:inline ${NAV_LINK}`}>
              Publish
            </Link>
            {/* Hidden on the phone row like Registry/Publish — Pricing,
                Connect and the CTA keep priority in the tight space. */}
            <Link href="/trending" className={`hidden sm:inline ${NAV_LINK}`}>
              Trending
            </Link>
            <Link href="#pricing" className={NAV_LINK}>
              Pricing
            </Link>
            <Link href="/connect" className={NAV_LINK}>
              Connect
            </Link>
            <NavAuth />
            {/* Signed out this lands on sign-in and returns to /welcome; signed
                in /signin redirects straight through. One href, both states — no
                session lookup on a static page. `new=1` only changes the copy
                on the far side. A new user used to land on /t (Teamspaces) and
                have no idea what to do; /welcome gives one obvious first action
                and bounces already-activated users on to their dashboard. */}
            <Link
              href="/signin?next=%2Fwelcome&new=1"
              className="inline-flex items-center bg-accent px-4 py-1.5 text-sm font-extrabold text-canvas transition-colors duration-150 hover:bg-accent-strong"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className={`${WRAP} pb-[76px] pt-[92px]`}>
          <h1 className="-ml-[0.058em] text-[clamp(40px,5.6vw,76px)] font-extrabold leading-[1.06] tracking-[-0.02em] text-ink">
            <span className="block">Push it once.</span>
            <span className="block">
              Every teammate&rsquo;s agent knows it.
            </span>
          </h1>
          <p className="mt-9 max-w-[56ch] text-[17px] leading-[28px] text-ink">
            ilolink is a registry for what agents produce — skills, specs,
            plans, runbooks, handoffs. Push once from any repo; every
            teammate&rsquo;s assistant reads the same versioned, reviewed set.
            And anything worth showing the world becomes a link anyone can
            open, no sign-in to read.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#pricing" className={BTN_PRIMARY}>
              Start free
            </Link>
            <Link href="#publish" className={BTN_GHOST}>
              I just want to share a document &rarr;
            </Link>
          </div>
          {/* Derived, not retyped — the price-drift rule this file promises. */}
          <p className="mt-5 text-sm leading-[28px] text-ink-soft">
            Free for one person. {formatPrice(PLANS.team5.priceCents)} once
            &mdash; not monthly &mdash; for a team of {PLANS.team5.seats === 5 ? "five" : PLANS.team5.seats}.
          </p>
        </section>

        <Rule />

        {/* ── In your assistant's chat ──────────────────────────────────── */}
        {/* The old standalone connector section is absorbed here, so the
            #connect anchor lives on this section to keep old links working. */}
        <section
          id="connect"
          aria-label="From your chat"
          className={`${WRAP} scroll-mt-20 py-[70px]`}
        >
          <div className="grid items-start gap-y-10 lg:grid-cols-12 lg:gap-x-[clamp(28px,5vw,84px)]">
            <div className="lg:col-span-5">
              <p className={`${KICKER} mb-3.5`}>One connector, both halves</p>
              <h2 className="text-[clamp(28px,3vw,40px)] font-extrabold leading-[1.12] text-ink">
                You say it in chat. It lands where the team can use it.
              </h2>
              <p className="mt-5 max-w-[46ch] text-[15.5px] leading-[28px] text-ink-soft">
                Add ilolink as an MCP connector in Claude, Claude Code, ChatGPT
                or any MCP-compatible assistant. One approval, no API key. You
                pick the teamspace it may write into — fixed for the life of
                the connection.
              </p>
              <div className="mt-7">
                <Link href="/connect" className={BTN_SECONDARY}>
                  Connect an assistant
                </Link>
              </div>
            </div>
            <div className="border-2 border-divider lg:col-span-7">
              <div className={`${PANEL_TITLE} border-b-2 border-divider px-5 py-3`}>
                In your assistant&rsquo;s chat
              </div>
              <div className="divide-y divide-hairline">
                {CHAT_LINES.map((c) => (
                  <div key={c.say} className="grid gap-1.5 px-5 py-[18px]">
                    <p className="text-base font-extrabold leading-6 text-ink">
                      &ldquo;{c.say}&rdquo;
                    </p>
                    <p className="text-sm leading-[22px] text-ink-soft">
                      <span
                        className="mr-2 inline-block h-2 w-2 bg-accent"
                        aria-hidden
                      />
                      {c.result}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Rule />

        {/* ── The registry ──────────────────────────────────────────────── */}
        <section id="registry" className={`${WRAP} scroll-mt-20 py-[84px]`}>
          <p className={`${KICKER} mb-3.5`}>The registry</p>
          <h2 className="-ml-[0.058em] max-w-[24ch] text-[clamp(32px,4vw,54px)] font-extrabold leading-[1.08] text-ink">
            One name means one thing, for every agent on the team.
          </h2>
          <div className="mt-14 grid gap-x-[clamp(24px,3vw,42px)] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.num} className="border-t-2 border-divider pb-7 pt-5">
                <p className="mb-3.5 text-[15px] font-extrabold tabular-nums text-ink">
                  {s.num}
                </p>
                <h3 className="text-lg font-extrabold leading-6 text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[26px] text-ink-soft">
                  {s.copy}
                </p>
              </div>
            ))}
          </div>

          {/* The ten kinds, straight from lib/artifacts/kinds — labels, repo
              directories and descriptions are the same data the MCP tools and
              the sync client read, so this grid cannot drift from the product. */}
          <div className="mt-10 border-2 border-divider">
            <div className="flex flex-wrap justify-between gap-3.5 border-b-2 border-divider px-5 py-3">
              <span className={PANEL_TITLE}>Ten kinds, one fixed list</span>
              <span className="text-[13px] leading-[18px] text-ink-soft">
                Fixed on purpose — so &ldquo;decision&rdquo; never means three
                different folders.
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5">
              {ARTIFACT_KINDS.map((k) => {
                const info = KINDS[k];
                return (
                  <div
                    key={k}
                    className="border-t border-r border-hairline px-5 pb-4 pt-3.5"
                  >
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className="text-[15px] font-extrabold text-ink">
                        {info.label}
                      </span>
                      <span className="whitespace-nowrap text-xs tabular-nums text-accent-strong">
                        {info.dir}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-[19px] text-ink-soft">
                      {info.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-7 max-w-[62ch] text-[15.5px] leading-[28px] text-ink-soft">
            A registry entry isn&rsquo;t a document someone might read —
            it&rsquo;s an instruction another person&rsquo;s assistant will act
            on. So a member&rsquo;s push arrives as a proposal, and an admin
            approves it before any agent obeys it. Teams that don&rsquo;t want
            the step turn it off.
          </p>
        </section>

        <Rule />

        {/* ── Publish ───────────────────────────────────────────────────── */}
        {/* `#compose` is kept as a second anchor on this section because
            marketing pages across the site link to it by name. */}
        <section id="publish" className={`${WRAP} scroll-mt-20 py-[84px]`}>
          <span id="compose" className="block scroll-mt-20" aria-hidden />
          <p className={`${KICKER} mb-3.5`}>The other half</p>
          <h2 className="-ml-[0.058em] max-w-[22ch] text-[clamp(32px,4vw,54px)] font-extrabold leading-[1.08] text-ink">
            Put a document online, and find out what happened to it.
          </h2>
          <p className="mt-9 max-w-[56ch] text-[17px] leading-[28px] text-ink">
            Paste Markdown or HTML, or drop in a PDF or .docx. One link anyone
            opens without an account — and a private page showing who read it,
            how far they got, and what they wrote back.
          </p>

          <div className="mt-14 grid items-start gap-y-7 lg:grid-cols-12 lg:gap-x-[clamp(28px,4vw,56px)]">
            {/* The LIVE composer — this is the signup, not a mock. A literal
                prop, not a session read: the form asks /api/teamspaces itself
                once mounted, so a signed-in visitor gets the "Publish into"
                picker without the homepage ever touching a cookie. */}
            <div className="lg:col-span-7 [&>form]:mt-0">
              <PublishForm discoverTeamspaces />
            </div>
            <div className="lg:col-span-5">
              <p className="max-w-[46ch] text-[15.5px] leading-[28px] text-ink-soft">
                Write first, make the account at the end — your draft stays
                where it is while you sign in. Choose who can open it: public,
                unlisted, password-protected, or expiring on a date.
              </p>
              <p className="mt-5 max-w-[46ch] text-[15.5px] leading-[28px] text-ink-soft">
                Revise in place and the link stays the same, previous version
                kept. Nobody ends up reading the wrong file.
              </p>
              <p className="mt-5 max-w-[46ch] text-[15.5px] font-extrabold leading-[28px] text-ink">
                Publishing needs an account. Reading never does.
              </p>
            </div>
          </div>

          {/* Static analytics mocks — presentation only, token colours. The
              old #analytics section is absorbed here; keep its anchor. */}
          <div
            id="analytics"
            className="mt-14 grid scroll-mt-20 items-start gap-[clamp(28px,4vw,56px)] lg:grid-cols-2"
          >
            <div>
              <div className="border-2 border-divider">
                <div className={`${PANEL_TITLE} border-b-2 border-divider px-5 py-3`}>
                  Read-through — Q3 pricing proposal
                </div>
                <div className="grid gap-3.5 p-5">
                  {FUNNEL.map((f) => (
                    <div
                      key={f.label}
                      className="grid grid-cols-[110px_1fr_44px] items-center gap-3"
                    >
                      <span className="text-[13px] uppercase tracking-[0.06em] text-ink-soft">
                        {f.label}
                      </span>
                      <div className="h-4 bg-surface">
                        <div className={`h-4 bg-accent ${f.w}`} />
                      </div>
                      <span className="text-right text-sm font-extrabold tabular-nums text-ink">
                        {f.pct}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-hairline px-5 py-3 text-[13px] leading-[19px] text-ink-soft">
                  31 readers &middot; counted without cookies or fingerprints —
                  nothing for a consent banner.
                </div>
              </div>
              <p className="mt-3.5 max-w-[46ch] text-[15px] leading-[26px] text-ink-soft">
                Views, unique readers, and the share who reached a quarter,
                half, and the end. Plus referrers, countries, devices, and time
                on the page day by day.
              </p>
            </div>
            <div>
              <div className="border-2 border-divider">
                <div className="flex justify-between gap-3.5 border-b-2 border-divider px-5 py-3">
                  <span className={PANEL_TITLE}>On the page itself</span>
                  <span className="text-[13px] text-ink-soft">
                    heatmap + comments
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 p-5">
                  <div className="grid content-start gap-2" aria-hidden>
                    <div className="h-2.5 w-[62%] bg-hairline" />
                    <div className="h-2.5 bg-surface" />
                    <div className="h-2.5 w-[92%] bg-surface" />
                    <div className="h-2.5 bg-accent-soft" />
                    <div className="h-2.5 w-[95%] bg-accent/40" />
                    <div className="h-2.5 w-[88%] bg-accent-soft" />
                    <div className="h-2.5 w-[70%] bg-surface" />
                    <div className="h-2.5 w-[84%] bg-surface" />
                    <div className="h-2.5 w-[40%] bg-surface" />
                  </div>
                  <div className="self-start border border-hairline bg-canvas px-3.5 py-3">
                    <p className="text-[13px] font-extrabold leading-[19px] text-ink">
                      &ldquo;This is the paragraph everyone reread — can we say
                      the price here, not on page 4?&rdquo;
                    </p>
                    <p className="mt-2 text-xs text-ink-soft">
                      Anchored comment &middot; 2 replies &middot; 👍 4 &middot;
                      🤔 2
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3.5 max-w-[46ch] text-[15px] leading-[26px] text-ink-soft">
                Heatmaps show where readers clicked and where they stopped.
                Comments sit against the passage being discussed — anonymous by
                default, named if you ask, off if you&rsquo;d rather.
              </p>
            </div>
          </div>

          {/* Stated rather than glossed: a PDF renders inside an iframe, so the
              page-level tracker genuinely cannot see scrolling within it. */}
          <p className="mt-7 max-w-[72ch] text-sm leading-6 text-ink-soft">
            One honest limit: a PDF opens in the browser&rsquo;s own viewer, so
            read-depth and heatmaps can&rsquo;t see into it. Views, sources,
            reactions and comments still work on a PDF.
          </p>
        </section>

        <Rule />

        {/* ── Who reaches for it ────────────────────────────────────────── */}
        <section
          id="use-cases"
          aria-label="Who uses it"
          className={`${WRAP} scroll-mt-20 py-[70px]`}
        >
          <p className={`${KICKER} mb-7`}>Who reaches for it</p>
          <div className="grid gap-x-[clamp(24px,3vw,42px)] sm:grid-cols-2 lg:grid-cols-3">
            {USES.map((u) => (
              <div key={u.who} className="border-t-2 border-divider pb-7 pt-[18px]">
                <h3 className="text-[17px] font-extrabold leading-6 text-ink">
                  {u.who}
                </h3>
                <p className="mt-2 text-[14.5px] leading-6 text-ink-soft">
                  {u.what}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Rule />

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section id="pricing" className={`${WRAP} scroll-mt-20 py-[84px]`}>
          <p className={`${KICKER} mb-3.5`}>Pricing</p>
          <h2 className="-ml-[0.058em] text-[clamp(32px,4vw,54px)] font-extrabold leading-[1.08] text-ink">
            Pay once, or don&rsquo;t pay at all.
          </h2>
          <p className="mt-7 max-w-[56ch] text-[17px] leading-[28px] text-ink">
            Working alone is free. A team plan is a one-time payment — you pay
            for the team size once and keep it. Nothing recurs, nothing
            expires, no card on file.
          </p>
          <div className="mt-10 grid items-stretch gap-7 md:grid-cols-3">
            {PRICING.map((plan) => {
              const featured = plan.id === "team5";
              return (
                <div
                  key={plan.id}
                  className={`grid grid-rows-[auto_auto_auto_1fr_auto] border-2 bg-canvas px-6 py-7 ${
                    featured ? "border-accent" : "border-divider"
                  }`}
                >
                  <p className={PANEL_TITLE}>{plan.label}</p>
                  <p
                    className={`mt-[18px] text-[44px] font-extrabold leading-none ${
                      featured ? "text-accent" : "text-ink"
                    }`}
                  >
                    {formatPrice(plan.priceCents)}
                  </p>
                  {/* The term line is the plan's own blurb — "Pay once. Five
                      people, forever." — not the prototype's retyped variant,
                      so it cannot drift from lib/billing/plans.ts. */}
                  <p className="mt-1.5 text-[13px] leading-[19px] text-ink-soft">
                    {plan.blurb}
                  </p>
                  <div className="mb-6 mt-5 grid content-start gap-2">
                    {plan.features.map((f) => (
                      <p key={f} className="text-[14.5px] leading-[22px] text-ink">
                        <span
                          className="mr-2.5 inline-block h-2 w-2 bg-accent"
                          aria-hidden
                        />
                        {f}
                      </p>
                    ))}
                  </div>
                  {/* Wide buttons are flush left, per the DS. Same `new=1` as
                      the header CTA — a first-visit entry point should not
                      promise "Start free" then open a screen headed "Sign in". */}
                  <Link
                    href="/signin?next=%2Fwelcome&new=1"
                    className={`${featured ? BTN_PRIMARY : BTN_SECONDARY} w-full justify-start text-left`}
                  >
                    {plan.priceCents === 0
                      ? "Start free"
                      : `Buy once — ${formatPrice(plan.priceCents)}`}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-7 max-w-[72ch] text-sm leading-6 text-ink-soft">
            Personal is one person: you. Inviting anybody — a teammate, a
            co-founder, one reviewer who writes to the registry — takes a team
            plan. That&rsquo;s the only thing the payment unlocks, and you make
            it once.
          </p>
        </section>

        {/* ── Poster banner — the one red block. bg-poster, not bg-accent:
            the poster pair is pinned in both color schemes, because a red
            statement that inverts to pastel salmon in dark mode stops being
            the statement (see globals.css). ─────────────────────────────── */}
        <section className="bg-poster text-poster-ink">
          <div className={`${WRAP} py-[84px]`}>
            <h2 className="-ml-[0.058em] text-[clamp(34px,4.2vw,56px)] font-extrabold leading-[1.06] text-poster-ink">
              <span className="block">Publish something now.</span>
              <span className="block">
                Sign in when it&rsquo;s worth keeping.
              </span>
            </h2>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="#compose"
                className="inline-flex items-center border border-poster-ink px-5 py-2.5 text-sm font-extrabold text-poster-ink transition-colors duration-150 hover:bg-poster-ink/10"
              >
                Start free — no card, ever
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {/* Prototype column structure (brand + link columns), real link set:
            pillars from PILLARS, product routes, legal from LEGAL. */}
        <footer className={`${WRAP} py-14`}>
          <div className="grid gap-7 text-sm leading-[26px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-2.5 flex items-center gap-2 font-extrabold text-ink">
                <IloMark size={12} className="text-accent" />
                ilolink
              </p>
              <p className="max-w-[32ch] text-ink-soft">
                A link for anything you publish, and a shared registry your
                team&rsquo;s agents read from.
              </p>
            </div>
            <div className="grid content-start gap-1">
              <p className="mb-1.5 text-[13px] uppercase tracking-[0.08em] text-ink-soft">
                Guides
              </p>
              {Object.values(PILLARS).map((p) => (
                <Link
                  key={p.path}
                  href={p.path}
                  className="text-ink transition-colors duration-150 hover:text-accent"
                >
                  {p.title}
                </Link>
              ))}
              <Link
                href="/guides"
                className="text-ink transition-colors duration-150 hover:text-accent"
              >
                All guides
              </Link>
            </div>
            <div className="grid content-start gap-1">
              <p className="mb-1.5 text-[13px] uppercase tracking-[0.08em] text-ink-soft">
                Product
              </p>
              <Link
                href="/publish"
                className="text-ink transition-colors duration-150 hover:text-accent"
              >
                Publish a document
              </Link>
              <Link
                href="/dashboard"
                className="text-ink transition-colors duration-150 hover:text-accent"
              >
                Your documents
              </Link>
              <Link
                href="/t"
                className="text-ink transition-colors duration-150 hover:text-accent"
              >
                Teamspaces &amp; registry
              </Link>
              <Link
                href="/mcp"
                className="text-ink transition-colors duration-150 hover:text-accent"
              >
                Connect to Claude, ChatGPT &amp; more
              </Link>
              <Link
                href="/trending"
                className="text-ink transition-colors duration-150 hover:text-accent"
              >
                Trending this week
              </Link>
              <Link
                href="#pricing"
                className="text-ink transition-colors duration-150 hover:text-accent"
              >
                Pricing
              </Link>
            </div>
            <div className="grid content-start gap-1">
              <p className="mb-1.5 text-[13px] uppercase tracking-[0.08em] text-ink-soft">
                Legal
              </p>
              {Object.values(LEGAL).map((l) => (
                <Link
                  key={l.path}
                  href={l.path}
                  className="text-ink transition-colors duration-150 hover:text-accent"
                >
                  {l.title}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
