# ilolink MCP Connector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people publish to ilolink from inside Claude (one-click OAuth) and ChatGPT (manual tokenized URL) via MCP tools, no account, reusing the existing sanitize→R2→D1→KV publish pipeline.

**Architecture:** One new standalone Worker (`mcp-worker/`, sibling of `content-worker/`) on `mcp.ilolink.com`. It runs a Cloudflare Agents SDK `McpAgent` (SQLite Durable Object per session). Two front doors resolve to one `workspace_id`: `/mcp` wrapped by `@cloudflare/workers-oauth-provider` (Claude, anonymous workspace auto-provisioned on Authorize) and `/w_XXXX/mcp` resolving a path token (ChatGPT). Downstream everything is identical and shares the app's publish code.

**Tech Stack:** Cloudflare Workers + Durable Objects (SQLite), D1, R2, KV, Analytics Engine, Queues; `agents` SDK (`agents/mcp`), `@modelcontextprotocol/sdk`, `@cloudflare/workers-oauth-provider`, `zod`. Reuses ilolink's pure libs (`lib/sanitize/*`, `lib/publish/formats.ts`).

## Global Constraints

- **Scope boundary:** all work stays inside `/Users/wilsonbright/Desktop/Filen/projects/ilolink` (new `mcp-worker/`, `migrations/`, `lib/` edits, `docs/`). No files outside except this repo's memory dir.
- **PIN & RE-VERIFY VERSIONS BEFORE CODING (non-negotiable).** The research that grounds this plan flagged several identifiers as possibly stale/guessed: the exact MCP SDK package name(s) and whether a v2 split exists (`@modelcontextprotocol/server` is suspect — the published package is `@modelcontextprotocol/sdk`), `ctx.mcpReq`/elicitation call signature, `apiHandlers` map vs `apiRoute`+`apiHandler` on OAuthProvider, and the exact `completeAuthorization({props}) → this.props` field. **Task 1 pins the installed versions and confirms every signature against `node_modules` before any feature code is written.** Treat the snippets in this plan as shape-accurate but subject to that confirmation.
- **No `env()` in the MCP worker.** `lib/cf.ts` `env()` uses OpenNext's `getCloudflareContext()`, which exists only inside the Next app. The MCP worker (like `content-worker`) has NO access to it. Storage code it shares MUST take explicit bindings.
- **One publish implementation.** Do not fork the sanitizer or a second storage path. Task 2 refactors the storage functions to accept explicit bindings so the app and the MCP worker call the same code.
- **Same sanitize boundary, always.** MCP content is untrusted LLM output. Every publish path ends at `sanitizeDocument()` and serves from isolated `view.ilolink.com` under the existing strict CSP. No exceptions because "an AI made it."
- **Tiny tool outputs.** Return links + short summaries via `content` (human) + `structuredContent` (typed). Never return raw document bodies through the tool channel. Claude caps tool results ≈150k chars.
- **Token path URL is a bearer secret.** Unguessable tokens, per-workspace quotas, rotate action, never log full tokens.
- **Reuse `SourceType`/formats.** The existing `detectFormat`/`renderContent` in `lib/publish/formats.ts` already handles md/html/json/csv/image; PDF/DOCX land via the same binary path added this week.

## Reuse map (verified against the codebase)

| Concern | Reuse | Note |
|---|---|---|
| Render + sanitize | `lib/publish/formats.ts`, `lib/sanitize/{html,markdown,csv}.ts`, `lib/sanitize/csp.ts` | PURE (Web Crypto only). Import via `../../lib/...` like `content-worker` does. |
| Store version (R2) | `lib/publish/pipeline.ts` `storeVersion`/`storeBinaryVersion` | **Uses `env()` indirectly via `putBody`/`createVersion` → REFACTOR (Task 2).** |
| D1 rows | `lib/db/documents.ts` `createDocument`/`createVersion`/`writeSlugRecord` | **Uses `env()` → REFACTOR (Task 2).** |
| Slug gen/validate | `lib/slug.ts` | Check for `env()`; pure if not. |
| KV slug record | `writeSlugRecord` | Refactored to take `KV` binding. |

## Environment / user actions required (cannot be done by the agent alone)

