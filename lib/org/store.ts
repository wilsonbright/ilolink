// Org analytics store — the pure core behind the teamspace page's
// "Connected assistants" / "Assistant activity" / "Org memory" sections and
// the publish-time org_memory writes (migrations/0017_org_analytics.sql).
//
// Follows the lib/publish/store-core.ts convention: parameterized by an
// explicit D1 binding, NO import of `@/lib/cf` (OpenNext's env()), so both the
// Next app and the standalone MCP worker share one implementation.
//
// THE RULE (same as mcp-worker/src/memory.ts): every teamspaceId parameter
// here must come from an already-verified membership — the page's gate or
// requireMember() — never from user-controlled input. The queries scope on it;
// they do not re-check it.

import { nanoid } from "nanoid";

// ── Excerpt extraction ─────────────────────────────────────────────────────

export const EXCERPT_MAX = 280;

// Crude, deliberate plain extraction — the memory must never say something the
// document didn't (0017's design note), so no model touches this. md gets its
// syntax stripped, html its tags; binary kinds (pdf, images) yield an empty
// excerpt while the kind itself is still recorded by the caller.
export function extractExcerpt(body: string, kind: string): string {
  if (!body) return "";
  let text: string;
  if (kind === "md") {
    text = body
      // Fenced code is dropped outright (an unterminated fence runs to EOF):
      // code is the part of a document least likely to read as a summary.
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/```[\s\S]*$/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      // Images to their alt text, links to their text.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Heading / blockquote / list markers at line starts.
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Emphasis and strikethrough markers.
      .replace(/(\*\*|__|\*|_|~~)/g, "")
      // Inline HTML that markdown allows through.
      .replace(/<[^>]*>/g, " ");
  } else if (kind === "html") {
    text = body
      // Script/style bodies are markup plumbing, not document text.
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'");
  } else {
    // pdf / docx bytes / anything binary: no text to extract here.
    return "";
  }
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= EXCERPT_MAX) return text;
  // Cut at a word boundary near the cap rather than mid-word.
  const slice = text.slice(0, EXCERPT_MAX);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > EXCERPT_MAX / 2 ? slice.slice(0, lastSpace) : slice;
  // The index cut can land inside a UTF-16 surrogate pair (CJK/emoji-heavy
  // text): strip a trailing lone high surrogate so the excerpt stays well-formed.
  return cut.replace(/[\uD800-\uDBFF]$/, "") + "…";
}

// ── Audit helpers ──────────────────────────────────────────────────────────

// The doc slug / artifact name / document id argument of a tool call, when it
// carries one. Tolerates being handed the request `extra` of a schema-less
// tool (ping, whoami): none of these keys exist on it, so it yields null.
const TARGET_KEYS = ["document_id", "id", "name", "slug"] as const;
const TARGET_MAX = 200;

export function auditTargetOf(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return null;
  const rec = input as Record<string, unknown>;
  for (const key of TARGET_KEYS) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, TARGET_MAX);
  }
  return null;
}

// ── org_memory writes ──────────────────────────────────────────────────────

export interface OrgMemoryInput {
  teamspaceId: string;
  documentId: string;
  title: string | null;
  excerpt: string;
  kind: string;
  createdBy: string | null;
}

// One entry per publish. Callers treat this as best-effort: a memory row must
// never fail the publish that already succeeded, so they swallow the throw.
export async function recordOrgMemory(
  DB: D1Database,
  input: OrgMemoryInput,
): Promise<void> {
  await DB.prepare(
    `INSERT INTO org_memory
       (id, teamspace_id, document_id, title, excerpt, kind, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `om_${nanoid(16)}`,
      input.teamspaceId,
      input.documentId,
      input.title,
      input.excerpt,
      input.kind,
      input.createdBy,
      Date.now(),
    )
    .run();
}

// ── Teamspace-page reads ───────────────────────────────────────────────────
// Single queries with JOINs and LIMITs — the page must never fan out per row.
// LEFT JOIN users everywhere: audit and memory outlive their authors (0017).

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface AssistantSummaryRow {
  client: string | null;
  user_id: string | null;
  email: string | null;
  last_at: number;
  reads: number;
  writes: number;
}

// One row per DISTINCT (client, actor) pair seen in the window — the truthful
// "what's connected" derivation the 0017 header describes, since OAuth grants
// themselves live opaquely in OAUTH_KV.
export async function connectedAssistants(
  DB: D1Database,
  teamspaceId: string,
  windowMs: number = THIRTY_DAYS_MS,
): Promise<AssistantSummaryRow[]> {
  const res = await DB.prepare(
    `SELECT a.client, a.user_id, u.email,
            MAX(a.created_at) AS last_at,
            SUM(CASE WHEN a.action = 'read' THEN 1 ELSE 0 END) AS reads,
            SUM(CASE WHEN a.action = 'write' THEN 1 ELSE 0 END) AS writes
       FROM mcp_audit a
       LEFT JOIN users u ON u.id = a.user_id
      WHERE a.teamspace_id = ? AND a.created_at >= ?
      GROUP BY COALESCE(a.client, ''), COALESCE(a.user_id, '')
      ORDER BY last_at DESC
      LIMIT 50`,
  )
    .bind(teamspaceId, Date.now() - windowMs)
    .all<AssistantSummaryRow>();
  return res.results;
}

export interface AuditLogRow {
  client: string | null;
  tool: string;
  action: string;
  target: string | null;
  created_at: number;
  email: string | null;
}

export async function assistantActivity(
  DB: D1Database,
  teamspaceId: string,
  limit = 30,
): Promise<AuditLogRow[]> {
  const res = await DB.prepare(
    `SELECT a.client, a.tool, a.action, a.target, a.created_at, u.email
       FROM mcp_audit a
       LEFT JOIN users u ON u.id = a.user_id
      WHERE a.teamspace_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?`,
  )
    .bind(teamspaceId, limit)
    .all<AuditLogRow>();
  return res.results;
}

export interface OrgMemoryEntry {
  title: string | null;
  excerpt: string | null;
  kind: string | null;
  created_at: number;
  email: string | null;
  // Resolved from documents at read time — memory stores the id, and the row
  // must survive an unpublish, so both slug and visibility can be null.
  slug: string | null;
  visibility: string | null;
}

export async function orgMemoryEntries(
  DB: D1Database,
  teamspaceId: string,
  limit = 15,
): Promise<OrgMemoryEntry[]> {
  const res = await DB.prepare(
    `SELECT m.title, m.excerpt, m.kind, m.created_at, u.email,
            d.slug, d.visibility
       FROM org_memory m
       LEFT JOIN users u ON u.id = m.created_by
       LEFT JOIN documents d
         ON d.id = m.document_id AND d.unpublished_at IS NULL
      WHERE m.teamspace_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?`,
  )
    .bind(teamspaceId, limit)
    .all<OrgMemoryEntry>();
  return res.results;
}

export interface ApiTokenSummaryRow {
  name: string | null;
  email: string | null;
  created_at: number;
  last_used_at: number | null;
}

// The standing inventory next to the derived 30-day view: PATs exist as rows,
// so they can be listed outright rather than inferred from audit traffic.
export async function activeApiTokens(
  DB: D1Database,
  teamspaceId: string,
): Promise<ApiTokenSummaryRow[]> {
  const res = await DB.prepare(
    `SELECT t.name, u.email, t.created_at, t.last_used_at
       FROM api_tokens t
       LEFT JOIN users u ON u.id = t.user_id
      WHERE t.teamspace_id = ? AND t.revoked_at IS NULL
        AND (t.expires_at IS NULL OR t.expires_at > ?)
      ORDER BY COALESCE(t.last_used_at, t.created_at) DESC
      LIMIT 50`,
  )
    .bind(teamspaceId, Date.now())
    .all<ApiTokenSummaryRow>();
  return res.results;
}
