// Everything that must happen when a sign-in succeeds, in one place.
//
// There are two entry points — the 6-digit code (/api/auth/verify) and the
// magic link (/auth/callback) — and they must stay identical. Duplicating this
// sequence across both is how one of them ends up missing a step.

import { createSession, getOrCreateUser, type UserRow } from "./session";
import { claimPendingShares, ensurePersonalTeamspace } from "@/lib/teamspace/store";

export interface CompletedSignIn {
  user: UserRow;
  sessionToken: string;
}

export async function completeSignIn(
  emailNorm: string,
  request: Request,
): Promise<CompletedSignIn> {
  const user = await getOrCreateUser(emailNorm, emailNorm);

  // Idempotent, and cheap after the first sign-in (one indexed read). Doing it
  // on every sign-in rather than only at creation means a user whose teamspace
  // was somehow removed self-heals instead of hitting a broken dashboard.
  await ensurePersonalTeamspace(user.id);

  // Someone may have shared a document with this address before the account
  // existed; bind those grants now that there is a user id to attach them to.
  await claimPendingShares(user.id, emailNorm);

  const sessionToken = await createSession(user.id, request);
  return { user, sessionToken };
}
