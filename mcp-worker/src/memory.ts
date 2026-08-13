// Org-memory reads for the MCP worker — the recall half of the org memory the
// publish path writes (migrations/0017_org_analytics.sql). Memory is FOR the
// org: an assistant bound to a teamspace should be able to ask "what has this
// team published lately" and get the plain-extraction entries back.
//
// NOT YET REGISTERED. The tool registration site is agent.ts (owned elsewhere);
// a follow-up wires this in with one line inside the tool handler:
//
//   memoryRecent(this.env, caller.teamspaceId, limit)
//
// where `caller` came from requireMember() — that is the whole authorization
// story, and it is load-bearing:
//
// THE RULE: teamspaceId here must ALWAYS be the connection's bound teamspace
// (requireMember's return), NEVER a caller-supplied tool argument. org_memory
// rows exist for every teamspace; the only thing keeping one org from reading
// another's memory is that this parameter can only ever hold the teamspace the
// OAuth grant sealed in. Do not add a teamspace_id input to the tool schema.

export interface MemoryRow {
  title: string | null;
  excerpt: string | null;
  kind: string | null;
  created_at: number;
  // Publisher's email for attribution; null when the account is gone or the
  // entry predates accounts. LEFT JOIN — memory must outlive its author.
  created_by_email: string | null;
}

// Structural on purpose: agent.ts's full Env satisfies it, and tests can hand
// in a fake with just a DB.
export interface MemoryBindings {
  DB: D1Database;
}

export const MEMORY_MAX_LIMIT = 50;
export const MEMORY_DEFAULT_LIMIT = 20;

// Newest-first org memory for ONE teamspace (see THE RULE above). Uses the
// idx_org_memory_ts covering index; limit is clamped so a hostile or confused
// client cannot page the whole table through a single call.
export async function memoryRecent(
  env: MemoryBindings,
  teamspaceId: string,
  limit: number = MEMORY_DEFAULT_LIMIT,
): Promise<MemoryRow[]> {
  const n = Math.max(1, Math.min(Math.floor(limit) || MEMORY_DEFAULT_LIMIT, MEMORY_MAX_LIMIT));
  const res = await env.DB.prepare(
    `SELECT m.title, m.excerpt, m.kind, m.created_at, u.email AS created_by_email
       FROM org_memory m
       LEFT JOIN users u ON u.id = m.created_by
      WHERE m.teamspace_id = ?
      ORDER BY m.created_at DESC
      LIMIT ?`,
  )
    .bind(teamspaceId, n)
    .all<MemoryRow>();
  return res.results;
}
