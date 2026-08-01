// HMAC-SHA256 over Web Crypto, plus a signed-payload envelope.
//
// Promoted out of lib/mcp/dashboard-token.ts because three separate features
// now need the same primitive: the dashboard token, the cross-worker MCP
// authorize handoff, and (if the fallback path is ever taken) comment tickets.
// Pure — no env(), no bindings — so both plain Workers can import it.

export function b64urlFromBytes(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlEncode(text: string): string {
  return btoa(unescape(encodeURIComponent(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function b64urlDecode(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(padded)));
}

export async function hmac(secret: string, msg: string): Promise<string> {
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
    new TextEncoder().encode(msg),
  );
  return b64urlFromBytes(sig);
}

// Length-independent, value-independent comparison.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// A signed, expiring JSON payload: "<b64url(json)>.<sig>".
//
// This is deliberately NOT a JWT. There is no algorithm field to confuse, no
// "alg: none", and no key discovery — one shared secret, one algorithm, and a
// verifier that cannot be talked into accepting anything else.
export async function signPayload<T extends object>(
  secret: string,
  payload: T,
  ttlSeconds: number,
  now: number,
): Promise<string> {
  const body = b64urlEncode(
    JSON.stringify({ ...payload, exp: now + ttlSeconds * 1000 }),
  );
  return `${body}.${await hmac(secret, body)}`;
}

// Returns the payload, or null for any failure — bad shape, bad signature, or
// expired. Callers must treat null as "reject", never as "unknown".
export async function verifyPayload<T>(
  secret: string,
  token: string,
  now: number,
): Promise<(T & { exp: number }) | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  if (!constantTimeEqual(sig, await hmac(secret, body))) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(b64urlDecode(body));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const exp = (parsed as { exp?: unknown }).exp;
  if (typeof exp !== "number" || exp < now) return null;

  return parsed as T & { exp: number };
}
