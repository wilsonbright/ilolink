// GET    /api/connections        — list this user's MCP OAuth connections
// DELETE /api/connections?id=     — disconnect one (revoke its grant)
//
// The OAuth grants live in the MCP worker's OAUTH_KV, which the app does not
// bind. So the app — which owns the session and therefore knows WHO is asking —
// signs a short-lived {userId} assertion with the shared MCP_HANDOFF_SECRET and
// hands it to the MCP worker's /grants endpoint, which owns the store. This is
// the same trust direction as the OAuth approval handoff (app authenticates the
// human, worker holds the OAuth state). Session-gated + same-origin here; the
// signed call is server-to-server.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { signPayload } from "@/lib/crypto/hmac";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

function handoffSecret(): string {
  const s = (env() as unknown as { MCP_HANDOFF_SECRET?: string })
    .MCP_HANDOFF_SECRET;
  if (!s) throw new Error("MCP_HANDOFF_SECRET is not configured.");
  return s;
}

function mcpOrigin(): string {
  return (
    (env() as unknown as { MCP_ORIGIN?: string }).MCP_ORIGIN ??
    "https://mcp.ilolink.com"
  );
}

// A 60s assertion is plenty for a same-request server-to-server call and keeps
// the window a captured token could be replayed tiny.
function assertion(userId: string): Promise<string> {
  return signPayload(handoffSecret(), { userId }, 60, Date.now());
}

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  try {
    const t = await assertion(user.id);
    const res = await fetch(`${mcpOrigin()}/grants?t=${encodeURIComponent(t)}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ connections: [] }, { status: 200 });
    }
    // The worker already shaped each grant (id, clientId, scope, connectedAt in
    // ms, email, ip, ua, geo) — pass it straight through.
    const data = (await res.json()) as { grants?: unknown };
    return NextResponse.json(
      { connections: Array.isArray(data.grants) ? data.grants : [] },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    // Degrade to an empty list rather than error the page — the connections
    // panel is informational and the PAT panel beside it must still render.
    return NextResponse.json({ connections: [] }, { status: 200 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "An 'id' is required." }, { status: 400 });
  }
  try {
    const t = await assertion(user.id);
    const res = await fetch(`${mcpOrigin()}/grants/revoke?t=${encodeURIComponent(t)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grantId: id }),
    });
    return NextResponse.json({ ok: res.ok, revoked: res.ok });
  } catch {
    return NextResponse.json({ ok: false, revoked: false }, { status: 502 });
  }
}
