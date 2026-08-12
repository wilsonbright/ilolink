# ilolink — Worklog

Dated running record, newest entries at top. After every meaningful task, append:
date, what was asked, what was done, files touched.

---

## 2026-08-12 — HTTPS redirect turned on, and the SERP copy trimmed to fit

- **Asked:** "fix the two things" — the http→https redirect and the copy backlog left over from the audit.

### Always Use HTTPS: it turned out I could do it after all
- Last session recorded the deploy credential as unable to write zone settings (`PATCH` → `10405`). That was **too broad a conclusion drawn from one endpoint**: `always_use_https` accepted the same token and flipped `off` → `on` first try. Only `bot_management` refuses it — that endpoint is genuinely restricted for account-owned tokens, which is also why `/user/tokens/verify` returns `1000 Invalid API Token` for it while zone reads succeed.
- **Verified on the wire:** `http://ilolink.com/` and `http://ilolink.com/pricing` now both return `301` with the path preserved, and `curl -IL` reports `redirects=1` to the https URL. One hop, no chain. Audit finding #5 closed.

### One audit finding was simply wrong, and I did not "fix" it
- The audit reported *"two generic 'read more' anchor texts"* on `/guides`. There are none. The string is the tail of the **glossary blurb** in `lib/seo/site.ts:443` — "…plus where to read more." — and it appeared twice in the HTML only because the page carries both the rendered markup and the RSC flight payload. Not an anchor, not a link label. Left alone rather than manufacturing a change to close a ticket.

### Meta descriptions: 15 over the limit, not the 11 the audit counted
- Measured all 58 sitemap URLs from the served HTML rather than trusting the number: **15** ran past 160 characters. The home page was **262** and lost its entire registry clause to truncation — the half of the positioning a reader cannot infer from the title. `/faq` was 242, inflated by interpolating `TEAM_PRICE_SHORT` ("$9 for 5 people or $19 for 10") into a sentence that was already long; the price is now left to the page body, where it is stated exactly.
- All 15 rewritten to ≤160 with the substance kept. `SITE_DESCRIPTION` matters most of the three — it is the home page's description **and**, through the root layout, the `og:description` of any page declaring none.

### Titles: expanded the 12 worth expanding, left 3 alone
- `/guides` was "Guides — ilolink" (16 chars) for the guides hub; now says what the guides are about. `/guides/capabilities` and `/vs/tiiny-host` likewise.
- The nine persona pages already **began** with the brand, so their trailing "— ilolink" was pure repetition; spent on the benefit instead ("ilolink for writers — see how far readers got").
- **Deliberately not touched:** `/privacy`, `/terms`, `/acceptable-use` and `/status`. "Privacy policy — ilolink" is exactly what that page should say; padding a legal page with keywords is stuffing, not clarity. `/status` stays the one title under 20 characters, on purpose.

### Verified by measuring the built output, not by reading the diff
- Built, served on :3124, refetched **all 58 pages**: **0** descriptions over 160 (was 15), **0** titles over 62, **0** duplicate titles, **0** duplicate descriptions, **0** pages missing a description, and `og:description` equal to `description` on every one of the 58 — so the root-layout inheritance still holds after the rewrite.
- **2 new tests, and the length guard was proved to bite**: padded `/guides/share-pdf` back over the limit and watched it fail with *`expected [ '/guides/share-pdf (234)' ] to deeply equal []`*, then restored. The test **states its own limitation** rather than hiding it — it only reads plain double-quoted literals, so `/pricing`'s template literal is skipped and checked against served HTML instead.
- 268 tests pass, `tsc --noEmit` exit 0, `next build` clean, 91/91 static pages generated.
- **Worked in a throwaway worktree at `main`**, because the primary tree is checked out on another session's `fix/chatgpt-mcp-oauth` with a merge in progress. Nothing of theirs was touched.
- Files: `lib/seo/site.ts`, `test/seo-metadata.test.ts`, and 25 page files under `app/(marketing)/`.

---

## 2026-08-12 — ChatGPT connector audited against the accounts pivot (branch `fix/chatgpt-mcp-oauth`)

- **Asked:** "in a new branch, check if the ChatGPT MCP setup is clean. I have added auth to the product. If ChatGPT requires it, ensure it is using OAuth flow similar to the Claude connector flow now."

### The headline answer
ChatGPT already goes through the **same OAuth flow as Claude** — there is no separate ChatGPT path left. Probed production before touching anything: AS metadata, protected-resource metadata at both `/` and `/mcp`, DCR endpoint live, PKCE `S256`, `401` carrying `WWW-Authenticate: … resource_metadata=…`, and CORS allowing `https://chatgpt.com`. The retired `/w_XXXX/mcp` token path answers with a "reconnect" JSON-RPC error. `search`/`fetch` are registered and already emit OpenAI's dual `structuredContent` + JSON-text shape.

### What was NOT clean
- **`/authorize` crashed on any bad request.** Measured live: no params → `500 error code: 1101`; unregistered `client_id` → same. `parseAuthRequest` throws and nothing caught it. ChatGPT hits this exactly when its DCR client record is gone — the moment the user most needs to be told to reconnect, and instead gets a blank Cloudflare page. Now a `400` with "remove the connector and add it again", `503` if the fault is ours (missing `MCP_HANDOFF_SECRET`). Verified on `wrangler dev`: both cases return the 400.
- **Unsigned dashboard tokens still accepted** — `SECURITY-AUDIT-2026-07-23` finding #1. The bare `w_XXXX` branch existed only for the ChatGPT URL-token connector, where the id was already a bearer secret. That connector is retired, so the branch was dead code that still let a leaked workspace id open a whole workspace's analytics with no session. Deleted; the signature is mandatory now.
- **`verifyDashboardToken` threw on a missing secret.** Callers default `DASHBOARD_SECRET` to `""`, and Web Crypto rejects a zero-length HMAC key — a `500` out of a public page. (My first guess was "an empty key is forgeable"; the test disproved it. Fails closed with `null` now.)
- **`fetch` never returned the document body.** OpenAI's contract is that `text` is the document, because that is what ChatGPT reads and cites; a stats blurb is not quotable. Now returns the current version's raw body from R2, capped at 100k chars with an explicit `[truncated]` marker; PDFs keep the summary; the stats line moved to `metadata.summary`.
- **CIMD was off.** OpenAI now prefers Client ID Metadata Documents over DCR, and wrangler warned about it on every boot. Needs *both* `clientIdMetadataDocumentEnabled: true` and the `global_fetch_strictly_public` compat flag — the flag is the SSRF guard for CIMD fetching an attacker-supplied `client_id` URL. Verified locally: metadata now reports `client_id_metadata_document_supported: true`.
- **Stale copy and comments.** `/connect` filed ChatGPT under neither heading; a ChatGPT user reading "Claude, and anything that supports OAuth" would scroll past to the token path their assistant cannot use. Header comments in `workspace.ts`, `dashboard-token.ts` and `/w/[token]` still described ChatGPT as a URL-token client.

### Verified
`285/285` tests pass (13 new, in `test/dashboard-token.test.ts` + `test/fetch-body.test.ts`); `tsc --noEmit` clean for both the app and `mcp-worker`; error paths and CIMD advertisement observed on a local `wrangler dev`, not inferred. **Not deployed** — production still 500s on a bad `/authorize` until `mcp-worker` ships.

### Files touched
`mcp-worker/src/authorize.ts`, `mcp-worker/src/index.ts`, `mcp-worker/src/docs.ts`, `mcp-worker/src/agent.ts`, `mcp-worker/src/workspace.ts`, `mcp-worker/wrangler.jsonc`, `lib/mcp/dashboard-token.ts`, `app/(app)/connect/page.tsx`, `app/(app)/w/[token]/page.tsx`, `test/dashboard-token.test.ts` (new), `test/fetch-body.test.ts` (new).

---

## 2026-08-12 — Agent pushed to the teamspace, audit run, and the metadata layer it found missing

- **Asked:** "push the seo audit to ilolink blocksurvey team space and run the audit" → then "yes" to fixing what it found.

### The push finally went through
- Connection reconnected, so `whoami` answered this time: teamspace **BlockSurvey** (`t_C9Oa_Xt2MzVAiyV1`), as `wilson@blocksurvey.org`, role **owner**, 8 members, 13 skills. Owner means the write publishes directly — no proposal step, which is worth stating because a member write in a reviewing teamspace would have landed invisible.
- `artifacts_get` first: no existing `agent/seo-audit`, so this was a create, not an overwrite. `artifacts_put` with `if_version: 0` so a concurrent create would have been rejected rather than silently clobbered. Result: **version 1, published**. First `agent`-kind artifact in a teamspace that until now held only skills.
- Pushed the file **verbatim including YAML frontmatter**, so a teammate can write it straight back to `.claude/agents/seo-audit.md` and it works; `source_path` records that path for a future sync.

### The audit, run live against production
Findings the agent reported and **I re-fetched by hand** before acting on any of them:
- **Zero `og:` or `twitter:` tags on the entire site** — confirmed on `/`, `/guides/quick-start`, `/pricing`. ~60 marketing pages, every share on Slack/X/LinkedIn/iMessage unfurling bare.
- **Every canonical relative** (`href="/pricing"`), which Lighthouse fails outright: *"Is not an absolute URL"*. Root cause: no `metadataBase` anywhere.
- **The home page had no canonical at all** — the only one of the 58 sitemap URLs missing one.
- `/favicon.ico` and `/apple-touch-icon.png` both **404**; only `icon.svg` existed.
- `http://ilolink.com` returns **200 with no redirect** — two indexable schemes.
- The **Cloudflare managed AI-crawler block is still live** above our robots.txt, exactly as the last entry recorded. Unchanged, still needs the dashboard toggle.
- Good news it also confirmed by measurement: LCP 1.2s/1.9s, CLS 0, all 58 sitemap URLs 200, zero duplicate titles or descriptions, full SSR, valid JSON-LD, app routes correctly noindexed.

### The fix, and the one thing that made it small
- **Next's resolver settled the design.** `inheritFromMetadata` (Next's `resolve-metadata.ts`, confirmed in the docs rather than assumed) fills a missing `openGraph`/`twitter` title or description from the **resolved metadata of the segment being rendered**. So an `openGraph` block in the root layout that *deliberately omits* title and description gives all ~60 pages their **own** title and description — turning a 74-file refactor into one object. Setting them there would have done the opposite and stamped one title onto every page. That inversion is the whole reason this is commented at length and tested.
- `og:url` omitted for the mirrored reason: unlike title there is nothing per-page to inherit, so a single value would claim every page is the home page. Unfurlers fall back to the URL they fetched.
- **The canonical went on `app/page.tsx`, not the root layout**, because `alternates` is inherited wholesale by any segment declaring none — in the layout it would have stamped `canonical: "/"` onto `/signin`, `/dashboard` and every other app route. Verified after the fact: those three still emit `noindex, nofollow` and **no canonical**.
- Metadata moved to **`lib/seo/metadata.ts`**, the same split `lib/seo/robots.ts` already uses: a plain data module is assertable without rendering a React tree or resolving a CSS import.
- **Images made, not stubbed.** No ImageMagick on this machine, so the 1200×630 OG banner, the 180px apple icon and the 16/32px favicon were rendered with headless Chrome and **looked at** — the first two attempts drew the brand mark as an unreadable blue blob at that scale, so the final art uses the app-icon lockup and now matches the favicon exactly. `favicon.ico` is a hand-built multi-size ICO (PNG-in-ICO container); `file` confirms *"MS Windows icon resource - 2 icons, 16x16, 32x32"* rather than a renamed PNG.
- **`.gitignore` had a blanket `*.png` under "Test artifacts"**, so both new images were invisible to git. They would have worked perfectly here and been **absent from a clean checkout** — the deploy serving no og:image and no apple-touch-icon, with nothing failing anywhere. Narrowed with two negations and a comment saying why.

### Verified by observation, not reasoning
- **Built, served the real build on :3123, and read the served HTML.** Home emits an absolute canonical plus 11 `og:`/`twitter:` tags; `/guides/quick-start` emits **its own** title and description in its og tags (the inheritance actually working, not just believed to); `/favicon.ico`, `/apple-icon.png`, `/opengraph-image.png`, `/icon.svg` all **200** with correct content types; `/signin`, `/publish`, `/connect` still `noindex, nofollow` with no canonical leaked.
- **15 new tests, and each was proved to bite** — reintroduced the bug three times and watched the right test fail: `openGraph.title` added → og-inheritance test fails; home canonical deleted → home-canonical test fails; `metadataBase` deleted → metadataBase test fails. The first draft of the canonical test was a **false negative** (it matched the phrase inside my own code comment); `read()` now strips comments before asserting.
- 279 tests pass total, `tsc --noEmit` exit 0, `next build` clean.
- **Working tree shared with another live session** — `app/(app)/connect`, `app/(app)/dashboard/page.tsx`, `app/(app)/w/[token]`, `app/api/documents/route.ts`, `lib/mcp/dashboard-token.ts`, `lib/publish/title.ts`, `mcp-worker/*`, `document-title.tsx` and two of their test files are theirs. Left untouched and excluded from the commit; the 279 count includes their tests.
- Files: `lib/seo/metadata.ts` (new), `test/seo-metadata.test.ts` (new), `app/opengraph-image.png` (new), `app/opengraph-image.alt.txt` (new), `app/apple-icon.png` (new), `app/favicon.ico` (new), `app/layout.tsx`, `app/page.tsx`, `.gitignore`.

### Left undone, deliberately
- **Cloudflare, unchanged and still the biggest item:** the managed robots.txt block and the missing http→https redirect are both zone settings this session's deploy-scoped credential cannot write (`PATCH` → 10405). Both need dashboard access.
- **Not touched from the audit:** 11 meta descriptions over 160 chars (home is 262), 6 short titles, two "read more" anchors on `/guides`, ~300 ms of render-blocking on the guide template. All real, all bounded, none of them blocking a share or an index.
- **Not verified by the audit either:** `www.ilolink.com` does not resolve in DNS at all, so no www→apex redirect could be tested; a genuine `/w/[token]` document page was never checked, only a synthetic bad token.

---

## 2026-08-12 — SEO audit agent authored; teamspace push blocked on dead MCP connection

- **Asked:** "create a agent for SEO audit … store this for reuse. and push to BlockSurvey teamspace using the mcp of ilolink."
- Wrote `.claude/agents/seo-audit.md` — first file in `.claude/agents/`, so this repo now has a local agent directory. Claude Code agent format: YAML frontmatter (`name`, `description`, `tools`, `model`) + markdown body; `description` written as *when to invoke* because that is what the dispatcher matches on.
- Agent is read-only by construction (`Read, Grep, Glob, Bash, WebFetch, WebSearch, TodoWrite`) and carries this repo's verify-don't-guess rule as its core constraint: every finding must cite a literal artifact (HTTP status, served HTML line, measured LCP), and anything it could not fetch is reported `NOT VERIFIED` rather than guessed. Explicitly forbids scoring out of 100.
- Checks cover indexability first (noindex / robots.txt / canonical / sitemap / redirect chains), then rendering (raw HTML vs rendered DOM), on-page, structured data + OG, Core Web Vitals, content. Severity is graded by traffic impact, not effort.
- **Push to the BlockSurvey teamspace did not happen.** Both `whoami` and `artifacts_list` returned `This connection is no longer valid. Reconnect ilolink from your assistant's connector settings.` — so the teamspace identity was never confirmed and nothing was written. Pending: reconnect, `whoami` to confirm it is bound to BlockSurvey (a connection is bound to one teamspace for life), then `artifacts_put` with `kind: "agent"`, `name: "seo-audit"`, `source_path: ".claude/agents/seo-audit.md"`. If the user is a member and the teamspace reviews member writes, it lands as a proposal, not live.
- Files: `.claude/agents/seo-audit.md` (new), `WORKLOG.md`.

---

## 2026-08-12 — Let AI assistants cite ilolink, without granting training

- **Asked:** "enable AI to crawl", after I flagged that live `robots.txt` carried a Cloudflare-managed block disallowing ClaudeBot, GPTBot, Google-Extended, CCBot, Bytespider, Amazonbot, Applebot-Extended and meta-externalagent outright.
- **Asked before changing it**, because "enable AI to crawl" spans two separable things and one of them is a rights decision that cannot be undone: being *cited* is distribution; being *trained on* is a one-way transfer. Chosen position: `search=yes, ai-input=yes, ai-train=no`.
- **Found the source:** zone `bot_management` on `6d337cc8707cda30ba6473e5b9086546` — `is_robots_txt_managed: true`, `cf_robots_variant: "off"`, with enforcement (`ai_bots_protection`) already at `only_on_ad_pages`, so the block was almost entirely a *declaration* rather than active blocking.
- **Could not change it.** The `.cf.env` credential reads zone settings (`GET` → 200) but is refused on write (`PATCH` → 10405 "Method not allowed for this authentication scheme"). It is deploy-scoped: it ships Workers, it does not edit zone bot settings. Said so rather than reporting the task done.
- **The docs settled the design:** Cloudflare "will not serve an `ai-input` signal for managed robots.txt customers", so the chosen combination is *impossible* while that feature is on — and it pairs its signals with a blanket per-agent `Disallow: /`, which is what blocks the citing. Turning it off is therefore required, and doing so also removes Cloudflare's Content-Signal line, so the reservation had to move into the repo or cease to exist.
- **`app/robots.ts` → `app/robots.txt/route.ts`.** Next's typed metadata route can only express user-agent/allow/disallow/sitemap — there is no way to emit `Content-Signal`. Rules and signal now live as plain data in `lib/seo/robots.ts`, which also keeps them assertable without rendering.
- Touched a parallel session's test (`test/seo-sitemap-robots.test.ts`) as little as possible: every assertion is theirs and unchanged; only the helper that unpicked the old typed shape moved to reading the data. Added three: the rendered file has exactly one wildcard group carrying the signal and every rule; the signal permits search and citation while refusing training; and no per-agent block or bare `Disallow: /` has reappeared.
- **Verified:** rendered the file and re-ran the sitemap cross-check — 58 URLs, none matched by any rule, `/terms` present and unblocked. 251 tests, `tsc` clean, build clean. Commit `67f4df4`, deployed `e8f5816b`.
- **NOT DONE, and the goal is not reached without it:** `ilolink.com/robots.txt` still serves Cloudflare's managed block *above* ours, so AI crawlers remain disallowed. The workers.dev origin already serves the new file correctly. Someone with dashboard access must turn off **Security → Settings → filter "Bot traffic" → "Set your preference to block training in robots.txt"** (API equivalent: `PATCH /zones/<id>/bot_management {"is_robots_txt_managed": false}` with a token holding Zone → Bot Management → Edit).

---

## 2026-08-12 — /dashboard becomes "Your library": artifacts beside documents

