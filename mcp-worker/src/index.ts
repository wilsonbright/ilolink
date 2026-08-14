// Worker entry. Two front doors to one teamspace:
//   /mcp + OAuth Bearer          → wrapped by workers-oauth-provider (Claude etc.)
//   /mcp + `ilo_pat_…` Bearer    → personal access token (clients without OAuth)
//
// Both land in the same IlolinkMCP tools with the same props shape. See
// mcp-worker/PINNED.md.
//
// RETIRED: /w_XXXX/mcp. The workspace id was itself the bearer secret AND sat in
// the URL, so it leaked into browser history, the assistant's stored connector
// config, referrer chains, and this worker's own request logs (observability is
// on). It also doubled as the dashboard key, so one leak gave away publishing
// and analytics together. The path now returns a JSON-RPC error telling the
// assistant to reconnect.

import { OAuthProvider, getOAuthApi } from "@cloudflare/workers-oauth-provider";
import { IlolinkMCP, type Env } from "./agent";
import { authorizeHandler } from "./authorize";
import { isMcpPath, isCanonicalMcpPath } from "./canonical-path";
import { resolveApiToken, touchApiToken, PAT_PREFIX } from "../../lib/mcp/api-tokens";
import { verifyPayload } from "../../lib/crypto/hmac";

export { IlolinkMCP };

// The MCP transport handler (Streamable HTTP). Reused by both paths. Wrapped in
// a plain { fetch } so it satisfies the provider's ExportedHandlerWithFetch.
const mcpHandler = IlolinkMCP.serve("/mcp");
const apiHandler = {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) =>
    mcpHandler.fetch(req, env, ctx),
};

// Extracted so getOAuthApi() below can read/revoke grants from the SAME store
// with the SAME key layout the provider writes — the KV helpers depend on these
// options, so they must not drift from what `new OAuthProvider(...)` gets.
const providerOptions = {
  apiRoute: "/mcp",
  apiHandler,
  defaultHandler: authorizeHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  scopesSupported: ["publish"],
  // Client ID Metadata Documents — OpenAI's preferred way for ChatGPT to
  // identify itself: one stable HTTPS metadata URL as the client_id, instead of
  // Dynamic Client Registration minting a throwaway client record per connector
  // instance. DCR stays on for everything else (Claude uses it).
  //
  // Takes BOTH this option and the `global_fetch_strictly_public` compatibility
  // flag in wrangler.jsonc; with only one of the two the provider advertises
  // client_id_metadata_document_supported: false and nothing changes.
  clientIdMetadataDocumentEnabled: true,
};

const provider = new OAuthProvider(providerOptions);

function handoffSecret(env: Env): string {
  const s = (env as unknown as { MCP_HANDOFF_SECRET?: string }).MCP_HANDOFF_SECRET;
  // Fail closed — without the shared secret we cannot trust who is asking, so
  // the connections API is simply unavailable rather than open.
  if (!s) throw new Error("MCP_HANDOFF_SECRET is not configured.");
  return s;
}

// App → MCP connection management. The app (which owns the session) signs a
// short-lived {userId} assertion with the shared handoff secret; this worker,
// which owns OAUTH_KV, verifies it and lists/revokes the OAuth grants for that
// user. revokeGrant is itself scoped to the userId by the library, so a forged
// grant id cannot touch another user's connection even if the assertion were
// bypassed. Returns JSON; server-to-server only, so no CORS.
async function handleGrants(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? "";
  const claims = await verifyPayload<{ userId: string }>(
    handoffSecret(env),
    token,
    Date.now(),
  );
  if (!claims || typeof claims.userId !== "string" || !claims.userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const api = getOAuthApi(providerOptions, env);

  if (url.pathname === "/grants" && request.method === "GET") {
    const res = await api.listUserGrants(claims.userId);
    const grants = res.items.map((g) => ({
      id: g.id,
      clientId: g.clientId,
      scope: g.scope,
      createdAt: g.createdAt,
      email: (g.metadata as { email?: string } | null)?.email ?? null,
    }));
    return new Response(JSON.stringify({ grants }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  if (url.pathname === "/grants/revoke" && request.method === "POST") {
    let body: { grantId?: unknown };
    try {
      body = (await request.json()) as { grantId?: unknown };
    } catch {
      body = {};
    }
    const grantId = typeof body.grantId === "string" ? body.grantId : "";
    if (!grantId) {
      return new Response(JSON.stringify({ error: "grantId required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    // Scoped to the asserted user by the library — cannot revoke another's.
    await api.revokeGrant(grantId, claims.userId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  return new Response(JSON.stringify({ error: "not found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}

function rpcError(message: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message } }),
    { status: 401, headers: { "content-type": "application/json" } },
  );
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    let url = new URL(request.url);

    // Accept the connector URL however it was pasted. A trailing full stop
    // copied off our own /connect page cost a real user four failed attempts:
    // the OAuth flow completed, the assistant said "connected", and only the
    // first transport call 404'd — so it flipped to "Disconnected" with nothing
    // to act on. `/mcp/`, `/MCP` and `/mcp%20` failed identically. See
    // ./canonical-path.ts for the measured table and why we rewrite rather than
    // redirect (clients store the URL and may not re-POST a body after a 3xx).
    if (!isCanonicalMcpPath(url.pathname) && isMcpPath(url.pathname)) {
      url.pathname = "/mcp";
      request = new Request(url.toString(), request);
    }

    // The retired URL-token path. Answer clearly rather than 404ing, so an
    // assistant still holding an old connector URL tells its user what to do.
    if (/^\/(w_[A-Za-z0-9]+)\/mcp(\/.*)?$/.test(url.pathname)) {
      return rpcError(
        "This ilolink connector URL has been retired. Reconnect ilolink from your assistant's connector settings, or create a new connector token at ilolink.com/connect.",
      );
    }

    // Personal access token path. Checked BEFORE the OAuth provider, because
    // the provider would reject an unrecognized bearer token outright.
    const auth = request.headers.get("authorization") ?? "";
    const presented = auth.replace(/^Bearer\s+/i, "");
    if (url.pathname.startsWith("/mcp") && presented.startsWith(PAT_PREFIX)) {
      const resolved = await resolveApiToken(env.DB, presented);
      if (!resolved) {
        return rpcError(
          "That ilolink connector token is not valid or has been revoked. Create a new one at ilolink.com/connect.",
        );
      }
      ctx.waitUntil(touchApiToken(env.DB, resolved.tokenId));
      // Identity only — membership and status are re-read from D1 on every tool
      // call (see ./authz.ts), so revoking access takes effect immediately. The
      // token's display name rides along as the audit client label (mcp_audit,
      // 0017); it came back with the token row, and is never an authorization
      // input.
      (ctx as unknown as { props: unknown }).props = {
        userId: resolved.userId,
        teamspaceId: resolved.teamspaceId,
        origin: "pat",
        client: resolved.name ?? "pat",
      };
      return mcpHandler.fetch(request, env, ctx);
    }

    // Connection management (app-signed): list/revoke this user's OAuth grants.
    // Before the provider, which would not recognize these paths.
    if (url.pathname === "/grants" || url.pathname === "/grants/revoke") {
      return handleGrants(request, env);
    }

    // Everything else (/, /mcp, /authorize, /token, /register, /.well-known/*)
    // goes through the OAuth provider.
    return provider.fetch(request, env, ctx);
  },
};
