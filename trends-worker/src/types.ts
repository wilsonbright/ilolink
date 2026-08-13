// Shared types for the trends worker. Card / WeekPayload mirror the KV
// contract with the app byte-for-byte: the app renders whatever JSON it finds
// under trending:* and has no other coupling to this worker, so any field
// change here must land on both sides at once.

export interface Env {
  // OWN database (ilolink-trends) — never the product DB. See wrangler.jsonc.
  DB: D1Database;
  // SHARED namespace with the app; this worker writes ONLY trending:* keys.
  KV: KVNamespace;
  // Optional secret. Absent => unauthenticated GitHub (search 10 req/min, core
  // 60/hr) with tighter budgets; present => higher caps. Never required.
  GITHUB_TOKEN?: string;
  // Optional secret gating the admin API. Absent => every admin route 503s
  // (fail closed — an unset token must never mean an open admin surface).
  ADMIN_TOKEN?: string;
}

export const KINDS = [
  "skill",
  "agent",
  "mcp-server",
  "framework",
  "spec",
  "workflow",
  "eval",
  "runbook",
] as const;
export type Kind = (typeof KINDS)[number];

// ─── KV contract (read by the app) ─────────────────────────────────────────

// One entry on the /trending page. description is the repo's own short
// description (displayed with attribution — the card links to the repo),
// never README content.
export interface Card {
  id: string;
  name: string;
  repoUrl: string;
  kind: string;
  description: string | null;
  stars: number;
  starVel: number;
  starGrowth: number;
  corroboration: string[]; // human directory names, e.g. ["awesome-mcp-servers"]
  score: number;
  rank: number;
  firstSeen: string;
  isNew: boolean;
}

// Value under "trending:" + week. Cards per kind sorted by rank asc, max 10.
export interface WeekPayload {
  week: string;
  generatedAt: string; // ISO timestamp of the approve step
  kinds: Partial<Record<Kind, Card[]>>;
}

// Value under "trending:weeks": ISO-Monday strings, newest first, max 12.

// ─── D1 row shapes (only the columns the worker actually reads) ────────────

export interface ItemRow {
  id: string;
  canonical_repo: string | null;
  name: string;
  kind: string | null;
  description: string | null;
  first_seen: string | null;
  repo_created_at: number | null;
}

export interface SourceRunRow {
  source: string;
  week_start: string;
  status: string;
  item_count: number | null;
  error: string | null;
  ran_at: number;
}