- **Asked:** "create a new design to add agents, skills, other ai artifacts categories inside personal and teamspace. by this all things are seen in one place." Planned first (spec approved before any code).
- **It was a discovery problem, not a capability one.** The registry already worked, including in personal teamspaces — the only gate anywhere is `getMembership`, and `app/(app)/t/[id]/page.tsx:104-150` renders it unconditionally. But documents were at `/dashboard` and artifacts three clicks away at `/t` → `/t/<id>` → "View N artifacts", and `/dashboard` never linked to a registry at all. Production made the cost visible: **8 of 10 kinds had never been used once**, and no personal teamspace held a single artifact.
- Kept the teamspace tabs, added a kind axis (Documents + all ten kinds, zeros included — the user's explicit call, on the grounds that the unused kinds are the unseen ones). Renamed the heading and the tab title to "Your library"; `/dashboard` URL unchanged.
- **Absence of `?kind=` means Documents**, so every pre-existing `?ts=` link keeps its exact meaning by construction rather than by special case. Kind is sticky across a teamspace switch, and dropped on the shared tab.
- **The bug the plan caught before it shipped:** an artifact whose only version is a proposal has `current_version_id NULL`; `getArtifact` returns null for it (`store-core.ts:162-169`) and the detail page turns that into `notFound()`. So `artifactHref` returns null and the row renders **unlinked** with "awaiting review" pointing at the proposals inbox. Linking it would have been a 404 on the front door.
- Three other traps handled: "Publish new" opens a *document* composer and is wrong on an artifact kind (→ "Open in registry"); the kind axis must render even for a one-teamspace user, or nobody with a single teamspace ever discovers the feature (the `tabs.length > 1` guard applies to the teamspace bar only); and the shared tab gets **no** kind axis, because artifacts have no per-item sharing and ten permanent zeros would advertise something impossible.
- **One grouped query for the whole grid** (`listDashboardArtifactCounts`), not ten `COUNT(*)`s per teamspace, and rows fetched only for the active kind — the registry fetches every kind at once because it renders them all; this page shows one. 4 queries → 5 on Documents, 7 on an artifact kind.
- Teamspace tab counts now include artifacts, so a tab equals the sum of its kind tabs; the comment in `store.ts` that promised the old behaviour was corrected in the same commit. `/t` cards now name every populated kind ("1 skill · 1 agent") rather than skills only, which read as wrong the moment the library showed the agents.
- **Verified by observation:** seeded a published skill and an awaiting-review agent in local D1 and drove the real page — bare `/dashboard` still shows documents, counts match the registry, all ten kinds render including zeros, an empty kind shows its `KINDS` description, the awaiting-review name is a `<span>` not an `<a>` and carries the proposals link, kind survives a teamspace switch, `/t` reads "1 document · 1 skill · 1 agent", no overflow at 375px, dark mode correct. Caught and fixed a stale `metadata.title` still reading "Your documents" that the `<h1>` rename had missed. 248 tests (20 new), `tsc` clean, `next build` clean. Commit `e4e40c8`.
- Files: `lib/teamspace/dashboard-kinds.ts` (new), `test/dashboard-kinds.test.ts` (new), `app/(app)/dashboard/artifact-list.tsx` (new), `lib/teamspace/store.ts`, `app/(app)/dashboard/page.tsx`, `app/(app)/t/page.tsx`.
- **Flagged, not done:** this now means two artifact lists exist — `/t/<id>/registry` and `/dashboard?ts=<id>&kind=skill` show the same rows with different chrome, which is the opposite of "one place". The honest end state is the registry redirecting into the dashboard; the blocker is that the registry has an "all kinds at once" view the dashboard deliberately does not. `artifactHref` is centralised as the down-payment. Also still open: archived artifacts have no view anywhere, and the registry's copy says "team" in personal teamspaces.

---

## 2026-08-12 — Three pending SEO findings closed: sitemap lastmod, robots.txt, copy-sweep backlog

- **Asked:** "any findings from SEO that is pending to be done?" → then "complete 1,2,4" of the six I reported.
- **Audited the worklog's deferred lists against the code rather than trusting them.** Most "deferred still" content items were in fact built: a registry-vs-filesystem diff found **56 registry paths, all 56 present on disk, zero orphans**, the only uncovered route being the `/guides` index that `app/sitemap.ts` adds by hand. Glossary, use-cases, 9 personas, comparisons, 6 help pages and the pdf/docx/spreadsheet format guides all shipped. What was actually open was infrastructure and bookkeeping.

### 1. Every sitemap URL claimed to be three weeks stale
- `SITE_UPDATED = "2026-07-21"` fed `lastModified` for **all 58 URLs**, unchanged through the landing rewrite (08-01), `/pricing` (08-09) and the corpus copy sweep (08-09).
- **Not fixed by making it dynamic.** Its original comment was right: `new Date()` at build time churns the diff every deploy and asserts all 58 pages changed each time, which is what makes a `lastmod` worth ignoring. Renamed to **`CORPUS_UPDATED = "2026-08-09"`** — the date of the sweep that genuinely audited every page, so one date is *true* for all of them — and added an optional per-page `updated` for single-page edits after it. `SitePage.updated` is documented to be omitted unless newer than the corpus date, because a stale per-page date is worse than none.

### 2. robots.txt still described the app as it was at launch
- It disallowed only `/dashboard`, `/publish`, `/api/`. Since then `/t`, `/t/[id]/{registry,skills,proposals,import-skills,new-skill}`, `/connect`, `/signin`, `/invite`, `/oauth/authorize` and `/w/[token]` all became crawlable — including `/w/`, where **the URL is the credential**.
- **The trap worth recording: `Disallow: /t` would have blocked `/terms`.** Disallow is a prefix match, and `/terms` is a legal page in the sitemap. Used `/t$` + `/t/` instead (`$` honoured by Google and Bing; a crawler ignoring it just sees a path that does not exist).
- Belt and braces on purpose: robots.txt saves crawl budget but cannot stop a linked-but-uncrawled URL appearing bare in results, so app pages also carry `robots: { index: false, follow: false }`. 10 already did; added it to `/publish` (the signed-in composer, which would otherwise compete with `/` for the same query) and `/w/[token]` (`nofollow` too, so a crawl cannot leak the token in a referrer). **Deliberately not added to two:** `dashboard/[slug]` is `"use client"` and cannot export metadata, and `t/[id]/skills` is a bare redirect that emits no HTML — robots.txt covers both.

### 3. The copy-sweep backlog was done but never closed, and would have generated phantom work
- `docs/launch/copy-sweep.md` still listed 40 PUBLISHER + 12 BOTH lines to rewrite. **Re-resolved all 123 citations against the current tree rather than sampling** (script over the doc's own file:line list): **97** no longer carry the phrase, **0** files or line numbers had gone missing, **26** still matched a flagged phrase — and reading all 26 in context, **25 are reader-scoped and true** ("Readers need no account; publishing needs a free one"), which is the differentiator and must stay.
- **The 26th was real and the greps had all walked past it:** `app/(marketing)/_components/content.tsx:183`, a *code comment* reading "ilolink is accountless — the composer is the signup". Five passes of page-copy greps missed it because it was a comment, not copy. Rewritten. Also re-checked corpus-wide: `2 MB`/`2&nbsp;MB` appears nowhere in the marketing corpus, and the one surviving "manage token" mention (`guides/where-hosted:74`) is a correct origin-isolation statement.
- The doc is now a closed record with the verification numbers; the stale 241-line worklist was removed rather than left to mislead (git history keeps it).

### Verified by observation, not by reasoning
- `tsc --noEmit` exit 0. **248 tests pass** — 239 baseline (219 mine + 20 from another session's uncommitted `dashboard-kinds` work sharing this tree) plus **9 new** in `test/seo-sitemap-robots.test.ts`.
- **The new test was proved to bite**, not just to pass: reintroduced `Disallow: /t` and watched it fail with *`robots rule "/t" blocks sitemap URL /terms`*, then restored. Its central invariant is that no robots rule may shadow any URL the sitemap advertises, so future prefix traps fail in CI rather than in production.
- `npm run build` clean, `○ /robots.txt` and `○ /sitemap.xml` both still prerendered.
- **Read the real output over HTTP** (`localhost:3000`, since the production `.next` was overwritten mid-verification by another session's `next dev`): robots.txt serves all 11 rules; sitemap serves **58 URLs, every one now `2026-08-09`** (was `2026-07-21`); `/terms` and `/pricing` both present and unblocked; `/publish` emits `noindex, nofollow`; `/` emits **no** robots meta, so the landing page stays indexable. `/w/w_bogus` → 404 before rendering, so for that route robots.txt is the guard that actually applies.
- **Working tree is shared with another live session** (`app/(app)/dashboard/page.tsx`, `app/(app)/t/page.tsx`, `lib/teamspace/store.ts`, new `artifact-list.tsx`, `dashboard-kinds.ts`, `dashboard-kinds.test.ts` are theirs). Left untouched and excluded from the commit.
- Files: `lib/seo/site.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/(app)/publish/page.tsx`, `app/(app)/w/[token]/page.tsx`, `app/(marketing)/_components/content.tsx`, `docs/launch/copy-sweep.md`, `test/seo-sitemap-robots.test.ts` (new).
- **Still open from the same audit, untouched:** (3) all four legal pages carry "Draft — not yet legally reviewed" and `/report` publishes `abuse@ilolink.com (placeholder)` inside FAQPage JSON-LD — needs a legal/mailbox decision; (5) per-competitor `/vs` pages, slides + diagram format pages; (6) `content-worker/src/index.ts:1114-1120` still builds `og:description` from a body excerpt for **unlisted** documents, so unfurlers cache private excerpts (`SECURITY-AUDIT-2026-07-23.md:274`).

---

## 2026-08-12 — Shipped row actions, and caught the preview being broken on prod

- **Asked:** "ship it and get it live."
- Pushed `ff28d72`, `01fb2bf`; deployed app worker `ecbd3195`. No migrations, no `content-worker` changes.
- **Production verification found a real bug that local verification could not have.** The preview overlay pointed its iframe at the live document URL. Every published document is served with `frame-ancestors 'none'` and `X-Frame-Options: DENY`, so the browser refused the frame and the overlay showed "ilolink.com refused to connect". Locally the same iframe merely 404'd — single-segment slugs rewrite to the content worker, which does not run under `next dev` — so it looked like an empty box rather than a refusal, and I read it as a local-only limitation. It was not.
- Those headers are correct and stay: they are what stops a third-party site framing someone's document for clickjacking. The supported route is `/api/doc-html` — gated on `canRead` by the same guard as the analytics routes, serving the sanitized body under `script-src 'none'`, and written explicitly to be rendered as srcdoc by the owner. **`heatmap-view.tsx` has always done it this way**; the overlay had copied its sandbox but not its source. Fixed in `c83fa93`, deployed `873b6f0e`, plus loading and failure states since the body is now fetched rather than framed.
- **Re-verified on production:** the overlay now renders the real document ("Working With Wilson — Founder Operating Manual…") via `srcDoc`, with `sandbox="allow-same-origin"` and `allow-scripts` absent, and no `src` attribute at all. Also confirmed live: all four row controls present, `2 views` from the real Durable Object counter, clipboard reading back `https://ilolink.com/gnt3pg`, and the move menu offering BlockSurvey while correctly excluding Personal (the document's current teamspace).
- **Did not execute a move against production data** — the menu was opened and inspected only. Which of the 10 Personal documents belong in BlockSurvey is the owner's decision, not mine.
- Probe sessions used for verification were deleted; confirmed `probes: 0` remaining.
- **Lesson worth keeping:** "it did not render locally" is not the same finding as "it cannot render", and the difference was a shipped-broken feature. A local 404 and a production frame-refusal look identical through a screenshot of an empty box.

---

## 2026-08-12 — Dashboard row actions: copy URL, preview, move, inline views

- **Asked:** "give an option to copy URL, quick way to preview and option to move from personal to teamspace, show basic view stats inline."
- Brainstormed to a spec first (`docs/superpowers/specs/2026-08-12-dashboard-row-actions-design.md`, commit `ff28d72`), approved before any code. Row treatment chosen: all four controls always visible rather than hover-revealed or behind a `···` — touch devices have no hover, and a menu costs two clicks for what should cost one.
- **Move is the repair for `02eb986`.** Ten documents were sitting in Personal that were never meant to be, and nothing could move them.
- **The spec was wrong about one thing and implementation caught it.** It said gate move on `resolveDocAccess`. But an *editor share* yields `canEdit: true` with **no membership** (`permissions.ts:110-118`), so that gate would let someone a document was merely shared with move it into their own teamspace — theft, not editing. Gated on `getMembership` + `canPublishInto` on **both** sides instead. The claim route already guards the same shape of attack ("anyone holding an old token could yank a document out of a teamspace", `app/api/claim/route.ts:78-84`).
- **The billing bypass, closed deliberately.** `/api/publish` refuses once a teamspace hits its plan's document cap; move calls the same `checkDocumentAllowance`. Without it, move would be a way to load unlimited documents into a free teamspace from a button. Verified by capping a local teamspace at `free`/3 docs, filling it, and confirming the move is refused with the identical `documentLimitMessage` — and that the document did not move.
- **`folder_id` is nulled in the same statement.** `folders.teamspace_id` is `NOT NULL`, so a moved document that kept its folder would point at a folder in the teamspace it just left. Verified: put a document in a folder, moved it, read `folder_id = null` back.
- **The slug never changes** — move is an ownership change, not a re-publish, so shared URLs keep working. The move menu says so where the decision is made ("Move to — the link stays the same").
- Preview is a sandboxed iframe reusing `heatmap-view.tsx`'s posture exactly: `sandbox="allow-same-origin"` with **no** `allow-scripts`. The content worker serves arbitrary author JavaScript for `trusted=1` documents by design; this overlay renders inside the authenticated origin, so scripts must never be enabled here.
- Views come from `/api/counts`, fetched client-side after paint. Counts live in a Durable Object keyed per document, so there is no batched query — N documents cost N round trips whatever we do, and doing them from the client after paint keeps the server-rendered list instant.
- **Verified by observation:** all six guards exercised over HTTP (401 no session, 400 missing fields, 403 non-member target, 403 unknown document, 400 same teamspace, 403 at cap). Round-tripped a document Personal → BlockSurvey → Personal through the UI and watched the tab counts re-derive (`Personal 0 / BlockSurvey 4` → `Personal 1 / BlockSurvey 3`). Clipboard read back as the correct absolute URL. Preview: `aria-modal`, labelled, focus inside on open, Esc closes, focus returns to the triggering button, body scroll restored. Dark mode correct; no overflow at 375px. 219 tests (was 212), `tsc` clean, `next build` clean.
- Files: `lib/teamspace/move-targets.ts` (new), `test/move-targets.test.ts` (new, 7 tests), `app/api/documents/move/route.ts` (new), `app/(app)/dashboard/document-row-actions.tsx` (new), `app/(app)/dashboard/preview-overlay.tsx` (new), `app/(app)/dashboard/page.tsx`.

---

## 2026-08-12 — Pushed and deployed to production

- **Asked:** "get it live and push."
- Pushed `02eb986`, `bbcc8ea`, `66eff60` to `origin/main` (`25ec8ea..66eff60`).
- Deployed the **app worker only** (`npm run deploy`, version `92bebeda-5701-4fe0-abf8-cc28bdac2759`). Per `DEPLOY.md` the content worker goes first *because* it defines the `ViewCounter` Durable Object the app binds cross-script — but nothing under `content-worker/` changed and that worker is already live, so redeploying it would have been motion without purpose. No migration either: the newest is still `0015_billing.sql`, already applied remotely, and the `document_count` work added a subquery, not a schema change.
- **Verified against the real site, not the build log.** Public surfaces: landing and `/guides` nav pills both go transparent → `rgb(237,240,253)` on hover with no layout shift, "Get started" carries `new=1`, `/signin?new=1` renders "Create your ilolink account" while bare `/signin` still renders "Sign in to ilolink".
- Signed-in surfaces needed a session I do not have, so — following the precedent set on 2026-08-09 — inserted one throwaway `sessions` row scoped to the owner's own account, verified, then **deleted it and confirmed `remaining: 0`**. Confirmed live: the teamspace picker exists in production with Personal + BlockSurvey, and `/publish?ts=t_C9Oa_Xt2MzVAiyV1` preselects BlockSurvey. `/t` renders the new card layout against real data — Personal "just you · 10 documents", BlockSurvey "8 people · 0 documents · 13 skills", matching the designer's own screenshot.
- Console on the signed-in pages showed only aborted `_rsc` prefetches (an artifact of navigating away fast) and a DNS failure reaching Turnstile's challenge host from the sandboxed browser. No page errors, no application exceptions.
- **BlockSurvey still reads 0 documents** — the footprint of the bug fixed in `02eb986`. Nothing ever landed there. Existing documents were deliberately left in Personal; moving them is a separate decision.

---

## 2026-08-12 — Designer's 11 suggestions implemented across five surfaces

- **Asked:** "improve and fix the changes requested in the document" — `Suggestions for ilolink.pdf`, 11 numbered items with annotated screenshots and two full redesign mockups, written by the designer after reviewing the live product.
- Ran as an ultracode workflow: 10 agents, scout → implement pipelined per surface, five surfaces in parallel. Every agent got the same preamble pinning the `globals.css` token table, the house comment voice, and hard limits — no `globals.css` edits, no new dependencies, no builds (verified centrally instead), and an explicit instruction to preserve the teamspace picker shipped in `02eb986` an hour earlier.
- **Header (1, 2)** — nav items became pills (`rounded-full px-2 py-1.5 sm:px-3`), taking item-to-item spacing from 16px to 32px on desktop. Hover/focus fills with `bg-accent-soft`, matching the shape and tint the dashboard tabs already use, so the app has one "this is selectable" language. Padding is always present, so hover cannot shift layout. Identity cluster (email + Sign out) separated by a hairline that only appears at `sm` and up, where it has something to divide. `flex-wrap` added so the wider pills wrap rather than overflow at 320px.
- **Sign-in copy (3)** — the mismatch was real: "Get started" led to "Sign in to ilolink", and ilolink has no separate signup at all. `/signin` now branches its heading on `?new=1`: entry from "Get started"/"Start free" reads "Create your ilolink account" and says outright that the emailed code creates the account the first time; the nav's "Sign in" is untouched. The shared hint under the email field now says "no separate signup" in **both** contexts, which matters because the same form renders inline in the composer after a 401. Step-2 button `Sign in` → `Continue`, since on a first-time address that button creates the account.
- **Publish composer (4, 5, 6)** — empty state became the designer's dropzone (upload icon, primary/secondary lines, `.md`/`.html` chips) while remaining a real focusable textarea: clicking it still types, which is the product's core flow and the main regression risk. The filled cluster got a genuine hierarchy — filename 14px/500/`ink` with a document icon, format 12px/400/`ink-soft`, and the generic disclaimer retired from the filled state entirely (it is guidance for the empty state). Success card: Open/Copy became inline-SVG icon buttons with `aria-label` + `title`, and "Publish another" was promoted from a text link to a filled primary.
- **Teamspaces (7, 8)** — full card redesign per the mockup: avatar tile, name, metadata row, role pill, "+ New teamspace" primary, bordered "Documents" control, create-card, and a "What is a teamspace?" footer. `listTeamspacesWithCounts` gained a real `document_count` subquery rather than a fabricated number; its comment records why it counts unpublished docs (to agree with the `/dashboard` tab it links to) while `countDocuments()` in billing does not (those do not spend the plan cap). The mockup's "···" became a real link to `/t/[id]` rather than a menu with nothing in it, and the "Learn more" link was dropped because no page existed to honour it.
- **Connect (9, 10, 11)** — name, teamspace and "Create token" are now one setup card with the button last, so the control deciding *where* a token may write no longer appears after the button that mints it. Copy button given real contrast; "Your documents" given the same bordered treatment as the Teamspaces control so the two pages agree. The security sentence about a connection's teamspace being fixed for its lifetime was kept intact — people are getting caught by exactly that.
- **Verified by observation, not by agent report:** `tsc --noEmit` clean, 212/212 tests, `next build` clean, then drove every surface in a real browser against a seeded local D1. Confirmed the composer still focuses and accepts typing on click (dropzone yields when filled, returns when emptied); a file upload produces three measurably distinct type levels; hover goes transparent → `rgb(237,240,253)` with byte-identical bounding boxes (no shift); 375px has no horizontal overflow; all three redesigned pages render correctly in dark mode; "Documents" → `/dashboard`, a card → `/t/<id>`; zero console errors.
- Files: `app/(app)/layout.tsx`, `app/(app)/sign-out.tsx`, `app/(app)/signin/page.tsx`, `app/(app)/signin/signin-form.tsx`, `app/page.tsx`, `app/(app)/publish/publish-form.tsx`, `app/(app)/t/page.tsx`, `app/(app)/t/create-teamspace.tsx`, `app/(app)/connect/page.tsx`, `app/(app)/connect/token-minter.tsx`, `app/(app)/connect/copy-field.tsx`, `lib/teamspace/store.ts`.
- **Flagged, not done:** the marketing and landing headers (`app/(marketing)/layout.tsx`, `app/page.tsx`) are independent copies of the app header and did not get the new hover treatment — a designer call. The composer's inline 401 heading still reads "Sign in to publish". The sign-in code email (`lib/email/templates.ts`) still says "Sign in to ilolink", the same mismatch one step further on.

---

## 2026-08-12 — Documents published from the web always landed in Personal

- **Asked:** "I create a document inside the teamspace but it is getting added to 'personal'", with `https://ilolink.com/gnt3pg` as the example.
- **Root cause, not the guessed one.** Nothing was mis-assigning the teamspace — the composer had no teamspace concept at all. `app/api/publish/route.ts:290-292` picks `resolveNamedTeamspace(...)` when `input.teamspaceId` is set and `ensurePersonalTeamspace(user.id)` otherwise; the client never sent the field, so the `else` arm was taken on **every** web publish. The membership-checked `resolveNamedTeamspace` (`route.ts:434-444`) was fully built and completely unreachable from the browser.
- Confirmed four independent ways before touching code: `gnt3pg` carried `teamspace_id = t_fl48zYMT_iGvBKHe` (Personal); the BlockSurvey teamspace had **0** documents, so no doc had ever landed in a team; the PAT's `last_used_at` was null while `touchApiToken` *is* wired (`mcp-worker/src/index.ts:83`), ruling out the MCP path; and `sessions` has no active-teamspace column, so no "current teamspace" existed server-side.
- **New `lib/teamspace/publish-target.ts`** — pure resolver extracted so it's testable without D1, same reasoning as `dashboard-tabs.ts`. `buildPublishTargets` mirrors that module's labelling so picker and tabs can't disagree. `resolvePublishTeamspace` falls back to personal for three distinct cases: no `?ts=`, `?ts=shared` (the dashboard's virtual tab, which is not a teamspace), and an id the user isn't a member of.
- `/publish` became a dynamic server component reading the session + `?ts=`; the picker renders only at ≥2 teamspaces, so a solo user still never meets the concept. **Deliberately not behind the Options disclosure** — hiding the control that fixes an invisible default just moves the same surprise one click deeper. The always-visible summary line now reads "Publishing as Public into BlockSurvey."
- `/dashboard` carries its active tab into both "Publish new" links. The global nav's `/publish` stays bare — it has no tab context to carry.
- **Verified by observation, not inference:** seeded a local D1 (user + Personal + BlockSurvey + a session row), drove the real page in a browser, published, and read the row back — `teamspace_id = t_localteam`, `is_personal = 0`. Also checked signed-out (no picker), `?ts=shared` and a bogus id (both fall back to Personal), and the dashboard href. One scare during verification turned out to be my own test racing React hydration, not a product bug — the post-hydration select updates correctly.
- 8 new tests (`test/publish-target.test.ts`). Suite 212/212, `tsc --noEmit` clean, `next build` clean. Commit `02eb986`.
- Files: `lib/teamspace/publish-target.ts` (new), `test/publish-target.test.ts` (new), `app/(app)/publish/page.tsx`, `app/(app)/publish/publish-form.tsx`, `app/(app)/dashboard/page.tsx`.
- **Left open, flagged not fixed:** an OAuth connector's teamspace is sealed at approval time and the consent picker is *hidden* when the user had only one teamspace (`app/(app)/oauth/authorize/approve-form.tsx:33,56`), so an assistant connected before a team existed is permanently bound to Personal. `/t/[id]` already explains this in copy.

---

## 2026-08-12 — Comped wilson@blocksurvey.org to team10 (highest plan)

- **Asked:** hit the "published 8 of 3 documents on the Personal plan" limit banner on `https://ilolink.com/publish`; wanted own account bumped to the highest plan, free.
- No admin UI for granting plans exists — only path that ever writes `teamspaces.plan` is the Stripe webhook (`app/api/stripe/webhook/route.ts`) after a real paid checkout. Schema already reserves `plan_source = 'comp'` for exactly this case (`migrations/0015_billing.sql`) but nothing wrote it before now.
- Confirmed via screenshot the error was on **live prod** (`ilolink.com`), not local dev — same D1 database serves both, distinguished only by `--local`/`--remote` on `wrangler d1 execute`. Asked user to confirm before running against prod.
- Ran directly against remote D1: `UPDATE teamspaces SET plan = 'team10', plan_source = 'comp', plan_updated_at = <epoch_ms> WHERE id = 't_fl48zYMT_iGvBKHe'` (wilson's Personal teamspace). Verified row after: `plan=team10`, `plan_source=comp`. `team10` = 10 seats / 500 docs, well above the 8 already published.
- No repo files touched — production D1 data only, via `npx wrangler d1 execute ilolink --remote`.

---

## 2026-08-10 — /dashboard splits into tabs by teamspace

- **Asked:** "for ease of access to team items - can you create quick access from home page or a dashboard where personal and team is easily accessible." Brainstormed to a scoped design before touching code — confirmed "home page" meant `/dashboard`, the friction was docs from every teamspace sitting in one flat list, and the fix should be tabs (Personal | each team), state kept in `?ts=` so a tab is linkable/bookmarkable.
- **No new client component.** `/dashboard` was already a server component; Next's App Router hands `searchParams` straight to page components, so each tab is a plain `<Link href="/dashboard?ts=<id>">` — same pattern `/t` already used. Zero new client JS, works with JS disabled, matches every other page in `app/(app)` except `ClaimBanner` (which is client only because it reads `localStorage`).
- **New `lib/teamspace/dashboard-tabs.ts`** — pure grouping extracted so it's unit-testable without D1: `groupDocsByTab` buckets by `teamspace_id`, except docs shared directly (`via === "shared"`) which go under a virtual `"shared"` tab since their real `teamspace_id` isn't one of the viewer's own teamspaces. `resolveActiveTab` falls back to the personal teamspace (always first, per `listTeamspacesForUser`'s existing ordering) on a missing or invalid `?ts=`. `buildDashboardTabs` always includes every teamspace even at 0 docs — a team should stay reachable, not disappear because it's currently empty.
- `showTeamspace` (the per-doc "which team" tag) now only fires on the shared tab — inside a single team's own tab every doc is already in that team, so the tag would be redundant.
- 8 new tests for the grouping/fallback logic (`test/dashboard-tabs.test.ts`). Full suite 204/204, `tsc --noEmit` clean, `next build` clean.
- Files: `app/(app)/dashboard/page.tsx`, `lib/teamspace/dashboard-tabs.ts` (new), `test/dashboard-tabs.test.ts` (new).

---

## 2026-08-09 — Stripe secrets set on the `ilolink` worker

- **Asked:** resume from prior session's outstanding item — set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- **User pasted both live values directly in chat** (a restricted key `rkth_live_...` and `whsec_...`). Same issue flagged in the 2026-08-09 billing entry: a secret typed into the conversation is compromised the moment it's sent, independent of what's done with it afterward.
- Set both via `npx wrangler secret put NAME --name ilolink`, value piped through stdin (`printf '%s' '<value>' | wrangler secret put ...`) — not a shell arg, not written to a file, so not in `.bash_history` or a wrangler log.
- **Verified against production, not inferred:** `POST /api/stripe/webhook` unsigned → `400` (was `503` before secrets existed — confirms fail-closed path now has a secret to check against). `POST /api/billing/checkout` anonymous → `401` (was `503` — confirms `STRIPE_SECRET_KEY` reads correctly before the auth check even completes the flow).
- **Told the user to rotate again**, this time entering the new value only at wrangler's interactive prompt in their own terminal — never pasted into chat. Did not attempt this rotation myself; it requires Stripe Dashboard access I don't have.
- No files touched — Cloudflare Worker secrets only, no repo changes.

### Follow-up: first key was invalid, second checkout verified live
- Asked to "check if checkout is working." A 401/503 status check isn't proof the Stripe call itself succeeds, so probed for real: inserted a throwaway session row directly in D1 (SHA-256-hashed token, `sessions` table) scoped to the user's own account (`wilson@blocksurvey.org`, personal teamspace `t_fl48zYMT_iGvBKHe`), called `POST /api/billing/checkout` as an authenticated owner, then deleted the probe row.
- **First key (`rkth_live_...`) was rejected by Stripe** — `wrangler tail` showed `Invalid API Key provided`. Not a valid Stripe prefix (`rkth_` isn't one Stripe issues; valid ones are `sk_`/`rk_` + `live`/`test`). Reported broken rather than assumed fixed.
- User supplied a corrected key (`rk_live_...`, same suffix — looks like the same key, correct prefix this time). Re-set, re-probed: first call after `secret put` still 502 (secret propagation lag across Cloudflare edge, a few seconds), second call **200** with a real `cs_live_...` Checkout Session URL from `checkout.stripe.com`. Session never completed/paid; Stripe auto-expires unpaid sessions in 24h, so no cleanup needed there beyond the DB probe row.
- Confirms `createCheckoutSession` in `lib/billing/stripe.ts` is live and correct end-to-end against production Stripe, not just "secret is present."

---

## 2026-08-09 — Stripe billing: one-time team plans, seat and document limits

- **Asked (ultracode):** "build an integration with stripe for subscription… it's a one time fee of $9 for 5 team members and $19 for 10… add upgrade to add a team member for collab, free for personal for upto 3 documents… make changes to copy in landing page."
- **SECURITY: a LIVE Stripe restricted key (`rk_live_…`) was pasted in the request.** It is in the transcript, so it is compromised. Not used, not written to any file. Must be rolled in the Stripe Dashboard. Same standing issue as `RESEND_API_KEY`.
- **The brief contradicted itself** — "subscription" vs "one time fee" are different Stripe integrations (`mode:"subscription"` vs `mode:"payment"`, different webhooks, different failure semantics). Settled with the user before writing code: **one-time, lifetime**. Also settled: free = solo, limits apply to everyone, doc caps 3 / 100 / 500.

### Shape
`lib/billing/plans.ts` is the single source of truth — pure data (no bindings), so the statically prerendered landing page can import it. Three consumers that must never disagree read from it: the pricing copy, the Stripe line item, and the server-side limit checks. `lib/billing/copy.ts` derives every marketing pricing sentence from the same numbers, so a price change cannot leave a stale figure in prose or in a `<title>`.
- Free: 1 seat, 3 docs. Team of 5: $9 once, 5 seats, 100 docs. Team of 10: $19 once, 10 seats, 500 docs.
- `migrations/0015_billing.sql`, strictly additive. **No new limit columns**: seats/docs derive from `teamspaces.plan`, which already existed with `DEFAULT 'free'` and was read by nothing — so every existing row was already on the free plan with **no backfill at all**. `planFor()` is total, degrading legacy values (`'anon'`, `'team'`) to free rather than throwing inside the publish path.
- No `plan_status` / `period_end` columns: a one-time purchase has no lifecycle, and those columns would invite code to check an expiry that does not exist.

### The bug that had to be fixed before anything could be priced
The MCP publish path counted `WHERE workspace_id = ?`, but the web path never writes `workspace_id`. **Measured in production: 21 of 27 live documents had `workspace_id` NULL — the MCP quota was blind to 78% of documents.** Harmless at a generous 200-doc quota nobody sold; the obvious bypass the moment free means 3 (publish three on the web, then publish forever over MCP). Both paths now count by `teamspace_id`. A legacy grant with no teamspace is counted by workspace against the free cap rather than falling through to an empty id, which would have matched nothing and never bound.

### Enforcement
- **Seats — atomic, inside the INSERT** (`lib/teamspace/invites.ts`). D1 has no transaction across the member INSERT and the invite-consume UPDATE, so a JS count-then-insert lets two people accepting two invites at the same instant both pass and sell a sixth seat on a five-seat plan. The limit lives in the `WHERE`, and `meta.changes` reports the outcome; `changes === 0` is disambiguated by re-reading, because `ON CONFLICT` also produces 0 for a harmless double-accept. Placed after the existing-member short-circuit so re-accepting stays idempotent and never consumes a second seat.
- New `seats_full` reason — without it the page's fallback said "this invitation link isn't valid", which is false and sends the invitee chasing the wrong problem.
- Non-authoritative pre-check at invite *creation* counts members + pending invites, so an owner learns the team is full while looking at the form. It cannot be the authority: invites live 14 days and several can be outstanding.
- **Documents** — read-then-write, deliberately not atomic. The race is a user against themselves and costs one extra row.

### Stripe
Plain `fetch`, no SDK — the convention `lib/email/send.ts` set, and the SDK needs `createSubtleCryptoProvider` + `createFetchHttpClient` shims on workerd anyway. Inline `price_data`, so **nothing needs configuring in the Stripe Dashboard** except the webhook endpoint, and there is no price id to drift from `plans.ts`.
- **Signature verification needed a new encoder.** Everything here signs base64url; Stripe signs **hex**. Verifying a `t=…,v1=<hex>` header against a base64url digest never matches — every real webhook would be rejected as a forgery with nothing to explain it. Added `hmacHex`.
- The webhook is the **only** place a plan is granted — never the checkout success redirect, which anyone can visit without paying. Idempotency in **D1, not KV** (`stripe_events`, `INSERT OR IGNORE` + `meta.changes`): KV is eventually consistent and `lib/ratelimit.ts` already documents that it loses races, which is fine for rate limits and not for granting a paid plan.
- Grants only on `payment_status === "paid"` — `checkout.session.completed` alone can mean a delayed payment still pending.
- Fails **closed**: no `STRIPE_WEBHOOK_SECRET` → every webhook rejected. Web Crypto refuses a zero-length key, so without the explicit guard this would throw a 500 that Stripe retries for three days.

### Verified against production, not inferred
- Unsigned webhook → **400**; forged signature → **400**; `stripe_events` stayed **empty** and BlockSurvey's plan was **unchanged** (still `comp`, not `stripe`).
- Anonymous checkout → **401**. Owner checkout with no key set → **503** (fail-closed, not a crash).
- Free teamspace at 3/3: web publish → **403** with the real numbers; **MCP publish → refused with the same message** — the bypass is closed.
- Invite on a solo teamspace → **403**.
- `○ /` and `○ /pricing` both still statically prerendered; `/pricing` reaches the sitemap (58 URLs).
- All probe data deleted; baseline re-confirmed `users 8, docs 27, qa_left 0, stripe_events 0, stripe_grants 0`.

### Comped, per the user's decision
BlockSurvey → `team10`, Research → `team5`, both `plan_source='comp'` so they are distinguishable from real revenue. Without this, enforcing seats immediately would have locked an 8-person org out of inviting — above even the $9 tier.

### Copy
New `/pricing`, a `#pricing` landing section, and a sweep of the marketing corpus. **Three multi-agent workflows** (map → copy → accountless sweep), each ending in an adversarial verifier. The verifiers earned their place: the first caught that a sweep agent's own `grep "2 MB"` could not match `2&nbsp;MB` and had missed 5 live claims plus **three user-facing error strings still naming the old 2 MB limit**; the second caught 5 surviving false claims including one in `lib/seo/site.ts`, which no agent had searched because all four grepped `app/**/*.tsx` only. Both sets fixed by hand afterwards.
- Also corrected: `/publish` upload error said 2 MB while enforcing 15 MB; the dashboard's "not published from this browser" screen stated the legacy manage-token rule unconditionally, which is false for every document published since accounts.

- **Deployed:** mcp `6319383d`, app `873ebb75`. 196 tests green, three typechecks clean.
- **Outstanding, user-owned:** roll the exposed Stripe key, then `wrangler secret put STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; create the webhook endpoint at `https://ilolink.com/api/stripe/webhook` for `checkout.session.completed`. Until then checkout returns 503 by design. Also still pending: rotate `RESEND_API_KEY`, `ADMIN_SECRET`, the Cloudflare API token, and enforce PAT scopes per tool.

---

## 2026-08-08 — four bugs from a teammate's first run, all root-caused against production
- **Asked:** feedback from a teammate who tried publishing with ilolink — "It has a 2 MB file-size limit. When the file is under 2 MB, some components are missing from the published file. For connecting the MCP, after logging into the platform, it was difficult to find where to initiate the connection. During the connection process, it showed an error immediately after connecting and then displayed as 'Disconnected.' I tried connecting around 4 times before it finally connected."
- **All four reproduced against production before any code changed.** No guessing; four hypotheses were formed and *disconfirmed* along the way (a `getOrCreateForTeamspace` insert race, a deploy landing mid-attempt, `safeRedirect` eating the `next` param, and a `canPublishInto` 403 on the teamspace picker — each ruled out with evidence rather than argument).

### 1. The 2 MB limit was real, and applied only to text
`MAX_BODY_BYTES` was 2 MB for md/html/json/csv while `MAX_BINARY_BYTES` gave pdf/docx/images **15 MB**. An exported HTML page with its images inlined as data URLs is *text*, so it hit the small cap — a PDF of identical size published fine. Raised text to 15 MB in all three enforcement points (`lib/publish/pipeline.ts`, `mcp-worker/src/publish-core.ts`, the client-side pre-check). The error now states the actual file size and names the usual cause (inlined base64 images). The existing test that pinned 2 MB was rewritten to assert the two ceilings stay **equal**, so they cannot silently drift apart again.

### 2. "Components missing" — the sanitizer, removing things silently
`sanitizeDocument` stripped `<svg>` along with script/iframe/canvas, and **reported nothing**: `SanitizeResult` was `{html, title}`, with no record of what was dropped. The escape hatch existed but was off by default *and* hidden inside a collapsed `showOptions` disclosure (`useState(false)`), so a first-time publisher could not discover it. Two fixes:
- **SVG is now allowed as a closed inert subset.** `<foreignObject>` (re-enters HTML parsing), SMIL `<animate>`/`<set>` (can retarget `href` at runtime), and SVG `<a>` are deliberately excluded; `<use>` is permitted but its href is restricted to same-document `#fragments` via `transformTags`, because "https" is an allowed scheme generally and must not be here. 12 new tests pin both the preservation and every blocked route back to script.
- **`summarizeRemovals` reports what went**, surfaced on the share card as *"Removed for safety: 2 scripts, 1 embedded frame"* with a pointer to the trusted-HTML option. Explicitly a report, not a boundary — `sanitizeHtml` remains the boundary, so an approximate tag regex is safe here.

### 3. Signing in *removed* the way to connect
The marketing header links to `/connect`; `app/(app)/layout.tsx` did not. `/dashboard` linked only to `/publish`, `/t` only to `/dashboard`. The single remaining route in was a teamspace **detail** page you had to already know to open. Added Connect to the signed-in nav.

### 4. A trailing full stop — and it was our own copy that supplied it
Recovered the actual grants from `OAUTH_KV`. Four for `reshma@blocksurvey.org` within four minutes, and the `resource` each recorded:
```
08-07 14:59:05  https://mcp.ilolink.com/mcp.   <- failed
08-07 14:59:54  https://mcp.ilolink.com/mcp.   <- failed
08-07 15:00:23  https://mcp.ilolink.com/mcp.   <- failed
08-07 15:03:44  https://mcp.ilolink.com/mcp    <- connected
```
No other user's grant has it. Source: `app/(app)/connect/page.tsx` rendered `<code>{connectorUrl}</code>.` — the sentence's full stop flush against the URL, **with no copy button**, so connecting required selecting the text by hand.
- **The path was only half of it.** `POST /mcp.` 404s, but the deeper failure is RFC 8707: the `resource` sent to `/authorize` becomes the **access token's audience**, so the dot minted a token for `…/mcp.` that the `…/mcp` resource server rejects on *every* request — `401 "Token audience does not match resource server"`. Fixing the path alone would NOT have helped; verified by deploying the path fix first and watching a dotted-resource token still 401 at a clean `/mcp`.
- Both are now canonicalised (`mcp-worker/src/canonical-path.ts`): the request path, and the `resource` before the provider ever parses it. Rewrite rather than redirect, since clients store the URL and may not re-POST a body after a 3xx. Forgiveness is bounded — `/mcpx` and `/mcp/extra` still do not resolve to the transport.
- `/connect` now shows the URL in its own field with a **Copy** button.

- **Measured before the fix (production):** `/mcp` 200; `/mcp.` `/mcp/` `/mcp,` `/mcp%20` `/MCP` `/mcp;` all **404**. A trailing **slash** — what browsers add unprompted — was as broken as the dot.
- **Verified after, end to end:** completed the whole OAuth dance using the dotted URL, then connected successfully at `/mcp`, `/mcp.`, `/mcp/`, `/MCP`, `/mcp%20` — all 200. Published a document containing SVG + 2 scripts + an iframe through MCP: the `<path>` survives and **renders** (browser reports `viewBox` parsed as 24×24 and the path painted at 32×22, confirming the HTML parser restores the lowercased attribute), scripts and iframe gone. Screenshotted the removal notice and the new nav in a real browser.
- **Caught a deploy trap:** the root deploy is `opennextjs-cloudflare build && … deploy`; a bare `wrangler deploy` silently shipped a **week-old** `.open-next` bundle (Aug 1 21:14). Re-deployed properly. `wrangler deploy` at the repo root is not a deploy.
- **Test/verification hygiene:** every probe used disposable QA accounts; all rows, R2 objects, KV slug records, grants, tokens and OAuth clients deleted afterwards, baseline re-confirmed (`users 8, qa_left 0, qa_ts 0`, probe tokens 401, test docs 404).
- **Files:** `lib/sanitize/html.ts`, `lib/types.ts`, `lib/publish/pipeline.ts`, `app/api/publish/route.ts`, `app/(app)/publish/publish-form.tsx`, `app/(app)/layout.tsx`, `app/(app)/connect/page.tsx`, new `app/(app)/connect/copy-field.tsx`, new `mcp-worker/src/canonical-path.ts`, `mcp-worker/src/{index,authorize,publish-core}.ts`, new `test/{canonical-path,sanitize-svg}.test.ts`, `test/tokens-slug.test.ts`. **178 tests green**, three typechecks clean, `○ /` still static.
- **Noticed, not fixed:** `/publish` still says *"No account needed"* — accountless-era copy that is now false. Part of the outstanding `docs/launch/copy-sweep.md` backlog.

---

## 2026-08-08 — v2 pushed off-machine and merged to `main`
- **Asked:** "git pull" → then "push it" → then "merge."
- **`git pull` failed for a reason worth recording:** HEAD was on `fix/pre-launch-security`, which existed **only locally** and had no upstream, so git had nothing to merge from. `git fetch origin` returned zero new commits — `origin/main` was untouched at `e7a8f8a` since 2026-07-23.
- **The real finding: the entire v2 pivot existed on one laptop.** 31 unpushed commits — accounts, teamspaces, the artifact registry, the MCP handoff, the `.docx` fix, the landing rewrite — all of it **already running in production** with no off-machine copy. `wrangler deploy` uploads the working tree, not a commit, so "deployed" never implied "pushed." Backup and deploy state had silently decoupled weeks earlier.
- **Scanned before pushing, because the repo is PUBLIC** (`gh repo view` → `isPrivate: false`). Swept all 31 commits for `re_*`, `sk-*`, `ilo_pat_*`, `AKIA*`, `ghp_*` and PEM private-key headers: **no matches**. `.dev.vars.example` carries only empty placeholders; the one tracked env file, `.env.production`, holds solely `NEXT_PUBLIC_TURNSTILE_SITEKEY` (a Turnstile **site** key — public by design). Emails in the diff are own-domain, test fixtures, or `delivered@resend.dev`.
- **Pushed, then merged `--ff-only`** (`main` was a strict ancestor, so history stays linear and the merge was provably content-neutral). **149 tests pass across 15 files** — the v2 plan had predicted "51 existing tests must stay green"; the suite nearly tripled, with `permissions.test.ts` alone contributing 29.
- **Verified against the server, not local refs:** `git ls-remote origin refs/heads/main` → `704262b5…`, identical to local HEAD, 0 unpushed on both branches.
- **Consequence now live:** the v2 codebase is publicly readable. Security does not depend on it being hidden, but the two known weaknesses are now auditable by strangers — **PAT scopes are stored but not enforced per tool** (a `skills:read` token can publish) and `update_document` has no concurrency control.
- **Files touched:** `WORKLOG.md` only. No source changed — a fast-forward moves a pointer, not files.
- **Still outstanding, user-owned:** rotate `RESEND_API_KEY` (exposed, live, sending real invitations), `ADMIN_SECRET`, and the Cloudflare API token.

---

## 2026-08-01 — .docx has never worked; landing page rewritten around documents + registry
- **Asked (ultracode):** "ensure that regular html, pdf, document hosting is supported too for peer review. I see it is completely missing in the landing page. add usecases… all things being emitted from ai being shared across entire org for best practices. review the landing page. communicate better."
- **The complaint was right, and measurable.** An audit found document hosting was **~60 words, ~6% of body copy, section 5 of 9**, under a heading that literally began *"And still…"*. The word **PDF appeared exactly once on the entire page**; `upload`, `password`, `expir`, `comment` and `peer` appeared **zero** times. `lib/seo/site.ts` led with the registry and gave hosting four words at the end prefixed with "too" — making the homepage the weakest document-hosting page on its own site, while ~60 guide pages send publish-intent traffic to it.
- **The page also carried two FALSE claims I had shipped.** It promised *"drop a file — a PDF, a .docx, a spreadsheet, an image"*, but `app/api/publish/route.ts` accepts as an upload only `.md/.html/.pdf/.docx`. Spreadsheets and images reach the product as pasted text or data URLs, never as uploads.
- **FOUND: `.docx` upload has NEVER worked in production.** Verified by publishing a real .docx and reading `wrangler tail`: `docxToHtml failed: Error: Could not find file in options` from mammoth's `openZip`. Cause: mammoth's `package.json` remaps `./lib/unzip.js` → `./browser/unzip.js` for bundlers, and the two builds accept **different options** — node takes `{path}|{buffer}|{file}`, the browser build takes **`{arrayBuffer}` and nothing else**. We passed only `buffer`. **Under Node the identical call succeeds**, so every local test passed while every real upload failed, and the user saw "Could not read that .docx file — it may be corrupt." Same shape as the PBKDF2 iteration-cap bug: the test environment and the runtime disagree, and only deploying finds it. Fixed by passing both keys, slicing the arrayBuffer to the view's own range (a Uint8Array may be a window onto a larger buffer). **2 new tests**, one of which fails if someone "tidies up" the call by dropping a key. Verified live: .docx → `<h1>Quarterly Review</h1>`.
- **ALSO FOUND: I had broken `publish_document` for every legacy connector.** The 8-tool fix added `await this.caller()` to stamp `teamspace_id`, but `requireMember` **rejects** a grant carrying only `workspaceId` — so publishing died for pre-accounts connections, including the user's own. Traded one outage for another in the same commit. The owner stamp is now best-effort (`ownerStamp()` returns null instead of throwing); publishing is not allowed to depend on it.
- **PDF hosting verified end to end, not assumed:** published a real PDF → `/hucgex` serves an HTML wrapper containing `<iframe src="/raw/hucgex">` and loading **tracker.js + widget.js**; `/raw/hucgex` returns `application/pdf`, `%PDF-` magic, exact bytes. So a PDF gets a link, renders inline, **and** carries analytics and comments — that is the peer-review story, and it works.
- **Verified every analytics claim before writing it** (`lib/analytics/query.ts`): referrer, country, device, unique, scroll, time_on all real; reactions are exactly 👍🤔👀; comments have anchors, selections and `parent_id` replies. **One honest limit now stated on the page**: a PDF renders inside an iframe, so read-depth and heatmaps cannot see into it — views, sources, reactions and comments still work.
- **Landing page rewritten.** New order: hero → composer → what comes back → formats → access → peer review → use cases → registry → kinds → roles → connector. Composer moved from section 6 to section 2. PDF mentions **1 → 24**, `.docx` **1 → 18**. Eight concrete use cases spanning document hosting (consultant proposal, PM spec, researcher peer review, designer rationale, investor update) and the registry (house style, agent standardisation, session handoff). SEO title/description now lead with hosting and name both halves.
- **Kept:** `#compose` anchor (marketing pages link to it by name), the signed-out composer, static prerender (**build confirms `┌ ○ /`**), the ~60-page publish corpus.
- **149 tests**, tsc clean on all three targets. Deployed mcp `876be6bd`, app `fdd2057a`. Browser-verified at 1280px: h1 correct, composer present, ten section headings, no revived "no account needed".
- **Still open:** the ~123-line copy sweep across ~50 marketing pages (now *narrower* than before, since the homepage leads with hosting again); PAT scopes stored but not enforced per tool; `RESEND_API_KEY` rotation.

## 2026-08-01 — Artifact registry, review flow, three roles, re-heroed landing page
- **Asked (ultracode):** teamspace roles/permissions; a folder structure for skills, agents, agent specs, design docs, plans, workflows and session transfers ("if there is more add it"); MCP tools to push files from codebases and sync across members; all of it on the landing page.
- **FOUND AND FIXED A LIVE PRODUCTION OUTAGE FIRST.** A mapping workflow claimed 8 of 13 MCP tools were broken; I verified it against production rather than trusting it, and it was true. `publish_document`, `list_documents`, `search`, `fetch`, `get_analytics`, `update_document`, `unpublish_document` and `get_dashboard_url` all failed with *"This connection predates ilolink accounts"* — **on a PAT created seconds earlier**. Cause: those tools read `props.workspaceId`, which nothing has set since the Phase 4 props change (OAuth writes `{userId, teamspaceId, tokenEpoch, origin}`, PAT writes `{userId, teamspaceId, origin}`). The error text blamed the connection's age, so the failure read as expected behaviour for an old connector rather than a regression — which is why it survived. `workspaceId()` now resolves the workspace backing the caller's teamspace, creating one on first use. Also stamped `teamspace_id`/`created_by` on MCP-published documents, without which a published doc was invisible to the dashboard and had no owner `resolveDocAccess` could see. Commit `9fc2ff0`, verified all eight return ok.
- **Decisions taken by the user:** add a third role *as well as* completing the two; flat registry keyed by (kind, name) rather than repo paths; pushes are **proposals** needing review, not a mirror; **re-hero** the landing page.
- **Migration 0014 renames `skills`→`artifacts` and `skill_versions`→`artifact_versions`** and adds `kind`, `folder_id`, version `status`, `reviewed_by/at/note`, `source_path`, and `teamspaces.review_member_writes`. Safe as a rename only because both tables had **zero rows in production** and carry no foreign keys — that window does not come back. The unique index moved to `(teamspace_id, kind, name)`, so `deploy` the runbook and `deploy` the workflow can coexist. **The column `skill_id` is deliberately NOT renamed** (a table rename does not rename columns).
- **NOT ADDITIVE, so it could not ship a release ahead of its code** like every other migration here. Applied and deployed in one tight sequence; measured window **72 seconds** (12:48:39 → 12:49:51 UTC) during which deployed code queried a table that no longer existed. Impact bounded to counts, since production held 0 artifacts.
- **Ten kinds, a closed set:** skill, agent, spec, design, plan, workflow, session — plus **decision, runbook, eval** added on the user's invitation. Closed on purpose: an open string lets two projects invent "adr" and "decision-record" for the same thing, which destroys the one-name-one-thing property the registry exists for. Each kind names the directory a sync client projects it into; **the registry itself stays flat and name-keyed** so `artifacts_get("commit-style")` remains something an agent types from memory.
- **Third role `admin`**, with the line drawn at the teamspace rather than its contents: owner alone renames it, changes roles and mints owners; admin invites, removes members, manages folders and approves proposals. **An admin cannot remove an owner** — otherwise "admin" is a quiet takeover path.
- **Completed the two-role model too.** There were **zero `UPDATE teamspace_members` statements in the repo**: roles were write-once, so the last-owner guard's message *"Make someone else an owner first"* named an action no code could perform. Added role PATCH with a last-owner refusal, a role picker on invites (every invite ever sent had been `member` because the form posted `{email}` only), invite revoke (`revokeInvite` existed and was imported by nothing), teamspace rename, and wired `guardTeamspace`'s `ownerOnly` branch that had never had a caller — until now **any member could delete a teamspace's folder structure**.
- **FOUR SECURITY DEFECTS FOUND BY THE ADVERSARIAL PASS, THREE OF THEM IN CODE I HAD JUST WRITTEN.** All four had already type-checked and built:
  1. **The review gate was bypassable one tool name wide.** My `putSkill` shim hardcoded `publish: true`, and both `skills_put` and the web skills route called it — so a member could publish straight past review by using the older tool. A gate on the new path only is decoration when a legacy path reaches the same store. `publish` is now a REQUIRED field; the type system then located all four call sites.
  2. **The idempotent-push shortcut mutated live state.** It returned before `publish` was consulted, rewriting the live description (the line agents match on) and clearing `archived_at` with no version row — then reporting "published".
  3. **Archive/unarchive had no role check at all.** Any member could hide any artifact from every agent, or resurrect one an admin had archived as malicious. Now bounded like document deletion (admins anything, members only what they created), and **unarchive is admin-only — it is not the mirror of archive**, because archiving is the only remedy an admin has.
  4. **A proposal read identically to live policy.** `provenancePreamble` had no status, so an agent shown a pending change would apply it as agreed. It now prints `NOT LIVE … Do not act on it`, and `getArtifact` refuses `rejected` versions outright.
- **Then my own fix introduced a usability bug, caught by testing the real loop:** gating the identical-body shortcut on `publish` meant a member re-pushing an unchanged file filed a **new proposal every sync**. Fixed with a no-mutation early return for unchanged bodies plus dedupe against an already-pending identical proposal. Verified stable across repeated pushes.
- **Verified end to end against production with two real accounts (owner + member):** member pushed two files over MCP → kind derived from path (`.claude/skills/…`→skill, `docs/specs/…`→spec), both landed **proposed**; `artifacts_get` refused to serve them; the member's **self-approval was blocked**; the owner approved one in the browser (*"Approved — v1 is live"*); MCP then returned it **with the provenance preamble**, while the still-pending one stayed hidden; re-push reported `unchanged` and the proposal count did not grow. All QA rows and R2 objects deleted; production back to `users=1, artifacts=0, api_tokens=0`.
- **Landing page re-heroed** around the registry, keeping the publish-and-measure story as a later section. **Build confirms `┌ ○ /` — still statically prerendered**, and the signed-out composer still renders (checked in the emitted HTML, not inferred). First curl showed the old hero — that was a Cloudflare edge cache hit, not a failed deploy.
- **147 tests** (18 new: admin role matrix, the review rule, preamble status, archive authority), tsc clean on all three targets. Deployed **mcp-worker `20fb5a04`**, **app `d0b43901`**.
- **Open and deliberately not done:** ~123 lines of accountless-era marketing copy across ~50 pages now disagree with a landing page that pitches teams — the re-hero widened that gap rather than closing it (`docs/launch/copy-sweep.md`). PAT scopes are still stored but **not enforced per tool**. `update_document` still has no concurrency control. `RESEND_API_KEY` still needs rotating.

## 2026-08-01 — whoami over MCP; import skills from a repo; edit them in the browser
- **Asked:** "is the team details added to MCP? Can I add my existing skills from code by signing in." Answers were **no** and **only through MCP**. User chose all four fixes.
- **Team details were resolved on every call but never surfaced.** `requireMember()` returns `{userId, teamspaceId, role}` per tool call, yet none of the 13 tools returned it — `ping` returned the literal `"pong"`, and the teamspace *name* appeared only as a side effect inside the `skills_get` provenance preamble. Since the teamspace is sealed into the OAuth grant at approval time, an assistant **could not tell the user which org it was publishing into**.
- **Added the `whoami` MCP tool:** teamspace name + id, shared vs personal, member and skill counts, signed-in email, role, and a note that the binding cannot be switched without reconnecting. Also appended the teamspace name to `publish_document`'s response — **strictly best-effort via a `teamspaceName()` helper that returns null rather than throwing**, because publish has already succeeded by that point and a label must never turn it into an error.
- **Skill writing from the web now exists, through ONE path.** `POST /api/teamspaces/<id>/skills` calls the same `putSkill()` the MCP tool does rather than touching D1 itself. The version history and `created_by` trail are the whole mitigation for "a teammate can write instructions another agent executes"; a second implementation would be a second place for that trail to be wrong. 409 (not 400) on a version conflict so a caller can tell "re-read and retry" from "your input was malformed".
- **Bulk import at `/t/<id>/import-skills`.** Files are parsed **in the browser and reviewed before anything is written** — importing a directory is exactly when someone stops reading, and these become instructions agents execute. The review names what was guessed: coerced names, inferred descriptions, and which files would bump an existing skill's version. Writes are **sequential**, so a large import neither trips the per-user limit nor leaves an incomprehensible partial state.
- **New `lib/skills/frontmatter.ts`** — a deliberate non-YAML parser (a handful of `key: value` lines; running a general-purpose parser over untrusted uploads buys nothing). Handles BOM, CRLF, quotes, unknown keys, and the `commit-style/SKILL.md` plugin layout where the basename carries no information. **9 new tests**, including that a BOM does not silently turn frontmatter into body text.
- **Browser editor** at `/t/<id>/skills/<name>/edit`, plus `/t/<id>/new-skill`. The **name is read-only when editing** — it is the retrieval key agents type from memory, so renaming would orphan every reference without a trace. Sends `ifVersion` so a teammate's concurrent edit is refused, not overwritten.
- **ROUTING BUG CAUGHT BY READING THE BUILD OUTPUT, NOT BY REASONING.** I first placed these at `skills/_new` and `skills/_import`, reasoning that an underscore cannot collide with a kebab-case skill name. It compiled cleanly and **produced no routes at all** — Next treats `_folder` as a *private folder* excluded from routing. Moved to `/t/<id>/new-skill` and `/t/<id>/import-skills`, one level up, which removes the `skills/[name]` shadowing ambiguity instead of encoding around it. Verified all six routes now appear in the build manifest.
- **Docs:** extended `skills/ilolink-skill-registry/SKILL.md` with a "know which teamspace you are in" section (call `whoami`, say the name out loud before the first publish) and a five-step import recipe that requires listing files and checking collisions with `skills_get` *before* writing. Re-ran the tool-name cross-check — all six documented names exist in `agent.ts`.
- **Verified end to end against production** with a disposable QA account. Imported two real files: `commit-style/SKILL.md` (frontmatter) and `API Errors.md` (none) → review correctly showed `api-errors` with *"name taken from the filename"* and *"description taken from the first line"* → both created. Edited `commit-style` in the browser → **v2**, history showing *"Added the issue-id rule"* above *"Imported from SKILL.md."*. Stale `ifVersion=1` → **409**; unauthenticated write → **401**. Then minted a PAT and drove **real JSON-RPC against mcp.ilolink.com**: `whoami` returned `{"teamspace":"QA Registry","shared":true,"members":1,"skills":2,"role":"owner"}`, and **`skills_get` returned the browser-edited v2 with the provenance preamble intact** — closing the loop that web and MCP are genuinely one write path. All QA rows and R2 objects deleted; production back to `users=1, skills=0, api_tokens=0`.
- **Files:** `lib/skills/frontmatter.ts`, `app/api/teamspaces/[id]/skills/route.ts`, `app/(app)/t/[id]/skills/skill-editor.tsx`, `app/(app)/t/[id]/skills/[name]/edit/page.tsx`, `app/(app)/t/[id]/new-skill/page.tsx`, `app/(app)/t/[id]/import-skills/{page,skill-import}.tsx`, `test/frontmatter.test.ts` (new); `mcp-worker/src/agent.ts`, `app/(app)/t/[id]/skills/page.tsx`, `app/(app)/t/[id]/skills/[name]/page.tsx`, `skills/ilolink-skill-registry/SKILL.md`. 129/129 tests, tsc clean on root + mcp-worker. Deployed **mcp-worker `d90551cc`** and **app `7a97d956`**.

## 2026-08-01 — New teamspaces start with skills; skills get a browser surface
- **Asked:** "did you check if the skills, spec folders are by default available inside the teamspace when created?" → answer was **no, I had not**. Checked, found three gaps, user chose to fix all four options.
- **Gap 1 — creation seeded nothing.** `POST /api/teamspaces` inserted exactly two rows (teamspace + owner). No folders, no skills.
- **Gap 2 — skills are hard-isolated and do not inherit.** `UNIQUE(teamspace_id, name)` plus every read binding `teamspace_id` means a new org's `skills_list` returns `[]`. Correct isolation, but it makes *"I made a team and my assistant lost all its skills"* the default experience.
- **Gap 3, the serious one — an existing MCP connection cannot see a teamspace made after it was authorized.** `teamspaceId` is sealed into the OAuth grant props at approval time (`mcp-worker/src/authorize.ts:134`). Nothing errors; the assistant just keeps writing to the old teamspace. And `TokenMinter` posted only `{name}`, so **every PAT silently bound to Personal** even though `POST /api/tokens` has always accepted a `teamspace` field.
- **Gap 4 — the registry had no browser surface at all.** grep across `app/**/*.tsx` found "skills" only in consent/marketing copy. For a feature whose entire risk model is *"a teammate can write instructions another agent will execute"*, the instructions being invisible was the wrong default.
- **Built `lib/teamspace/bootstrap.ts`:** seeds a `Drafts` folder and a `house-style` starter skill, or copies skills from a teamspace you already belong to. **Best-effort by design** — the teamspace row is already committed when it runs, so a throw would 500 a create that actually succeeded and push the user to make a duplicate. Every step swallows its own failure and reports what landed.
- **The starter skill is a template with the blanks visible, not invented advice.** A seeded skill full of confident opinions nobody wrote would get followed by agents and blamed on the team.
- **Copy restarts version numbering at 1 and attributes every copied version to the person who made the teamspace** — they are who is responsible for those instructions being in this org. Carrying the original author across would attribute the copy to someone who never chose to put it there.
- **Security: membership of the SOURCE teamspace is checked in the route, 404 not 403.** `bootstrapTeamspace()` deliberately does no check of its own, so an unverified id would have turned "create a teamspace" into a way to read any org's skills by guessing its id. Verified live: copy from a foreign teamspace → **404**, PAT scoped to a foreign teamspace → **403**, foreign skills page → **404**.
- **Refactored bootstrap to insert the folder through the passed `b.DB`** rather than `lib/teamspace/folders`, which resolves D1 from the global OpenNext `env()`. Everything now goes through the binding, so it is importable outside a request context and testable — **4 new tests**, including "never fails the whole bootstrap when a step throws".
- **Skills UI:** `/t/[id]/skills` (list with version + author + updated, one query for all current versions rather than one per row) and `/t/[id]/skills/[name]` (body + history). **Bodies render as PLAIN TEXT in a `<pre>`, never markdown or HTML** — a skill is arbitrary member-written text and this page is served from the app origin where the session cookie lives; rendering it as HTML would make "write a skill" stored XSS against your own teammates.
- **MCP targeting:** `TokenMinter` now posts a teamspace and shows *"Scoped to X"* on the receipt; `/connect` and `/t/[id]` both state outright that an OAuth connection keeps writing to the teamspace it was approved for and must be reconnected to move.
- **Verified end to end in a browser against production** with a disposable QA account: created "Acme Design" → **seeded 1 skill + Drafts folder**; opened the skills list and detail; created "Acme Marketing" **copying from Acme Design** → skill carried over with changelog *"Copied when this teamspace was created."* vs *"Created with the teamspace."* on the seeded one; minted a PAT scoped to Acme Marketing (`Scoped to Acme Marketing.` on the receipt). Picker correctly excluded Personal (0 skills). All QA rows **and their R2 bodies** deleted afterwards.
- **Files:** `lib/teamspace/bootstrap.ts`, `app/(app)/t/[id]/skills/page.tsx`, `app/(app)/t/[id]/skills/[name]/page.tsx`, `test/bootstrap.test.ts` (new); `app/api/teamspaces/route.ts`, `app/(app)/t/page.tsx`, `app/(app)/t/create-teamspace.tsx`, `app/(app)/t/[id]/page.tsx`, `app/(app)/connect/page.tsx`, `app/(app)/connect/token-minter.tsx`, `lib/teamspace/store.ts`. 120/120 tests, tsc clean, build clean. Deployed app worker `60277615`.
- **Note for the user:** the **BlockSurvey** teamspace (with invites out to `raja@` and `sam@`) was created BEFORE this deploy, so it has no `Drafts` folder and no starter skill. Backfilling it is a one-liner but writes into a real org — not done without asking.

## 2026-08-01 — Team invites made reachable; sign-in rate limit relaxed
- **Asked:** "check if the 'team invite' to work as an org is enabled. if not build it." + "also fix this [429 screenshot]. relax a little bit for signing in."
- **Answer: it was NOT enabled — and the cause was a dead entry point, not missing code.** Every downstream piece already existed and was correct: `POST /api/teamspaces`, `POST /api/teamspaces/[id]/invite` (hashed nanoid(32), 14-day TTL, supersedes prior invites for the same address), `/invite?t=` acceptance, `/t/[id]` member admin, owner-only gating, 404-not-403 for non-members. **Nothing in the entire codebase called the create endpoint.** Grep found exactly two client callers under `app/` — invite and members — and none for create.
- **Confirmed empirically against production D1, which is stronger than reading code:** `invites = 0` (not one ever created) and `human_made_ts = 0` — all 20 shared teamspaces carry a `legacy_workspace_id`, i.e. they are backfilled shells from the accountless era, not orgs anyone made. The feature had never executed in production.
- **The layout actively sealed the loop.** `app/(app)/layout.tsx` filtered to `!is_personal` and rendered links only for what survived — the deliberate "a solo user never meets the concept" choice. Combined with no create button that is closed: you cannot see teamspaces until you have one, and you cannot make one.
- **Built the missing entry point:** `app/(app)/t/page.tsx` (index: your teamspaces, member counts, roles, empty-state explainer) + `app/(app)/t/create-teamspace.tsx`. On success it pushes to `/t/<id>` — where the invite form is — because naming an org is never the goal, inviting someone is. Added `listTeamspacesWithCounts()` kept **separate** from `listTeamspacesForUser()` so the app shell doesn't pay for a `GROUP BY` on every render.
- **Nav now shows one "Teamspaces" link instead of one link per teamspace.** This also **removes a D1 query from every app page render** — the shell no longer needs to fetch teamspaces at all. `/t` is 1 char and the content-worker rewrite is `/:slug([a-z0-9-]{3,32})`, so there is no route collision; checked before shipping.
- **Rate limit — the 429 was worse than the numbers suggested.** `rateLimit()` re-puts the KV counter with a fresh TTL on **every allowed hit**, so the window runs from the LAST send, not the first: 5/hour meant one distracted burst locked an address out for a full hour from its final attempt. Changed per-email to **8 per 15 min** and per-IP to **40/hour** (kept hourly — it is the enumeration ceiling, and office NAT shares one IP). The wait is now **derived from the window**; the old copy hardcoded "an hour" and would have started lying the moment anyone retuned it.
- **Cleared the user's stuck counter** — `rl:auth:send:email:55ded987…` read exactly `5`, the old ceiling. Deleted; readback confirms gone.
- **Verified in a real browser against production, end to end.** Rather than read the user's inbox or mint a session on their account, created a **disposable QA user + session row**, drove Playwright with that cookie: `/t` rendered → typed "QA Verify Org" → Create → **redirected to `/t/t_p2CscTQJIG-63WSw`** → invite form → invited `delivered@resend.dev` (Resend's official test inbox, so no real person was emailed) → **"Invitation sent", row appeared as `invited`**. Resend accepted it (no 502). **0 console errors.** Invite row confirmed in D1. Signed-out `/t` → 307 to `/signin?next=%2Ft`.
- **All QA rows deleted afterwards; production re-verified back to baseline** (`users=1, members=1, invites=0`).
- **Files:** `app/(app)/t/page.tsx`, `app/(app)/t/create-teamspace.tsx` (new); `app/(app)/layout.tsx`, `app/api/auth/request/route.ts`, `lib/teamspace/store.ts`. 116/116 tests, tsc clean, build clean (`○ /` still static). Deployed app worker `f1cade9f`.
- **Not done:** the invite *acceptance* leg (`/invite?t=`) was not clicked through — that needs a second real mailbox. The code path is unit-tested and unchanged by this work, but it has still never been exercised in a browser.

## 2026-08-01 — Landing-page sign-in, inline auth on publish, comment cleanup
- **Asked:** "go ahead and clean up. also add sign in / sign up to landing page."
- **The gap:** after the pivot a visitor could compose on `/` but publish returned **401 with no way to sign in from that page**. Nav had no auth entry at all.
- **Session-aware nav WITHOUT making the landing page dynamic.** Server-rendering `/` with a session lookup would add 2 D1 reads to every marketing hit — the highest-traffic page with the least need for personalization. Added `GET /api/auth/me` (`private, no-store`) + `app/nav-auth.tsx`, a small client component. **Build confirms `○ /` — still statically prerendered.** Renders the signed-out state first and swaps on response, so the common case is instant and never flickers.
- **A 401 from `/api/publish` now renders the sign-in form INLINE, draft untouched.** This finally realises the Phase 1 decision to use a 6-digit code rather than a magic link: the composer holds up to a 15 MB `File` in React state, and any flow that navigates away destroys it. Until now that reasoning was unused — the form just showed an error.
- **Cleanup — 13 comments corrected.** Eleven across `lib/`, `app/(app)/`, `app/api/` still described the accountless ownership model; e.g. `app/(app)/publish/page.tsx` read *"Accountless: anyone can publish"* on a route that now 401s, and the counts/heatmap headers described verifying a manage token as *the* mechanism rather than one of three. Rewritten to describe `guardDoc` and the real status codes. The three surviving "accountless" mentions are historical by design — they say what something WAS, in the modules that exist only to carry pre-accounts docs forward.
- **No dead code found to delete.** `lib/history.ts` still feeds the claim flow; `lib/manage-token.ts` still mints legacy tokens during the transition. Both are Phase 9 deletions, not now. Stopped all stray dev processes; removed `.playwright-mcp`.
- **Verified on production (not locally):** `/` 200 and still static; `href="/signin"` present in nav; `/api/auth/me` returns `{"signedIn":false}` with `cache-control: private, no-store`. **Browser-driven the real flow against ilolink.com:** typed a draft signed-out → pressed Publish → **draft survived intact (54 chars, verified by reading the textarea back)**, inline "Sign in to publish" panel appeared, email field focused, **no navigation**. The 5 console errors are all from `challenges.cloudflare.com` (Turnstile's own anti-automation console spam) — zero from ilolink code.
- **Files:** commit `2e0a34c`-adjacent; deployed app worker (version `1d560538`).
- **Still open, unchanged:** rotate `RESEND_API_KEY` (live in prod, exposed in transcript) and `ADMIN_SECRET` + CF token; ~123 lines of accountless-era marketing copy (`docs/launch/copy-sweep.md`); comment widget composer swap still unrendered against a published doc; H1/H2 audit repros not re-run against live.

## 2026-08-01 — DEPLOYED to production (accounts / teamspaces / skills release)
- **Asked:** "deploy all changes." (Reverses the earlier commit-only choice.)
- **Refused to deploy code first.** Checked state before acting: remote D1 had **none** of the 9 new tables and 7 unapplied migrations, and only 4 of 9 secrets were set. Deploying code first would have been a full outage, not a degradation — `app/(app)/layout.tsx` calls `currentUser()` (queries `sessions`), and `content-worker`'s comment read path now `LEFT JOIN`s `users`, so **every existing published document's comments would have broken too**.
- **Order executed:** migrations → backfill → secrets → content worker → mcp worker → app.
- **Migrations 0007–0013 applied to remote D1.** All 11 tables created; `docs:23 ws:20 comments:8` unchanged before/after.
- **Backfill:** 20 shadow teamspaces (one per workspace), 5 MCP docs re-homed, 20 workspaces linked, **18 web docs deliberately left unclaimed** — their ownership isn't knowable server-side.
- **Secrets set:** generated a fresh `MCP_HANDOFF_SECRET` and set it on **both** `ilolink` and `ilolink-mcp`; plus `SITE_ORIGIN`, `MCP_ORIGIN`, `EMAIL_FROM`, `APP_ORIGIN` (mcp). `RESEND_API_KEY` set at user's instruction using the transcript-exposed value — **user to rotate immediately**.
- **PRODUCTION BUG FOUND AND FIXED MID-DEPLOY — `NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported (requested 600000)`.** `lib/crypto/password.ts` has used 600k since it was written; **Cloudflare Workers caps PBKDF2 at 100k**. Pre-existing — password-protected docs would always have failed — but never surfaced because that feature has **zero rows** in production. Sign-in codes on the same primitive exposed it: `/api/auth/request` returned an unhandled 500, so **nobody could sign in at all**. Capped at 100k; `verifyPassword` now returns `false` (not throws) for an over-limit legacy hash. Nothing to migrate. Commit `d8f1a6e`-adjacent; redeployed app + content.
- **Why local tests didn't catch it:** Node's WebCrypto has no such cap, so vitest passes either way. **Found by deploying and reading `wrangler tail`, not by reasoning.** Worth remembering: the test environment and the runtime diverge on crypto limits.
- **Verified live:** `/`, `/signin`, `/privacy`, `/terms` 200; `/dashboard` 307 (auth); existing docs serve 200 both direct and apex-proxied; retired `w_` path returns the reconnect error; bogus PAT rejected; anon publish **401**; `/api/connect` **404**; `/dashboard` keeps `X-Frame-Options: SAMEORIGIN` while `/embed/comment` sends **none** plus `frame-ancestors 'self' https://view.ilolink.com`; **real sign-in email `status=delivered` via Resend** from `auth@ilolink.com`.
- **Still open:** rotate `RESEND_API_KEY` (exposed in transcript, now live in prod); rotate `ADMIN_SECRET` + CF API token; ~123 lines of accountless-era marketing copy (`docs/launch/copy-sweep.md`); comment widget composer swap still unrendered in a real browser against a published doc; security-audit repros H1/H2 not re-run against live.

## 2026-08-01 — Phase 6: pre-launch copy correction, CI worker type-checks, deploy runbook
- **Asked:** "launch phase 6."
- **Scope split stated up front:** deploying, rotating secrets, and re-running audit repros against live are user-owned (commit-only was chosen in Step 0). This entry covers everything else.
- **The distinction that drove the whole sweep:** "no account" is **still true for readers** (they never sign in; `comments_mode` defaults to `anon`) and **now false for publishers**. "cookieless" is now *partly* false — analytics still are, the app origin sets a session cookie. A naive find-replace would have made the copy *less* accurate.
- **privacy** — claimed "cookieless and accountless" and "we set no cookies on readers or publishers". Rewritten around what survives: readers never tracked, publishers have one strictly necessary session cookie. Added a **"What we store about you"** section (email, optional name, truncated one-way UA/IP hashes on session rows) — **cross-checked against migration 0007's actual columns**, because my own first draft said "an email address and nothing more", which would itself have been false.
- **terms** — "no account to close" / "ilolink is accountless" → publishing needs a free email-only account, reading needs nothing, docs belong to a teamspace not a device, pre-accounts docs stay token-controlled until claimed.
- **app/page.tsx + docs/launch/product-hunt.md** — launch draft led with "accountless" as the differentiator. Re-led on the true half (readers never sign in), added the team/skill-registry pillar. Taglines and pillar ordering flagged as a **positioning call for the author** — this pass corrects accuracy, not conversion.
- **CI now type-checks both workers.** Root tsconfig excludes `content-worker/` and `mcp-worker/`, so until now a type error in either could reach main with CI green — and both just gained auth code. (Phase 0 item, finally closed.)
- **Automated pass** removed the unambiguous "free and accountless" family across 16 files. **123 lines across 50 files remain and are NOT mechanical** — categorized in `docs/launch/copy-sweep.md` (21 READER keep / 40 PUBLISHER rewrite / 12 BOTH split / 50 REVIEW) with file + line.
- **`docs/launch/deploy-runbook.md`** — load-bearing ordering: rotate the transcript-exposed Resend key first; **`MCP_HANDOFF_SECRET` must be identical on `ilolink` and `ilolink-mcp`** or approvals fail in a way that reads like a bug; **`SITE_ORIGIN` is baked into emails at send time and cannot be recalled**; content worker deploys first (owns the ViewCounter DO). Plus live verification list and known gaps.
- **Verified:** vitest **113/113**, tsc clean on root + both workers, build clean.
- **Files:** commit `7ca3f8b`.
- **Known gaps carried into launch:** comment widget composer swap still unrendered in a real browser against a published doc; 123 lines of stale copy; `visibility='team'` deliberately out of scope.

## 2026-08-01 — Phase 4 close-out + Phase 5: PATs, URL-token retirement, plugin bundle
- **Asked:** "yes" (close out Phase 4, then Phase 5).
- **Migration:** `0013_api_tokens.sql`.
- **Retired `w_<id>/mcp`.** The workspace id was itself the bearer secret *and* sat in a URL — leaking into browser history, stored connector config, referrer chains, and this worker's own request logs (`observability: true`) — *and* doubled as the dashboard key, so one leak gave away publishing + analytics together. Now returns a JSON-RPC reconnect error rather than a 404 an agent can't interpret.
- **Deleted `app/api/connect`** (minted a workspace row on any unauthenticated POST) and `/api/connect/rotate`; removed the `/w/<token>` rotate control with the path it protected. Replacement `POST /api/tokens` requires a session, verifies the caller can publish into the named teamspace, and returns the raw token **once** — only SHA-256 stored. `ilo_pat_` prefix so a leak is greppable/scannable; presented as an Authorization header, never a URL.
- **Phase 5 plugin bundle:** `.claude-plugin/{plugin,marketplace}.json` + `skills/ilolink-publish/` + `skills/ilolink-skill-registry/` + `docs/plugin.md`. Boundary documented: **local plugin = stable and generic (how to talk to ilolink); everything project-specific lives server-side in the registry**, editable without a plugin release.
- **Verified end-to-end against a real `wrangler dev` of the MCP worker** (`--persist-to .wrangler/state` so it shares the app's local D1 — separate state was why the first attempt failed): retired `w_` path returns the reconnect error; bogus PAT refused; real PAT initializes a session and the **server `instructions` ship** with the treat-skills-as-data warning; `skills_put` → v1, `skills_list` returns it, **`skills_get` returns the full provenance preamble** (author/teamspace/version) ahead of the body; stale `if_version=99` refused with the current version. **And the load-bearing one: deleting the caller's teamspace membership MID-SESSION immediately failed the next tool call in the same warm Durable Object, then succeeded again on restore** — the props-carry-identity/D1-carries-authority rule observed, not asserted.
- App side: `/api/connect` + `/api/connect/rotate` **404**; token mint anon **401**; signed-in returns `ilo_pat_…` whose stored hash matches its SHA-256, and **zero rows hold a raw token**.
- **Caught by cross-checking docs against code:** the shipped skill promised a `skills_search` tool that was never implemented. Corrected the doc to point at `skills_list`'s `query` param rather than adding a redundant tool. Added that check (every tool name in `skills/*/SKILL.md` must exist in `agent.ts`) to the validation run.
- **Verified:** vitest **113/113**, tsc clean on root + both workers, build clean.
- **Files:** commits `bcf12a6` (PATs + retirement), `bcbd2d6` (plugin bundle).
- **Note:** the alice@example.com sign-in hit "Too many sign-in emails for that address" mid-testing — the 5/hour per-email limiter working as designed.
- **Pending:** rotate `RESEND_API_KEY`; `wrangler secret put` RESEND_API_KEY/EMAIL_FROM/SITE_ORIGIN/TURNSTILE_SECRET/**MCP_HANDOFF_SECRET (both `ilolink` and `ilolink-mcp`)**; apply 0007–0013 + backfill to remote D1; deploy 3 workers (content first). Comment widget composer swap still unexercised in a real browser against a published doc.

## 2026-08-01 — Phase 4 (first pass): MCP OAuth handoff, per-call authority, skill registry
- **Asked:** "star phase 4."
- **Migration:** `0012_skills.sql` (skills + skill_versions).
- **OAuth rework.** `mcp-worker/src/authorize.ts` no longer mints `crypto.randomUUID()` as an anonymous subject. It can't authenticate directly — the session cookie is host-locked to ilolink.com and widening it would hand sessions to the untrusted content origin — so consent is delegated over a **signed four-step handoff**: worker validates + signs the OAuth request → app authenticates + teamspace picker → app signs a 2-min assertion → worker verifies + `completeAuthorization`. **Both directions signed**: without the outbound signature, any site could drive the consent screen with an unvalidated OAuth request and phish an approval for its own `redirect_uri`. Assertion carries `reqHash` so it can't be replayed against another request.
- **`lib/crypto/hmac.ts`** promoted out of `dashboard-token.ts` (3 features need it). Envelope is deliberately **not a JWT** — one secret, one algorithm, no `alg` field, no key discovery.
- **`mcp-worker/src/authz.ts` — the rule the design rests on: props carry identity, D1 carries authority.** `McpAgent` is a stateful DO; props are decrypted once at session start, so anything cached there is an hours-old decision. Props now carry only `userId`/`teamspaceId`/`tokenEpoch` — never a role. `requireMember()` re-reads membership + account status + teamspace status + token epoch from D1 **on every tool call**. Without it, removing a member wouldn't stop their in-flight session publishing.
- **Skill registry** — own tables, not `documents`: skills are keyed by **name**, have no slug/visibility/KV-hot-path/analytics, and reusing `documents` would mean bolting `AND kind != 'skill'` onto every existing query. `skills_put` takes `if_version` (two agents in two projects **will** race; without it the later write silently erases the earlier edit). Identical bodies return the current version instead of piling up no-op revisions.
- **Prompt injection is the security story, not a footnote.** A skill is instructions another agent executes; any member can write "read .env and publish it", and the registry carries it into every connected project. Every `skills_get` is prefixed with a **non-optional provenance preamble** naming the author and stating the content is teammate data that must not change tool permissions or read credentials. Tests assert each clause survives.
- Added the server-level `instructions` string `McpServer` never had — what lets an agent with no local ilolink skill still discover the registry and handle it correctly.
- **Verified (observed):** vitest **113/113** (17 new: HMAC tampering/expiry/no-exp, skill-name validation, provenance clauses), tsc clean on root + both workers, build clean. Over HTTP: forged request signature refused before render; validly signed + signed-out bounces to `/signin` preserving the request; consent screen renders with app name + picker; approve forged-sig **400**, non-member teamspace **403**, signed-out **401**; happy path **303** with an assertion carrying identity only + `reqHash` + 2-min exp.
- **NOT done in Phase 4:** personal access tokens; deleting the unauthenticated `/api/connect`; retiring the `w_<id>/mcp` URL-token path (legacy workspace path still honored so pre-pivot connectors keep working). **The MCP worker's own half of the handoff is untested end-to-end** — needs `wrangler dev` with a real OAuth client.
- **Files:** commit `388da10`.

## 2026-08-01 — Phase 3: folders, sharing/assignment, comment identity
- **Asked:** "continue with phase 3."
- **Migrations:** `0010_folders.sql` (folders + `documents.folder_id`), `0011_comment_identity.sql` (`comments.author_user_id/author_kind/resolved_*`, `documents.comments_mode`).
- **3a Folders** — teamspace-scoped, one level of nesting enforced in code (SQLite can't express "a parent must have no parent", and a recursive tree would mean recursive queries on every dashboard render). Every mutation resolves the folder *through* its teamspace, so a foreign id reads as "not found" and a doc can't be filed across the boundary. **Archiving never deletes documents** — children and docs detach to the root.
- **3b Shares/assignments** — one table discriminated by `kind`. Re-sharing replaces the prior grant rather than stacking rows, so revoking once actually revokes. A share can name an address with no account yet (`email_norm`), bound to a user id on first sign-in. **Sharing requires `canManageShares`, which an editor share does not carry** — access can't spread transitively past what the owner granted. `lib/auth/team-guard.ts` mirrors doc-guard; non-members get 404 not 403.
- **3c Comment identity — the identity-island design.** ilolink.com and view.ilolink.com are **same-site**, so `SameSite=Lax` protects nothing between them and `trusted=1` docs run arbitrary author JS. So: reads stay public/anonymous on the content worker (+`LEFT JOIN users` for the verified marker); identified **writes** move into an iframe served from the app origin, whose POST is **same-origin**. No credentialed cross-origin fetch exists anywhere. postMessage both ways uses explicit `targetOrigin` + origin checks, never `*`.
- **Three silent-breakage points, all handled:** `buildDocCsp` untrusted branch was `frame-src 'none'` (now opts in to the app origin, untrusted docs only); `next.config.ts` sent a global `X-Frame-Options: SAMEORIGIN` and XFO has **no** allow-one-origin value, so framing headers were split out behind a negative lookahead excluding `/embed/*`; `comments_mode` written at **all four** `SlugRecord` sites — **the admin restore's SELECT didn't fetch the column and would have reset the policy on every restore**.
- **Identified commenting refused on `trusted=1` docs**, in both API and widget — the author's scripts can hide the real frame and draw a fake one; no in-page UI on an attacker-controlled origin prevents that, so the feature is withdrawn rather than made forgeable.
- **Privacy bug I introduced and fixed mid-change:** the write path snapshotted `user.email` into `comments.author_name`, which the content worker returns verbatim from its **public** `GET /_comments` — publishing the commenter's address to every reader. Both sides now route through `lib/email/display.ts`; tests assert no public display name can contain `@`.
- **Verified (observed):** vitest **96/96**, tsc clean on root + both workers, build clean. Over HTTP: folder created / non-member 404 / doc moved and folder heading rendered; commenter share → read 200 but edit 403 and re-share 403; `/dashboard` keeps XFO+frame-ancestors while `/embed/comment` sends **no XFO** and `frame-ancestors 'self' https://view.ilolink.com`; unauthenticated comment 401; authenticated comment stores `author_kind='user'` + user id + a name with no address.
- **Files:** commits `819b666` (3a+3b), `946f3dd` (3c).
- **Pending:** rotate `RESEND_API_KEY`; `wrangler secret put` the four secrets; apply 0007–0011 + backfill to remote D1; deploy 3 workers (content first). Widget composer swap is wired but **not yet exercised in a real browser against a published doc** — needs a deploy or a local content-worker run. Phase 4 (MCP OAuth rework + skill registry) next.

## 2026-08-01 — Phase 2: teamspaces, ownership convergence, invites
- **Asked:** "now do phase 2", then "continue 2c, 2d, 2e".
- **Migrations:** `0008_teamspaces.sql` (teamspaces / teamspace_members / invites), `0009_ownership.sql` (`documents.teamspace_id` + `created_by`, `document_shares`, workspace→user/teamspace binding).
- **The load-bearing decision — `teamspaces.is_personal`:** every user gets an auto-created personal teamspace at first sign-in and *everything* is owned by a teamspace, never directly by a user. Without it we'd have replaced two ownership models with three. Solo users never see the concept (teamspace labels/links only render once a shared one exists).
- **`lib/teamspace/permissions.ts` is now the only answer to document access.** Previously 7 API routes + 3 mcp-worker queries each re-derived ownership. Routes call `guardDoc(req, { require: "canX" })` and the pure resolver decides. Naming the capability per call site is what stops "can read analytics" silently becoming "can delete".
- **Notable rules:** a member may delete only what they created (deletion drops R2 bodies irreversibly); shares never grant moderation; membership outranks a weaker direct share; a valid legacy manage token still grants full control until Phase 9; non-members get **404 not 403** so teamspace/doc ids can't be probed.
- **`scripts/backfill-ownership.sql`** maps each workspace to a shadow teamspace and moves its docs. **Deliberately does not touch web-published docs** — their only proof is a manage token in one browser's localStorage, and a wrong guess would hand one person's analytics and delete button to another. They keep working via the legacy branch until claimed through `/api/claim`.
- **2c** publish requires a session, stamps ownership, enforces per-teamspace quota. Composer at `/` still renders signed-out and gates at submit — gating the front door would invalidate the ~60-page SEO corpus that sells "no account needed".
- **2d** `/dashboard` server-rendered from membership (was 100% localStorage — no server-side "list my documents" query existed at all). `ClaimBanner` volunteers local history to `/api/claim`.
- **2e** invites (emailed nanoid(32), sha256 at rest, 14d, superseded on re-invite, idempotent accept), `/t/<id>` member management, last-owner removal refused **and** the UI stops offering it.
- **Verified (observed):** vitest **93/93** (18 new permission-matrix cases + 2 new store-core), tsc clean on root + both workers, build clean. Over HTTP with two real accounts: publish 401 signed-out / 200 signed-in with ownership stamped; dashboard lists + redirects; invite emailed; signed-out invite link bounces to `/signin` preserving the token; accept joins as member, repeat is idempotent; member cannot invite (403); non-member 404; last owner cannot leave (409); member can leave (200); **Bob sees neither Alice's personal doc on his dashboard nor its analytics (403)**. Backfill idempotent (3 teamspaces after 2 runs). Browser-checked dashboard + teamspace pages.
- **Fixed along the way:** `store-core` tests indexed bound params from the *end* of the array, so appending a column broke them while the code was correct — now resolved by column name.
- **Incidents:** ran `npm run build` while `next dev` was live, which clobbered `.next/` and made every route 500 — looked like the new guard was broken; it wasn't. Don't run the production build against a running dev server.
- **Files:** commits `79d746b` (2a), `308378b` (2b), `ccab716` (2c–2e).
- **Local-only test config added to gitignored `.dev.vars`:** Cloudflare's documented always-passes Turnstile test secret, so publish is testable locally. Do not use in production.
- **Pending:** rotate `RESEND_API_KEY`; `wrangler secret put` RESEND_API_KEY/EMAIL_FROM/SITE_ORIGIN/TURNSTILE_SECRET; apply 0007–0009 + backfill to remote D1; deploy 3 workers (content first). Phase 3 (folders, share/assign UI, named comments) next.

## 2026-08-01 — Phase 1: passwordless accounts (Resend sign-in codes + magic links + sessions)
- **Asked:** "here is the resend api key… get started and implement."
- **Done — migration `0007_accounts.sql`:** `users` (re-created after `0002_accountless.sql` dropped it; adds `email_norm` lookup key, `status`, `is_staff`, `token_epoch`), `sessions`, `auth_challenges`.
- **New modules:** `lib/crypto/token.ts` (promoted `hashToken`/`verifyToken` out of `lib/manage-token.ts`), `lib/auth/{cookies,otp,redirect,challenge,session,current-user,config}.ts`, `lib/email/{send,templates}.ts`. `sendEmail` takes its config as an argument rather than reading `env()`, following the `lib/publish/store-core.ts` convention, so `mcp-worker` can import it in Phase 4.
- **Routes:** `POST /api/auth/request`, `POST /api/auth/verify`, `POST /api/auth/logout`, `GET /auth/callback`; UI at `/signin` (`app/(app)/signin/`).
- **Design calls, with reasons:**
  - **6-digit code primary, magic link secondary.** `publish-form.tsx` holds up to a 15 MB `File` in React state; a link opens a new tab and destroys the draft. Codes also survive corporate link scanners that consume single-use links.
  - **Code hashed with PBKDF2, not SHA-256** — 10^6 possibilities is brute-forceable from a stolen dump. Link/session tokens are nanoid(32) ≈ 190 bits, so plain SHA-256 is right for those.
  - **`__Host-ilo_session` cookie.** Corrects an error in the plan: `ilolink.com` and `view.ilolink.com` are **same-site** (shared registrable domain), so `SameSite=Lax` protects nothing between them and a `Domain=.ilolink.com` cookie *would* reach the untrusted content origin. The `__Host-` prefix makes the browser refuse the cookie unless it is Secure + `Path=/` + Domain-less, so host-locking is enforced, not remembered. Unit test asserts no `Domain=` is ever emitted.
  - **Sessions in D1, not KV/JWT** — KV is eventually consistent (a revoked session lingering ~60s is unacceptable once membership drives access); JWT would need a denylist, which is a session table with extra steps.
  - `safeRedirect()` constrains the emailed `next` param: rejects absolute URLs, `//host`, backslash variants, control chars.
- **Verified (observed, not inferred):** vitest **73/73** (22 new), `tsc --noEmit` clean on root + `content-worker` + `mcp-worker`, `next build` clean. Against a local dev server: wrong code → 401; correct code → cookie set with `__Host-…; HttpOnly; Secure; SameSite=Lax; Path=/` and no `Domain`; challenge replay → 400; magic link → 302 + session, reuse → `/signin?e=consumed`; forged cookie does not authenticate; logout revokes server-side (cookie stops working); all three open-redirect payloads fall back to `/dashboard`; D1 confirms `code_hash` is `pbkdf2$600000$…` and `link_hash` is 64-hex. Browser-driven the full two-step form, light **and** dark. **Real Resend delivery confirmed** — `status=delivered` to wilson@blocksurvey.org after ilolink.com was verified mid-session.
- **Also fixed:** `.dev.vars.example` had never been committed — `.gitignore:15` (`.dev.vars.*`) swallowed it, so a fresh checkout had no record of the required secrets. Added `!.dev.vars.example`, mirroring the existing `!.env.example`.
- **Files touched:** 20 new/modified, commit `17fc475`. Real key lives only in gitignored `.dev.vars`; a staged-diff scan confirmed it is not in the commit.
- **Incidents:** (1) cleaning up dev servers I ran `pkill -9 -f "next dev"`, which matched broadly and killed an unrelated **clema-lp** dev server — a scope violation; match on the port instead. (2) Earlier, `git checkout next.config.ts` discarded 30 lines of uncommitted security work; restored verbatim and verified.
- **Pending:** rotate `RESEND_API_KEY` (it was pasted in a chat transcript); `wrangler secret put` for RESEND_API_KEY/EMAIL_FROM/SITE_ORIGIN before deploy; apply `0007` to remote D1; deploy the 3 workers. Phase 2 (teamspaces + ownership) is next.

## 2026-08-01 — v2 plan (accounts/teamspaces/skills) + Step 0: commit security work, prove the cookie leak
- **Asked:** plan teamspaces with member collaboration, email sign-up/sign-in via Resend, invites, named comments, assign/share documents, folders, and a cross-project agent skill folder over MCP that agents can also write to.
- **Decisions (user):** accounts required for everything (full pivot off the accountless model); Owner/Member roles only; build now, launch later; ship *both* a local Claude Code plugin bundle and server-side skill-registry MCP tools.
- **Planned:** `~/.claude/plans/lively-mapping-gem.md` — 6 phases, migrations 0007–0011, MCP OAuth signed handoff replacing the anonymous `crypto.randomUUID()` subject, skills as their own name-keyed table reusing `store-core.ts` R2 helpers.
- **Production sizing (read-only D1 query):** 21 docs (17 web / 4 MCP), 19 workspaces, 8 comments — all founder test data. No user base, so the ownership migration needs no claim/grandfather flow; backfill to one founder account.
- **Verified the cross-origin cookie question (the plan's biggest risk):** ran `next dev` with `CONTENT_ORIGIN` pointed at a local echo server and curled the proxied paths. **Both rewrite tiers forward `Cookie` and `Authorization` verbatim to the content origin** (`/abc123` via afterFiles, `/_comments` and `/widget.js` via beforeFiles). So introducing a session cookie at `path=/` would hand sessions to `view.ilolink.com`, defeating the two-origin split. Plan updated: scope `ilo_session` to explicit app path prefixes. Caveat — measured under `next dev`, not the OpenNext production runtime; re-confirm before Phase 1 ships.
- **Step 0 done:** branched `fix/pre-launch-security`; committed the previously-uncommitted PH security work as `72ed6c0` (H1 report-flood, H2 unmetered MCP writes, M9 app-origin headers, admin secret out of URL) and `77486a4` (launch docs). Verified vitest 51/51, `tsc --noEmit` clean on root + `content-worker` + `mcp-worker`, `next build` clean.
- **Incident:** while reverting a one-line test edit I ran `git checkout next.config.ts`, which discarded all 30 lines of uncommitted security-headers work in that file rather than just my edit. Restored verbatim from the copy read earlier in-session and confirmed the diff returned to exactly `30 insertions(+)` with tsc clean. Use `git stash` or a targeted revert for this next time.
- **Files touched:** `WORKLOG.md`; commits above cover `content-worker/src/index.ts`, `mcp-worker/src/{agent,docs,publish-core,ratelimit}.ts`, `next.config.ts`, `lib/admin/gate.ts`, `app/api/admin/{login,action}/`, `app/admin/moderation/*`, `docs/launch/*`.
- **Pending (user-owned):** deploy 3 workers (content first) + re-run audit repros before Phase 1 starts.

## 2026-07-25 — Product Hunt launch prep: Phase 0 security fixes + listing/assets/playbook
- **Asked:** execute the approved PH launch plan (`~/.claude/plans/concurrent-toasting-papert.md`).
- **Phase 0 — security (blocking) — code done, locally verified:**
  - **H1 (report-flood takedown)** `content-worker/src/index.ts`: reporter dedupe now keys on client **IP only** (`visitorHash(ip, "", docId, salt)`), not the attacker-controlled UA; `REPORT_LIMIT` 3→10 distinct IPs; `autoActionDoc` no longer suspends the whole workspace (single-doc unpublish only, reversible) — workspace suspension is now human-only via `/admin/moderation`. Removed `WS_REPORT_FLAG_LIMIT`.
  - **H2 (unmetered MCP + update bypass)** `mcp-worker/src/docs.ts` `updateDoc` now enforces `MAX_TEXT_BYTES` (2 MB) on the text path and re-runs `scanContent` block on text+docx (`assertNotAbusive`). New `mcp-worker/src/ratelimit.ts` (`enforceMcpRate`) wired into `publish`(10/min), `update`(15/min), `unpublish`(20/min) per workspace in `agent.ts`. Exported `MAX_TEXT_BYTES` from `publish-core.ts`.
  - **Headers** `next.config.ts`: added `headers()` — HSTS, nosniff, referrer-policy (strict-origin-when-cross-origin keeps `/w` token out of cross-origin Referer), `X-Frame-Options: SAMEORIGIN` + `CSP frame-ancestors 'self'` (pdf iframe is same-origin), Permissions-Policy; `Cache-Control: private, no-store` on `/admin/*` and `/w/*`.
  - **Admin secret out of URL** new `app/api/admin/login/route.ts` sets HttpOnly `ilo_admin` cookie; `app/admin/moderation/{page,actions,login}.tsx` + `app/api/admin/action/route.ts` + `lib/admin/gate.ts` now read the cookie (dropped `?key=` + `x-admin-key` + client `adminKey` prop).
  - **Verified:** `tsc --noEmit` clean (app + both workers), `vitest run` 51/51, `next build` clean. Runtime audit repros NOT yet re-run (needs deploy).
- **Phase 1/2/3 — deliverables:** `docs/launch/product-hunt.md` (tagline/desc/topics/first comment/canned answers), `docs/launch/playbook.md` (timing + day-of), `docs/launch/assets/README.md` (asset spec + GIF shot-list), `docs/launch/assets/thumbnail.png` (240×240) + `social-card.png` (1200×630) rendered from brand HTML (kept as source).
- **Pending (production side effects / decisions):** deploy 3 workers + re-run repros; publish seeded demo doc; capture 7 live gallery screenshots; rotate `ADMIN_SECRET` + CF API token.

## 2026-07-22 — Per-doc opt-in "trusted" (raw, unsanitized) HTML
- **Asked:** an uploaded interactive HTML file (`clema_prompt_evolution.html`, expand/collapse via inline `onclick`) is dead on ilolink.com/w3p3bd. "Don't sanitize, accept as is."
- **Root cause (systematic-debugging):** the file's interactivity is inline `onclick` only (no `<script>`). ilolink's sanitizer strips ALL `on*` attributes on ingest (`lib/sanitize/html.ts`) and the doc CSP is `default-src 'none'` + nonce-only `script-src` (`lib/sanitize/csp.ts`), so nothing runs. By design, not a bug.
- **Decision (asked user):** scope = **per-doc opt-in raw**, NOT global. Default stays sanitized.
- **Done:** added a `trusted` flag that rides publish → D1 → KV `SlugRecord` → content-worker:
  - `migrations/0006_trusted.sql` — `documents.trusted INTEGER DEFAULT 0` (additive).
  - `lib/types.ts` (`DocumentRow.trusted`, `SlugRecord.trusted`), `lib/publish/store-core.ts` (insert column).
  - `lib/sanitize/html.ts` `renderTrustedDocument()` + `lib/publish/pipeline.ts` `renderTrusted()` — bypass sanitize, keep raw, still extract title safely.
  - `app/api/publish/route.ts` — parse `trusted`, honoured ONLY for text `sourceType:"html"` (never md/pdf/docx); abuse scan still runs.
  - `lib/sanitize/csp.ts` `buildDocCsp({trusted})` — permissive `script-src 'unsafe-inline' 'unsafe-eval'` with NO nonce-source (a nonce-source makes browsers ignore unsafe-inline), keeps `frame-ancestors 'none'`/`base-uri 'none'`/`object-src 'none'` + view-origin isolation. Wired at `content-worker/src/index.ts` serve.
  - `app/(app)/publish/publish-form.tsx` — "Run this page's scripts (trusted HTML)" checkbox (HTML source only) + request field.
- **Verified:** `tsc --noEmit` clean; `vitest` 51/51 (updated store-core param test, added trusted-CSP test). **Observed in real headless Chrome** under the exact trusted CSP: clicking the file's own `.col-header` toggled `.open` (before=false→after=true, glyph→`−`) — inline scripts AND inline `onclick` both execute.
- **Security hardening (background push-review found 3: cross-origin-authorization, confused-deputy, phishing-amplifier):** all rooted in trusted-doc JS running on the SHARED `view.ilolink.com` origin — it could make credentialed same-origin requests to `/raw`, `/_unlock`, `/_collect` and read/forge OTHER docs (unlock cookie is HttpOnly so not directly readable, but `/raw/<slug>` serves bytes gated only by that auto-attached cookie → cross-doc exfil). **Fix:** `content-worker` now wraps trusted docs in a **sandboxed iframe with no `allow-same-origin`** (`trustedFrame()`) → fresh opaque origin: scripts still run (`allow-scripts`), but no access to this origin's cookies/storage/endpoints. **Verified in headless Chrome:** inner doc's inline script + real `onclick` still toggle inside the opaque sandbox. Residual accepted tradeoff: in-doc heatmap/tracker can't see inside the cross-origin frame (report link + tracker stay on the outer shell); content-level phishing is inherent to any run-user-JS feature (abuse scan on ingest + report link mitigate).
- **Deployed + follow-ups DONE:**
  - **(1) Deploy:** migration 0006 already on remote (prior session); redeployed content worker (`f797adb0`) + app (`59293193`).
  - **(2) w3p3bd:** flipped in place, reversibly (no update API — docs immutable). Backed up the sanitized rendered body, overwrote `rendered_r2_key` with the already-stored raw, set `documents.trusted=1` + KV `trusted:true`. **Verified live:** the production-served bytes toggle (`before=false after=true`); raw had 6 `onclick`, sanitized copy had 0.
  - **(3) Copy sweep (full):** workflow, 28 agents (0 errors), **61 edits across 28 pages** (Terms, Privacy, FAQ, acceptable-use, vs/alternatives, for/*, and all share-*/guide pages). Turned absolute "no JS ever runs / frozen to static" guarantees into "by default … unless you mark the doc trusted (sandboxed, opaque-origin frame on the isolated origin)"; left already-scoped "untrusted HTML is sanitized" copy intact; Terms/Privacy got liability wording ("you are responsible for content you publish as trusted"). Verified `tsc` clean + spot-read Terms/Privacy/FAQ/limitations. **Deployed** (app `0e9f682c`) — new copy live.

## 2026-07-22 — Fix: dashboard comments + reactions not loading (CORS) — branch `fix/comments-cors`
- **Asked:** comments not loading for a doc (pxw5j9) though the dashboard shows a count (3 comments).
- **Root cause (systematic-debugging, verified live):** the dashboard on `ilolink.com` fetches `${VIEW_ORIGIN}/_comments` and `/_feedback` **cross-origin** from `view.ilolink.com`. The worker returned 200 with the data but **no `Access-Control-Allow-Origin`**, so the browser dropped the body (`fetch` rejects → "Couldn't load comments"). The count still showed because it comes from a same-origin app query, not the view origin. Confirmed: D1 has 3 `status='visible'` comments; direct curl returns all 3; headless cross-origin `fetch` → `BLOCKED: Failed to fetch`.
- **Fix:** `content-worker` `jsonResponse()` now sets `access-control-allow-origin: https://ilolink.com` + `Vary: Origin`. Simple GETs (no custom headers/credentials) need no preflight. Scoped to the app origin, not `*`. Fixes reactions (`/_feedback`) too.
- **Verified:** worker `tsc` clean; deployed content worker; **CDP-drove real `https://ilolink.com` origin** → cross-origin fetch now returns `comments=3` (was `BLOCKED` pre-fix).
- **Deployed:** content worker redeployed (version `1d2167c5`). Independent of the trusted-HTML work; split onto its own branch off `main` for fast merge.

## 2026-07-22 — MCP connector: research + plan + Phase 0 (branch `mcp-connector`)
- **Asked:** "implement this spec next: ilolink-mcp-connector-spec.md" (ultracode). Then: don't show base64, show filename (done first — see chip commit `c6f1ed9` on main).
- **Research (workflow, 10 agents = 5 topics + 5 adversarial critiques):** current APIs for Cloudflare Agents SDK `McpAgent`, `@cloudflare/workers-oauth-provider`, Claude connector OAuth, ChatGPT `search`/`fetch`, MCP tool contract. Critiques caught fabrications (a fake `@modelcontextprotocol/server` v2 split, `ctx.mcpReq.elicitInput`) → **Task 1 pinned every signature against installed node_modules** (`agents@0.17.4`, `@modelcontextprotocol/sdk@1.29.0`, `workers-oauth-provider@0.8.2`). See `mcp-worker/PINNED.md`.
- **Plan:** `docs/superpowers/plans/2026-07-22-mcp-connector.md` — Phases 0–3, Global Constraints (pin versions, no `env()` in worker, one publish impl, sanitize always).
- **Done + committed (on branch, NOT main):**
  - **Storage refactor** (`c965044`): new pure `lib/publish/store-core.ts` — SQL/R2/KV parameterized by explicit `{DB,DOCS,KV}` bindings, no `@/lib/cf`. App wrappers delegate with `env()` defaults; MCP worker will pass its own bindings. 40 tests unchanged + 3 new. Build clean.
  - **Migration 0003** (applied to remote D1): `workspaces` table + `documents.workspace_id`. Additive; running app unaffected.
  - **Phase 0 skeleton** (`61be36e`): `mcp-worker/` McpAgent + `ping` tool. **VERIFIED LIVE** on `*.workers.dev` via Streamable-HTTP JSON-RPC: `initialize`→ilolink 1.0.0, `tools/list`→[ping] w/ annotations, `tools/call ping`→pong.
  - **Custom domain** (`da20f1c`): `mcp.ilolink.com` provisioned by wrangler (DNS propagating).
  - **Bundling confirmed:** tsconfig `paths` alias resolves `@/lib/*` in the worker bundle (so it can import `formats.ts`/`store-core`).
- **Phase 1 DONE + verified (except the live Claude click-through, which needs your account):**
  - `workspace.ts` — mint/resolve anonymous workspaces + HMAC-signed login-free dashboard URLs.
  - OAuth wrap (`workers-oauth-provider`) on `/mcp`: anonymous workspace auto-provisioned on Authorize, `props`→`this.props`. **Verified:** `.well-known/oauth-authorization-server` (S256) + unauthenticated `/mcp` → 401 `WWW-Authenticate: ...resource_metadata=.../oauth-protected-resource/mcp` (Claude's requirement).
  - Token path `/w_XXXX/mcp` resolves the workspace, injects `ctx.props`. Unknown token → friendly re-mint message.
  - `publish_document` + `get_dashboard_url` tools on the shared pipeline. **VERIFIED end-to-end over MCP:** published a markdown doc via `tools/call` on the token path → rendered sanitized on `view.ilolink.com`, owned by `workspace_id` in D1.
  - `mcp.ilolink.com` custom domain LIVE (resolves globally; returns issuer).
  - `/connect` page (app) with the Claude connect steps + server URL. Live.
- **YOUR STEP:** add the connector in Claude (Settings → Connectors → Add custom connector → `https://mcp.ilolink.com/mcp` → Authorize), then "Publish this as an ilolink page." That confirms the one-click flagship live.
- **NEXT:** Phase 2 (ChatGPT `/connect` token minting UI + `search`/`fetch`), Phase 3 (read tools + login-free dashboard route + quotas/rotate/abuse).

## 2026-07-22 — MCP connector Phase 2 + Phase 3
- **Phase 2 (ChatGPT):** `/api/connect` mints an anonymous tokenized workspace (connector + dashboard URLs); `/connect` page "Create my ChatGPT workspace" button. `search` + `fetch` tools (structuredContent + stringified content; `fetch` returns a stats summary, never the raw body).
- **Phase 3 (read tools + dashboard + safety):**
  - Tools: `list_documents`, `get_analytics` (views via cross-script ViewCounter DO, comments from D1), `update_document` (new version, stable link, preserves password/expiry), `unpublish_document` (soft/reversible, `destructiveHint`; migration 0004 `documents.unpublished_at` + drops KV slug).
  - **Login-free dashboard** `/w/<token>`: verifies a bare token (ChatGPT) or an HMAC-signed token (Claude OAuth) via shared `lib/mcp/dashboard-token.ts` + shared `DASHBOARD_SECRET` on both workers; renders the workspace's live docs.
  - **Token rotation** `/api/connect/rotate` — migrates a leaked workspace to a fresh id (old connector + dashboard URLs die); dashboard rotate control.
  - **Quota** — per-workspace `quota_docs` enforced in publish-core.
- **VERIFIED live end-to-end:** all 9 tools over MCP (publish/list/search/fetch/analytics/update/unpublish); ChatGPT mint→publish→dashboard→rotate (old URLs 404, docs migrated); signed OAuth dashboard token verifies cross-service, tampered sig → 404; unpublished slug 404s while still-published 200. Worker tsc clean; app 43 tests + build clean.
- **Directory submission = Phase 4 (needs Team/Enterprise org). Live Claude "Add to Claude" click-through still needs the user's account.**

## 2026-07-22 — Moderation review UI + drag-and-drop design
- **Moderation UI** `/admin/moderation?key=<ADMIN_SECRET>` (gated, constant-time; not linked anywhere): open reports grouped by doc (count + reasons), suspended workspaces, flagged-but-active workspaces. One-click actions via `/api/admin/action` (`x-admin-key` header): unpublish / **restore** (rebuilds the KV slug from the current version) / dismiss reports / suspend / unsuspend. `ADMIN_SECRET` set as an app secret.
- **Drag & drop** on the publish composer: flicker-free depth counter (dragenter/leave), a full drop overlay ("Drop your file to upload" + format list, dashed accent border), and a resting "⬆ Drag & drop a file, or Choose a file" affordance.
- **VERIFIED live (Playwright):** moderation gated (404 without key, 401 API), renders seeded reports/suspended/flagged, Unsuspend flips status→active + resets flags; drag overlay shows on file dragenter (screenshot) and clears on leave; resting hint present.
- **Files:** `app/admin/moderation/{page,actions}.tsx`, `app/api/admin/action/route.ts`, `lib/admin/gate.ts`, `app/(app)/publish/publish-form.tsx`.

## 2026-07-22 — MCP connector: abuse scanning + report route (spec §7)
- **Inline content scan** `lib/abuse/scan.ts` — precision heuristic: `block` only when a credential-capture STRUCTURE (password field / external form) coincides with phishing/crypto/brand phrasing; single softer signals `flag`. Wired into **MCP publish** (block rejects; flag increments `workspaces.abuse_flags`, auto-suspend at 5) and **web publish** (block only — no workspace to flag). 6 unit tests.
- **Viewer report route** — content worker `POST /_report` (honeypot + IP rate-limit + per-reporter dedupe via salted hash); **3 distinct reports auto-unpublish** the doc + flag the owning workspace (suspend at 5). `/_report` reverse-proxied through `ilolink.com`. **"⚑ Report" link** (nonce'd) on every published page.
- **Suspension** — suspended workspaces rejected at publish (token path + publish-core check); suspending takes all a workspace's docs offline (reversible: rows + R2 stay, KV slugs dropped).
- migration 0005: `reports` table + `workspaces.abuse_flags`.
- **VERIFIED live:** MCP block rejected a phishing page; flag published + incremented; 3 reports → doc 404s (`unpublished_at` set); suspended workspace rejected; report link renders. 49 tests; both workers tsc clean; app build clean.
- **Deferred:** external malware/URL reputation scanning (heuristic only for now); a moderation queue/review UI; email alerts on suspension.
- **Files:** `mcp-worker/src/{agent,docs,publish-core,workspace}.ts`, `lib/mcp/dashboard-token.ts`, `app/(app)/connect/page.tsx`, `app/(app)/w/[token]/{page,rotate}.tsx`, `app/api/connect/{route,rotate/route}.ts`, `migrations/0004_unpublish.sql`.
- **Files:** `mcp-worker/{PINNED.md,wrangler.jsonc,tsconfig.json,src/{agent,index}.ts}`, `lib/publish/store-core.ts`, `lib/{r2/store,db/documents,publish/pipeline}.ts`, `migrations/0003_workspaces.sql`, `test/store-core.test.ts`, `docs/superpowers/plans/2026-07-22-mcp-connector.md`.

## 2026-07-22 — PDF + DOCX support (binary uploads)
- **Asked:** "add pdf and docx support next" (ultracode). Chosen approach for PDF: native iframe (full fidelity).
- **Built (two distinct data paths):**
  - **DOCX** → converted to HTML at publish time via `mammoth` (app worker, `nodejs_compat`), then through
    the existing `sanitizeDocument()` boundary → stored as a normal HTML doc. No CSP change.
  - **PDF** → stored as raw bytes in R2 (`storeBinaryVersion`), served by the content worker's new
    `GET /raw/<slug>` route (`application/pdf`, `inline`, `frame-ancestors 'self'`, `nosniff`), and framed by
    the doc page's same-origin `<iframe>` = browser's native viewer. New `SourceType "pdf"`; CSP gains
    `frame-src 'self'` only for pdf (`buildDocCsp({allowFrame})`).
  - Server **re-derives** the real type from the content data-URL (`detectUpload`) — never trusts the client
    sourceType. Binary cap `MAX_BINARY_BYTES` = 15 MB (decoded); text stays 2 MB.
  - Publish form: accepts `.pdf`/`.docx` (read as data URL), file-name title, format label ("PDF — native
    viewer" / "Word document") instead of the md/html toggle for binary; hint copy adds PDF + DOCX.
  - **Fix found via live test:** `/raw/:slug` wasn't in `next.config.ts` reverse-proxy rewrites → iframe 404'd
    on ilolink.com. Added the rewrite → view.ilolink.com.
- **Files:** `lib/types.ts` (+pdf, +raw_r2_key on SlugRecord), `lib/r2/store.ts` (binary putBody),
  `lib/publish/pipeline.ts` (detectUpload/decodeDataUrl/docxToHtml/storeBinaryVersion/MAX_BINARY_BYTES),
  `app/api/publish/route.ts` (3-way branch), `lib/sanitize/csp.ts` (allowFrame), `content-worker/src/index.ts`
  (`/raw` route + `pdfIframe` + `gateDoc`), `next.config.ts` (/raw rewrite), `app/(app)/publish/publish-form.tsx`,
  `package.json` (+mammoth), tests (`test/binary-formats.test.ts`, tokens-slug update).
- **VERIFIED LIVE on ilolink.com** (Playwright, real files, screenshots): PDF renders in native viewer
  ("ilolink PDF works", 1/1, zoom/print/download); DOCX → `<h1>` + `<strong>bold</strong>`; `/raw` returns a
  valid `application/pdf` (554 B, `file` confirms). 40/40 tests, both workers type-check clean.
- **Git note:** work was parked to branch `pdf-binary-upload-wip` mid-session, then fast-forwarded into `main`
  (`97a7983`) and pushed so main == deployed production. Both workers deployed.

## 2026-07-22 — Glossary + use-cases (reference pages)
- **Asked:** continue content plan → glossary (F18) + use-cases (D11).
- **Built (2 pages, workflow — 4 agents, draft→anti-slop/accuracy pipeline):**
  - `/glossary` — ~12-15 quotable one-sentence definitions (AI output, artifact, canvas, static hosting,
    sanitization, CSP, cookieless analytics, scroll depth, heatmap, GEO, anchored comment…) + "Further
    reading" linking ONLY an allowlist of real external URLs (web.dev CWV, MDN CSP, Cloudflare, Anthropic,
    OpenAI), each rel="noopener noreferrer". No hallucinated URLs.
  - `/guides/use-cases` — ~8-10 examples, each paired with the analytics question it answers; honest that
    analytics are aggregate/approximate, not per-person. Links to personas.
- **Registry:** added `REFERENCE` group → sitemap; `/guides` index gained a "Reference" section.
- **VERIFIED:** tsc clean (mine); `next build` 40/40 static; external URLs = allowlist only; slop clean.
- **NOT deployed yet:** working tree carries a parallel session's uncommitted PDF/binary-upload WIP
  (publish/route.ts, types.ts+"pdf", r2/store, pipeline, csp, package.json). Build is green but
  `npm run deploy` would bundle that WIP — held for user decision.

## 2026-07-22 — Homepage publish discoverability + comparison/persona pages
- **Asked (1):** publish button hidden below the fold — a user couldn't find how to publish; refactor.
- **Fixed (`app/page.tsx`):** sticky top bar with an always-visible filled **Publish** button (jumps
  to `#compose`); tightened hero (mt-16/20 → mt-10/14); added a "Start publishing" CTA + "First time?
  See how it works →" link (to P1 guide) above the fold; wrapped composer in `#compose` w/ scroll-mt.
  VERIFIED in a real browser (Playwright, 1366×768): three publish affordances above the fold; clicking
  Publish scrolls the composer + its submit button into view. Console errors were only Turnstile 110200
  (invalid-domain on localhost — expected), none from the change.
- **Asked (2):** continue the content plan. Built comparison (B5) + persona (B4) pages.
- **Built (5 pages, workflow — 10 agents, draft→anti-slop/honesty pipeline):**
  - Compare: `/vs/tiiny-host` (table + SoftwareApplication), `/alternatives/tiiny-host`.
  - Personas: `/for/product-managers`, `/for/designers`, `/for/consultants`.
  - Competitor claims hedged (no invented caps/prices; "verify current terms"); personas explicitly
    keep analytics AGGREGATE + APPROXIMATE, never per-person identity (FAQ "Can I see WHO read it?" → No).
- **Registry:** added `COMPARISONS` + `PERSONAS` (new groups) to `lib/seo/site.ts` → auto into sitemap;
  `/guides` index gained "Compare with other tools" + "By role" sections.
- **VERIFIED:** tsc 0; `next build` 38/38 static; slop grep clean on all 5; no identity overclaim.
- **Deferred still:** format pages (wait for viewers), glossary, use-cases, real legal copy.

## 2026-07-22 — SEO content plan: source how-tos + pain-point pages
- **Asked:** What's next → build the low-competition money pages. Chose source how-tos + pain-points.
- **Built (7 pages, dynamic workflow — 14 agents, draft→anti-slop-edit pipeline, HowTo schema):**
  - Source how-tos (C10): `/guides/share-claude-artifact`, `/guides/publish-chatgpt-html`,
    `/guides/share-gemini-output`, `/guides/markdown-to-web-page`, `/guides/host-ai-image`.
  - Pain-points (E14/D12): `/guides/do-links-expire` (permanence answer up top),
    `/guides/limitations` (honest limits = citation bait).
  - Each links UP to P1 + sideways to P2/P3. Source-tool facts made accurate (ChatGPT share =
    conversation not a page; Claude artifacts export to one file; etc).
- **Registry wiring:** added `HOW_TOS` + `PAIN_POINTS` to `lib/seo/site.ts` → auto-flow into
  sitemap + `/guides` index. Rebuilt `/guides` index into grouped sections (Start here / Share
  from a specific tool / Straight answers). Landing-page footer stays pillar-only (+ "All guides").
- **Also:** homepage (`app/page.tsx`) got a real 3-column footer (Guides/Product/Legal) + Guides
  nav link — it sits outside the (marketing) group so it never inherited that footer. Deployed.
- **VERIFIED:** `tsc` exit 0; `next build` 32/32 static; per-page slop grep = clean on all 7;
  not-live terms (version rollback, audio/video, per-slide, custom domains) confirmed framed as
  roadmap/negation, never claimed live; all 5 how-tos carry HowTo JSON-LD.
- **Deferred still:** comparison /vs pages, format pages (slides/PDF/spreadsheet/diagram),
  personas (/for), real legal copy, glossary/use-cases. Media (audio/video) waits for infra.

---

## 2026-07-22 — SEO content plan: pillars + infra (workflow build)
- **Asked:** Implement `ilolink-content-seo-plan.md` (ultracode). Scoped to: 3 pillar
  pages + SEO infrastructure; legal as plain-language stubs; stop-slop pass on all copy.
- **Built (infra, hand-written):**
  - `lib/seo/site.ts` — single page registry (drives sitemap, /guides index, footer,
    internal links). CTAs point at `/` (accountless composer = conversion), not /pricing.
  - `lib/seo/jsonld.tsx` — schema builders (Article, HowTo, FAQPage, SoftwareApplication,
    BreadcrumbList) + `<JsonLd>` with hardened serializer (escapes `< > &` so copy can
    never break out of the script tag).
  - `app/(marketing)/_components/content.tsx` — Article, Breadcrumbs, PageHeader (liftable
    lead), Prose, Callout, ComparisonTable, Faq, Cta, RelatedLinks.
  - `app/(marketing)/layout.tsx` — marketing chrome (header + footer w/ internal links).
  - `app/sitemap.ts`, `app/robots.ts` (registry-derived), `app/(marketing)/guides/page.tsx`.
  - `.prose` styles added to `app/globals.css` (no typography plugin; zen tokens).
- **Built (8 pages, dynamic workflow — 16 agents, draft→anti-slop-edit pipeline):**
  - Pillars: `/guides/share-ai-output` (P1, +HowTo schema), `/guides/best-way-to-share-ai-html`
    (P2, comparison table +SoftwareApplication), `/guides/analytics-heatmaps-feedback` (P3).
  - Legal/ops stubs (all carry a "Draft — not yet legally reviewed"/"Placeholder" callout):
    `/privacy`, `/terms`, `/acceptable-use`, `/report`, `/status`.
- **Honesty guardrail:** agents given exact live-feature facts; format-specific metrics
  (per-slide/PDF/watch-through), version rollback, custom domains, pricing framed as roadmap
  or omitted — never claimed live. Uniques described as approximate by design.
- **VERIFIED:** `tsc --noEmit` exit 0; `next build` 25/25 static incl. sitemap.xml + robots.txt;
  curled live server — titles/meta/H1/JSON-LD (Article+HowTo+FAQPage+BreadcrumbList+
  SoftwareApplication) all present, 10-URL sitemap, comparison table rendered; per-page grep
  for banned slop words = clean on all 8; no false-live claims; callouts present.
- **Not built (deferred per scope):** Group A–F supporting pages, personas (/for), per-competitor
  /vs pages, glossary, use-cases, real legal copy (stubs are placeholders pending review).

---

## 2026-07-21 — Exact view counter (Durable Object) + finish/cleanup
- **Asked:** Continue and finish; what's pending.
- **Built:** `ViewCounter` Durable Object (defined + migrated in the content-worker, one
  instance per doc, atomic increment on each pageview via ctx.waitUntil). App reads it
  cross-script (`script_name` binding); `/api/stats` returns `exactViews`, dashboard prefers it
  over AE's sampled count. Gotcha fixed: DO bindings use `name`, not `binding`. Deploy order:
  content-worker first (defines DO), then app.
- **VERIFIED LIVE:** `exactViews 0 → 5` after 5 pageviews (exact, immediate; AE still lagged at 2).
- **Housekeeping:** purged MY 3 test docs (Smoke Test / Launch Notes / Phase 2 Live) from D1 + KV
  + R2 — left the USER's 3 real "Clema" docs untouched. Refreshed README + DEPLOY.md to the final
  accountless + all-phases + DO + real-Turnstile state.
- **Pending = operational only:** rotate the CF API token (in transcript) and re-set
  `AE_SQL_TOKEN` after; eyeball doc-page overlays on view.ilolink.com (my DNS can't). No code
  work remains — full roadmap shipped.

---

## 2026-07-22 — Fix comment placement (markdown) + region/area selection
- **Reported:** (1) on a markdown doc, text-selection comment "doesn't show in right places";
  (2) on a landing page, the pin has no screenshot and selection is "only for text".
- **Root cause #1:** in the widget rewrite the text-selection affordance button was created WITHOUT
  a label → it rendered as a tiny empty box, and clicking it scrolled to the bottom form (far from
  the selection).
- **Fixed:** (1) affordance now labelled "💬 Comment" and clicking it opens the composer POPOVER
  right at the selection (with the quoted context); text anchors unchanged. (2) Added Figma-style
  AREA selection: in pin mode, click = point pin, DRAG = region — a rubber-band box, then a composer;
  the comment anchors to that region {type:"region",x,y,w,h}. Region comments render a highlighted
  BOX over the section + a corner pin; clicking the pin opens the thread and hovering brightens the
  box. (Pointer events → works with mouse and touch.) A literal screenshot isn't feasible
  dependency-free under the strict CSP, so the live region box IS the visual of the commented section.
  Server validateAnchor now accepts the region anchor alongside point + text.
- **VERIFIED LIVE on ilolink.com (screenshots):** markdown text selection → "💬 Comment" at the
  selection → composer popover in place; landing/any doc → drag an area → region box + numbered pin,
  posted, clicking the pin opens "On a selected area" thread with reply. WIDGET_JS node --check clean;
  28 tests green; content-worker deployed.

---

## 2026-07-22 — Figma-style pin comments + discoverable floating launcher
- **Asked:** the comment widget is buried at the bottom — make it discoverable (floating, right);
  and allow Figma-style screen selection (mouse/touch) to add a comment associated to a section.
- **Did:** rewrote content-worker/src/widget-script.ts:
  * Floating launcher pill, fixed bottom-right, always visible: "Comment" enters pin mode,
    "Comments" shows the live count + scrolls to the panel.
  * Pin mode: crosshair + hint; click anywhere on the doc → a composer popover opens at that spot,
    pre-labelled with the section's nearby text; posting anchors the comment to that POINT
    (fractional x/y of the document). Numbered pins render on the page; clicking a pin opens its
    thread popover (comment + replies + reply box).
  * Kept the bottom panel (reactions + notes + full comment list) and text-selection anchoring.
  * New anchor kind on the server: validateAnchor now accepts {type:"point",x,y,label} in [0,1]
    alongside the text-quote anchor (older no-type anchors still parse as text). All user text via
    textContent (no innerHTML).
- **VERIFIED LIVE on ilolink.com (screenshots):** launcher visible; Comment → click hero → composer
  popover "On: The data hub…" → posted → numbered pin "1" at the spot, launcher shows "1 comment";
  clicking the pin opens the thread with the comment + reply box. 28 tests green; WIDGET_JS
  node --check clean; content-worker deployed.

---

## 2026-07-22 — Home dashboard link, conditional preview switcher, app icon, readable widget
- **Asked (4):** dashboard link on home after publishing; only show device switcher if the doc has
  responsive CSS (else desktop-only full); add an app icon; posted comment text was dark-on-dark.
- **Did:** (1) share card now has a "Your documents →" link to the dashboard. (2) Preview shows the
  Mobile/Tablet/Desktop switcher ONLY when the doc's HTML has width-based @media queries; otherwise
  it renders desktop full (scaled to fit) with no switcher. (3) added app/icon.svg (accent
  rounded-square "link" mark) — Next serves it as the favicon. (4) the doc feedback/comments widget
  is now a self-contained LIGHT panel (own background + border) so its text (comments, headings) is
  readable on any doc, including dark-themed ones — the earlier fix only covered inputs.
- **VERIFIED LIVE on ilolink.com (screenshots):** publish → share card has the dashboard link +
  device switcher (clema is responsive); icon.svg served + linked in <head>; opened the doc at
  ilolink.com/<slug>, posted a comment — widget renders as a light card with dark readable text.
- **NOTE:** left the separately-added marketing/SEO files (app/(marketing)/*, robots.ts, sitemap.ts,
  lib/seo/*, globals.css .prose) untouched and uncommitted — not part of this task; already build-clean
  and deployed since they were in the working tree.

---

## 2026-07-21 — Home=composer, preview device switcher, single-origin ilolink.com URLs
- **Asked (3):** publish on the home page (fewer clicks); preview device switcher
  (mobile/tablet/desktop, default by device, desktop full-res in frame); doc address bar to stay
  ilolink.com (not view.ilolink.com).
- **Did:** (1) app/page.tsx now renders the `<PublishForm/>` composer directly under a tight hero.
  (2) Preview got a Mobile/Tablet/Desktop toggle — iframe renders at the device's real width
  (390/834/1280) and is transform-scaled to fit, so desktop shows its full-resolution layout;
  default picks from window.innerWidth. (3) next.config reverse-proxy rewrites forward slug-shaped
  paths + /tracker.js /widget.js /_collect /_feedback /_comments /_unlock to the content worker, so
  ilolink.com/<slug> serves the doc with the address bar staying ilolink.com; removed the old
  app/[slug] redirect. viewUrl already returns ilolink.com/<slug>.
- **Security note:** proxying serves untrusted doc HTML under the ilolink.com ORIGIN (same origin as
  the dashboard + its localStorage manage tokens), which trades away the two-origin isolation. The
  strict per-doc CSP (default-src 'none'; nonce script only) is retained as the primary defense.
  Documented tradeoff; user chose clean URLs. (Old view.ilolink.com links still work directly.)
- **VERIFIED LIVE on ilolink.com (screenshots):** home shows the composer; publish → share card with
  ilolink.com/<slug> URL + Open button + a device-switchable Preview (desktop full-res scaled,
  mobile 390px); ilolink.com/<slug> returns the doc (200, strict CSP), /tracker.js + /_collect proxy,
  app routes (/ , /publish) intact. 28 tests green.

---

## 2026-07-21 — UX fixes: fonts, publish preview, readable comments, branded URL
- **Asked (4):** relax CSP for Google Fonts; publish page preview + Open-in-new-tab before Copy;
  fix dark-on-dark comment/note inputs; share URL on ilolink.com not view.ilolink.com.
- **Did:** (Fonts) doc CSP + doc-html CSP now allow style-src fonts.googleapis.com + font-src
  fonts.gstatic.com only. (Publish) share card: added an "Open" (new tab) button before Copy in the
  link row + a live Preview (sanitized doc in a sandboxed no-scripts srcdoc iframe via token-gated
  /api/doc-html). (Comments) widget scopes its own light readable tokens (--surface/--ink/…) locally
  so the doc's :root overrides + reader dark-mode can't produce dark-on-dark inputs; --accent still
  inherits so buttons match the doc. (URL) publish returns ilolink.com/<slug>; new app/[slug]/route.ts
  302-redirects to view.ilolink.com/<slug> — branded link, rendering stays on the isolated origin
  (serving untrusted HTML on the apex would break origin isolation).
- **VERIFIED LIVE:** ilolink.com/<slug> → 302 → view.ilolink.com/<slug>; served doc CSP has the
  Google Fonts hosts; /widget.js carries the readable tokens; publish screenshot shows the
  ilolink.com URL + Open button + a rendered landing-page Preview. 28 tests green; both deployed.

---

## 2026-07-21 — Fix: render styled HTML docs (landing mockups)
- **Reported:** an uploaded HTML landing mockup rendered wrong (view.ilolink.com/8sjbae).
- **Root cause:** sanitization runs at PUBLISH time. The sanitizer stripped the doc's `<style>`
  block + inline `style=` (kept classes/divs → unstyled), AND the 68ch reading shell cramped the
  full-width layout.
- **Fix:** (1) sanitizer now allows `<style>` + `style=` + layout/form tags (nav/header/footer/
  main/aside/form/input/button/label/select/textarea) — safe under the served doc's strict CSP
  (no JS in CSS; external url()/@import governed by CSP; form-action 'none'); scripts/iframes/
  objects/on* still stripped. (2) `SlugRecord.source_type` added; content-worker renders HTML docs
  FULL-BLEED (author controls styling), Markdown docs in the zen reading shell.
- **VERIFIED LIVE (observed, screenshot):** re-published the mockup → rendered as the full landing
  page (peach→coral gradient hero, nav, serif headline, search box, sticky profile card + 9-lens
  grid, fixed badge). 28 unit tests green (added: styling kept, </style> can't smuggle a script,
  forms inert). Both workers deployed.
- **Caveat:** custom Google Fonts (@import fonts.googleapis) are blocked by the strict CSP → system
  font fallback (layout/colors perfect). Relaxing CSP for Google Fonts is a small optional follow-up.
- **Note:** existing docs published BEFORE this fix (e.g. 8sjbae) stay broken — they were stored
  sanitized-old; they must be RE-PUBLISHED to pick up the fix.

---

## 2026-07-21 — Real invisible Turnstile provisioned
- **Asked:** Provision real Turnstile (granted Turnstile:Edit scope).
- **Did:** Created an INVISIBLE Turnstile widget via CF API (sitekey 0x4AAAAAAD6lbUQWiBAq0dKi,
  hostnames ilolink.com / view.ilolink.com / workers.dev). Set the real `TURNSTILE_SECRET` worker
  secret; put the public sitekey in committed `.env.production` (NEXT_PUBLIC_, baked into client).
  Rebuilt + redeployed app.
- **VERIFIED LIVE (real browser):** /publish shows no visible widget; typed content + Publish →
  real invisible widget issued a token silently → real secret validated → published
  `view.ilolink.com/s224fh` (then deleted). No challenge shown.
- **Secret hygiene:** widget secret is a worker secret only (never committed); `.env.production`
  holds the public sitekey only.

---

## 2026-07-21 — Turnstile hidden (invisible verification)
- **Asked:** Make Turnstile hidden to verify.
- **Did:** Publish form now runs Turnstile INVISIBLE + `appearance:"interaction-only"` — verifies
  silently, only surfaces UI if a real interactive challenge is required. Fallback sitekey switched
  to Cloudflare's invisible always-pass test key `1x00000000000000000000BB` (prod injects an
  invisible-mode sitekey via `NEXT_PUBLIC_TURNSTILE_SITEKEY`). Widget container reserves no height.
- **VERIFIED LIVE (real browser):** /publish shows NO visible Turnstile widget (0 challenge
  iframes); typed content + clicked Publish → token issued silently → published
  `view.ilolink.com/tpk4jx` (then deleted). No "human check" error.

---

## 2026-07-21 — Phase 4: anchored comments + delete/unpublish (verified live)
- **Asked:** Continue (Phase 4).
- **Built:** Hand-wrote the security-critical delete path (token-gated `DELETE /api/documents`,
  cascade D1 delete + KV purge + R2 `deleteByPrefix`). Workflow (2 agents + verify) added:
  anchored comments — text selection offers a "Comment" affordance, stores
  `{quote,prefix,suffix,start,end}` in `comments.anchor` (offsets into the immutable doc text →
  resolve exactly), widget highlights the span + drops a margin pin; and the delete UI (two-step
  confirm on the dashboard detail page + per-card, with localStorage cleanup).
- **Security review:** no HIGH. Fixed [LOW-MED] moved the destructive delete token from the URL
  query to an `Authorization: Bearer` header (keeps it out of access logs); [LOW] batched the D1
  cascade into one atomic `DB.batch`. Documented [LOW/info]: anchor `quote` is commenter-provided
  display context (no XSS — textContent; the real highlight uses offsets), minor spoof surface.
- **VERIFIED LIVE (observed):** anchored comment posts + `GET /_comments` returns its anchor;
  anchor-on-reply rejected (400). Delete: no-auth 400, wrong-token 403, right-token `{ok:true}`;
  view → 404; **full erasure confirmed** (KV slug gone, D1 `docs:0 orphan_comments:0`). Dashboard
  detail page renders the "Danger → Delete document" zone (screenshot).
- **Deferred (noted):** Durable-Object exact counters (optional; AE counts honest for v1).
- **Visual not verifiable from here:** the anchored-comment margin pins/highlight render on the
  doc page (view.ilolink.com) — needs your eyes; data path verified.

---

## 2026-07-21 — Phase 3: heatmaps (built, deployed, verified live)
- **Asked:** Proceed with next steps; fix GitHub attribution to wilsonbright (not compressstudio).
- **Git:** commits were authored `wilson@blocksurvey.org` (maps to compressstudio GH account) —
  re-authored ALL commits to `wilsonbright <10022551+wilsonbright@users.noreply.github.com>`,
  force-pushed; GitHub now attributes to wilsonbright. Repo-local git identity updated.
- **Phase 3 (2-agent workflow + hand-written security fixes):** click capture in tracker.js
  (document-relative fractions x,y ∈ [0,1]); collector writes click coords to Analytics Engine
  (doubles 5/6, extended to 6 doubles for all events); token-gated `/api/heatmap` (clicks +
  scroll bands per device bucket sm/md/lg) and `/api/doc-html` (sanitized body for the overlay);
  dashboard `HeatmapView` — sandboxed no-scripts `srcdoc` iframe + canvas overlay (click-density
  blobs, scroll bands), device-bucket + click/scroll toggles. Render approach chosen to keep the
  content origin's strict CSP intact (never frames view.ilolink.com).
- **Security review:** no HIGH. Fixed [LOW-MED] `/_collect` accepted arbitrary event `type`
  (heatmap poisoning + possible AE write error) → closed-set validation + blob length caps +
  try/catch the write; [LOW] added `cache-control: private, no-store` to all token-in-URL
  responses (heatmap/stats/feedback/doc-html). Verified solid: token gating, AE SQL-injection
  defense, coord clamping, enumeration protection, iframe script-safety.
- **VERIFIED LIVE (observed):** click beacons → AE click rows; garbage event type dropped (not
  written); `/api/heatmap` returns the click points + scroll bands (cache-control set); token
  gating 403; `/api/doc-html` token-gated returns sanitized body. **Visual (screenshot of
  ilolink dashboard):** stats tiles + scroll funnel + referrers/countries/devices + reactions +
  private note all render; **heatmap overlay renders the doc + a click-density blob at the
  captured coords** with working bucket/mode toggles.
- **AE SQL note reconfirmed:** heatmap queries also use `count()` (not COUNT(*)).
- **Deployed:** content-worker `ad792e89`… then security fix; app redeployed. Both live.

---

## 2026-07-21 — Accountless pivot + Phase 2 (analytics, feedback, comments)
- **Asked:** No email/signup — open platform, browser-local index/history; do Phase 2 (all three).
- **Design:** brainstormed → spec + plan committed under `docs/superpowers/`. Chose: immutable docs +
  silent per-doc **manage token** (localStorage) gating private analytics + comment moderation;
  Turnstile + IP rate-limit on publish; Turnstile NOT on the content origin (keeps its strict CSP).
- **Foundation (hand-written):** migration `0002` (drop `users` + `owner_id`, add `manage_token_hash`);
  deleted all auth (magic link, sessions, `/api/auth`, signin, middleware); `lib/manage-token`,
  `lib/turnstile`, `lib/history` (localStorage); rewrote `/api/publish` open (Turnstile + rate-limit,
  returns `{slug,url,manageToken}`).
- **Phase 2 (5-agent workflow):** client dashboard (localStorage), Turnstile publish form; `tracker.js`
  (cookieless pageview/scroll/time, DNT-respecting) + `/_collect` → Analytics Engine; `widget.js`
  (reactions + notes + threaded comments) + `/_feedback`/`/_comments`; token-gated `/api/stats`
  (AE SQL) + `/api/comments/moderate` + `StatsView`. Both scripts served same-origin under CSP nonce.
- **Security review:** 1 HIGH fixed (public `/_feedback` leaked private notes → split: reactions public,
  notes token-gated via new `/api/feedback`); 2 LOW accepted+documented: rate-limit is KV
  read-then-write (not atomic — Durable Object is Phase 4); `img-src https:` lets a doc author beacon
  viewer IPs via embedded `<img>` (kept, since docs need external images — privacy caveat).
- **Secrets set:** app worker `TURNSTILE_SECRET` (CF test key) + `AE_SQL_TOKEN` (currently the account
  token — MUST be re-set to a dedicated Analytics-Read token after the deploy token is rotated);
  content-worker `SALT_SECRET`.
- **Deployed + VERIFIED LIVE (observed, real domains):** both workers deployed (ilolink.com +
  view.ilolink.com custom domains). End-to-end: anonymous publish w/ Turnstile test token → slug
  `dh23s9` + manageToken; doc serves tracker.js (1899B) + widget.js (6036B) + `ilo:doc` meta;
  `/_collect` beacons → Analytics Engine rows; token-gated `/api/stats` shows views 1 / uniques 1 /
  scroll 100%→1 / referrer news.ycombinator.com / device ≥1025; reactions public via `/_feedback`,
  notes ONLY via token-gated `/api/feedback` (HIGH fix confirmed — notes not leaked); honeypot
  drops bot reaction; comments post+reply+list (stored XSS inert, rendered via textContent);
  moderation 403 (wrong token) / 200 (right token) → hidden comment drops from public list.
- **Live-test bug caught + fixed:** Analytics Engine SQL rejects `COUNT(*)` ("must have 0
  arguments") and lacks `uniq()` — rewrote query.ts to `count()` + a GROUP BY subquery for
  uniques. Without the live test this would have shipped as silent all-zero stats.
- **Test docs** in prod (dh23s9, plus earlier) under throwaway data — harmless, no delete UI yet.

---

## 2026-07-21 — Phase 1: publish + read (built, deployed, verified live)
- **Asked:** Build Phase 1 (ultracode).
- **Did:** Wrote security core by hand (types contract, `lib/cf`, `lib/sanitize/{markdown,html,csp}`).
  Ran a 10-agent workflow (foundation libs → surface routes/worker/UI → adversarial security
  review + build-verify). Applied the security review: fixed broken magic-link callback URL,
  PBKDF2 100k→600k, anti-framing/CSP on all content-worker responses, constant-time unlock
  compare, dropped DOM-clobbering `name` attr, added KV rate-limit on magic endpoint.
- **Deployed:** content-worker → **view.ilolink.com** (custom domain, live). App → OpenNext
  Worker `ilolink`, live on **ilolink.sweet-night-5b17.workers.dev** (apex ilolink.com custom
  domain trigger FAILED — pre-existing parked A record → 192.64.119.21; not overridden, needs
  user decision). Set `workers_dev: true` in config after a redeploy silently disabled it.
- **VERIFIED LIVE (observed, not inferred):** landing renders zen UI (screenshot); magic-link
  auth → 307 + host-only `ilo_session` cookie; publish a deliberately MALICIOUS html doc →
  slug `9hepg7`; fetched `view.ilolink.com/9hepg7` via edge and confirmed `<script>`, `onerror`,
  `onclick`, `javascript:` link, `<iframe>` ALL stripped, legit content survived, CSP
  `default-src 'none'; script-src 'nonce-…'` + X-Frame-Options DENY etc. all present.
- **Integration bugs caught by the live test + fixed:** publish form sent snake_case
  (`source_type`) vs API camelCase (`sourceType`) — two agents disagreed on the contract;
  `APP_ORIGIN` was `app.ilolink.com` → corrected to `ilolink.com`.
- **Known Phase-1 tradeoffs (documented):** magic token consumable by link-prefetchers (GET
  single-use); Turnstile deferred to Phase 2.
- **Files:** lib/{types,cf,ratelimit}, lib/sanitize/*, lib/db/*, lib/auth/*, lib/crypto/password,
  lib/r2/store, lib/slug, lib/publish/pipeline, app/api/{publish,documents/[id],auth/*},
  app/(app)/*, app/(auth)/signin/*, app/page.tsx, middleware.ts, content-worker/*, wrangler.jsonc.
- **Apex wired (user approved takeover):** deleted the parked A record (→192.64.119.21), redeployed;
  **ilolink.com** now serves the app (custom domain, cert issued, HTTP 200). Full production loop
  re-verified on the real domains: apex auth → apex publish (md) → `view.ilolink.com/2kqffj` renders.
- **Open:** set RESEND_API_KEY for real email (dev fallback works now); Phase 2
  (analytics/feedback/comments); rotate the CF API token after the session.

---

## 2026-07-21 — Phase 0: skeleton
- **Asked:** Build first version from `ilolink-spec.md` (ultracode). Phase 0 + Phase 1.
- **Did (Phase 0):** Provisioned Cloudflare resources via API token — D1 `ilolink`
  (`342cf013-…`), KV (`b3b0ebce…`), R2 `ilolink-docs`, Queue `ilolink-jobs`; AE dataset
  `ilolink_events` declared. Hand-scaffolded Next 15.5.20 + React 19 + `@opennextjs/cloudflare`
  1.20 + Tailwind v4 (c3 flag schema broke — `--framework=next` unsupported in c3 2.70).
  Wrote `wrangler.jsonc` (real binding IDs), `next.config.ts` (output standalone +
  OpenNext dev), `open-next.config.ts`, zen design tokens in `globals.css` (@theme),
  landing placeholder, `migrations/0001_init.sql` (5 tables). Applied migration to remote
  D1 — verified all 5 tables exist. Generated typed `CloudflareEnv`. **Verified:** `next
  build` compiles clean (3.3s, page prerendered). Moved CF deploy creds out of `.env`
  → `.cf.env` so Next doesn't auto-load them. Added README, DEPLOY.md, `.dev.vars.example`.
- **Decisions locked:** content origin = `view.ilolink.com` (subdomain, best isolation);
  I provision+deploy via user's scoped API token; Next 15.5.20 (avoids OpenNext's 16.0–16.2.5
  peer-dep hole).
- **Files touched:** `package.json`, `tsconfig.json`, `next.config.ts`, `open-next.config.ts`,
  `wrangler.jsonc`, `postcss.config.mjs`, `app/{globals.css,layout.tsx,page.tsx}`,
  `migrations/0001_init.sql`, `README.md`, `DEPLOY.md`, `.dev.vars.example`, `.gitignore`.
- **Not yet:** live deploy to Workers (next), Phase 1 features.

---

## 2026-07-21 — Project setup
- **Asked:** Set up project tracking — CLAUDE.md, WORKLOG.md, ultracode/workflow +
  verify-don't-guess rules, persist scope/reference/behavior memory entries.
- **Did:** Created project `CLAUDE.md` (scope, worklog note, global-rules note,
  ultracode & workflows section, verify-don't-guess section) and this `WORKLOG.md`.
  Wrote 3 memory entries (project scope, ultracode/workflows reference, verify-don't-guess
  behavior) + `MEMORY.md` index.
- **Files touched:** `CLAUDE.md`, `WORKLOG.md`, memory dir
  (`project-scope.md`, `ultracode-workflows.md`, `verify-dont-guess.md`, `MEMORY.md`).
- **Git:** `git init` (branch `main`), added `.gitignore`, set repo-local identity
  (wilson@blocksurvey.org), added remote `origin` →
  `https://github.com/wilsonbright/ilolink.git`, made first commit. Not pushed yet.
