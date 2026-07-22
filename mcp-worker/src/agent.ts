// ilolink MCP agent. See mcp-worker/PINNED.md for the SDK signatures confirmed
// against the installed packages (agents 0.17.4, @modelcontextprotocol/sdk
// 1.29.0). McpAgent<Env,State,Props>: `this.props` carries per-session identity
// (set by the OAuth provider or the token resolver); register tools in init().

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { publishForWorkspace, PublishError } from "./publish-core";
import { signedDashboardUrl, touchLastSeen } from "./workspace";
import {
  listDocuments,
  searchDocuments,
  getOwnedDoc,
  docViews,
  docComments,
  unpublishDoc,
  updateDoc,
  shareUrl,
} from "./docs";

export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  DOCS: R2Bucket;
  KV: KVNamespace;
  EVENTS: AnalyticsEngineDataset;
  OAUTH_KV: KVNamespace;
  VIEW_COUNTER?: DurableObjectNamespace;
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

// ChatGPT wire requirement: the structured object AND the same JSON as a text
// content block. Used by search/fetch (and fine for the other structured tools).
const jsonResult = (structured: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text: JSON.stringify(structured) }],
  structuredContent: structured,
});

const errResult = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
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

    this.server.registerTool(
      "list_documents",
      {
        title: "List your documents",
        description:
          "List the documents published to ilolink from this workspace, newest first, with their share URLs and view counts.",
        inputSchema: { limit: z.number().int().min(1).max(100).optional() },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ limit }) => {
        try {
          const ws = this.workspaceId();
          const rows = await listDocuments(this.env.DB, ws, limit ?? 20);
          const documents = await Promise.all(
            rows.map(async (d) => ({
              document_id: d.id,
              title: d.title ?? "Untitled",
              share_url: shareUrl(d.slug),
              views: await docViews(this.env.VIEW_COUNTER, d.id),
              created_at: new Date(d.published_at).toISOString(),
            })),
          );
          return jsonResult({ documents });
        } catch (e) {
          return errResult(e instanceof PublishError ? e.message : "Could not list documents.");
        }
      },
    );

    this.server.registerTool(
      "get_analytics",
      {
        title: "Get document analytics",
        description:
          "Summary analytics for one document: views and comment count. Numbers are privacy-first and approximate; deep heatmaps live on the dashboard.",
        inputSchema: { document_id: z.string() },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ document_id }) => {
        try {
          const ws = this.workspaceId();
          const doc = await getOwnedDoc(this.env.DB, ws, document_id);
          const [views, comments, dashboard_url] = await Promise.all([
            docViews(this.env.VIEW_COUNTER, doc.id),
            docComments(this.env.DB, doc.id),
            this.dashboardUrl(ws),
          ]);
          return jsonResult({
            document_id: doc.id,
            views,
            comments,
            share_url: shareUrl(doc.slug),
            dashboard_url,
            note: "Views/comments are approximate and privacy-first. Scroll depth, heatmaps, and referrers are on your dashboard.",
          });
        } catch (e) {
          return errResult(e instanceof PublishError ? e.message : "Could not fetch analytics.");
        }
      },
    );

    this.server.registerTool(
      "update_document",
      {
        title: "Update a document",
        description:
          "Replace a document's content with a new version. The share URL and link stay the same.",
        inputSchema: {
          document_id: z.string(),
          content: z.string().optional(),
          file_base64: z.string().optional(),
          filename: z.string().optional(),
        },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      async ({ document_id, content, file_base64, filename }) => {
        try {
          const ws = this.workspaceId();
          const b = { DB: this.env.DB, DOCS: this.env.DOCS, KV: this.env.KV };
          const res = await updateDoc(b, ws, document_id, { content, file_base64, filename });
          return textResult(`Updated. Same link: ${res.share_url}`, {
            document_id,
            ...res,
          });
        } catch (e) {
          return errResult(e instanceof PublishError ? e.message : "Update failed — please retry.");
        }
      },
    );

    this.server.registerTool(
      "unpublish_document",
      {
        title: "Unpublish a document",
        description:
          "Take a document offline so its link stops working. Reversible from your dashboard; the document is not permanently deleted.",
        inputSchema: { document_id: z.string() },
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      },
      async ({ document_id }) => {
        try {
          const ws = this.workspaceId();
          const slug = await unpublishDoc(this.env.DB, this.env.KV, ws, document_id);
          return textResult(`Unpublished. ${shareUrl(slug)} now returns 404. Reverse it from your dashboard.`, {
            document_id,
            unpublished: true,
          });
        } catch (e) {
          return errResult(e instanceof PublishError ? e.message : "Unpublish failed — please retry.");
        }
      },
    );

    // ChatGPT compatibility: read-only search + fetch over the workspace's docs.
    this.server.registerTool(
      "search",
      {
        title: "Search your ilolink documents",
        description:
          "Search the documents you have published to ilolink by title. Returns matches with their ids and share URLs.",
        inputSchema: { query: z.string() },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ query }) => {
        try {
          const ws = this.workspaceId();
          const rows = await searchDocuments(this.env.DB, ws, query);
          return jsonResult({
            results: rows.map((d) => ({
              id: d.id,
              title: d.title ?? "Untitled",
              url: shareUrl(d.slug),
            })),
          });
        } catch (e) {
          return errResult(e instanceof PublishError ? e.message : "Search failed.");
        }
      },
    );

    this.server.registerTool(
      "fetch",
      {
        title: "Fetch an ilolink document summary",
        description:
          "Fetch metadata and a stats summary for one of your ilolink documents by id. Never returns the raw document body.",
        inputSchema: { id: z.string() },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async ({ id }) => {
        try {
          const ws = this.workspaceId();
          const doc = await getOwnedDoc(this.env.DB, ws, id);
          const [views, comments] = await Promise.all([
            docViews(this.env.VIEW_COUNTER, doc.id),
            docComments(this.env.DB, doc.id),
          ]);
          const url = shareUrl(doc.slug);
          const text = `${doc.title ?? "Untitled"} — ${doc.source_type} document published ${new Date(doc.published_at).toISOString().slice(0, 10)}. ${views} views, ${comments} comments. Visibility: ${doc.visibility}. Open: ${url}`;
          return jsonResult({
            id: doc.id,
            title: doc.title ?? "Untitled",
            text,
            url,
            metadata: { views, comments, visibility: doc.visibility, format: doc.source_type },
          });
        } catch (e) {
          return errResult(e instanceof PublishError ? e.message : "Fetch failed.");
        }
      },
    );
  }
}
