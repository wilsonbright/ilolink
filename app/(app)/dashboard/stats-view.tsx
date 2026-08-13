"use client";

// ─────────────────────────────────────────────────────────────────────────
// StatsView — the private analytics + moderation surface for one doc.
//
// Three quiet data sources, each degrading to silence on failure:
//   • /api/stats            (app origin)  — aggregate Stats from Analytics Engine
//   • view.ilolink.com/_feedback (view)   — reaction tallies + reader notes
//   • view.ilolink.com/_comments (view)   — visible comments to moderate
// Moderation writes back through the app origin: /api/comments/moderate.
//
// The manage token is the LEGACY proof of ownership (pre-accounts docs only);
// current docs authorize by session. It is passed in from
// the dashboard (which read it from the publisher's localStorage) and never
// rendered. The client only knows slug + token, so /api/stats doubles as the
// slug→doc-id bridge: it returns the (non-secret) doc id, which then keys the
// view-origin /_feedback and /_comments reads.
// One accent, few borders, calm empty/error states. No external deps.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Stats } from "@/lib/analytics/query";
import { TAG_OUTLINE } from "@/lib/ui/tags";

// /api/stats returns Stats plus the doc id (slug→id bridge) and the exact
// Durable-Object view count (preferred over the sampled AE `views` when present).
type StatsData = Stats & { doc: string; exactViews?: number | null };

const VIEW_ORIGIN = "https://view.ilolink.com";
const REACTIONS = ["👍", "🤔", "👀"] as const;
const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;

interface FeedbackData {
  reactions: Record<string, number>;
  notes: { value: string; created_at: number }[];
}

interface CommentRow {
  id: string;
  parent_id: string | null;
  author_name: string | null;
  body: string;
  created_at: number;
  // Present only when the comment was anchored to a selection; the quoted text
  // gives moderation context. May be absent from the payload entirely.
  anchor?: { quote?: string } | null;
}

type Load<T> =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; data: T };

function formatDate(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(ms);
}

// Compact number for tiles: 1.2k, 34, 0.
function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function formatDuration(s: number): string {
  if (!s || s < 1) return "0s";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

export function StatsView({ slug, token }: { slug: string; token: string }) {
  const [stats, setStats] = useState<Load<StatsData>>({ state: "loading" });
  const [feedback, setFeedback] = useState<Load<FeedbackData>>({
    state: "loading",
  });
  const [comments, setComments] = useState<Load<CommentRow[]>>({
    state: "loading",
  });
  // commentId -> the action that was applied, so we can dim + label it.
  const [moderated, setModerated] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ slug, token }).toString();

    fetch(`/api/stats?${q}`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<StatsData>)
          : Promise.reject(),
      )
      .then((data) => {
        if (!alive) return;
        setStats({ state: "ready", data });
        // The doc id comes back from our own origin; the view-origin feedback
        // and comments endpoints key by it.
        const doc = encodeURIComponent(data.doc);

        // Reactions + private notes come token-gated from our own origin — the
        // public content-origin /_feedback returns reaction tallies only.
        fetch(`/api/feedback?${q}`)
          .then((r) =>
            r.ok ? (r.json() as Promise<FeedbackData>) : Promise.reject(),
          )
          .then((f) => alive && setFeedback({ state: "ready", data: f }))
          .catch(() => alive && setFeedback({ state: "error" }));

        fetch(`${VIEW_ORIGIN}/_comments?doc=${doc}`)
          .then((r) =>
            r.ok
              ? (r.json() as Promise<{ comments: CommentRow[] }>)
              : Promise.reject(),
          )
          .then(
            (c) => alive && setComments({ state: "ready", data: c.comments ?? [] }),
          )
          .catch(() => alive && setComments({ state: "error" }));
      })
      .catch(() => {
        if (!alive) return;
        setStats({ state: "error" });
        setFeedback({ state: "error" });
        setComments({ state: "error" });
      });

    return () => {
      alive = false;
    };
  }, [slug, token]);

  const moderate = useCallback(
    async (commentId: string, action: "hide" | "flag") => {
      // Optimistic: mark immediately, revert on failure.
      setModerated((m) => ({ ...m, [commentId]: action }));
      try {
        const res = await fetch("/api/comments/moderate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, commentId, action, token }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setModerated((m) => {
          const next = { ...m };
          delete next[commentId];
          return next;
        });
      }
    },
    [slug, token],
  );

  return (
    <div className="space-y-12">
      <Tiles stats={stats} />
      <ScrollFunnel stats={stats} />
      <Breakdowns stats={stats} />
      <DailySparkline stats={stats} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(24px,3vw,42px)]">
        <Reactions feedback={feedback} />
        <Notes feedback={feedback} />
        <Moderation
          comments={comments}
          moderated={moderated}
          onModerate={moderate}
        />
      </div>
    </div>
  );
}

// ── Section scaffolding ──────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2.5 text-[13px] uppercase tracking-[0.08em] text-ink">
        {title}
      </h2>
      <div className="border-t-2 border-divider pt-3.5">{children}</div>
    </section>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-faint">{children}</p>;
}

