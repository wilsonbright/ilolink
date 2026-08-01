// POST /api/auth/mcp-approve — the app's half of the MCP consent handoff.
//
// Verifies the signed OAuth request, confirms the signed-in user really belongs
// to the teamspace they picked, then signs a short-lived assertion and redirects
// back into the MCP worker to complete the grant.
//
// The assertion is deliberately tiny and short-lived (2 minutes): it is a claim
// about a single approval, not a session, and it is bound by reqHash to the one
// OAuth request it was issued for so it cannot be replayed against another.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { canPublishInto } from "@/lib/teamspace/permissions";
import { constantTimeEqual, hmac, signPayload } from "@/lib/crypto/hmac";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

const ASSERTION_TTL_SECONDS = 120;

function secret(): string {
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

export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const form = await req.formData();
  const request = String(form.get("req") ?? "");
  const sig = String(form.get("sig") ?? "");
  const teamspaceId = String(form.get("teamspace") ?? "");

  // The OAuth request must be one the MCP worker signed — otherwise any site
  // could post here and mint an approval for a redirect_uri of its choosing.
  if (!request || !constantTimeEqual(sig, await hmac(secret(), request))) {
    return NextResponse.json(
      { error: "Invalid connection request." },
      { status: 400 },
    );
  }

  // And the user must actually be able to publish into the teamspace they
  // named — the picker is a UI affordance, not an authorization.
  const role = await getMembership(teamspaceId, user.id);
  if (!canPublishInto(role)) {
    return NextResponse.json(
      { error: "You are not a member of that teamspace." },
      { status: 403 },
    );
  }

  const grant = await signPayload(
    secret(),
    {
      userId: user.id,
      teamspaceId,
      // Snapshotted so the MCP worker can detect a "sign out everywhere" that
      // happened after this grant was issued.
      tokenEpoch: user.token_epoch,
      email: user.email,
      reqHash: await hmac(secret(), request),
    },
    ASSERTION_TTL_SECONDS,
    Date.now(),
  );

  const back = new URL("/authorize/complete", mcpOrigin());
  back.searchParams.set("req", request);
  back.searchParams.set("sig", sig);
  back.searchParams.set("grant", grant);

  // 303: the browser must follow with GET, not repeat the POST.
  return NextResponse.redirect(back.toString(), 303);
}
