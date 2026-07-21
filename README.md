# ilolink

Publish a Markdown or HTML file, get a shareable link, and see how people actually
read it — cookieless analytics, heatmaps, feedback, and comments. Built for PMs and
designers sharing docs, specs, and briefs. **Live:** `ilolink.com` (app) +
`view.ilolink.com` (published docs).

**Stack:** Next.js 15.5 (App Router) · Tailwind v4 · Cloudflare Workers via
`@opennextjs/cloudflare` · D1 · R2 · KV · Analytics Engine · Durable Objects · Turnstile.

## Model — accountless

No signup, no email. Anyone can publish (open, Turnstile + IP rate-limited). Publishing
returns a per-doc **manage token** kept in the browser's `localStorage` (your history);
that token unlocks private analytics and comment moderation. Documents are **immutable**
after publish; the manage token can also delete them.

## Status — shipped ✅

- **Phase 0** scaffold + Cloudflare bindings + D1 schema.
- **Phase 1** publish → sanitize → store → slug; isolated content origin with strict CSP;
  visibility modes (public / unlisted / password / expiring).
- **Accountless pivot** — dropped auth; manage-token ownership; browser-local history.
- **Phase 2** cookieless analytics (tracker → Analytics Engine, DNT-respecting), feedback
  (public reactions + private notes), threaded comments + moderation.
- **Phase 3** heatmaps — click + scroll capture, device buckets, canvas overlay.
- **Phase 4** anchored comments (text-selection pins), delete/unpublish, exact per-doc
  view counter (Durable Object).

See [`DEPLOY.md`](./DEPLOY.md) for resources, secrets, and deploy commands.

## Develop

```bash
npm install
cp .dev.vars.example .dev.vars   # local secrets (see DEPLOY.md)
npm run db:migrate:local
npm run dev
```

## Security posture

Uploaded HTML is treated as hostile: sanitized on ingest (`sanitize-html` strict
allowlist), served from an isolated content origin (`view.ilolink.com`) under a strict
per-response CSP (`default-src 'none'`, nonce'd first-party script only), never on the app
origin. Analytics are cookieless — visitor identity is a daily-rotating, unstored hash that
cannot re-identify anyone across days. Private analytics/moderation/delete are gated by a
constant-time manage-token check; every D1 query is parametrized.
