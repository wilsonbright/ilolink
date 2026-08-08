// Home.
//
// Two products, one page, in the order people actually arrive: publish a
// document and see how it was read, then the team registry that keeps what
// your agents write.
//
// The previous version led with the registry and demoted publishing to one
// ~60-word section under a heading that began "And still" — five sections down,
// with the word "PDF" appearing exactly once on the page. Wrong twice over:
// ~60 marketing pages send publish-intent traffic here, and hosting is what
// most first-time visitors can actually use today.
//
// TRUTHFULNESS RULES FOR THIS FILE — the previous version broke two of them:
//  - File uploads are .md, .html, .pdf and .docx ONLY. JSON, CSV and images are
//    pasted as text or a data URL. The old copy promised "drop a file — a PDF,
//    a .docx, a spreadsheet, an image"; half of that was false.
//  - A PDF is served inside an iframe, so read-depth and heatmaps cannot see
//    into it. Say so plainly instead of implying otherwise.
//  - Publishing needs an account; reading never does. Do not revive the old
//    "no account needed" line — it is now true only of readers.
//
// HARD CONSTRAINT: this page is statically prerendered (`○ /` in the build
// output). Nothing here may read a session, a cookie, or a binding. Session
// awareness comes only from the <NavAuth/> client island.
import Link from "next/link";
import { PublishForm } from "@/app/(app)/publish/publish-form";
import { PILLARS, LEGAL } from "@/lib/seo/site";
import { NavAuth } from "@/app/nav-auth";
import { ARTIFACT_KINDS, KINDS } from "@/lib/artifacts/kinds";
import { PLANS, formatPrice } from "@/lib/billing/plans";

// Safe to import into a static page: lib/artifacts/kinds is pure data with no
// imports of its own — no bindings, no D1, nothing server-only to drag in.
// lib/billing/plans is pure for the same reason — see the header comment there.

// What each format becomes. Checked against lib/publish/formats.ts and
// app/api/publish/route.ts, not written from memory.
const FORMATS = [
  {
    name: "Markdown",
    how: "Paste or upload",
    body: "Becomes a reading page — headings, code, tables, set in type meant to be read.",
  },
  {
    name: "HTML",
    how: "Paste or upload",
    body: "Served the way you wrote it: your CSS, your layout. Cleaned on the way in. A page that needs its own scripts can be opted in one document at a time, and then runs sandboxed.",
  },
  {
    name: "PDF",
    how: "Upload, to 15 MB",
    body: "Stored and served as the actual file, in the browser's own viewer. Nothing is converted, nothing re-rendered.",
  },
  {
    name: ".docx",
    how: "Upload",
    body: "Converted to a web page, so a reviewer opens a tab instead of downloading a file and needing Word.",
  },
  {
    name: "JSON & CSV",
    how: "Paste",
    body: "Rendered as a readable page, so a data dump becomes something you can send someone.",
  },
  {
    name: "Images",
    how: "Paste as a data URL",
    body: "Published as a page with its own link and the same analytics as anything else.",
  },
];

const REVIEW = [
  {
    title: "Publish the draft",
    body: "A PDF stays a PDF. A .docx becomes a web page. A Markdown spec becomes a reading page. You get one link.",
  },
  {
    title: "Decide how open it is",
    body: "Public, unlisted, password-protected, or expiring on a date. Unlisted for reviewers you emailed; expiring for a pre-read that shouldn't outlive the meeting.",
  },
  {
    title: "Send it",
    body: "Reviewers open it in a browser — no account, no attachment, no request-access round trip. That holds for the PDF too.",
  },
  {
    title: "They mark it up in place",
    body: "A reader selects a passage and comments on it, and the note sits against that text; others reply underneath. Or they react — 👍, 🤔, 👀 — or leave a note only you read.",
  },
  {
    title: "You see what actually happened",
    body: "How many opened it, how far they got, how long they stayed, where they came from, and where on the page they clicked and stopped.",
  },
];

