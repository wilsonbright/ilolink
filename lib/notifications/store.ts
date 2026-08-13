// Notification reads/writes (migration 0016), plus the pure mention-validation
// helpers the comments route runs before it writes any row.
//
// Binding-parameterized like lib/artifacts/store-core.ts — every function takes
// the D1 handle — so the helpers stay importable from anywhere without
// OpenNext's env(), and the pure parts are testable with no bindings at all.
//
// PRIVACY: a notification is only ever read back by its recipient
// (WHERE user_id = requester on every query below), and a 'mention' row only
// exists because the actor deliberately acted on that recipient from inside a
// teamspace they share. So resolving actorLabel to users.name ?? email exposes
// nothing the recipient could not already see on the members list — the same
// argument that lets /api/mentions/candidates return labels to members only.
// Keep both facts true if you add kinds or readers.

import { nanoid } from "nanoid";

// Hard cap per the mentions contract: at most 10 notifications per comment.
export const MAX_MENTIONS_PER_COMMENT = 10;

// Step 1 of validation, pure: coerce the untrusted request field into a
// bounded list of candidate ids. Anything that is not an array of strings is
// silently ignored (the contract says mentions are optional and malformed
// shapes must not fail the comment). Deduped and capped BEFORE the membership
// query so the request cannot inflate the IN(...) clause.
export function mentionCandidateIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string" || !v) continue;
    if (out.includes(v)) continue;
    out.push(v);
    if (out.length >= MAX_MENTIONS_PER_COMMENT) break;
  }
  return out;
}

// Step 2, pure: keep only ids that are members of the DOC's teamspace, and
// never the commenter themselves. Invalid ids are dropped silently, not
// rejected — a stale picker must not turn into a failed comment.
export function filterValidMentions(
  candidates: readonly string[],
  memberIds: ReadonlySet<string>,
  selfId: string,
): string[] {
  return candidates.filter((id) => id !== selfId && memberIds.has(id));
}

// Which of these ids actually belong to the teamspace. Bounded by
// MAX_MENTIONS_PER_COMMENT via mentionCandidateIds, so the placeholder list
// stays tiny.
export async function memberIdsAmong(
  db: D1Database,
  teamspaceId: string,
  userIds: readonly string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const placeholders = userIds.map(() => "?").join(", ");
  const res = await db
    .prepare(
      `SELECT user_id FROM teamspace_members
        WHERE teamspace_id = ? AND user_id IN (${placeholders})`,
    )
    .bind(teamspaceId, ...userIds)
    .all<{ user_id: string }>();
  return new Set(res.results.map((r) => r.user_id));
}

export interface MentionInsert {
  recipients: readonly string[];
  actorUserId: string;
  teamspaceId: string | null;
  documentId: string;
  commentId: string;
}

// One row per mentioned user, in a single batch (atomic in D1, one round trip).
export async function insertMentionNotifications(
  db: D1Database,
  input: MentionInsert,
): Promise<void> {
  if (input.recipients.length === 0) return;
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO notifications
       (id, user_id, kind, actor_user_id, teamspace_id, document_id,
        comment_id, created_at)
     VALUES (?, ?, 'mention', ?, ?, ?, ?, ?)`,
  );
  await db.batch(
    input.recipients.map((userId) =>
      stmt.bind(
        `n_${nanoid(16)}`,
        userId,
        input.actorUserId,
        input.teamspaceId,
        input.documentId,
        input.commentId,
        now,
      ),
    ),
  );
}

// The wire shape of GET /api/notifications. Reference columns are resolved by
// JOIN at read time on purpose: documents/comments rows are deleted on
// unpublish (see the migration header), so everything joined is nullable and
// the UI decides how to render a gap ("comment removed").
export interface NotificationItem {
  id: string;
  kind: string;
  actorLabel: string | null;
  docSlug: string | null;
  docTitle: string | null;
  commentExcerpt: string | null;
  createdAt: number;
  readAt: number | null;
}

// Newest first; rides idx_notifications_user (user_id, created_at DESC).
export async function listNotifications(
  db: D1Database,
  userId: string,
  limit = 50,
): Promise<NotificationItem[]> {
  const res = await db
    .prepare(
      `SELECT n.id, n.kind,
              COALESCE(u.name, u.email)          AS actorLabel,
              d.slug                             AS docSlug,
              d.title                            AS docTitle,
              substr(c.body, 1, 140)             AS commentExcerpt,
              n.created_at                       AS createdAt,
              n.read_at                          AS readAt
         FROM notifications n
         LEFT JOIN users u     ON u.id = n.actor_user_id
         LEFT JOIN documents d ON d.id = n.document_id
         LEFT JOIN comments c  ON c.id = n.comment_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT ?`,
    )
    .bind(userId, limit)
    .all<NotificationItem>();
  return res.results;
}

// Rides the partial unread index. The nav island calls this on every page, so
// it must stay this one indexed count and nothing more.
export async function unreadCount(
  db: D1Database,
  userId: string,
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL",
    )
    .bind(userId)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function markAllRead(
  db: D1Database,
  userId: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL",
    )
    .bind(Date.now(), userId)
    .run();
}

// user_id in the WHERE is the ownership check: ids belonging to someone else
// simply match no rows. Capped to one feed page of placeholders.
export async function markRead(
  db: D1Database,
  userId: string,
  ids: readonly string[],
): Promise<void> {
  const bounded = ids.slice(0, 50);
  if (bounded.length === 0) return;
  const placeholders = bounded.map(() => "?").join(", ");
  await db
    .prepare(
      `UPDATE notifications SET read_at = ?
        WHERE user_id = ? AND read_at IS NULL AND id IN (${placeholders})`,
    )
    .bind(Date.now(), userId, ...bounded)
    .run();
}