1. **`mcp.ilolink.com` custom domain** — DNS + Worker custom-domain route. `ilolink.com` is on Cloudflare; the agent will attempt to add the custom domain via wrangler using `.cf.env`, but if cert/DNS provisioning needs the dashboard, the user completes it. Phase 0 can proceed on the `*.workers.dev` URL.
2. **`OAUTH_KV` namespace** — create a new KV namespace (agent can via `wrangler kv namespace create OAUTH_KV`).
3. **Claude account** — the real "Add to Claude" OAuth handshake requires the user to click Authorize in claude.ai. Agent verifies up to that boundary with MCP Inspector + `/.well-known` curl checks.
4. **ChatGPT Plus+/Developer Mode** — needed to live-test the ChatGPT path (Phase 2).

---

## File Structure

- `mcp-worker/wrangler.jsonc` — new worker; DO binding `MCP_OBJECT`, `OAUTH_KV`, shared `DB`/`DOCS`/`KV`/`EVENTS`/`JOBS`, `nodejs_compat`, migration `new_sqlite_classes`, route `mcp.ilolink.com/*`.
- `mcp-worker/src/index.ts` — worker entry: path branch (`/mcp` OAuth-wrapped vs `/w_*/mcp` token), `OAuthProvider` wiring, `.well-known` handled by the lib.
- `mcp-worker/src/agent.ts` — `IlolinkMCP extends McpAgent<Env, State, Props>`; `init()` registers tools; `resolveWorkspace()`.
- `mcp-worker/src/authorize.ts` — the OAuth `defaultHandler`: Authorize page (GET) + silent anonymous provisioning (POST → `completeAuthorization`).
- `mcp-worker/src/workspace.ts` — workspace CRUD (D1), token mint/rotate, signed dashboard URL.
- `mcp-worker/src/tools/*.ts` — one file per tool (publish, update, list, analytics, dashboard-url, unpublish, search-fetch).
- `mcp-worker/src/publish-core.ts` — thin adapter calling the refactored shared pipeline with the worker's bindings.
- `lib/publish/pipeline.ts`, `lib/db/documents.ts`, `lib/r2/store.ts` — refactored to accept explicit bindings (Task 2).
- `migrations/0003_workspaces.sql` — `workspaces` table + `documents.workspace_id`.
- `app/(app)/connect/page.tsx` + `app/api/connect/route.ts` — ChatGPT workspace minting UI + endpoint (Phase 2).
- `app/connect/` "Add to Claude" button on landing/`/connect` (Phase 1).

---

## Phase 0 — Server skeleton (verifiable on workers.dev)

### Task 1: Pin versions & confirm signatures

**Files:** Create `mcp-worker/` (empty), root `package.json` (add deps).

