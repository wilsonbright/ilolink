# ilolink

Publish a Markdown or HTML file, get a shareable link, and see how people actually
read it — cookieless analytics, heatmaps, and quiet feedback. Built for PMs and
designers sharing docs, specs, and briefs.

**Stack:** Next.js (App Router) · Tailwind v4 · Cloudflare Workers via `@opennextjs/cloudflare`
· D1 · R2 · KV · Analytics Engine · Queues.

## Status

- **Phase 0 — skeleton** ✅ scaffold, bindings, D1 schema, local build verified.
- **Phase 1 — publish + read** (in progress): auth, upload→sanitize→store→slug,
  content origin with strict CSP, visibility modes.
- Phases 2–4: analytics + feedback + comments, heatmaps, anchored comments.

See [`DEPLOY.md`](./DEPLOY.md) for resources, credentials, and deploy commands, and
the build spec for the full design.

## Develop

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in local secrets
npm run db:migrate:local
npm run dev
```

## Security posture (why this exists)

Uploaded HTML is treated as hostile: sanitized on ingest, served from an isolated
content origin (`view.ilolink.com`) under a strict CSP, never on the app origin
where the creator's session lives. Analytics are cookieless — visitor identity is a
daily-rotating hash that can't re-identify anyone across days.
