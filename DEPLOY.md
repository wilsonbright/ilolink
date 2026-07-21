# Deploy & operations — ilolink

Two Cloudflare Workers, live:
- **App** `ilolink` on `ilolink.com` (custom domain) — dashboard, publish, private APIs.
  Built via `@opennextjs/cloudflare`.
- **Content** `ilolink-content` on `view.ilolink.com` (custom domain) — serves sanitized
  docs + the tracker/widget scripts + the `/_collect` `/_feedback` `/_comments` endpoints.
  Config: `content-worker/wrangler.jsonc`.

## Provisioned resources (account `a8ec57aa9f4b6a49e48e60b1aa2a306e`)

| Binding | Type | Name / ID |
|---|---|---|
| `DB` | D1 | `ilolink` · `342cf013-28a3-4fb7-b5a6-650102fad933` |
| `DOCS` | R2 | `ilolink-docs` |
| `KV` | KV | `b3b0ebce3b0842afa429cfa3372483e8` |
| `EVENTS` | Analytics Engine | dataset `ilolink_events` |
| `JOBS` | Queue | `ilolink-jobs` |
| `VIEW_COUNTER` | Durable Object | class `ViewCounter` (defined in `ilolink-content`; app binds cross-script) |
| — | Turnstile | invisible widget · sitekey `0x4AAAAAAD6lbUQWiBAq0dKi` (public, in `.env.production`) |

## Credentials & secrets

- **Deploy creds** (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) live in `.cf.env`
  (git-ignored). Source before any wrangler command: `set -a; . ./.cf.env; set +a`.
- **Public build var**: `NEXT_PUBLIC_TURNSTILE_SITEKEY` in committed `.env.production`
  (public by design; baked into the client bundle).
- **Worker secrets** (`wrangler secret put`):
  ```bash
  # App worker (ilolink):
  wrangler secret put TURNSTILE_SECRET --name ilolink   # invisible widget secret
  wrangler secret put AE_SQL_TOKEN     --name ilolink    # Analytics Engine SQL API (see note)
  # Content worker (ilolink-content):
  wrangler secret put SALT_SECRET --config content-worker/wrangler.jsonc  # daily visitor-hash salt
  ```
  > **AE_SQL_TOKEN is currently the account deploy token.** After you rotate the deploy
  > token, re-set `AE_SQL_TOKEN` (ideally a dedicated *Account Analytics: Read* token) or
  > dashboard stats/heatmaps go blank.

  No `AUTH_SECRET`/`RESEND_API_KEY` — the product is accountless with no email.

## Common commands

```bash
# Local dev (Next dev server, OpenNext binds D1/R2/KV locally)
npm run dev

# DB migrations
npm run db:migrate:remote    # remote D1 (0001_init, 0002_accountless)

# Deploy — CONTENT WORKER FIRST (it defines the ViewCounter Durable Object the app binds to):
set -a; . ./.cf.env; set +a
npx wrangler deploy --config content-worker/wrangler.jsonc
npm run deploy               # app (opennextjs-cloudflare build && deploy)
```

## Notes

- Deploy order matters: the app's cross-script `VIEW_COUNTER` binding requires
  `ilolink-content` (which defines + migrates the DO) to be deployed first.
- Custom domains auto-provision DNS + cert. `workers_dev: true` keeps the app's
  `*.workers.dev` URL live for testing.
- Watch the Worker size limit (10 MiB). Keep `.open-next/` out of git.
- **Real Turnstile:** an invisible-mode widget is provisioned; to rotate, create a new
  invisible widget and update `.env.production` (sitekey) + `TURNSTILE_SECRET` (secret).
