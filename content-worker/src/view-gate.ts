// View-gate token verification — the content-origin twin of the app worker's
// mint. The app (ilolink.com/private/<slug>) checks the session + teamspace
// membership, mints vt = "<exp>.<sig>" (exp = epoch SECONDS as a decimal
// string; sig = lowercase hex HMAC-SHA256(VIEW_GATE_SECRET, slug + "." + exp)),
// and 302s here with ?vt=. This side holds no session and asks no membership
// question — the signature IS the app's answer, and it expires in 5 minutes.
//
// Deliberately dependency-free (Web Crypto only), like every other module this
// Worker shares with the app, so it bundles into a plain Worker without shims.

/** Token + gate-cookie lifetime, seconds. Must match the app's mint side. */
export const VIEW_GATE_TTL_SECONDS = 300;

/**
 * The doc-scoped gate cookie this Worker sets for itself on a valid ?vt=, so a
 * refresh within the window works without a fresh round-trip through the app.
 * The ONLY foreign-origin risk here is none at all: the app session cookie is
 * __Host- locked to ilolink.com and never reaches this origin, and this Worker
 * reads cookies strictly by name — "vg" and the per-doc unlock cookie.
 */
export const VIEW_GATE_COOKIE = "vg";

// exp = epoch seconds; sig = 64 lowercase hex chars of HMAC-SHA256.
const EXP_RE = /^\d{1,12}$/;
const SIG_RE = /^[0-9a-f]{64}$/;

// Constant-time compare of two equal-length ASCII strings — no timing oracle
// on the signature. (Same shape as the unlock-token compare in index.ts.)
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Verify a view-gate token for one slug. FAILS CLOSED on every deviation: a
 * missing secret (misconfigured deploy) makes every token invalid rather than
 * throwing a 500 that would tell a prober something sits behind the gate.
 */
export async function verifyViewGateToken(
  secret: string,
  slug: string,
  token: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!secret || !slug || !token) return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!EXP_RE.test(exp) || !SIG_RE.test(sig)) return false;
  // Expiry is public shape, not secret material — checking it first is fine.
  if (Number(exp) <= Math.floor(nowMs / 1000)) return false;
  let expected: string;
  try {
    expected = await hmacHex(secret, `${slug}.${exp}`);
  } catch {
    return false; // fail closed — the gate never throws outward
  }
  return constantTimeEqual(sig, expected);
}
