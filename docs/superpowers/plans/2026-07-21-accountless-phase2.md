# Accountless Pivot + Phase 2 Implementation Plan

> **For agentic workers:** executed via dynamic Workflow (ultracode). Tasks are ordered
> by dependency; each ends with an independently verifiable deliverable. Verification is
> live-integration (build + deploy + curl) plus targeted unit checks where noted.

**Goal:** Remove accounts (open anonymous publishing with a per-doc manage token + browser-local
history), then ship Phase 2 (cookieless analytics, feedback, threaded comments).

**Architecture:** Next 15.5 app on Cloudflare Workers (OpenNext) at ilolink.com; isolated
content-worker at view.ilolink.com serving sanitized docs + first-party doc-script (tracker +
feedback + comments UI) under strict CSP; D1 / R2 / KV / Analytics Engine bindings.

**Tech Stack:** TypeScript strict, sanitize-html, markdown-it, nanoid, Web Crypto, Turnstile,
Analytics Engine SQL API.

## Global Constraints

- No accounts, no email anywhere. Documents immutable after publish.
- Manage token = `nanoid(32)`; store `SHA-256(token)` only; constant-time compare.
- Content-origin CSP stays strict; Turnstile only on publish (app origin). Visitor endpoints
  (`/_collect`, `/_feedback`, `/_comments`) use IP rate-limit + daily `visitor_hash` + honeypot.
- Cookieless analytics: visitor id = `SHA-256(daily_salt + ip + ua + doc_id)`,
  `daily_salt = SHA-256(<UTC-date> + SALT_SECRET)`, unstored; respect `navigator.doNotTrack`.
- `tracker`/doc-script dependency-free, < 5 KB, served from content origin under the CSP nonce.
- TypeScript strict; parametrize all D1; no ad-hoc hex in UI (design tokens only).

---

## Task 1: Data migration + auth removal (foundation)

**Files:**
- Create: `migrations/0002_accountless.sql`
- Delete: `lib/auth/*`, `app/api/auth/*`, `app/(auth)/`, `app/api/documents/[id]/route.ts`,
  `middleware.ts`
- Modify: `lib/db/documents.ts` (drop owner_id; add manage_token_hash read/write, findById),
  `lib/db/users.ts` (delete), `lib/types.ts` (drop User; `DocumentRow.owner_id` → remove,
  add `manage_token_hash`), `lib/publish/pipeline.ts` (drop editUrl/APP edit)

**Migration SQL:**
```sql
DROP INDEX IF EXISTS idx_documents_owner;
ALTER TABLE documents DROP COLUMN owner_id;
ALTER TABLE documents ADD COLUMN manage_token_hash TEXT;
DROP TABLE IF EXISTS users;
```

**Deliverable / verify:** `wrangler d1 migrations apply ilolink --remote` succeeds; `next build`
clean after deletions (no dangling imports).

---

## Task 2: Manage token + open publish

**Files:**
- Create: `lib/manage-token.ts` — `newManageToken(): string` (nanoid 32);
  `hashToken(t): Promise<string>` (SHA-256 hex); `verifyToken(t, hash): Promise<boolean>`
  (constant-time)
- Create: `lib/turnstile.ts` — `verifyTurnstile(token, ip): Promise<boolean>` (POST siteverify
  with `TURNSTILE_SECRET`; if secret unset, return false in prod / true in dev flag)
- Modify: `app/api/publish/route.ts` — remove auth gate; verify Turnstile; IP rate-limit
  (20/hr); generate manage token, store hash; return `{slug, url, manageToken}`
- Create: `lib/history.ts` — client-only localStorage helpers: `addToHistory(entry)`,
  `getHistory(): HistoryEntry[]`, `HistoryEntry = {slug,title,url,visibility,publishedAt,manageToken}`

**Interfaces produced:** `verifyToken`, `hashToken`, `getHistory/addToHistory`.

**Deliverable / verify (unit + live):** unit-check `hashToken`/`verifyToken` round-trip and
reject wrong token; deploy; `curl` publish without Turnstile → 403; with valid dev bypass →
`{slug,url,manageToken}` present.

---

## Task 3: Client history dashboard + publish form

**Files:**
- Modify: `app/(app)/publish/publish-form.tsx` — add Turnstile widget (site key), send token;
  on success `addToHistory(...)`; drop any auth assumptions
- Rewrite: `app/(app)/dashboard/page.tsx` → client component reading `getHistory()`; list cards;
  per-browser empty-state copy
- Modify: `app/(app)/dashboard/[slug]/page.tsx` — client; read manageToken from history; fetch
  stats (Task 6)