// ── Top-line tiles ───────────────────────────────────────────────────────

function Tiles({ stats }: { stats: Load<StatsData> }) {
  const tiles = useMemo(() => {
    if (stats.state !== "ready") {
      return [
        { label: "Views", value: "—" },
        { label: "Unique readers", value: "—" },
        { label: "Avg. time", value: "—" },
      ];
    }
    return [
      {
        label: "Views",
        value: compact(stats.data.exactViews ?? stats.data.views),
      },
      { label: "Unique readers", value: compact(stats.data.uniques) },
      { label: "Avg. time", value: formatDuration(stats.data.avgTimeS) },
    ];
  }, [stats]);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-5">
      {tiles.map((t) => (
        <div key={t.label} className="border-2 border-divider p-5">
          <div className="text-[36px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {stats.state === "error" ? "—" : t.value}
          </div>
          <div className="mt-2.5 text-[12px] uppercase tracking-[0.08em] text-ink-faint">
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Read-through funnel ──────────────────────────────────────────────────
// AE returns discrete 25%-buckets; a reader in the 75 bucket also cleared 25
// and 50, so each threshold's count is the sum of its bucket and every deeper
// one. That makes an honest descending funnel. Shares are relative to the
// 25%-depth base; exact reader counts ride on each row's title and the
// caption names the base.

const FUNNEL_LABEL: Record<number, string> = {
  25: "Quarter",
  50: "Halfway",
  75: "Three quarters",
  100: "Finished",
};

function ScrollFunnel({ stats }: { stats: Load<Stats> }) {
  const rows = useMemo(() => {
    if (stats.state !== "ready") return null;
    const byPct = new Map(stats.data.scroll.map((s) => [s.pct, s.n]));
    const atLeast = (t: number) => {
      let sum = 0;
      for (const [pct, n] of byPct) if (pct >= t) sum += n;
      return sum;
    };
    const base = atLeast(SCROLL_THRESHOLDS[0]) || 0;
    return SCROLL_THRESHOLDS.map((t) => {
      const n = atLeast(t);
      return { t, n, frac: base > 0 ? n / base : 0 };
    });
  }, [stats]);

  return (
    <Section title="Read-through">
      {stats.state === "error" ? (
        <Quiet>Couldn’t load scroll data.</Quiet>
      ) : !rows || rows[0].n === 0 ? (
        <Quiet>No scroll data yet.</Quiet>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div
              key={r.t}
              title={`${r.n} readers reached ${r.t}%`}
              className="grid grid-cols-[120px_1fr_44px] items-center gap-3"
            >
              <span className="text-[13px] uppercase tracking-[0.06em] text-ink-faint">
                {FUNNEL_LABEL[r.t]}
              </span>
              <div className="h-3.5 bg-surface">
                <div
                  className="h-3.5 bg-accent transition-[width] duration-200"
                  style={{ width: `${Math.max(2, r.frac * 100)}%` }}
                />
              </div>
              <span className="text-right text-sm font-extrabold tabular-nums text-ink">
                {Math.round(r.frac * 100)}%
                {/* The exact count otherwise lives only on the title attribute,
                    which a screen reader on a plain div never reaches. */}
                <span className="sr-only"> — {r.n} readers</span>
              </span>
            </div>
          ))}
          <p className="text-[13px] text-ink-faint">
            Of {compact(rows[0].n)} readers who reached a quarter of the page.
          </p>
        </div>
      )}
    </Section>
  );
}

// ── Referrers / countries / devices ──────────────────────────────────────

function Breakdowns({ stats }: { stats: Load<Stats> }) {
  if (stats.state === "error") {
    return (
      <Section title="Where readers came from">
        <Quiet>Couldn’t load breakdowns.</Quiet>
      </Section>
    );
  }
  const ready = stats.state === "ready" ? stats.data : null;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(24px,3vw,42px)]">
      <BreakdownList
        title="Referrers"
        rows={ready?.referrers.map((r) => ({ label: r.host || "direct", n: r.n }))}
      />
      <BreakdownList
        title="Countries"
        rows={ready?.countries.map((c) => ({ label: c.code, n: c.n }))}
      />
      <BreakdownList
        title="Devices"
        rows={ready?.devices.map((d) => ({ label: d.class, n: d.n }))}
      />
    </div>
  );
}

