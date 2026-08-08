// Forgiving path matching for the connector URL. Pure — no bindings, so the
// whole table of near-misses below is unit-testable with no Cloudflare context.
//
// WHY THIS EXISTS (a real, diagnosed support incident, 2026-08-07):
//
// A teammate connected an assistant to `https://mcp.ilolink.com/mcp.` — with a
// trailing full stop, copied off our own /connect page, where the sentence's
// period sat flush against the URL with no copy button. The OAuth dance then
// succeeded COMPLETELY: client registered, consent approved, grant written,
// access token issued. The assistant reported "connected". Only the first
// transport call hit `/mcp.`, missed the route, and returned a bare 404 — so
// the connector flipped straight to "Disconnected" with no usable explanation.
// They retried four times before happening to paste it clean. The grants are
// still in OAUTH_KV with `resource: https://mcp.ilolink.com/mcp.` recorded on
// the three failures and the clean URL on the one that worked.
//
// Measured against production, every near-miss failed the same silent way:
//
//   /mcp   → 200      /mcp.  → 404      /mcp/  → 404
//   /MCP   → 404      /mcp,  → 404      /mcp%20 → 404
//
// A trailing SLASH is the one that would have kept hurting people: it is what
// browsers and many "copy link" affordances add on their own.
//
// The rule: punctuation and case are not part of anyone's intent when they
// paste a URL. Normalise them away and serve the request. We deliberately do
// NOT redirect — MCP clients store the URL they were given and some will not
// follow a 3xx on a POST with a body, which would convert one silent failure
// into a different one.

// Trailing characters a human or a text editor appends to a pasted URL:
// sentence punctuation, closing brackets, quotes, and whitespace. `/` is
// handled separately below so that a bare "/" cannot be eaten.
const TRAILING_NOISE = /[.,;:!?)\]}>'"`\s]+$/;

// Canonicalise a URL path for route matching. Returns a lowercase path with
// trailing noise and trailing slashes removed. Never returns an empty string.
export function canonicalPath(pathname: string): string {
  // A pasted "%20" arrives here still encoded; decode so it can be trimmed as
  // whitespace. Malformed escapes must not throw — fall back to the raw path.
  let p = pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep the raw pathname */
  }

  // Strip repeatedly: "/mcp.)" and "/mcp/." both need more than one pass, and
  // each pass is guaranteed to shorten the string, so this terminates.
  let previous: string;
  do {
    previous = p;
    p = p.replace(TRAILING_NOISE, "");
    if (p.length > 1) p = p.replace(/\/+$/, "");
  } while (p !== previous);

  return (p || "/").toLowerCase();
}

// True when `pathname` is the connector endpoint, however it was pasted.
export function isMcpPath(pathname: string): boolean {
  return canonicalPath(pathname) === "/mcp";
}

// True when the path is already exactly right, so the hot path can skip
// rebuilding the Request entirely.
export function isCanonicalMcpPath(pathname: string): boolean {
  return pathname === "/mcp";
}

// Canonicalise an RFC 8707 `resource` indicator.
//
// THIS IS THE ONE THAT ACTUALLY BIT SOMEONE, and it is worse than a bad path.
// The `resource` a client sends at /authorize becomes the AUDIENCE of the
// issued access token. A trailing full stop therefore mints a token for
// `https://mcp.ilolink.com/mcp.` while the resource server is
// `https://mcp.ilolink.com/mcp`, and the provider then rejects that token on
// EVERY request:
//
//   401 {"error":"invalid_token",
//        "error_description":"Token audience does not match resource server"}
//
// So the connection fails even when the client afterwards POSTs to a perfectly
// correct /mcp — normalising the request path is not enough on its own. The
// audience has to be canonical at the moment the grant is created, which is
// here, before the OAuth provider ever parses the request.
//
// Returns the input unchanged if it is not a parseable absolute URL; the
// provider is the authority on whether a resource is acceptable, and this must
// only ever tidy punctuation, never invent or widen a value.
export function canonicalResource(resource: string): string {
  let u: URL;
  try {
    u = new URL(resource);
  } catch {
    return resource;
  }
  const before = u.pathname;
  const after = canonicalPath(before);
  // Conservative on purpose: if the path is already canonical, hand back the
  // exact input. Rewriting a resource the provider would have accepted risks
  // breaking a working client to fix a problem it does not have.
  if (after === before) return resource;
  u.pathname = after;
  // Only once we are already rebuilding: RFC 8707 forbids a fragment on a
  // resource indicator, and one here would keep the audience from matching.
  u.hash = "";
  return u.toString();
}
