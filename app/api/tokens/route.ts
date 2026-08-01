// GET    /api/tokens          — list this user's connector tokens
// POST   /api/tokens          — mint one (returned exactly once)
// DELETE /api/tokens?id=      — revoke one
//
// Replaces app/api/connect/route.ts, which was an UNAUTHENTICATED endpoint that
// minted a workspace row on any POST.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership, ensurePersonalTeamspace } from "@/lib/teamspace/store";
import { canPublishInto } from "@/lib/teamspace/permissions";
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
} from "@/lib/mcp/api-tokens";
import { rateLimit } from "@/lib/ratelimit";
import { env } from "@/lib/cf";
import { db } from "@/lib/db/client";

export const runtime = "nodejs";

const ALLOWED_SCOPES = ["publish", "skills:read", "skills:write"];

function mcpOrigin(): string {
  return (
    (env() as unknown as { MCP_ORIGIN?: string }).MCP_ORIGIN ??
    "https://mcp.ilolink.com"
  );
}

export async function GET(): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const tokens = await listApiTokens(db(), user.id);
  return NextResponse.json(
    { tokens },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!(await rateLimit(`pat:create:${user.id}`, 10, 3600))) {
    return NextResponse.json(
      { error: "Too many connector tokens created. Try again later." },
      { status: 429 },
    );
  }

  let body: { name?: unknown; teamspace?: unknown; scopes?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const teamspaceId =
    typeof body.teamspace === "string" && body.teamspace
      ? body.teamspace
      : (await ensurePersonalTeamspace(user.id)).id;

  // The picker is a UI affordance, not an authorization.
  const role = await getMembership(teamspaceId, user.id);
  if (!canPublishInto(role)) {
    return NextResponse.json(
      { error: "You are not a member of that teamspace." },
      { status: 403 },
    );
  }

  const requested = Array.isArray(body.scopes)
    ? body.scopes.filter(
        (s): s is string => typeof s === "string" && ALLOWED_SCOPES.includes(s),
      )
    : ALLOWED_SCOPES;
  const scopes = requested.length ? requested : ["publish"];

  const { id, token } = await createApiToken(
    db(),
    user.id,
    teamspaceId,
    typeof body.name === "string" ? body.name.slice(0, 60) : null,
    scopes,
  );

  return NextResponse.json(
    {
      id,
      // Shown once. There is no endpoint that can return it again.
      token,
      scopes,
      teamspaceId,
      connectorUrl: `${mcpOrigin()}/mcp`,
      note: "Copy this now — it is not shown again. Present it as an Authorization: Bearer header, never in a URL.",
    },
    { status: 201, headers: { "cache-control": "private, no-store" } },
  );
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
  const ok = await revokeApiToken(db(), user.id, id);
  return NextResponse.json({ ok: true, revoked: ok });
}
