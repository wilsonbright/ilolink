// Per-tool-call authorization.
//
// THE RULE: props carry identity, D1 carries authority.
//
// McpAgent is a stateful Durable Object. `this.props` is decrypted from the
// access token once, at session establishment, and then lives in a warm DO for
// as long as the session is active. Anything cached there is a decision made
// minutes or hours ago. So props carry only WHO the caller is; every mutating
// tool re-reads whether they may still act, from D1, on each call.
//
// Without this, removing someone from a teamspace would not stop their
// in-flight assistant session from continuing to publish into it.

import { PublishError } from "./publish-core";

export interface CallerProps {
  userId?: string;
  teamspaceId?: string;
  tokenEpoch?: number;
  // Pre-accounts sessions, honored during the transition.
  workspaceId?: string;
  origin?: string;
}

export interface Caller {
  userId: string;
  teamspaceId: string;
  role: "owner" | "member";
}

export async function requireMember(
  DB: D1Database,
  props: CallerProps | undefined,
): Promise<Caller> {
  const userId = props?.userId;
  const teamspaceId = props?.teamspaceId;

  if (!userId || !teamspaceId) {
    throw new PublishError(
      "This connection is no longer valid. Reconnect ilolink from your assistant's connector settings.",
    );
  }

  // One indexed read. Membership, account status, and the token epoch in a
  // single statement so revocation lands within a single tool call.
  const row = await DB.prepare(
    `SELECT m.role, u.status, u.token_epoch, t.status AS ts_status
       FROM teamspace_members m
       JOIN users u      ON u.id = m.user_id
       JOIN teamspaces t ON t.id = m.teamspace_id
      WHERE m.user_id = ? AND m.teamspace_id = ?`,
  )
    .bind(userId, teamspaceId)
    .first<{
      role: "owner" | "member";
      status: string;
      token_epoch: number;
      ts_status: string;
    }>();

  if (!row) {
    throw new PublishError(
      "You no longer have access to that teamspace. Reconnect ilolink to choose another.",
    );
  }
  if (row.status !== "active") {
    throw new PublishError("This account is suspended.");
  }
  if (row.ts_status !== "active") {
    throw new PublishError("That teamspace is suspended.");
  }
  // "Sign out everywhere" bumps users.token_epoch, which invalidates every
  // outstanding grant at once without having to enumerate them.
  if (typeof props?.tokenEpoch === "number" && props.tokenEpoch !== row.token_epoch) {
    throw new PublishError(
      "This connection was signed out. Reconnect ilolink from your assistant's connector settings.",
    );
  }

  return { userId, teamspaceId, role: row.role };
}

// Owner-only teamspace actions.
export function requireOwner(caller: Caller): void {
  if (caller.role !== "owner") {
    throw new PublishError("Only a teamspace owner can do that.");
  }
}
