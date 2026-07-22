// ilolink MCP agent. See mcp-worker/PINNED.md for the SDK signatures confirmed
// against the installed packages (agents 0.17.4, @modelcontextprotocol/sdk
// 1.29.0). McpAgent<Env,State,Props>: `this.props` carries per-session identity
// (set by the OAuth provider or the token resolver); register tools in init().

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { publishForWorkspace, PublishError } from "./publish-core";
import { signedDashboardUrl, touchLastSeen } from "./workspace";

export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  DOCS: R2Bucket;
  KV: KVNamespace;
  EVENTS: AnalyticsEngineDataset;
  OAUTH_KV: KVNamespace;
  DASHBOARD_SECRET: string;
}

// Per-session identity, injected by the OAuth provider (Claude) or the token
// resolver (ChatGPT).
export interface Props extends Record<string, unknown> {
  workspaceId?: string;
  origin?: "claude_oauth" | "chatgpt_token";
}

const textResult = (text: string, structured?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  ...(structured ? { structuredContent: structured } : {}),
});

export class IlolinkMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({ name: "ilolink", version: "1.0.0" });

  private workspaceId(): string {
    const id = this.props?.workspaceId;
    if (!id) {
      throw new PublishError(
        "No ilolink workspace on this connection. In Claude, click Authorize; in ChatGPT, use your tokenized connector URL from ilolink.com/connect.",
      );
    }
    return id;
  }

  private dashboardUrl(workspaceId: string): Promise<string> {
    return signedDashboardUrl(workspaceId, this.env.DASHBOARD_SECRET);
  }

  async init(): Promise<void> {
    this.server.registerTool(
      "ping",
      {
        title: "Ping",
        description: "Health check for the ilolink MCP server. Returns 'pong'.",
        inputSchema: {},
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => textResult("pong"),
    );

    this.server.registerTool(
      "publish_document",
      {
        title: "Publish to ilolink",
        description:
          "Publish a document (Markdown, HTML, PDF, JSON, CSV, a diagram, or an image) to ilolink and get a public shareable URL plus a private analytics link. Use when the user wants to share something they or the AI just created as a live web page.",
        inputSchema: {
          content: z
            .string()
            .optional()
            .describe("Inline text: Markdown, HTML, JSON, CSV, or plain text."),
          file_base64: z
            .string()
            .optional()
            .describe("Base64 of a binary file (PDF, DOCX, image). Provide `filename` too."),
          filename: z.string().optional().describe("Filename, used to detect the file type."),
          format: z
            .enum(["md", "html", "auto"])
            .optional()
            .describe("Force text interpretation. Default auto-detects."),
          title: z.string().optional(),
          visibility: z
            .enum(["public", "unlisted", "password", "expiring"])
            .optional()
            .describe("Default 'unlisted'."),
          password: z.string().optional().describe("Required when visibility is 'password'."),
          expires_at: z.string().optional().describe("ISO date; required when visibility is 'expiring'."),
          slug: z.string().optional().describe("Optional custom link (3-32 chars: a-z, 0-9, -)."),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      async (input) => {
        try {
          const wsId = this.workspaceId();
          const b = { DB: this.env.DB, DOCS: this.env.DOCS, KV: this.env.KV };
          const res = await publishForWorkspace(b, wsId, input);
          void touchLastSeen(this.env.DB, wsId).catch(() => {});
          const dashboard_url = await this.dashboardUrl(wsId);
          return textResult(
            `Published. Share: ${res.share_url}. Your private analytics: ${dashboard_url}.`,
            { ...res, dashboard_url },
          );
        } catch (e) {
          const msg = e instanceof PublishError ? e.message : "Publish failed — please retry.";
          return { content: [{ type: "text" as const, text: msg }], isError: true };
        }
      },
    );

    this.server.registerTool(
      "get_dashboard_url",
      {
        title: "Get dashboard URL",
        description:
          "Return the workspace's private, login-free dashboard link (analytics + heatmaps). The link is the key — keep it private.",
        inputSchema: {},
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async () => {
        try {
          const url = await this.dashboardUrl(this.workspaceId());
          return textResult(`Your dashboard: ${url}`, { dashboard_url: url });
        } catch (e) {
          const msg = e instanceof PublishError ? e.message : "Could not build the dashboard link.";
          return { content: [{ type: "text" as const, text: msg }], isError: true };
        }
      },
    );
  }
}
