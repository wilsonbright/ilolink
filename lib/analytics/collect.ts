// Cookieless visitor derivation + event field helpers (spec §7, WIRE CONTRACT).
//
// PURE by design: this module imports nothing from @/lib/cf and never touches a
// binding. The salt secret is passed in by the caller, so the same code runs on
// the OpenNext app origin and on the standalone content-worker. Web Crypto only.
//
// Visitor identity is a daily-rotating SHA-256 — no cookie, no durable id. The
// daily salt (SHA-256 of the UTC date + a server secret) is derived on the fly
// and never stored, so yesterday's hashes cannot be recomputed or correlated.

const encoder = new TextEncoder();

// Lowercase hex of a SHA-256 digest over a UTF-8 string.
async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

// Current UTC calendar date as yyyy-mm-dd.
function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// SHA-256(<UTC yyyy-mm-dd> + saltSecret). Rotates at UTC midnight; never stored.
export function dailySalt(saltSecret: string): Promise<string> {
  return sha256Hex(`${utcDay()}${saltSecret}`);
}

// Cookieless per-visitor hash: SHA-256(dailySalt + ip + ua + docId). Stable for
// one UTC day for a given (ip, ua, doc) triple, then irrecoverably rotates.
export async function visitorHash(
  ip: string,
  ua: string,
  docId: string,
  saltSecret: string,
): Promise<string> {
  const salt = await dailySalt(saltSecret);
  return sha256Hex(`${salt}${ip}${ua}${docId}`);
}

// Coarse device bucket from viewport width — kept intentionally lossy so it can
// never single out a visitor. Breakpoints mirror the app's responsive tiers.
export function deviceClass(w: number): string {
  if (!Number.isFinite(w) || w <= 640) return "≤640";
  if (w <= 1024) return "641–1024";
  return "≥1025";
}

// Referrer reduced to its bare host (no path, no query — avoids leaking URLs).
// Empty string for direct hits or anything that will not parse as a URL.
export function refHost(ref: string): string {
  if (!ref) return "";
  try {
    return new URL(ref).hostname;
  } catch {
    return "";
  }
}
