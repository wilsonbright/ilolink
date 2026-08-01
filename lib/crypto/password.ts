// Password hashing via PBKDF2-SHA256 on Web Crypto (SubtleCrypto).
// Workers-compatible and dependency-free — imported by BOTH the app and the
// content-worker, so it must never reach for Node APIs (no bcrypt, no Buffer).
//
// Stored format: "pbkdf2$<iterations>$<saltB64>$<hashB64>"

// Cloudflare Workers' WebCrypto REFUSES PBKDF2 above 100,000 iterations:
//   NotSupportedError: iteration counts above 100000 are not supported
// This was set to 600,000 (OWASP guidance for server-side PBKDF2) and would
// throw on every call in production. It was never noticed because the only
// caller was password-protected documents, a feature nobody had exercised;
// putting sign-in codes on the same primitive is what surfaced it.
//
// 100k is the platform ceiling, not a preference. Anything needing a stronger
// KDF than the platform allows should not be using PBKDF2 here.
const ITERATIONS = 100_000;
const MAX_SUPPORTED_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32; // 256-bit derived key
const PREFIX = "pbkdf2";

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// Length-independent, value-independent byte comparison.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(pw, salt, ITERATIONS, HASH_BYTES);
  return `${PREFIX}$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  // A hash stored with a higher count than the platform supports can never be
  // verified here. Return false rather than letting deriveBits throw, so the
  // caller sees "wrong password" instead of a 500.
  if (iterations > MAX_SUPPORTED_ITERATIONS) return false;

  let salt: Uint8Array<ArrayBuffer>;
  let expected: Uint8Array<ArrayBuffer>;
  try {
    salt = fromB64(parts[2]);
    expected = fromB64(parts[3]);
  } catch {
    return false;
  }

  const actual = await derive(pw, salt, iterations, expected.length);
  return timingSafeEqual(actual, expected);
}
