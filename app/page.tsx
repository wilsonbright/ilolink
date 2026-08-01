// Home = the artifact registry pitch, then the composer.
//
// The page leads with the team registry because that is what the product is
// now: one place a team's skills, specs, plans and handoffs live, shared across
// every repo its agents work in. Publishing a document is still here — demoted
// to its own section, with the composer and every existing link intact, because
// ~60 marketing pages point at that story and orphaning them would cost the
// whole organic surface.
//
// HARD CONSTRAINT: this page is statically prerendered (`○ /` in the build
// output). Nothing here may read a session, a cookie, or a binding. Session
// awareness comes only from the <NavAuth/> client island.
import Link from "next/link";
import { PublishForm } from "@/app/(app)/publish/publish-form";
import { PILLARS, LEGAL } from "@/lib/seo/site";
import { NavAuth } from "@/app/nav-auth";
import { ARTIFACT_KINDS, KINDS } from "@/lib/artifacts/kinds";

// Safe to import into a static page: lib/artifacts/kinds is pure data with no
// imports of its own — no bindings, no D1, nothing server-only to drag in.

const VALUE = [
  {
    title: "Privacy-first analytics",
    body: "Views and read-through, counted without cookies, fingerprints, or personal profiles.",
  },
  {
    title: "Heatmaps",
    body: "See which parts people actually read, and where they stop.",
  },
  {
    title: "Quiet feedback",
    body: "Readers can react or leave a note without signing in. No account, no friction.",
  },
];

// The push/pull loop, in the order someone actually meets it.
const LOOP = [
  {
    title: "Connect an assistant once",
    body: "Add ilolink as an MCP connector in Claude, Grok, ChatGPT, or your coding agent. You approve it yourself and pick which teamspace it may write into — that choice is sealed into the connection, so an assistant can never quietly start writing somewhere else.",
  },
  {
    title: "Push from whatever repo you're in",
    body: "Ask your assistant to push the skill or spec you just wrote. The path implies the kind — a file under .claude/skills is a skill, one under docs/decisions is a decision — so nothing has to be classified by hand. Every write is a new version with an author and a changelog; the old one stays readable.",
  },
  {
    title: "Teammates pull the same set",
    body: "Anyone in the teamspace can list the registry and fetch an artifact by name from any repo, on any machine. What comes back carries a provenance line naming the teamspace, the author, the version and when it changed — so an agent reading team instructions knows whose instructions they are.",
  },
  {
    title: "Review before it becomes team policy",
    body: "A member's push lands as a proposal, not as live guidance. An admin approves or rejects it with a note, and only then does every other agent start reading it. Teams that don't want the ceremony turn review off per teamspace.",
  },
];

// Straight from lib/teamspace/permissions.ts. If the matrix changes there,
// this copy is wrong — it is the same three roles described once for humans.
const ROLES = [
  {
    role: "Owner",
    body: "Everything an admin can do, plus the teamspace itself: rename it, change anyone's role, mint other owners, delete it. Only an owner can promote someone to owner.",
  },
  {
    role: "Admin",
    body: "Invite and remove members, manage folders, and review proposals. An admin's own pushes publish immediately. An admin cannot remove an owner — otherwise 'admin' would be a quiet path to taking over the teamspace.",
  },
  {
    role: "Member",
    body: "Read everything, and write anything. Whether a write goes live or waits for review depends on the teamspace's setting, not on asking permission first.",
  },
];