const USE_CASES = [
  {
    who: "Consultant sending a proposal",
    body: "Send the PDF as a link instead of a 12 MB attachment. See whether the client opened it at all.",
  },
  {
    who: "PM circulating a spec",
    body: "Publish unlisted, collect comments anchored to the exact paragraph people are arguing about, and revise in place — the link never changes.",
  },
  {
    who: "Researcher running peer review",
    body: "Share the paper as a password-protected PDF. Reviewers leave margin notes and reactions without ever making an account.",
  },
  {
    who: "Designer sharing a rationale doc",
    body: "Publish the .docx as a web page so nobody needs Word, then read the heatmap to see which section people went back to.",
  },
  {
    who: "Founder sending an investor update",
    body: "One expiring link. Views, read depth, and who came back a second time — with no tracking pixel and no cookie banner.",
  },
  {
    who: "Engineer with a house style",
    body: "Push commit conventions to the registry once. Every teammate's assistant reads the same rules in every repo, instead of each person re-explaining them in chat.",
  },
  {
    who: "Team lead standardising agents",
    body: "Keep agent definitions and runbooks in one place with versions and authors, so how an agent behaves is something the team reviewed, not something one person set.",
  },
  {
    who: "Anyone finishing a long session",
    body: "Save the handoff as a session transfer. The next person — or the next model — picks up what was decided and what is still open, instead of re-deriving it.",
  },
];

const LOOP = [
  {
    title: "Connect an assistant once",
    body: "Add ilolink as an MCP connector in Claude, ChatGPT, or your coding agent. You approve it and pick which teamspace it may write into — that choice is fixed for the life of the connection, so an assistant can never quietly start writing somewhere else.",
  },
  {
    title: "Push from whatever repo you're in",
    body: "Ask your assistant to push the skill or spec you just wrote. The file's path implies what it is — something under .claude/skills is a skill, something under docs/decisions is a decision — so nothing gets classified by hand. Every write is a new version with an author and a note.",
  },
  {
    title: "Teammates pull the same set",
    body: "Anyone on the team fetches it by name, from any repo, on any machine. What comes back names the author, the version and the date, so an agent acting on team instructions can say whose instructions they are.",
  },
  {
    title: "Review before it becomes policy",
    body: "A member's push arrives as a proposal — written down and visible, but not yet what anyone's agent reads. An admin approves or rejects it. Teams who don't want the step turn it off.",
  },
];

// Straight from lib/teamspace/permissions.ts. If the matrix changes there, this
// copy is wrong — it is the same three roles described once, for humans.
const ROLES = [
  {
    role: "Owner",
    body: "Everything an admin can do, plus the teamspace itself: rename it, change anyone's role, delete it. Only an owner can make another owner.",
  },
  {
    role: "Admin",
    body: "Invite and remove people, organise the registry, approve proposals. An admin's own writes go live immediately.",
  },
  {
    role: "Member",
    body: "Publish documents and write to the registry. Registry writes wait for an admin, unless the team has turned review off.",
  },
];

const ANALYTICS = [
  [
    "Views and unique readers",
    "Counted without cookies or fingerprints, so there is nothing to put in a consent banner.",
  ],
  [
    "How far people got",
    "The share of readers who reached a quarter, half, three quarters, and the end.",
  ],
  [
    "Where they came from",
    "Referring sites, countries and device types, plus time on the page day by day.",
  ],
  [
    "Heatmaps",
    "Where readers clicked and where they stopped, drawn over the document at phone, tablet and desktop widths.",
  ],
  [
    "Reactions and private notes",
    "Readers tap 👍, 🤔 or 👀, or leave a note only you see. No account either way.",
  ],
  [
    "Comments",
    "Anchored to the passage being discussed, with replies. Anonymous by default; you can require a name, or turn them off.",
  ],
];

const ACCESS = [
  ["Public", "Anyone with the link."],
  ["Unlisted", "Only the people you send it to."],
  ["Password", "Opens with a password you set and send another way."],
  ["Expiring", "Stops working on a date you choose."],
];

