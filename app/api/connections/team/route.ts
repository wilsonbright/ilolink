// GET /api/connections/team?teamspace=<id>
//
// The team audit view: every connector token and OAuth assistant belonging to
// any member of a teamspace, so an admin or owner can spot access they do not
// recognise. READ-ONLY on purpose — revoking another member's connection is a
// stronger power (account-level), left for a deliberate follow-up; this only
// surfaces what exists.
//
// Authorization is derived HERE, from the session + D1: only an admin/owner of
// the named teamspace may see it. The member userId list is then SIGNED and
// handed to the MCP worker's /grants/team, which trusts the signature rather
// than re-checking membership it cannot see.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership, listMembers } from "@/lib/teamspace/store";
import { atLeast } from "@/lib/teamspace/permissions";
import { listTeamApiTokens } from "@/lib/mcp/api-tokens";
import { signPayload } from "@/lib/crypto/hmac";
import { env } from "@/lib/cf";
import { db } from "@/lib/db/client";

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

export async function GET(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  const teamspaceId = new URL(req.url).searchParams.get("teamspace") ?? "";
  if (!teamspaceId) {
    return NextResponse.json({ error: "A teamspace is required." }, { status: 400 });
  }

  // Admins and owners only — a plain member cannot audit their teammates.
  const role = await getMembership(teamspaceId, user.id);
  if (!atLeast(role, "admin")) {
    return NextResponse.json({ error: "Admins and owners only." }, { status: 403 });
  }

  const members = await listMembers(teamspaceId);
  const tokens = await listTeamApiTokens(db(), teamspaceId);

  // OAuth grants for every member, fetched from the worker with a signed list.
  let byUser: Record<string, unknown[]> = {};
  try {
    const t = await signPayload(
      handoffSecret(),
      { userIds: members.map((m) => m.user_id) },
      60,
      Date.now(),
    );
    const res = await fetch(
      `${mcpOrigin()}/grants/team?t=${encodeURIComponent(t)}`,
      { headers: { accept: "application/json" } },
    );
    if (res.ok) {
      const data = (await res.json()) as { byUser?: Record<string, unknown[]> };
      byUser = data.byUser ?? {};
    }
  } catch {
    // Degrade to tokens-only rather than error the whole audit view.
    byUser = {};
  }

  const rows = members.map((m) => ({
    userId: m.user_id,
    email: m.email,
    role: m.role,
    tokens: tokens
      .filter((t) => t.user_id === m.user_id)
      .map((t) => ({
        id: t.id,
        name: t.name,
        created_at: t.created_at,
        last_used_at: t.last_used_at,
        created_ip: t.created_ip,
        created_ua: t.created_ua,
        created_geo: t.created_geo,
      })),
    assistants: byUser[m.user_id] ?? [],
  }));

  return NextResponse.json(
    { members: rows },
    { headers: { "cache-control": "private, no-store" } },
  );
}
