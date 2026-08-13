// Shared rendering for /trending and /trending/[week] — one server component
// so the live page and the frozen archive can never drift apart. No client JS:
// category "tabs" are server-rendered sections with anchor links, which keeps
// every week a static, indexable document.

import Link from "next/link";
import {
  Article,
  Breadcrumbs,
  Callout,
  PageHeader,
  Prose,
  RelatedLinks,
} from "../../_components/content";
import { KINDS, type Card, type Kind, type WeekSnapshot } from "@/lib/trending/types";

// Section headings / tag labels per kind, in KINDS display order.
const KIND_LABELS: Record<Kind, string> = {
  skill: "Skills",
  "mcp-server": "MCP servers",
  agent: "Agents",
  framework: "Frameworks",
  spec: "Specs",
  workflow: "Workflows",
  eval: "Evals",
  runbook: "Runbooks",
};

// Singular form for the tag on a card ("MCP server", not "MCP servers").
const KIND_TAGS: Record<Kind, string> = {
  skill: "Skill",
  "mcp-server": "MCP server",
  agent: "Agent",
  framework: "Framework",
  spec: "Spec",
  workflow: "Workflow",
  eval: "Eval",
  runbook: "Runbook",
};

// "2026-08-10" → "August 10, 2026". Weeks are ISO Mondays; pin UTC so the
// label never slips a day in whatever timezone the worker renders in.
export function formatWeek(week: string): string {
  return new Date(`${week}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function kindsPresent(snapshot: WeekSnapshot): Kind[] {
  return KINDS.filter((k) => (snapshot.kinds[k] ?? []).length > 0);
}

// Hero picks: each kind's rank-1 card, top 3 by star velocity. Scores are NOT
// comparable across kinds — the worker publishes z-scores only when a kind has
// enough qualifiers and falls back to ln(raw+1) below that, and the two scales
// differ by an order of magnitude — so the hero compares category winners on
// the one scale every card shares: absolute stars gained this week.
function breakouts(snapshot: WeekSnapshot): Card[] {
  return KINDS.flatMap((k) => (snapshot.kinds[k] ?? []).slice(0, 1))
    .sort((a, b) => b.starVel - a.starVel)
    .slice(0, 3);
}

function TrendCard({ card }: { card: Card }) {
  return (
    <article className="border-2 border-divider p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-extrabold text-ink">
          {/* External link on purpose — every card credits its repo by
              linking straight to it. */}
          <a
            href={card.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-150 hover:text-accent"
          >
            {card.name}
          </a>
        </h3>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">
          {KIND_TAGS[card.kind]}
        </span>
        {card.isNew && (
          <span className="bg-accent px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-canvas">
            New
          </span>
        )}
      </div>
      {/* The repo's own description — attributed by the link above, never
          README content. */}
      {card.description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {card.description}
        </p>
      )}
      <p className="mt-3 text-sm tabular-nums text-ink">
        &uarr; {card.starVel.toLocaleString("en-US")} stars this week (
        {card.starGrowth.toFixed(1)}&times;)
      </p>
      {card.corroboration.length > 0 && (
        <p className="mt-1 text-sm text-ink-faint">
          Listed on {card.corroboration.join(" · ")}
        </p>
      )}
    </article>
  );
}

// Week selector: plain links, newest first. The newest week lives at
// /trending (its canonical home); older weeks at /trending/{week}.
function WeekSelector({
  weeks,
  activeWeek,
}: {
  weeks: string[];
  activeWeek: string;
}) {
  return (
    <section className="mt-14 border-t-2 border-divider pt-10">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">
        Weekly archive
      </h2>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {weeks.map((w, i) => (
          <li key={w}>
            {w === activeWeek ? (
              <span className="font-extrabold text-accent-strong">
                {formatWeek(w)}
              </span>
            ) : (
              <Link
                href={i === 0 ? "/trending" : `/trending/${w}`}
                className="text-ink-soft transition-colors duration-150 hover:text-accent"
              >
                {formatWeek(w)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// A published week. `archive` switches the header copy: the live page speaks
// in the present tense, a frozen week names its date.
export function SnapshotView({
  snapshot,
  weeks,
  archive,
}: {
  snapshot: WeekSnapshot;
  weeks: string[];
  archive: boolean;
}) {
  const present = kindsPresent(snapshot);
  const top = breakouts(snapshot);
  return (
    <Article>
      <Breadcrumbs
        crumbs={
          archive
            ? [
                { name: "Home", path: "/" },
                { name: "Trending", path: "/trending" },
                {
                  name: formatWeek(snapshot.week),
                  path: `/trending/${snapshot.week}`,
                },
              ]
            : [
                { name: "Home", path: "/" },
                { name: "Trending", path: "/trending" },
              ]
        }
      />
      <PageHeader
        eyebrow={
          archive
            ? `Archive — week of ${formatWeek(snapshot.week)}`
            : `Week of ${formatWeek(snapshot.week)}`
        }
        title="Trending in agent work"
        lead={
          archive ? (
            <>
              A frozen snapshot of the skills, MCP servers, agents, and
              frameworks that broke out in the week of{" "}
              {formatWeek(snapshot.week)} — ranked by star velocity on GitHub
              and corroborated by the curated lists that added them.
            </>
          ) : (
            <>
              The skills, MCP servers, agents, and frameworks that broke out
              this week — ranked by star velocity on GitHub, corroborated by
              the curated lists that added them, and hand-approved before
              publishing. A new snapshot lands every Monday.
            </>
          )
        }
      />

      <section>
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-accent-strong">
          Breakouts of the week
        </h2>
        <div className="mt-4 grid gap-4">
          {top.map((c) => (
            <TrendCard key={c.id} card={c} />
          ))}
        </div>
      </section>

      {/* Anchor nav instead of client tabs: the whole week stays one
          indexable document. */}
      <nav
        aria-label="Categories"
        className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t-2 border-divider pt-6 text-sm"
      >
        {present.map((k) => (
          <a
            key={k}
            href={`#${k}`}
            className="text-ink-soft transition-colors duration-150 hover:text-accent"
          >
            {KIND_LABELS[k]}
          </a>
        ))}
      </nav>

      {present.map((k) => (
        <section key={k} id={k} className="mt-14 scroll-mt-6">
          <h2 className="text-2xl font-extrabold text-ink">{KIND_LABELS[k]}</h2>
          <div className="mt-5 grid gap-4">
            {(snapshot.kinds[k] ?? []).map((c) => (
              <TrendCard key={c.id} card={c} />
            ))}
          </div>
        </section>
      ))}

      <WeekSelector weeks={weeks} activeWeek={snapshot.week} />
      <TrendingRelated />
    </Article>
  );
}