// The three tiers, in order. Every number on the pricing card — price, seats,
// documents, feature bullets — comes out of lib/billing/plans.ts, which is the
// same file the Checkout line item and the server-side limit checks read. No
// figure is retyped here, so this copy cannot drift away from what is enforced.
const PRICING = [PLANS.free, PLANS.team5, PLANS.team10];

export default function Home() {
  return (
    <>
      {/* Sticky bar: brand + nav + one unmissable primary action. */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <p className="text-sm font-medium tracking-wide text-accent">ilolink</p>
          <nav className="flex items-center gap-4 text-sm text-ink-soft sm:gap-5">
            <Link
              href="#registry"
              className="hidden transition-colors duration-150 hover:text-ink sm:inline"
            >
              For teams
            </Link>
            <Link
              href="#pricing"
              className="transition-colors duration-150 hover:text-ink"
            >
              Pricing
            </Link>
            <Link
              href="/connect"
              className="transition-colors duration-150 hover:text-ink"
            >
              Connect
            </Link>
            <Link
              href="/guides"
              className="hidden transition-colors duration-150 hover:text-ink sm:inline"
            >
              Guides
            </Link>
            <span className="hidden sm:inline">
              <NavAuth />
            </span>
            {/* Signed out this lands on sign-in and returns to /t; signed in
                /signin redirects straight through. One href, both states — no
                session lookup on a static page. */}
            <Link
              href="/signin?next=%2Ft"
              className="inline-flex items-center rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center rounded-md border border-hairline px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-accent hover:text-accent sm:hidden"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-8">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="mt-10 sm:mt-14">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            One link for a document. One registry for your agents.
          </p>
          <h1 className="mt-3 max-w-[20ch] text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
            Put a document online, and find out what happened to it.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            Paste Markdown or HTML, or upload a PDF or a .docx. You get a link
            anyone can open without signing in — and a private page showing how
            many people read it, how far they got, and what they wrote back.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The same account keeps your team&rsquo;s skills, specs, plans and
            handoffs in one registry every teammate&rsquo;s assistant can read,
            so what your AI produces stops dying in one person&rsquo;s chat
            window.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="#compose"
              className="rounded-lg bg-accent px-5 py-3 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Publish something now
            </Link>
            <Link
              href="#registry"
              className="text-accent transition-colors duration-150 hover:text-ink"
            >
              I&rsquo;m here for the team registry &rarr;
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-faint">
            Publishing needs an account. Reading never does.
          </p>
        </div>

        {/* ── Composer ──────────────────────────────────────────────────── */}
        {/* `#compose` is kept as an anchor because marketing pages across the
            site link to it by name. */}
        <section id="compose" className="mt-14 scroll-mt-20">
          <h2 className="text-2xl font-semibold leading-tight text-ink">
            Paste it, or drop a file in
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Markdown, HTML, JSON, CSV or plain text goes straight in the box.
            For a PDF or a .docx, drop the file anywhere in it.
          </p>
          <div className="mt-6">
            <PublishForm />
          </div>
          <p className="mt-4 text-sm text-ink-faint">
            Write first and make an account at the end — your draft stays
            exactly where it is while you sign in.
          </p>
        </section>

        {/* ── What comes back ───────────────────────────────────────────── */}
        <section
          id="analytics"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            What comes back with the link
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            One URL to send, and a page only you can see.
          </p>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2">
            {ANALYTICS.map(([title, body]) => (
              <li key={title}>
                <h3 className="font-medium text-ink">{title}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{body}</p>
              </li>
            ))}
          </ul>
          {/* Stated rather than glossed: a PDF renders inside an iframe, so the
              page-level tracker genuinely cannot see scrolling within it. */}
          <p className="mt-8 text-sm leading-relaxed text-ink-faint">
            One honest limit: a PDF opens in the browser&rsquo;s own viewer
            inside the page, so read-depth and heatmaps can&rsquo;t see into it.
            You still get views, sources, reactions and comments on a PDF —
            read-depth and heatmaps apply to Markdown, HTML and .docx pages.
          </p>
        </section>

        {/* ── Formats ───────────────────────────────────────────────────── */}
        <section
          id="formats"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            What you can publish, and what each one becomes
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The format decides how the page is served. You don&rsquo;t configure
            anything.
          </p>
          <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {FORMATS.map((f) => (
              <li key={f.name}>
                <h3 className="font-medium text-ink">{f.name}</h3>
                <p className="text-sm text-ink-faint">{f.how}</p>
                <p className="mt-1 leading-relaxed text-ink-soft">{f.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-ink-faint">
            File uploads are .md, .html, .pdf and .docx. Everything else goes in
            as text you paste.
          </p>
        </section>

        {/* ── Access ────────────────────────────────────────────────────── */}
        <section
          id="access"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Decide who can open it
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {ACCESS.map(([t, b]) => (
              <li key={t}>
                <h3 className="font-medium text-ink">{t}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{b}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 leading-relaxed text-ink-soft">
            Readers never make an account to read — not for a public document,
            not for a password-protected one. The only time a reader signs in is
            if you&rsquo;ve asked for named comments and they want to leave one.
          </p>
        </section>

        {/* ── Peer review ───────────────────────────────────────────────── */}
        <section
          id="review"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Send a draft out for review, and see what came back
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The document, the readers&rsquo; marks on it, and the record of who
            got how far — in one link.
          </p>
          <ol className="mt-8 space-y-6">
            {REVIEW.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="mt-1 shrink-0 text-sm tabular-nums text-ink-faint">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium text-ink">{s.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 leading-relaxed text-ink-soft">
            Revise in place and the link stays the same, with the previous
            version kept. Nobody ends up reading the wrong file.
          </p>
        </section>

        {/* ── Use cases ─────────────────────────────────────────────────── */}
        <section
          id="use-cases"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            What people use it for
          </h2>
          <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <li key={u.who}>
                <h3 className="font-medium text-ink">{u.who}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{u.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── The registry ──────────────────────────────────────────────── */}
        <section
          id="registry"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            For teams building with agents
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Everything your AI writes, kept where the whole team&rsquo;s agents
            can read it
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            A skill, a spec, a plan, a runbook, the handoff at the end of a long
            session — most of it is written once, in one person&rsquo;s chat, and
            then lost. The registry is a shared home for that work: one name
            means one thing for everyone, every change keeps its author and
            version, and any assistant your team connects can read and write it
            from any repo.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2">
            {LOOP.map((s, i) => (
              <li key={s.title}>
                <p className="text-sm tabular-nums text-ink-faint">{i + 1}</p>
                <h3 className="mt-1 font-medium text-ink">{s.title}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Kinds ─────────────────────────────────────────────────────── */}
        <section
          id="kinds"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Ten kinds, one fixed list
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The list is fixed on purpose. If one project files a decision record
            under <span className="font-mono text-ink">decision</span> and
            another under <span className="font-mono text-ink">adr</span>, a name
            stops meaning one thing across the team — and that is the whole
            point. Each kind also names the folder it belongs in, so pushing a
            file from a repo already says what it is.
          </p>
          <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {ARTIFACT_KINDS.map((k) => {
              const info = KINDS[k];
              return (
                <li key={k}>
                  <h3 className="text-sm font-medium text-ink">{info.label}</h3>
                  <p className="font-mono text-xs text-ink-faint">{info.dir}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {info.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Teamspaces & roles ────────────────────────────────────────── */}
        <section
          id="teamspaces"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            A teamspace, and three roles
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            A teamspace holds a team&rsquo;s documents, its registry and its
            people. You can be in several — one for your own work, one per
            organisation — and they never see each other.
          </p>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            {ROLES.map((r) => (
              <li key={r.role}>
                <h3 className="font-medium text-ink">{r.role}</h3>
                <p className="mt-1 leading-relaxed text-ink-soft">{r.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 leading-relaxed text-ink-soft">
            Roles exist because a registry entry isn&rsquo;t a document someone
            might read — it&rsquo;s an instruction another person&rsquo;s
            assistant will act on. Review is what stops one person&rsquo;s
            half-considered rule quietly becoming how everyone&rsquo;s agent
            behaves.
          </p>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section
          id="pricing"
          className="mt-20 scroll-mt-20 border-t border-hairline pt-12"
        >
          <h2 className="text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Pay once, or don&rsquo;t pay at all
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            A team plan is a one-time payment, not a subscription. You pay for
            the team size once and keep it: nothing recurs, nothing expires,
            and there is no card kept on file. Working on your own is free.
            What you pay for is bringing other people in.
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            {PRICING.map((plan) => (
              <li
                key={plan.id}
                className="flex flex-col rounded-xl border border-hairline p-6"
              >
                <h3 className="font-medium text-ink">{plan.label}</h3>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold text-ink">
                    {formatPrice(plan.priceCents)}
                  </span>
                  {plan.priceCents > 0 && (
                    <span className="text-sm text-ink-faint">
                      one-time, paid once
                    </span>
                  )}
                </p>
                <p className="mt-3 leading-relaxed text-ink-soft">
                  {plan.blurb}
                </p>
                {/* No seats/documents summary line here on purpose: the first
                    two feature bullets in lib/billing/plans.ts already state
                    both numbers, and printing them twice read as padding. */}
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-soft">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-8 leading-relaxed text-ink-soft">
            Personal is one person: you. Inviting anybody — a teammate, a
            co-founder, one reviewer who needs to write to the registry — takes
            a team plan. That is the only thing the payment unlocks, and you
            make it once.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            Uploads are capped at 15 MB per document on every plan. Publishing
            needs an account; reading never does.
          </p>
          <Link
            href="/signin?next=%2Ft"
            className="mt-6 inline-block rounded-lg bg-accent px-5 py-3 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
          >
            Start free
          </Link>
        </section>

        {/* ── Connector ─────────────────────────────────────────────────── */}
        <section
          id="connect"
          className="mt-20 scroll-mt-20 rounded-2xl border border-hairline bg-accent-soft/40 p-8 sm:p-10"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            One connector, both halves
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Publish and push straight from your AI chat
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Add ilolink as a connector in Claude, ChatGPT, or any MCP-compatible
            assistant. Then say &ldquo;publish this as an ilolink page&rdquo; and
            get a link back, or &ldquo;save this as a team skill&rdquo; and it
            goes to the registry. Same connection, no copy-paste.
          </p>
          <Link
            href="/connect"
            className="mt-6 inline-block rounded-lg bg-accent px-5 py-3 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
          >
            Connect an assistant
          </Link>
        </section>

        <footer className="mt-24 border-t border-hairline pt-12">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-ink">Guides</p>
              <ul className="mt-3 space-y-2 text-sm">
                {Object.values(PILLARS).map((p) => (
                  <li key={p.path}>
                    <Link
                      href={p.path}
                      className="text-ink-soft transition-colors duration-150 hover:text-accent"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/publish"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Publish a document
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Your documents
                  </Link>
                </li>
                <li>
                  <Link
                    href="/t"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Teamspaces &amp; registry
                  </Link>
                </li>
                <li>
                  <Link
                    href="/connect"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Connect to Claude, ChatGPT &amp; more
                  </Link>
                </li>
                <li>
                  <Link
                    href="/guides"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    All guides
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Legal</p>
              <ul className="mt-3 space-y-2 text-sm">
                {Object.values(LEGAL).map((l) => (
                  <li key={l.path}>
                    <Link
                      href={l.path}
                      className="text-ink-soft transition-colors duration-150 hover:text-accent"
                    >
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-10 text-sm text-ink-faint">
            A link for anything you publish, and a shared registry your
            team&rsquo;s agents read from.
          </p>
        </footer>
      </main>
    </>
  );
}
