// ilolink MCP agent. See mcp-worker/PINNED.md for the SDK signatures confirmed
// against the installed packages (agents 0.17.4, @modelcontextprotocol/sdk
// 1.29.0). McpAgent<Env,State,Props>: `this.props` (not this.ctx.props) carries
// per-session identity; register tools in init(); serve via the static serve().

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Bindings this worker uses. Phase 0 only needs the DO namespace; the shared
// data bindings (DB/DOCS/KV/EVENTS) and OAUTH_KV are added in Phase 1.
export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
}

// Per-session identity, injected by the OAuth provider (Claude) or the token
// resolver (ChatGPT). Empty in Phase 0.
export interface Props extends Record<string, unknown> {
  workspaceId?: string;
  origin?: "claude_oauth" | "chatgpt_token";
}

export class IlolinkMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({ name: "ilolink", version: "1.0.0" });

  async init(): Promise<void> {
    this.server.registerTool(
      "ping",
      {
        title: "Ping",
        description: "Health check for the ilolink MCP server. Returns 'pong'.",
        inputSchema: {},
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => ({ content: [{ type: "text", text: "pong" }] }),
    );
  }
}