function BreakdownList({
  title,
  rows,
}: {
  title: string;
  rows?: { label: string; n: number }[];
}) {
  return (
    <Section title={title}>
      {!rows ? (
        <Quiet>Loading…</Quiet>
      ) : rows.length === 0 ? (
        <Quiet>Nothing yet.</Quiet>
      ) : (
        <ul className="grid gap-2">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-3 bg-accent-wash px-3 py-2 text-sm"
            >
              <span className="truncate text-ink">{r.label}</span>
              <span className="shrink-0 tabular-nums text-accent-strong">
                {compact(r.n)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── Daily views sparkline (inline SVG, one accent) ───────────────────────

function DailySparkline({ stats }: { stats: Load<Stats> }) {
  const daily = stats.state === "ready" ? stats.data.daily : [];
  const path = useMemo(() => {
    if (daily.length < 2) return null;
    const w = 100;
    const h = 28;
    const max = Math.max(...daily.map((d) => d.views), 1);
    const step = w / (daily.length - 1);
    const pts = daily.map((d, i) => {
      const x = i * step;
      const y = h - (d.views / max) * (h - 2) - 1;
      return [x, y] as const;
    });
    const line = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(" ");
    const area = `${line} L${w} ${h} L0 ${h} Z`;
    return { line, area };
  }, [daily]);

  return (
    <Section title="Daily views">
      {stats.state === "error" ? (
        <Quiet>Couldn’t load the trend.</Quiet>
      ) : !path ? (
        <Quiet>Not enough history yet.</Quiet>
      ) : (
        <div>
          <svg
            viewBox="0 0 100 28"
            preserveAspectRatio="none"
            className="h-16 w-full"
            role="img"
            aria-label="Daily views over the last 30 days"
          >
            <path d={path.area} fill="var(--color-accent-soft)" />
            <path
              d={path.line}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-1 flex justify-between text-xs text-ink-faint">
            <span>{formatDate(daily[0].day ? Date.parse(daily[0].day) : 0)}</span>
            <span>
              {formatDate(
                daily[daily.length - 1].day
                  ? Date.parse(daily[daily.length - 1].day)
                  : 0,
              )}
            </span>
          </div>
        </div>
      )}
    </Section>
  );
}

// ── Reactions ────────────────────────────────────────────────────────────

function Reactions({ feedback }: { feedback: Load<FeedbackData> }) {
  return (
    <Section title="Reactions">
      {feedback.state === "error" ? (
        <Quiet>Couldn’t load reactions.</Quiet>
      ) : feedback.state === "loading" ? (
        <Quiet>Loading…</Quiet>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {REACTIONS.map((emoji) => (
            <span key={emoji} className={`${TAG_OUTLINE} gap-1.5 tabular-nums`}>
              <span>{emoji}</span>
              <span>{feedback.data.reactions?.[emoji] ?? 0}</span>
            </span>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Reader notes ─────────────────────────────────────────────────────────

function Notes({ feedback }: { feedback: Load<FeedbackData> }) {
  const notes = feedback.state === "ready" ? feedback.data.notes ?? [] : [];
  return (
    <Section title="Notes — only you see these">
      {feedback.state === "error" ? (
        <Quiet>Couldn’t load notes.</Quiet>
      ) : feedback.state === "loading" ? (
        <Quiet>Loading…</Quiet>
      ) : notes.length === 0 ? (
        <Quiet>No notes yet.</Quiet>
      ) : (
        <ul className="space-y-3.5">
          {notes.map((note, i) => (
            <li key={i}>
              <p className="text-sm leading-[22px] text-ink-soft">
                &ldquo;{note.value}&rdquo;
              </p>
              <p className="mt-1 text-xs tabular-nums text-ink-faint">
                {formatDate(note.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ── Comment moderation ───────────────────────────────────────────────────

function Moderation({
  comments,
  moderated,
  onModerate,
}: {
  comments: Load<CommentRow[]>;
  moderated: Record<string, string>;
  onModerate: (id: string, action: "hide" | "flag") => void;
}) {
  return (
    <Section title="Comments">
      {comments.state === "error" ? (
        <Quiet>Couldn’t load comments.</Quiet>
      ) : comments.state === "loading" ? (
        <Quiet>Loading…</Quiet>
      ) : comments.data.length === 0 ? (
        <Quiet>No comments yet.</Quiet>
      ) : (
        <ul className="space-y-3">
          {comments.data.map((c) => {
            const action = moderated[c.id];
            return (
              <li
                key={c.id}
                className={`bg-surface px-4 py-3 transition-opacity duration-150 ${
                  action ? "opacity-45" : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-extrabold text-ink">
                    {c.author_name?.trim() || "Anonymous"}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {formatDate(c.created_at)}
                  </span>
                </div>
                {c.anchor?.quote ? (
                  <p className="mt-1.5 border-l-2 border-divider pl-2.5 text-xs italic text-ink-faint">
                    “{c.anchor.quote}”
                  </p>
                ) : null}
                <p className="mt-1.5 text-sm text-ink-soft">{c.body}</p>
                <div className="mt-2.5 flex items-center gap-4">
                  {action ? (
                    <span className="text-xs text-ink-faint">
                      {action === "hide" ? "Hidden" : "Flagged"}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onModerate(c.id, "hide")}
                        className="text-xs text-ink-faint transition-colors duration-150 hover:text-ink"
                      >
                        Hide
                      </button>
                      <button
                        type="button"
                        onClick={() => onModerate(c.id, "flag")}
                        className="text-xs text-ink-faint transition-colors duration-150 hover:text-accent"
                      >
                        Flag
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