- [ ] **Step 1:** `npm i agents @modelcontextprotocol/sdk @cloudflare/workers-oauth-provider zod` (zod already present).
- [ ] **Step 2:** Confirm real identifiers against `node_modules`, recording findings in a comment block at the top of `mcp-worker/src/agent.ts`:
  - `node -e "console.log(Object.keys(require('@modelcontextprotocol/sdk/server/mcp.js')))"` → confirm `McpServer`, and that `registerTool` exists on an instance.
  - Confirm `agents/mcp` exports `McpAgent` and it has a static `serve`: `node -e "const m=require('agents/mcp');console.log(typeof m.McpAgent, typeof m.McpAgent?.serve)"`.
  - Confirm `@cloudflare/workers-oauth-provider` exports `OAuthProvider` and inspect its constructor option names (grep the package's `.d.ts` for `apiHandler`, `apiHandlers`, `defaultHandler`, `completeAuthorization`, `parseAuthRequest`).
  - Grep the installed `agents` package `.d.ts` for how `this.props` is typed and whether the OAuth `props` flow uses `this.props` (McpAgent) vs `this.ctx.props`.
- [ ] **Step 3:** Write the confirmed signatures into the comment block. If any differ from this plan's snippets, the confirmed form wins.

### Task 2: Refactor shared storage to accept explicit bindings

**Files:** Modify `lib/r2/store.ts`, `lib/db/documents.ts`, `lib/db/client.ts`, `lib/publish/pipeline.ts`. Test: `test/pipeline-bindings.test.ts`.

**Interfaces:**
- Produces: a `PublishBindings` type `{ DB: D1Database; DOCS: R2Bucket; KV: KVNamespace }`; every storage fn gains an optional first-or-last `bindings?: PublishBindings` param that defaults to `env()` when omitted (app keeps working unchanged).

- [ ] **Step 1:** Write a failing test: `storeVersion(docId, raw, html, "md", fakeBindings)` writes to `fakeBindings.DOCS`/`DB` (mocked), not `env()`.
- [ ] **Step 2:** Add `PublishBindings` to `lib/types.ts`. Thread an optional `bindings` param through `putBody`, `getBody` (`lib/r2/store.ts`), `createVersion`, `createDocument`, `writeSlugRecord`, `getDocumentBySlug` (`lib/db/documents.ts`), and the D1 client accessor (`lib/db/client.ts`), each falling back to `env()` when not supplied.
- [ ] **Step 3:** Thread `bindings` through `storeVersion`/`storeBinaryVersion` in `lib/publish/pipeline.ts`.
- [ ] **Step 4:** Run the full existing suite (`npx vitest run`) — all 40 pass unchanged (app path uses the `env()` default) + the new test passes.
- [ ] **Step 5:** `npx next build` clean. Commit.

### Task 3: Minimal McpAgent + `ping` tool on workers.dev

**Files:** `mcp-worker/wrangler.jsonc`, `mcp-worker/src/agent.ts`, `mcp-worker/src/index.ts`, `mcp-worker/tsconfig.json`.

- [ ] **Step 1:** `wrangler.jsonc` — name `ilolink-mcp`, `main src/index.ts`, `compatibility_date` matching the other workers, `compatibility_flags ["nodejs_compat"]`, DO binding `{ name: "MCP_OBJECT", class_name: "IlolinkMCP" }`, migration `{ tag: "v1", new_sqlite_classes: ["IlolinkMCP"] }`. NO custom domain yet (deploy to workers.dev).
- [ ] **Step 2:** `agent.ts` — `export class IlolinkMCP extends McpAgent<Env, {}, Props>` with `server = new McpServer({name:"ilolink",version:"1.0.0"})` and `init()` registering one tool:
  ```ts
  this.server.registerTool("ping",
    { title:"Ping", description:"Health check", inputSchema:{}, annotations:{ readOnlyHint:true } },
    async () => ({ content:[{ type:"text", text:"pong" }] }));
  ```
- [ ] **Step 3:** `index.ts` — `export { IlolinkMCP }` and `export default IlolinkMCP.serve("/mcp")` (confirm signature from Task 1).
- [ ] **Step 4:** Deploy: `wrangler deploy` (with `.cf.env`). Note the `*.workers.dev` URL.
- [ ] **Step 5:** VERIFY: connect via MCP Inspector (`npx @modelcontextprotocol/inspector`) to `https://<workers-dev>/mcp`, confirm `tools/list` shows `ping` and calling it returns `pong`. Record the result. Commit.

---

## Phase 1 — Claude one-click OAuth + `publish_document` (flagship, ship first)

### Task 4: workspaces migration + workspace module

**Files:** `migrations/0003_workspaces.sql`, `mcp-worker/src/workspace.ts`. Test: `test/workspace.test.ts` (pure helpers).

- [ ] **Step 1:** Migration: `workspaces` table per spec §3 **minus** the `users` FK (no `users` table exists — `claimed_by TEXT` plain, nullable, no REFERENCES). Add `ALTER TABLE documents ADD COLUMN workspace_id TEXT;` and `CREATE INDEX idx_workspaces_oauth ON workspaces(oauth_subject);`, `CREATE INDEX idx_documents_workspace ON documents(workspace_id);`.
- [ ] **Step 2:** Apply locally then remote: `wrangler d1 migrations apply ilolink --local` then `--remote`.
- [ ] **Step 3:** `workspace.ts` — `mintWorkspaceId()` → `w_` + `nanoid(16)` (unguessable); `getOrCreateByOauthSubject(DB, subject)`; `getByToken(DB, token)`; `touchLastSeen`; `signedDashboardUrl(workspaceId, secret)` (HMAC via Web Crypto) → `https://ilolink.com/w/<signed>`. Pure crypto — unit-test `mintWorkspaceId` format + HMAC round-trip.
- [ ] **Step 4:** Test + commit.

### Task 5: OAuth wrapping + silent anonymous Authorize

**Files:** `mcp-worker/src/index.ts` (wrap), `mcp-worker/src/authorize.ts`. Also add `OAUTH_KV` to `wrangler.jsonc`.

**Interfaces:**
- Consumes: `OAuthProvider` (confirmed API from Task 1), `completeAuthorization({request,userId,scope,props})`.
- Produces: on the `/mcp` path, `this.props` inside the agent carries `{ workspaceId, origin:"claude_oauth" }`.

- [ ] **Step 1:** `wrangler kv namespace create OAUTH_KV`; add the binding to `wrangler.jsonc`.
- [ ] **Step 2:** `authorize.ts` `defaultHandler`: GET `/authorize` renders a minimal branded Authorize page (reuse ilolink tokens/copy, run through `stop-slop`); POST `/authorize` → `parseAuthRequest`, `getOrCreateByOauthSubject` (subject = a stable per-grant id; for anonymous, generate + persist a UUID as the subject on first authorize), then `completeAuthorization({ request, userId: workspaceId, scope, props:{ workspaceId, origin:"claude_oauth" } })`. The complete page shows the signed dashboard URL with copy + "bookmark this" nudge.
- [ ] **Step 3:** `index.ts` — wrap with `new OAuthProvider({ authorizeEndpoint:"/authorize", tokenEndpoint:"/token", clientRegistrationEndpoint:"/register", apiHandler: IlolinkMCP.serve("/mcp"), defaultHandler, scopesSupported:["publish"] })` (reconcile `apiHandler` vs `apiHandlers` per Task 1). Keep `export { IlolinkMCP }`.
- [ ] **Step 4:** In `IlolinkMCP.resolveWorkspace()`: read `this.props.workspaceId` (OAuth path).
- [ ] **Step 5:** VERIFY: `curl -i https://<host>/.well-known/oauth-authorization-server` returns metadata with `code_challenge_methods_supported: ["S256"]`; unauthenticated `/mcp` returns 401 with `WWW-Authenticate: Bearer resource_metadata=...` (Claude requires this). Record outputs. Commit.

### Task 6: `publish_document` tool on the shared pipeline

**Files:** `mcp-worker/src/publish-core.ts`, `mcp-worker/src/tools/publish.ts`, register in `agent.ts`. Test: `test/publish-core.test.ts`.

**Interfaces:**
- Consumes: refactored `renderAndSanitize` (pure) + `storeVersion`/`storeBinaryVersion`/`createDocument`/`writeSlugRecord` (with `bindings`), Task 4 workspace helpers.
- Input (zod): `{ content?: string, file_base64?: string, filename?: string, format?: enum, title?: string, visibility?: enum default "unlisted", password?: string, expires_at?: string, slug?: string }`.
- Output (structuredContent): `{ document_id, share_url, dashboard_url, visibility, format }`.

- [ ] **Step 1:** `publish-core.ts` `publishForWorkspace(bindings, workspaceId, input)`: detect format (reuse `detectUpload`/`detectFormat`), decode base64 for binary, `renderAndSanitize`, resolve slug (reuse/guard `lib/slug.ts` for `env()`), `createDocument({...,workspace_id})`, `storeVersion`/`storeBinaryVersion`, `writeSlugRecord`. Enforce the payload cap (reject > cap, tell user to use the web app).
- [ ] **Step 2:** `tools/publish.ts` registers the tool with the description written *for the model* (spec §4 wording), `annotations:{ readOnlyHint:false, destructiveHint:false, openWorldHint:true }`, and returns `{ content:[{type:"text",text:"Published. Share: <url>. Your private analytics: <dashboard_url>."}], structuredContent }`.
- [ ] **Step 3:** Unit-test `publishForWorkspace` with fake bindings: asserts a row is created under `workspace_id`, slug written, sanitize applied (script stripped).
- [ ] **Step 4:** VERIFY over MCP Inspector against the OAuth-wrapped deploy (use an Inspector-provided token or the token path if OAuth-in-Inspector is hard): call `publish_document` with a markdown string, open the returned `share_url` on `view.ilolink.com`, confirm it renders sanitized. Screenshot. Commit.

### Task 7: "Add to Claude" surface + help H1

**Files:** `app/(app)/connect/page.tsx` (or landing addition), `app/(marketing)/help/connect-claude/*`.

- [ ] **Step 1:** `/connect` page: an "Add to Claude" section with the server URL `https://mcp.ilolink.com/mcp` and copy-paste manual-add instructions (no unofficial deep link — research found none documented). Run copy through `stop-slop`.
- [ ] **Step 2:** Help article H1 (spec §9) with a "last checked 2026-07-22" date.
- [ ] **Step 3:** Build clean; commit. (Live one-click test deferred to the user's Claude account + custom domain.)

---

## Phase 2 — ChatGPT manual path (same tools, second front door)

### Task 8: token-path resolution + `/connect` minting

**Files:** `mcp-worker/src/index.ts` (path branch `/w_*/mcp`), `app/api/connect/route.ts`, `/connect` page additions.

- [ ] **Step 1:** In `index.ts`, before the OAuth wrap, branch: if pathname matches `/w_[A-Za-z0-9]+/mcp`, extract the token, `getByToken(DB, token)`; unknown → JSON-RPC error "your workspace URL looks wrong — mint a new one at ilolink.com/connect"; else route to `IlolinkMCP.serve` with `props:{ workspaceId, origin:"chatgpt_token" }` (via the non-OAuth `routeAgentRequest` props path — confirm signature).
- [ ] **Step 2:** `app/api/connect/route.ts` POST → mint workspace (`origin:"web"`/`chatgpt_token`), return `{ connector_url:"https://mcp.ilolink.com/w_XXXX/mcp", dashboard_url:"https://ilolink.com/w/w_XXXX" }`. Rate-limit + Turnstile (reuse).
- [ ] **Step 3:** `/connect` "Create my ilolink workspace" button + the bearer-secret warning + copy buttons.
- [ ] **Step 4:** VERIFY: `curl` the tokenized `/w_XXXX/mcp` via MCP Inspector, `tools/list` + `ping`. Commit.

### Task 9: `search` + `fetch` (ChatGPT compatibility) + help H2

**Files:** `mcp-worker/src/tools/search-fetch.ts`, `app/(marketing)/help/connect-chatgpt/*`.

- [ ] **Step 1:** `search({query})` → `{ results:[{ id, title, url }] }` over the workspace's docs (url = share_url). `fetch({id})` → `{ id, title, text, url, metadata }` where `text` is the analytics/metadata summary, **never** the raw untrusted body. Return each as `structuredContent` AND a stringified `content[0].text` (ChatGPT wire requirement). `readOnlyHint:true`.
- [ ] **Step 2:** Help H2 with "last checked" date; note the Developer-Mode toggle path is UI-volatile (verify live).
- [ ] **Step 3:** VERIFY over Inspector. Commit.

---

## Phase 3 — Read tools + dashboard + safety

### Task 10: `list_documents`, `get_analytics`, `get_dashboard_url`, `update_document`, `unpublish_document`

**Files:** `mcp-worker/src/tools/*.ts`, register in `agent.ts`.

- [ ] Each tool workspace-scoped, correct annotations: reads `readOnlyHint:true`; `update_document` `destructiveHint:false`; `unpublish_document` `readOnlyHint:false, destructiveHint:true` + an `elicitInput` confirm gate (confirm the call signature from Task 1 — flagged uncertain). `unpublish` is soft/reversible; NO hard delete over MCP. `get_analytics` reuses the app's analytics query but via the worker's `EVENTS`/`DB` bindings (may need a small refactor mirroring Task 2). Verify each over Inspector.

### Task 11: login-free dashboard + safety (quotas, rotate, abuse)

**Files:** `app/(app)/w/[token]/page.tsx` (signed/token dashboard), `mcp-worker/src/workspace.ts` (rotate), rate-limit helpers, abuse queue hook.

- [ ] Signed/token dashboard route (no login; the link is the key). Per-workspace quotas + IP rate limits (KV counters). Dashboard "Rotate token" action. Queue a content-abuse check on publish (reuse the app's queue). Verify quota enforcement + rotation invalidates the old token.

---

## Phase 4 — Future (not in this plan)

Email-claim upgrade; Claude connector **directory submission** (needs a Team/Enterprise org, public privacy policy, per-tool `title`+hints, the 11-step portal — NOT a "one-click web deep link"; research confirmed none is documented). Optional ChatGPT App listing for one-click there. Track in the spec's §10 open decisions.

---

## Self-Review notes

- Spec §4 tools all mapped (Tasks 6, 9, 10). §3 identity both branches (Tasks 5, 8). §5 install flows (Tasks 7, 8). §7 security threaded (sanitize reuse constraint, Task 11). §9 help docs (Tasks 7, 9; H3/H4 fold into those).
- **Biggest risk = version drift** in the MCP/OAuth/agents SDKs. Task 1 gates all feature code on pinning real signatures. Do not skip it.
- **`get_analytics` reuse** may need the same bindings refactor as Task 2 for `lib/analytics/*` (they call `env()`); fold that into Task 10 when reached.
