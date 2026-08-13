// The KV contract for the weekly trending snapshot, shared with trends-worker.
//
// trends-worker (a separate Worker with its own D1 database) writes exactly two
// key shapes into the SHARED KV namespace when a weekly snapshot is
// hand-approved; the app only ever reads them. One-way data flow on purpose:
// trends writes KV, app reads KV, and the two sides never share a database.
//
//   "trending:weeks"  → string[]   ISO-Monday weeks, newest first, max 12.
//   "trending:{week}" → WeekSnapshot   cards ranked asc, max 10 per kind.
//
// These shapes are the contract — if a field changes here it must change in
// trends-worker's approve step in the same breath.

// Every kind a card can carry. Array order is also the section order on
// /trending (skills lead — they're the wedge — runbooks trail).
export const KINDS = [
  "skill",
  "mcp-server",
  "agent",
  "framework",
  "spec",
  "workflow",
  "eval",
  "runbook",
] as const;

export type Kind = (typeof KINDS)[number];

export interface Card {
  /** Stable item id, e.g. "gh:owner/repo". */
  id: string;
  name: string;
  repoUrl: string;
  kind: Kind;
  /**
   * The repo's own short description — always displayed WITH attribution (the
   * card links straight to the repo), and never README content.
   */
  description: string | null;
  stars: number;
  /** Absolute star gain this week. */
  starVel: number;
  /** Smoothed week-over-week growth ratio, e.g. 2.1. */
  starGrowth: number;
  /** Directories/lists that also carry this item, e.g. ["awesome-mcp-servers"]. */
  corroboration: string[];
  score: number;
  /** 1-based rank within its kind for this week. */
  rank: number;
  /** ISO week the watchlist first saw this repo. */
  firstSeen: string;
  isNew: boolean;
}

export interface WeekSnapshot {
  /** ISO-Monday week this snapshot covers, e.g. "2026-08-10". */
  week: string;
  /** ISO timestamp of the approve step that published it. */
  generatedAt: string;
  /** Only kinds that actually have cards are present. */
  kinds: Partial<Record<Kind, Card[]>>;
}
