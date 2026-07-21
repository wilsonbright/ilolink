# ilolink — Worklog

Dated running record, newest entries at top. After every meaningful task, append:
date, what was asked, what was done, files touched.

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
