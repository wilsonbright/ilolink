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
//
// 'artifact_proposal' (migration 0018) is the second kind, and this paragraph
// demands the argument be restated rather than assumed: a recipient is by
// definition an owner or admin of that teamspace, so the proposal, who filed
// it, and the artifact's name and kind are all already on /t/<id>/proposals
// for them. Nothing this file joins in at read time is news to a recipient.

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

// Hard cap on the fan-out of one contribution, mirroring the mentions cap: a
// teamspace with a long bench of admins must not turn a single proposal into
// an unbounded batch.
export const MAX_PROPOSAL_NOTIFY = 50;

// Pure: who gets told a proposal is waiting. Owners and admins only, because
// they are the roles that can act on it, and never the actor — nobody needs
// telling what they themselves just filed. The role test is repeated here even
// though the query below already filters on role: same belt-and-braces as
// filterValidMentions, so the rule holds wherever the rows came from.
export function proposalRecipients(
  reviewers: readonly { user_id: string; role: string }[],
  actorUserId: string,
): string[] {
  const out: string[] = [];
  for (const r of reviewers) {
    if (r.role !== "owner" && r.role !== "admin") continue;
    if (r.user_id === actorUserId) continue;
    out.push(r.user_id);
    if (out.length >= MAX_PROPOSAL_NOTIFY) break;
  }
  return out;
}

export interface ArtifactProposalInsert {
  teamspaceId: string;
  actorUserId: string;
  artifactVersionId: string;
}

// One row per reviewer, in a single batch like the mention path. Returns how
// many were written so the caller can tell the contributing assistant whether
// a human will actually see the proposal.
//
// Zero recipients is a normal outcome, not a failure: in a personal teamspace
// the contributor IS the sole owner, so there is nobody left to notify and the
// proposal simply waits for them on their own review queue.
export async function insertArtifactProposalNotifications(
  db: D1Database,
  input: ArtifactProposalInsert,
): Promise<number> {
  const reviewers = await db
    .prepare(
      `SELECT user_id, role FROM teamspace_members
        WHERE teamspace_id = ? AND role IN ('owner','admin') AND user_id != ?
        LIMIT ?`,
    )
    .bind(input.teamspaceId, input.actorUserId, MAX_PROPOSAL_NOTIFY)
    .all<{ user_id: string; role: string }>();

  const recipients = proposalRecipients(reviewers.results, input.actorUserId);
  if (recipients.length === 0) return 0;

  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO notifications
       (id, user_id, kind, actor_user_id, teamspace_id, artifact_version_id,
        created_at)
     VALUES (?, ?, 'artifact_proposal', ?, ?, ?, ?)`,
  );
  await db.batch(
    recipients.map((userId) =>
      stmt.bind(
        `n_${nanoid(16)}`,
        userId,
        input.actorUserId,
        input.teamspaceId,
        input.artifactVersionId,
        now,
      ),
    ),
  );
  return recipients.length;
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
  artifactName: string | null;
  artifactKind: string | null;
  teamspaceName: string | null;
  teamspaceId: string | null;
  createdAt: number;
  readAt: number | null;
}

// Newest first; rides idx_notifications_user (user_id, created_at DESC).
//
// artifact_versions.skill_id really is the artifacts FK: 0014 renamed both
// tables and left the column its pre-rename name. It is not a typo — renaming
// it now would be a migration, not a cleanup.
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
              a.name                             AS artifactName,
              a.kind                             AS artifactKind,
              t.name                             AS teamspaceName,
              n.teamspace_id                     AS teamspaceId,
              n.created_at                       AS createdAt,
              n.read_at                          AS readAt
         FROM notifications n
         LEFT JOIN users u     ON u.id = n.actor_user_id
         LEFT JOIN documents d ON d.id = n.document_id
         LEFT JOIN comments c  ON c.id = n.comment_id
         LEFT JOIN artifact_versions av ON av.id = n.artifact_version_id
         LEFT JOIN artifacts a          ON a.id  = av.skill_id
         LEFT JOIN teamspaces t         ON t.id  = n.teamspace_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT ?`,
    )
    .bind(userId, limit)
    .all<NotificationItem>();
  return res.results;
}

// Rides the partial unread index. The nav island calls this on every page, so
// it must stay this one indexed count and nothing more. Kind-agnostic on
// purpose — every kind counts toward the same badge, so a new kind needs no
// change here and adding a `kind IN (...)` filter would drop the index.
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
