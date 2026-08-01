// Sign-in code generation and email normalization. Pure — no bindings.
//
// The code is only 10^6 possibilities, so its security comes from the
// surrounding limits, not from its length: a 5-attempt cap per challenge, a
// 10-minute expiry, and per-email/per-IP send throttles. At rest it is hashed
// with PBKDF2 (lib/crypto/password.ts), NOT SHA-256 — a stolen D1 dump would
// otherwise let an attacker enumerate all 10^6 codes instantly.

export const CODE_LENGTH = 6;
export const CODE_TTL_SECONDS = 10 * 60;
export const MAX_ATTEMPTS = 5;

// Rejection sampling: taking a raw byte mod 10 would over-represent 0-5, and a
// biased sign-in code is a (small, real) reduction in brute-force cost.
export function generateCode(): string {
  const digits: string[] = [];
  const buf = new Uint8Array(1);
  while (digits.length < CODE_LENGTH) {
    crypto.getRandomValues(buf);
    // 250 is the largest multiple of 10 <= 255; discard the tail.
    if (buf[0] >= 250) continue;
    digits.push(String(buf[0] % 10));
  }
  return digits.join("");
}

// Users paste codes with spaces, hyphens, and stray whitespace.
export function normalizeCode(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

export function isWellFormedCode(input: string): boolean {
  return new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(input);
}

// The lookup key for users.email_norm and auth_challenges.email_norm.
// Deliberately conservative: lowercase + trim only. We do NOT strip Gmail dots
// or +tags — those are provider-specific, and treating a+b@gmail.com as
// a@gmail.com would let one person silently take over another's invite.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Good enough to reject typos and obvious junk before we spend a Resend call.
// Deliberately not RFC 5322 — that grammar accepts addresses no provider routes.
export function isPlausibleEmail(email: string): boolean {
  const e = normalizeEmail(email);
  if (e.length < 3 || e.length > 254) return false;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e)) return false;
  return true;
}
