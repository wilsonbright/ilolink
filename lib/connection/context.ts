// What we record about WHERE a connection was made from — for the "manage
// access" audit trail. Captured once at the moment a connector token is minted
// or an OAuth grant is approved, from the incoming request. Purely descriptive:
// none of it is ever an authorization input (authority is always re-derived from
// D1), so a spoofed header can at worst make the audit line misleading, never
// grant access.
//
// Shared by the app (PAT creation) and the MCP worker (OAuth approval) — both
// receive a Cloudflare `Request`, so both read the same headers and `.cf`.

export interface ConnectionContext {
  ip: string | null;
  ua: string | null;
  // Human-readable "City, Region, Country" — whatever Cloudflare could resolve.
  geo: string | null;
}

// Cloudflare sets cf-connecting-ip (real client IP) and cf-ipcountry on every
// request; city/region come from the request.cf object when present. We keep
// the raw UA (truncated) and let the UI derive a friendly device label, so the
// stored value never loses information to a parsing guess.
export function captureConnectionContext(req: Request): ConnectionContext {
  const h = req.headers;
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? null;
  const ua = (h.get("user-agent") ?? "").slice(0, 300) || null;

  const cf = (req as unknown as { cf?: Record<string, unknown> }).cf;
  const country = h.get("cf-ipcountry") ?? (cf?.country as string | undefined) ?? null;
  const city = (cf?.city as string | undefined) ?? null;
  const region = (cf?.region as string | undefined) ?? null;
  const geo =
    [city, region, country].filter((p) => p && p !== "XX").join(", ") || null;

  return { ip, ua, geo };
}
