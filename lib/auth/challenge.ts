// Sign-in challenges: mint, then redeem by either factor.
//
// A challenge carries a 6-digit code AND a magic-link token. Redeeming either
// consumes the row, so a user who clicks the link cannot then also have the
// code replayed against them.

import { nanoid } from "nanoid";
import { execute, queryFirst } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/crypto/password";
import { hashToken, newOpaqueToken } from "@/lib/crypto/token";
import {
  CODE_TTL_SECONDS,
  MAX_ATTEMPTS,
  generateCode,
  isWellFormedCode,
  normalizeCode,
} from "./otp";

export type ChallengePurpose = "signin" | "invite" | "share";

export interface MintedChallenge {
  challengeId: string;
  code: string;
  linkToken: string;
  expiresAt: number;
}

interface ChallengeRow {
  id: string;
  email_norm: string;
  code_hash: string;
  purpose: string;
  attempts: number;
  expires_at: number;
  consumed_at: number | null;
  redirect_to: string | null;
}

export interface RedeemedChallenge {
  emailNorm: string;
  redirectTo: string | null;
}

// Distinguishable so the caller can pick the user-facing wording; the HTTP
// layer deliberately collapses several of these to the same generic message.
export type RedeemFailure =
  | "not_found"
  | "expired"
  | "consumed"
  | "too_many_attempts"
  | "bad_code";

export class ChallengeError extends Error {
  constructor(public reason: RedeemFailure) {
    super(reason);
  }
}

export async function createChallenge(
  emailNorm: string,
  purpose: ChallengePurpose,
  redirectTo: string | null,
): Promise<MintedChallenge> {
  const id = `ac_${nanoid(16)}`;
  const code = generateCode();
  const linkToken = newOpaqueToken();
  const now = Date.now();
  const expiresAt = now + CODE_TTL_SECONDS * 1000;

  await execute(
    `INSERT INTO auth_challenges
       (id, email_norm, code_hash, link_hash, purpose, attempts, created_at, expires_at, redirect_to)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    id,
    emailNorm,
    await hashPassword(code),
    await hashToken(linkToken),
    purpose,
    now,
    expiresAt,
    redirectTo,
  );

  return { challengeId: id, code, linkToken, expiresAt };
}

// Redeem by 6-digit code. Increments the attempt counter BEFORE verifying, so a
// crash or a timeout mid-verify still costs the attacker an attempt.
export async function redeemCode(
  challengeId: string,
  rawCode: string,
): Promise<RedeemedChallenge> {
  const row = await queryFirst<ChallengeRow>(
    `SELECT id, email_norm, code_hash, purpose, attempts, expires_at, consumed_at, redirect_to
       FROM auth_challenges WHERE id = ?`,
    challengeId,
  );
  if (!row) throw new ChallengeError("not_found");
  if (row.consumed_at) throw new ChallengeError("consumed");
  if (row.expires_at < Date.now()) throw new ChallengeError("expired");
  if (row.attempts >= MAX_ATTEMPTS) throw new ChallengeError("too_many_attempts");

  await execute(
    "UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?",
    challengeId,
  );

  const code = normalizeCode(rawCode);
  // Still run the (slow) verify on a malformed code so a wrong-length guess is
  // not distinguishable by timing from a wrong-value one.
  const ok =
    (await verifyPassword(code, row.code_hash)) && isWellFormedCode(code);
  if (!ok) throw new ChallengeError("bad_code");

  await consume(row.id);
  return { emailNorm: row.email_norm, redirectTo: row.redirect_to };
}

// Redeem by magic link. The token is 190 bits and looked up by its hash, so
// there is nothing to brute-force and no attempt counter is needed.
export async function redeemLink(linkToken: string): Promise<RedeemedChallenge> {
  const row = await queryFirst<ChallengeRow>(
    `SELECT id, email_norm, code_hash, purpose, attempts, expires_at, consumed_at, redirect_to
       FROM auth_challenges WHERE link_hash = ?`,
    await hashToken(linkToken),
  );
  if (!row) throw new ChallengeError("not_found");
  if (row.consumed_at) throw new ChallengeError("consumed");
  if (row.expires_at < Date.now()) throw new ChallengeError("expired");

  await consume(row.id);
  return { emailNorm: row.email_norm, redirectTo: row.redirect_to };
}

// Conditional on consumed_at IS NULL so two concurrent redemptions of the same
// challenge cannot both succeed.
async function consume(id: string): Promise<void> {
  const res = await execute(
    "UPDATE auth_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
    Date.now(),
    id,
  );
  if (!res.meta.changes) throw new ChallengeError("consumed");
}
