// Signed, login-free dashboard tokens — shared by the MCP worker (which mints
// them) and the app dashboard route (which verifies them). Pure Web Crypto, no
// env(); safe to import from either side.
//
// Two forms of dashboard token:
//   - "w_XXXX"        → ChatGPT path: the workspace id IS a bearer secret.
//   - "w_XXXX~<sig>"  → Claude OAuth path: id is not a publish secret, so it is
//                        HMAC-signed to prevent enumeration.

function b64url(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64url(sig);
}

export async function signedDashboardUrl(
  workspaceId: string,
  secret: string,
): Promise<string> {
  const sig = await hmac(secret, workspaceId);
  return `https://ilolink.com/w/${workspaceId}~${sig}`;
}

// Resolve a dashboard token to a workspace id, or null if it fails verification.
// Accepts a bare "w_XXXX" (token path) or "w_XXXX~sig" (signed OAuth path).
export async function verifyDashboardToken(
  token: string,
  secret: string,
): Promise<string | null> {
  const i = token.indexOf("~");
  if (i < 0) {
    // Bare workspace id (ChatGPT bearer-secret path).
    return /^w_[0-9A-Za-z]+$/.test(token) ? token : null;
  }
  const id = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = await hmac(secret, id);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let k = 0; k < sig.length; k++) diff |= sig.charCodeAt(k) ^ expected.charCodeAt(k);
  return diff === 0 ? id : null;
}
