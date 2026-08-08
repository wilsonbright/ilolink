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

import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { IlolinkMCP, type Env } from "./agent";
import { authorizeHandler } from "./authorize";
import { isMcpPath, isCanonicalMcpPath } from "./canonical-path";
import { resolveApiToken, touchApiToken, PAT_PREFIX } from "../../lib/mcp/api-tokens";

export { IlolinkMCP };

// The MCP transport handler (Streamable HTTP). Reused by both paths. Wrapped in
// a plain { fetch } so it satisfies the provider's ExportedHandlerWithFetch.
const mcpHandler = IlolinkMCP.serve("/mcp");
const apiHandler = {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) =>
    mcpHandler.fetch(req, env, ctx),
};

const provider = new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler,
  defaultHandler: authorizeHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  scopesSupported: ["publish"],
});

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
      // call (see ./authz.ts), so revoking access takes effect immediately.
      (ctx as unknown as { props: unknown }).props = {
        userId: resolved.userId,
        teamspaceId: resolved.teamspaceId,
        origin: "pat",
      };
      return mcpHandler.fetch(request, env, ctx);
    }

    // Everything else (/, /mcp, /authorize, /token, /register, /.well-known/*)
    // goes through the OAuth provider.
    return provider.fetch(request, env, ctx);
  },
};
