// Signed, login-free dashboard tokens — shared by the MCP worker (which mints
// them) and the app dashboard route (which verifies them). Pure Web Crypto, no
// env(); safe to import from either side.
//
// One form of dashboard token: "w_XXXX~<sig>". The workspace id is not itself a
// credential, so the signature is the only thing standing between a leaked id
// and a stranger reading every document, slug, view count and comment in that
// workspace.
//
// There used to be a second form — a bare "w_XXXX" accepted with no signature
// check at all — because the retired ChatGPT connector used the workspace id as
// its bearer secret, which made signing redundant on that path. It also made
// the signature optional on EVERY path: presenting a Claude-OAuth id with the
// "~sig" simply omitted skipped verification entirely (SECURITY-AUDIT-2026-07-23
// finding #1). The ChatGPT token path is gone (mcp-worker/src/index.ts), so the
// bare form is gone with it.

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
// The signature is mandatory: an unsigned id is not a token.
export async function verifyDashboardToken(
  token: string,
  secret: string,
): Promise<string | null> {
  // Callers default the secret to "" when the binding is absent. Web Crypto
  // rejects a zero-length HMAC key, so this used to throw DataError out of a
  // public page — a 500 where "this link is not valid" is the honest answer.
  if (!secret) return null;
  const i = token.indexOf("~");
  if (i < 0) return null;
  const id = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = await hmac(secret, id);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let k = 0; k < sig.length; k++) diff |= sig.charCodeAt(k) ^ expected.charCodeAt(k);
  return diff === 0 ? id : null;
}