export default function Home() {
  return (
    <>
      {/* Sticky bar: brand + nav + one unmissable primary action. */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <p className="text-sm font-medium tracking-wide text-accent">ilolink</p>
          <nav className="flex items-center gap-4 text-sm text-ink-soft sm:gap-5">
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

      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 pb-8">
        <div className="mt-10 sm:mt-14">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Artifact registry for teams building with agents
          </p>
          <h1 className="mt-3 max-w-[22ch] text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
            Your team&rsquo;s skills, specs and plans, in one registry every
            agent can read.
          </h1>
          <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
            Push a skill, spec, design doc, plan, workflow or session handoff
            from any repo over MCP. Every teammate&rsquo;s assistant pulls the
            same versioned copy, by name, wherever they&rsquo;re working. A
            member&rsquo;s push lands as a proposal until an admin approves it,
            so nothing becomes team policy by accident.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <Link
              href="/signin?next=%2Ft"
              className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Create a teamspace
            </Link>
            <Link
              href="/connect"
              className="text-ink-soft underline-offset-2 transition-colors duration-150 hover:text-accent hover:underline"
            >
              Connect an assistant →
            </Link>
          </div>
          <p className="mt-5 text-sm text-ink-faint">
            Just want to publish one document and see how it landed?{" "}
            <a
              href="#publish"
              className="underline underline-offset-2 transition-colors duration-150 hover:text-accent"
            >
              The composer is still here.
            </a>
          </p>
        </div>

        {/* ── The ten kinds ─────────────────────────────────────────────── */}
        <section id="kinds" className="mt-20 scroll-mt-20 border-t border-hairline pt-12">
          <h2 className="max-w-[26ch] text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Ten kinds of artifact, one closed set
          </h2>
          <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
            The list is fixed on purpose. If one project files a decision record
            under <span className="text-ink">decision</span> and another under{" "}
            <span className="text-ink">adr</span>, a name stops resolving to one
            thing for the whole team — and resolving to one thing is the entire
            point of a registry. Each kind names the directory a sync client
            projects it into, so pushing a file from a repo already implies what
            it is.
          </p>
          <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {ARTIFACT_KINDS.map((k) => {
              const info = KINDS[k];
              return (
                <li key={k}>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="text-sm font-medium text-ink">{info.label}</h3>
                    <code className="font-mono text-xs text-ink-faint">
                      {info.dir}
                    </code>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {info.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── The push/pull loop ────────────────────────────────────────── */}
        <section id="sync" className="mt-20 scroll-mt-20 border-t border-hairline pt-12">
          <h2 className="max-w-[26ch] text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Connect once. Push from any repo. Everyone pulls the same set.
          </h2>
          <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
            Nothing is copy-pasted between machines and nothing is checked into
            one repo hoping the others notice. The registry sits beside your
            repos, and your assistant reads and writes it over MCP.
          </p>
          <ol className="mt-8 space-y-7">
            {LOOP.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium text-ink">{step.title}</h3>
                  <p className="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 text-sm">
            <Link
              href="/connect"
              className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Connect an assistant →
            </Link>
          </div>
        </section>

        {/* ── Teamspaces and roles ──────────────────────────────────────── */}
        <section id="teamspaces" className="mt-20 scroll-mt-20 border-t border-hairline pt-12">
          <h2 className="max-w-[26ch] text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            A teamspace, and three roles
          </h2>
          <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
            A teamspace is the boundary: its artifacts, its members, its review
            setting. You can belong to several — one per company, client or
            side project — and an assistant is connected to exactly one of them
            at a time. To anyone who isn&rsquo;t a member, a teamspace
            doesn&rsquo;t exist: they get a 404, not a &ldquo;forbidden&rdquo;,
            so ids can&rsquo;t be probed for which orgs are real.
          </p>
          <dl className="mt-8 space-y-6">
            {ROLES.map((r) => (
              <div key={r.role}>
                <dt className="text-sm font-medium text-ink">{r.role}</dt>
                <dd className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
                  {r.body}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 max-w-[62ch] rounded-xl border border-hairline bg-accent-soft/40 p-5 text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">
              Why roles exist at all:
            </span>{" "}
            an artifact isn&rsquo;t a document someone might read — it&rsquo;s
            instructions another person&rsquo;s agent will read and act on. Every
            version keeps its author, its changelog and who approved it, so
            &ldquo;where did my agent get that idea&rdquo; always has an answer.
          </p>
        </section>

        {/* ── Publishing, demoted but intact ────────────────────────────── */}
        <section id="publish" className="mt-20 scroll-mt-20 border-t border-hairline pt-12">
          <h2 className="max-w-[28ch] text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            And still the fastest way to publish a document and see how it
            landed
          </h2>
          <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
            Paste Markdown or HTML, or drop a file — a PDF, a .docx, a
            spreadsheet, an image. You get a link anyone can open without
            signing in, plus cookieless analytics, heatmaps and quiet feedback
            on how it read.
          </p>
        </section>

        {/* The composer. `#compose` is kept as an anchor because marketing
            pages across the site link to it by name. */}
        <div id="compose" className="scroll-mt-20">
          <PublishForm />
        </div>

        <ul className="mt-20 grid gap-10 border-t border-hairline pt-12 sm:grid-cols-3 sm:gap-8">
          {VALUE.map((v) => (
            <li key={v.title}>
              <h2 className="text-sm font-medium text-ink">{v.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{v.body}</p>
            </li>
          ))}
        </ul>

        {/* Publishing straight from an AI chat — the same connector as the
            registry, so anyone who set one up already has the other. */}
        <section className="mt-16 rounded-2xl border border-hairline bg-accent-soft/40 p-8 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Same connector
          </p>
          <h2 className="mt-2 max-w-[24ch] text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            Publish straight from your AI chat
          </h2>
          <p className="mt-4 max-w-[56ch] text-ink-soft">
            Add ilolink as a connector in{" "}
            <span className="text-ink">Claude</span>,{" "}
            <span className="text-ink">Grok</span>,{" "}
            <span className="text-ink">ChatGPT</span>, or any MCP-compatible
            assistant. Then just say <em>&ldquo;publish this as an ilolink page&rdquo;</em> —
            you get a share link and a private analytics dashboard without leaving
            the chat. No copy-paste, no context switch.
          </p>
          <ul className="mt-6 grid gap-3 text-sm text-ink-soft sm:grid-cols-3">
            <li className="rounded-lg border border-hairline bg-surface px-4 py-3">
              <span className="font-medium text-ink">Claude</span>
              <br />
              One-click — add connector, Authorize.
            </li>
            <li className="rounded-lg border border-hairline bg-surface px-4 py-3">
              <span className="font-medium text-ink">Grok</span>
              <br />
              Skills &amp; Connectors → add the URL.
            </li>
            <li className="rounded-lg border border-hairline bg-surface px-4 py-3">
              <span className="font-medium text-ink">ChatGPT</span>
              <br />
              Developer Mode → mint a workspace.
            </li>
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              href="/connect"
              className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 font-medium text-canvas transition-opacity duration-150 hover:opacity-90"
            >
              Connect an assistant →
            </Link>
            <Link
              href="/guides/share-ai-output"
              className="text-ink-soft underline-offset-2 transition-colors duration-150 hover:text-accent hover:underline"
            >
              First time? See how publishing works →
            </Link>
          </div>
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
                    href="/t"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Teamspaces &amp; artifacts
                  </Link>
                </li>
                <li>
                  <Link
                    href="/publish"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Publish a doc
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
                    href="/connect"
                    className="text-ink-soft transition-colors duration-150 hover:text-accent"
                  >
                    Connect to Claude, Grok &amp; more
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
            One registry your whole team&rsquo;s agents read from. And a link for
            anything you publish.
          </p>
        </footer>
      </main>
    </>
  );
}
