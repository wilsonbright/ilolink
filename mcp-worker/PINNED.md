# Pinned SDK signatures (confirmed against node_modules, 2026-07-22)

Versions: `agents@0.17.4`, `@modelcontextprotocol/sdk@1.29.0`, `@cloudflare/workers-oauth-provider@0.8.2`, `zod@4.4.3`.

Research flagged several identifiers as possibly stale/guessed. Confirmed against installed code:

## agents/mcp — McpAgent  (dist/agent-tool-types-*.d.ts)
- `abstract class McpAgent<Env extends Cloudflare.Env, State, Props extends Record<string,unknown>> extends Agent<Env,State,Props>`
- `props?: Props` — instance field, read as **`this.props?.x`** (NOT `this.ctx.props` for McpAgent).
- `abstract server: McpServer` ; `abstract init(): Promise<void>`.
- `static serve(path, { binding?, corsOptions?, transport?, jurisdiction? }?): { fetch }` — Streamable HTTP default.
- `static serveSSE(path, opts?)` and `static mount(path, opts?)` — legacy.
- `elicitInput({ message, requestedSchema }, options?): Promise<ElicitResult>` — a method **on the agent** (the researched `ctx.mcpReq.elicitInput` does NOT exist).
- Also exported: `getMcpAuthContext()`, `createMcpHandler(...)`.

## @modelcontextprotocol/sdk — McpServer  (server/mcp.js)
- Import `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"`.
- `new McpServer({ name, version })`; both `.registerTool(name, config, cb)` and `.tool(...)` exist.
- **No `@modelcontextprotocol/server` package** — the researched "v2 split" was fabricated. It's the single `@modelcontextprotocol/sdk`.
- `registerTool(name, { title?, description?, inputSchema?, outputSchema?, annotations?, icons?, _meta? }, cb)`. `inputSchema` = a zod raw shape `{ field: z.string() }` or `z.object`.
- Return `{ content: [{ type:"text", text }], structuredContent? , isError? }`.

## @cloudflare/workers-oauth-provider — OAuthProvider 0.8.2  (dist/oauth-provider.d.ts)
- `new OAuthProvider({ defaultHandler (required), authorizeEndpoint, tokenEndpoint, clientRegistrationEndpoint?, scopesSupported?, ... })`.
- API handler: **either** `apiRoute: string|string[]` + `apiHandler` **or** `apiHandlers: Record<route,handler>` — mutually exclusive (both are real; research's "inconsistency" was two valid forms).
- Props: encrypted into the access token, exposed to the API handler as **`this.props`** (MCP) / `ctx.props`.
- Helpers via `OAuthHelpers` interface: `parseAuthRequest(request)`, `lookupClient(clientId)`, `completeAuthorization(options)`, `createClient`, `listClients`. Get them with `getOAuthApi(options, env)` (NOT auto-injected as `env.OAUTH_PROVIDER` in this version — verify access path when wiring authorize.ts).
- `completeAuthorization({ request, userId, metadata, scope, props, revokeExistingGrants? }) → { redirectTo }`. `props` flows to `this.props`.
- Requires a KV namespace binding (wire in Task 5).
