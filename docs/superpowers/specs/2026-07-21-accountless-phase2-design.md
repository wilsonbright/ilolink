# Design — Accountless pivot + Phase 2 (analytics, feedback, comments)

Date: 2026-07-21
Status: approved-pending-review

## Goal

Remove accounts entirely. ilolink becomes an open, anonymous publishing platform:
anyone can publish with no signup. A per-doc **manage token** (secret, browser-stored)
gives the publisher private analytics and comment moderation without a server account.
Documents are **immutable** (no content edits). Then ship Phase 2: cookieless analytics,
feedback, and basic comments.

## 1. Auth removal + data model

**Remove:** magic-link auth, KV sessions, `users` table, `/api/auth/*`, `app/(auth)/signin`,
auth `middleware.ts`, `lib/auth/*`, `currentUser` gating, `lib/publish` re-publish route
(`app/api/documents/[id]`). Email (`lib/auth/email.ts`) is deleted — no email anywhere.

**Migration `0002_accountless.sql`:**
- `DROP INDEX idx_documents_owner;`
- `ALTER TABLE documents DROP COLUMN owner_id;`
- `ALTER TABLE documents ADD COLUMN manage_token_hash TEXT;` (SHA-256 of the manage token)
- `DROP TABLE users;`
- Keep `documents`, one `document_versions` row per doc, `comments`, `feedback`.

**Manage token:** on publish, generate `nanoid(32)`. Store `SHA-256(token)` in
`documents.manage_token_hash`; return the raw token to the browser once. It is high-entropy,
so a plain SHA-256 (constant-time compared) is sufficient — no PBKDF2 needed. Any privileged
action (private stats, comment moderation) requires presenting the token; the server hashes
and constant-time-compares it to `manage_token_hash`.

## 2. Open publish + browser-local history

- `POST /api/publish` (app origin) becomes public. Steps: verify **Turnstile** token →
  **IP rate-limit** (KV, e.g. 20/hour) → sanitize → store raw+rendered in R2 → `documents` +
  one `document_versions` → slug → KV `SlugRecord`. Generates + stores `manage_token_hash`.
  Returns `{ slug, url, manageToken }`. No `editUrl`.
- Client appends `{ slug, title, url, visibility, publishedAt, manageToken }` to
  `localStorage["ilolink:history"]` (a small typed helper in `lib/history.ts`, client-only).
- **Dashboard** (`app/(app)/dashboard`) becomes a **client component** that reads localStorage
  and renders the list. No server enumeration (there is no owner to query by). Empty state
  explains history is per-browser. Per-doc page (`dashboard/[slug]`) reads the token from
  localStorage and fetches that doc's private analytics.
- Remove signin/auth shell; app header simplifies to wordmark + "Publish".

## 3. Phase 2 — cookieless analytics

**Client `public/tracker.js`** (dependency-free, <5 KB), injected into the served doc by the
content-worker under the existing CSP nonce:
- On load (unless `navigator.doNotTrack === "1"`): `POST` a `pageview` beacon via
  `navigator.sendBeacon` to `https://view.ilolink.com/_collect`.
- Track scroll-depth milestones (25/50/75/100%), time-on-page (visibility-aware), referrer,
  device class (width bucket: `≤640` / `641–1024` / `≥1025`). Batch, flush on `pagehide`.

**Collector** — content-worker route `POST /_collect`:
- Validate; derive country from `request.cf.country`; compute visitor id =
  `SHA-256(daily_salt + ip + ua + doc_id)` where `daily_salt = SHA-256(<UTC-date> + SALT_SECRET)`
  (rotates at 00:00 UTC, never stored). Respect DNT (drop if signalled).
- Write one AE row to `EVENTS`: `blobs = [doc_id, event_type, referrer_host, country,
  device_class, path, visitor_hash]`, `doubles = [scroll_pct, time_on_page_s, viewport_w,
  viewport_h]`, `indexes = [doc_id]`.
- IP rate-limit the collector (KV) to blunt floods.

**Dashboard stats** — app route `GET /api/stats?slug=&token=`:
- Verify manage token against `manage_token_hash` (private analytics). 403 otherwise.
- Query AE SQL API server-side (secret `AE_SQL_TOKEN` + account id): views, unique visitors
  (`COUNT(DISTINCT visitor_hash)`), top referrers, countries, device split, scroll-depth funnel,
  avg time-on-page, and a per-day sparkline. Render calm stat tiles (dataviz discipline).

## 4. Phase 2 — feedback

- **Reaction bar** rendered by the first-party doc script at the end of the doc: 👍 clear /
  🤔 confusing / 👀 interesting. One reaction per visitor per day (dedupe on `visitor_hash`).
- **Note** — one expandable textbox + optional name. `POST /_feedback` on the content origin →
  `feedback` row (`kind` = `reaction` | `note`).
- **Protection (design decision — see §6):** IP rate-limit + `visitor_hash` dedupe, **not**
  Turnstile, to avoid loading third-party script onto the strict-CSP content origin.
- Creator sees aggregate reaction counts + notes list in the per-doc dashboard (token-gated).

## 5. Phase 2 — comments

- Top-level + one reply level, tied to the doc, rendered by the first-party doc script.
  Optional name; optional email is **not** collected (no email in this product).
- `GET /_comments?doc=` (list visible) and `POST /_comments` (add) on the content origin.
  IP rate-limit; store in `comments` (`status` defaults `visible`).
- **Moderation:** the per-doc dashboard (has the manage token) can hide/flag a comment via
  `POST /api/comments/moderate` (token-gated). This is the manage-token's second privilege.

## 6. Security decisions

1. **Content-origin CSP stays strict.** Turnstile requires loading
   `challenges.cloudflare.com` script + iframe, which would weaken the untrusted-content
   origin's CSP. So Turnstile gates **publish only** (app origin, normal CSP). Visitor
   feedback/comments on the content origin use IP rate-limit + daily `visitor_hash` dedupe +
   a hidden honeypot field. *(Flag: this deviates from the spec, which wanted Turnstile on
   feedback/comments. Trade-off favours keeping the content origin locked down. Revisit if
   spam proves it insufficient.)*
2. **Analytics are private by manage token** — stats endpoints 403 without a valid token.
3. **Manage token** never leaves the browser except when presented to privileged endpoints
   over HTTPS; only its SHA-256 is stored server-side; compared in constant time.
4. Collector, feedback, comments endpoints all IP-rate-limited (KV counters).
5. Cookieless preserved: no cookies for analytics; visitor id is a daily-rotating, unstored hash.

## 7. Secrets / provisioning needed

- **Turnstile** widget: site key (public, in publish form) + `TURNSTILE_SECRET` (Worker secret).
  Provision via CF API with the account token if scope allows; else user supplies keys.
- `AE_SQL_TOKEN` — account token to read the Analytics Engine SQL API.
- `SALT_SECRET` — random, for the daily visitor-hash salt (`wrangler secret put`).

## 8. Out of scope (unchanged)

Heatmaps (Phase 3), anchored comments / Durable-Object exact counters / version rollback
(Phase 4). No email, ever. No content editing after publish.

## 9. Build order

1. Data migration + auth removal (foundation; app must still build).
2. Open publish (Turnstile + rate-limit) + `lib/history` + client dashboard.
3. Analytics: tracker.js + collector + AE writes + stats API + stats UI.
4. Feedback + comments: content-origin endpoints + first-party doc-script UI + moderation.
5. Deploy; verify live (publish anonymously → view → beacon lands in AE → stats render →
   react/comment → moderate).
