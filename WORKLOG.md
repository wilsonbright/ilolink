# ilolink — Worklog

Dated running record, newest entries at top. After every meaningful task, append:
date, what was asked, what was done, files touched.

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
- **Open:** wire ilolink.com apex to the app (needs user OK — repoints the domain); set RESEND_API_KEY
  for real email; Phase 2 (analytics/feedback/comments).

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