// Day-one state: the page ships before the first snapshot is approved, so this
// is literally what production shows on launch — it carries the pitch, not an
// apology.
export function TrendingEmpty() {
  return (
    <Article>
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Trending", path: "/trending" },
        ]}
      />
      <PageHeader
        eyebrow="This week in agent work"
        title="Trending in agent work"
        lead={
          <>
            A weekly snapshot of the skills, MCP servers, agents, and
            frameworks breaking out across GitHub — ranked by star velocity,
            corroborated by the curated lists that track them, and
            hand-approved before publishing. The first weekly snapshot lands
            Monday.
          </>
        }
      />
      <Prose>
        <p>
          Exhaustive directories already exist — tens of thousands of MCP
          servers and skills, indexed. What they don&rsquo;t tell you is what
          moved <em>this week</em>. Every Monday this page ranks the
          week&rsquo;s movers per category: top skills, MCP servers, agents,
          and frameworks, each with its star velocity and the lists that
          corroborate it. Every card links to the repo it describes, and past
          weeks stay up as a frozen archive.
        </p>
      </Prose>
      <Callout title="How the ranking works">
        Absolute star gain times smoothed week-over-week growth, so a card has
        to be both moving and accelerating — velocity alone favors giants,
        growth alone favors ten-star noise. Landing in a curated awesome-list
        the same week counts as corroboration. Nothing publishes without a
        human approving the week.
      </Callout>
      <TrendingRelated />
    </Article>
  );
}

// Shared "keep reading" cluster — same links whether the week is empty, live,
// or archived, so the trend layer always points back at the product.
function TrendingRelated() {
  return (
    <RelatedLinks
      links={[
        {
          path: "/mcp",
          title: "MCP connector for Claude, Claude Code & ChatGPT",
          blurb:
            "Add ilolink as a connector and let your assistant read the team's shared skills, specs and runbooks.",
        },
        {
          path: "/guides/share-ai-output",
          title: "Share anything an AI made, as a real link",
          blurb:
            "The full loop for turning AI output into a page anyone can open — then seeing how it read.",
        },
      ]}
    />
  );
}
