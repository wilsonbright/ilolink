// Worker entry. Two front doors to one workspace:
//   /mcp            → wrapped by workers-oauth-provider (Claude one-click).
//   /w_XXXX/mcp     → resolve the workspace from the path token (ChatGPT), set
//                     ctx.props, and hand to the MCP transport (no OAuth).
// Downstream both land in the same IlolinkMCP tools. See mcp-worker/PINNED.md.

import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { IlolinkMCP, type Env } from "./agent";
import { authorizeHandler } from "./authorize";
import { getWorkspace } from "./workspace";

export { IlolinkMCP };

// The MCP transport handler (Streamable HTTP). Reused by both paths. Wrapped in
// a plain { fetch } so it satisfies the provider's ExportedHandlerWithFetch.
const mcpHandler = IlolinkMCP.serve("/mcp");
const apiHandler = {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) =>
    mcpHandler.fetch(req, env, ctx),
};

// OAuth-wrapped handler for the Claude path.
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
    const url = new URL(request.url);

    // ChatGPT token path: /w_XXXX/mcp[...] — resolve workspace, inject props,
    // rewrite to /mcp, and hand to the transport directly (bypassing OAuth).
    const m = url.pathname.match(/^\/(w_[A-Za-z0-9]+)\/mcp(\/.*)?$/);
    if (m) {
      const ws = await getWorkspace(env.DB, m[1]);
      if (!ws) {
        return rpcError(
          "Your ilolink workspace URL looks wrong — mint a new one at ilolink.com/connect.",
        );
      }
      (ctx as unknown as { props: unknown }).props = {
        workspaceId: ws.id,
        origin: "chatgpt_token",
      };
      const rewritten = new Request(
        `${url.origin}/mcp${m[2] ?? ""}${url.search}`,
        request,
      );
      return mcpHandler.fetch(rewritten, env, ctx);
    }

    // Everything else (/, /mcp, /authorize, /token, /register, /.well-known/*)
    // goes through the OAuth provider.
    return provider.fetch(request, env, ctx);
  },
};