- Modify: `app/(app)/layout.tsx` — remove sign-out; wordmark + Publish only
- Modify: `app/page.tsx` — CTA "Publish a document" → `/publish` (no signin)

**Deliverable / verify:** deploy; browser: publish a doc → appears in dashboard from localStorage;
no signin anywhere; landing CTA goes to publish.

---

## Task 4: Analytics tracker (client doc-script)

**Files:**
- Create: `public/tracker.js` — dependency-free (<5 KB). On load (unless DNT): `sendBeacon`
  pageview to `/_collect`. Track scroll milestones (25/50/75/100), time-on-page
  (visibilitychange), referrer, device class. Flush on `pagehide`. Reads `doc_id` from a
  `<meta name="ilo:doc">` the shell injects.
- Modify: `content-worker/src/index.ts` — serve the real tracker.js (not the no-op); inject
  `<meta name="ilo:doc" content="<docId>">` + nonce'd `<script src="/tracker.js">` into the shell

**Deliverable / verify:** deploy content-worker; load a doc via edge; confirm tracker.js served
(<5 KB, correct content-type), meta tag present, CSP unchanged.

---

## Task 5: Collector → Analytics Engine

**Files:**
- Create: `lib/analytics/collect.ts` — `visitorHash(ip, ua, docId, saltSecret)`,
  `dailySalt(saltSecret)`, `deviceClass(w)`, `refHost(ref)`
- Modify: `content-worker/src/index.ts` — `POST /_collect`: validate, DNT-drop, IP rate-limit,
  derive country from `request.cf`, write AE row to `EVENTS`
  (`blobs=[doc_id,event_type,referrer_host,country,device_class,path,visitor_hash]`,
  `doubles=[scroll_pct,time_on_page_s,viewport_w,viewport_h]`, `indexes=[doc_id]`)

**Deliverable / verify:** deploy; `curl -XPOST view.ilolink.com/_collect` with a pageview →
202; query AE SQL API and confirm the row landed for that doc_id.

---

## Task 6: Dashboard stats (AE SQL API)

**Files:**
- Create: `lib/analytics/query.ts` — `queryStats(docId): Promise<Stats>` via AE SQL API
  (`AE_SQL_TOKEN`, account id): views, uniques (`COUNT(DISTINCT visitor_hash)`), referrers,
  countries, device split, scroll funnel, avg time, per-day series
- Create: `app/api/stats/route.ts` — `GET ?slug=&token=`: resolve doc, `verifyToken` vs
  `manage_token_hash` (403 else), return `queryStats`
- Create: `app/(app)/dashboard/stats-view.tsx` — calm stat tiles + sparkline (dataviz tokens)

**Deliverable / verify:** deploy; publish → generate a pageview → dashboard stats page (with
token) shows views ≥ 1; without/with-wrong token → 403.

---

## Task 7: Feedback (reactions + notes)

**Files:**
- Modify: `content-worker/src/index.ts` — `POST /_feedback` (reaction|note): rate-limit +
  `visitor_hash` daily dedupe + honeypot; insert `feedback` row. `GET /_feedback?doc=` aggregate.
- Modify: `public/tracker.js` (or `public/widget.js`) — render reaction bar (👍🤔👀) + note box
  at doc end; submit; one reaction/visitor/day
- Modify: stats view — show reaction counts + notes list (token-gated via `/api/stats` or a
  `/api/feedback` read)

**Deliverable / verify:** deploy; react on a doc → `feedback` row; second reaction same
day/visitor deduped; dashboard shows the count.

---

## Task 8: Comments (top-level + one reply)

**Files:**
- Modify: `content-worker/src/index.ts` — `GET /_comments?doc=` (visible only),
  `POST /_comments` (rate-limit + honeypot, optional name, `status=visible`)
- Modify: doc-script — render threaded list (1 reply level) + add-comment form
- Create: `app/api/comments/moderate/route.ts` — `POST {slug, commentId, action, token}`:
  `verifyToken` → set `status` hidden/flagged
- Modify: `dashboard/[slug]` — moderation list (hide/flag), token-gated

**Deliverable / verify:** deploy; post a comment → visible on doc; reply → nested; moderate
hide with token → disappears from `GET /_comments`; wrong token → 403.

---

## Task 9: Provision + deploy + full live verification

**Steps:** provision Turnstile (CF API or user keys) → set `TURNSTILE_SECRET`, `SALT_SECRET`,
`AE_SQL_TOKEN` via `wrangler secret put` (both workers as needed) → wire site key into publish
form → deploy app + content-worker → end-to-end: publish anonymously (Turnstile) → view →
beacon in AE → stats render (token) → react + comment → moderate. Update WORKLOG + README + DEPLOY.
