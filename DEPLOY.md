# Deploy & operations — ilolink

Everything runs on Cloudflare (Workers + D1 + R2 + KV + Analytics Engine + Queues)
via `@opennextjs/cloudflare`. Domain: `ilolink.com`; content origin: `view.ilolink.com`.

## Provisioned resources (account `a8ec57aa9f4b6a49e48e60b1aa2a306e`)

| Binding | Type | Name / ID |
|---|---|---|
| `DB` | D1 | `ilolink` · `342cf013-28a3-4fb7-b5a6-650102fad933` |
| `DOCS` | R2 | `ilolink-docs` |
| `KV` | KV | `b3b0ebce3b0842afa429cfa3372483e8` |
| `EVENTS` | Analytics Engine | dataset `ilolink_events` |
| `JOBS` | Queue | `ilolink-jobs` |

## Credentials

- **Deploy creds** (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) live in `.cf.env`
  (git-ignored). Source before any wrangler command: `set -a; . ./.cf.env; set +a`.
- **App runtime secrets** — set for production with `wrangler secret put`:
  ```bash
  wrangler secret put AUTH_SECRET       # openssl rand -base64 32
  wrangler secret put RESEND_API_KEY
  wrangler secret put TURNSTILE_SECRET
  wrangler secret put AE_SQL_TOKEN
  ```
  For local dev, copy `.dev.vars.example` → `.dev.vars`.

## Common commands

```bash
# Local dev (Next dev server, OpenNext binds D1/R2/KV locally)
npm run dev

# Apply DB migrations
npm run db:migrate:local     # local SQLite for dev
npm run db:migrate:remote    # remote D1

# Build + preview the real Worker bundle locally
npm run preview

# Build + deploy to Cloudflare
npm run deploy
```

## First deploy — DNS / routes (one-time)

After `npm run deploy` publishes the Worker:

1. Map the app origin `ilolink.com` to the Worker (custom domain in the Workers
   dashboard, or a route in `wrangler.jsonc`).
2. Add `view.ilolink.com` as the content origin (Phase 1: separate Worker /
   route serving sanitized docs with strict CSP).

> Watch the Worker size limit (10 MiB on paid). Keep `.open-next/` out of git.
