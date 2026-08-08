// OAuth defaultHandler — the consent step for any MCP client (Claude, Grok, …).
//
// This used to mint `crypto.randomUUID()` as an anonymous subject and silently
// provision a workspace: approving created an account-less bucket with no owner.
// Now it authenticates a real ilolink user.
//
// It cannot do that itself. The session cookie is host-locked to ilolink.com
// (deliberately — see lib/auth/cookies.ts), so mcp.ilolink.com can never read
// it, and widening the cookie would hand sessions to the untrusted content
// origin. So consent is DELEGATED to the app over a signed handoff:
//
//   1. GET  mcp/authorize            → validate the OAuth request, redirect to
//                                      app/oauth/authorize with the request in a
//                                      signed envelope
//   2.      app/oauth/authorize      → sign in if needed, pick a teamspace, approve
//   3.      app/api/auth/mcp-approve → sign {userId, teamspaceId, tokenEpoch, reqHash}
//   4. GET  mcp/authorize/complete   → verify, then completeAuthorization
//
// The envelope in step 1 is signed too, so a third party cannot drive the app's
// consent screen with an OAuth request we never validated.

import type { Env } from "./agent";
import {
  hmac,
  b64urlEncode,
  b64urlDecode,
  constantTimeEqual,
  verifyPayload,
} from "../../lib/crypto/hmac";
import { canonicalResource } from "./canonical-path";

interface OAuthHelpers {
  parseAuthRequest(request: Request): Promise<{ clientId?: string; scope?: string[] } & Record<string, unknown>>;
  lookupClient(clientId: string): Promise<{ clientName?: string } | null>;
  completeAuthorization(o: {
    request: unknown;
    userId: string;
    scope: string[];
    metadata: unknown;
    props: unknown;
  }): Promise<{ redirectTo: string }>;
}

interface GrantAssertion {
  userId: string;
  teamspaceId: string;
  tokenEpoch: number;
  email: string;
  // Binds the assertion to ONE authorize request, so a captured assertion
  // cannot be replayed against a different (attacker-chosen) redirect_uri.
  reqHash: string;
}

function appOrigin(env: Env): string {
  return (env as unknown as { APP_ORIGIN?: string }).APP_ORIGIN ?? "https://ilolink.com";
}

function handoffSecret(env: Env): string {
  const s = (env as unknown as { MCP_HANDOFF_SECRET?: string }).MCP_HANDOFF_SECRET;
  // Fail closed: without the shared secret we cannot verify who approved a
  // grant, and issuing one anyway is exactly the bug this replaces.
  if (!s) throw new Error("MCP_HANDOFF_SECRET is not configured.");
  return s;
}

export const authorizeHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const helpers = (env as unknown as { OAUTH_PROVIDER: OAuthHelpers }).OAUTH_PROVIDER;
    const url = new URL(request.url);

    // Step 1 — validate the OAuth request, then hand off to the app.
    if (url.pathname === "/authorize" && request.method === "GET") {
      // Canonicalise the RFC 8707 `resource` BEFORE the provider parses it.
      // Whatever arrives here becomes the audience of the issued access token,
      // and a token minted for "…/mcp." is rejected against the "…/mcp"
      // resource server on every single request, with an "Invalid audience"
      // 401 — which is what a real user hit after pasting the connector URL
      // with a sentence's full stop attached. Fixing the path alone does not
      // help: the token is already stamped with the wrong audience by then.
      const rawResource = url.searchParams.get("resource");
      if (rawResource) {
        const fixed = canonicalResource(rawResource);
        if (fixed !== rawResource) {
          url.searchParams.set("resource", fixed);
          request = new Request(url.toString(), request);
        }
      }

      const oauthReq = await helpers.parseAuthRequest(request);
      const client = oauthReq.clientId
        ? await helpers.lookupClient(oauthReq.clientId).catch(() => null)
        : null;

      const req = b64urlEncode(JSON.stringify(oauthReq));
      const secret = handoffSecret(env);
      const sig = await hmac(secret, req);

      const target = new URL("/oauth/authorize", appOrigin(env));
      target.searchParams.set("req", req);
      target.searchParams.set("sig", sig);
      if (client?.clientName) target.searchParams.set("app", client.clientName);
      return Response.redirect(target.toString(), 302);
    }

    // Step 4 — the app says this user approved. Verify and issue.
    if (url.pathname === "/authorize/complete" && request.method === "GET") {
      const req = url.searchParams.get("req") ?? "";
      const grant = url.searchParams.get("grant") ?? "";
      const secret = handoffSecret(env);

      // The OAuth request must still be one we signed in step 1.
      const reqSig = url.searchParams.get("sig") ?? "";
      if (!constantTimeEqual(reqSig, await hmac(secret, req))) {
        return new Response("Invalid authorize request.", { status: 400 });
      }

      const assertion = await verifyPayload<GrantAssertion>(
        secret,
        grant,
        Date.now(),
      );
      if (!assertion) {
        return new Response("That approval expired. Please try again.", {
          status: 400,
        });
      }
      // The assertion must belong to THIS request, not another one.
      if (!constantTimeEqual(assertion.reqHash, await hmac(secret, req))) {
        return new Response("Approval does not match this request.", {
          status: 400,
        });
      }

      let parsed: { scope?: string[] } & Record<string, unknown>;
      try {
        parsed = JSON.parse(b64urlDecode(req));
      } catch {
        return new Response("Invalid authorize request.", { status: 400 });
      }

      const { redirectTo } = await helpers.completeAuthorization({
        request: parsed,
        userId: assertion.userId,
        scope: parsed.scope ?? ["publish"],
        metadata: { email: assertion.email },
        // Identity ONLY. No role, no permissions: those are re-read from D1 on
        // every tool call (see mcp-worker/src/authz.ts), because this props
        // object is decrypted once and then cached in a warm Durable Object.
        props: {
          userId: assertion.userId,
          teamspaceId: assertion.teamspaceId,
          tokenEpoch: assertion.tokenEpoch,
          origin: "oauth",
        },
      });
      return Response.redirect(redirectTo, 302);
    }

    return new Response("Not found", { status: 404 });
  },
};
