# ilolink — Worklog

Dated running record, newest entries at top. After every meaningful task, append:
date, what was asked, what was done, files touched.

---

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
