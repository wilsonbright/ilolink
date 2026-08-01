# Deploy runbook — accounts / teamspaces release

Everything in this release is on `fix/pre-launch-security`. It has never been
deployed. Work top to bottom; the ordering is load-bearing.

## 0. Rotate the exposed Resend key — first

`RESEND_API_KEY` was pasted into a chat transcript during development. Treat it
as compromised: rotate it in the Resend dashboard before it is set anywhere.
The value in the local, git-ignored `.dev.vars` is not in any commit, but the
transcript is the exposure.

Also rotate, per the original launch plan: `ADMIN_SECRET` and the Cloudflare API
token.

## 1. Secrets

`wrangler secret put <NAME>` per worker. **Two of these must be identical across
workers or things fail in confusing ways.**

| Secret | `ilolink` | `ilolink-content` | `ilolink-mcp` | Notes |
|---|:--:|:--:|:--:|---|
| `RESEND_API_KEY` | ✅ | | | rotated value from step 0 |
| `EMAIL_FROM` | ✅ | | | must be on a Resend-verified domain |
| `SITE_ORIGIN` | ✅ | | | **see the warning below** |
| `MCP_ORIGIN` | ✅ | | | `https://mcp.ilolink.com` |
| `MCP_HANDOFF_SECRET` | ✅ | | ✅ | **must match exactly** |
| `DASHBOARD_SECRET` | ✅ | | ✅ | must match (existing) |
| `TURNSTILE_SECRET` | ✅ | | | existing |
| `ADMIN_SECRET` | ✅ | | | rotated |
| `AE_SQL_TOKEN` | ✅ | | | existing |
| `SALT_SECRET` | | ✅ | | existing |

> **`SITE_ORIGIN` is the one that cannot be undone.** It is read at send time and
> baked into every magic link and invitation email. Set it wrong and you mail
> links that point at the wrong host — and you cannot recall an email. Verify it
> is exactly `https://ilolink.com` before the first send.

> **`MCP_HANDOFF_SECRET` set on only one worker** makes every connector approval
> fail with "Invalid authorize request", which reads like a bug rather than a
> config error. Set it on both.

`ilolink.com` was verified in Resend on 2026-08-01. Confirm it still reads
`status: verified` before launch:

```
curl -s -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains
```

## 2. Migrations

```
npm run db:migrate:remote        # 0007 … 0013
npx wrangler d1 execute ilolink --remote --file scripts/backfill-ownership.sql
```

The backfill is idempotent — running it twice is safe.

**What it deliberately does not do:** it never touches web-published documents.
Their only ownership proof is a manage token in one browser's localStorage, so
attributing them server-side would be a guess, and a wrong guess hands one
person's analytics and delete button to another. They keep working through the
legacy path and are attached to an account when their publisher visits
`/dashboard` and uses the claim banner.

## 3. Deploy — content worker FIRST

```
npx wrangler deploy --config content-worker/wrangler.jsonc   # owns the ViewCounter DO
npx wrangler deploy --config mcp-worker/wrangler.jsonc
npm run deploy                                               # the app
```

Content first because it defines the `ViewCounter` Durable Object that the other
two bind to cross-script.

## 4. Verify against live

Auth
- [ ] Request a code at `/signin`; it arrives; the emailed link points at
      `https://ilolink.com`, not localhost
- [ ] Code signs in; refresh keeps you signed in; sign out revokes
- [ ] `curl -sI https://ilolink.com/dashboard | grep -i x-frame-options` → `SAMEORIGIN`
- [ ] `curl -sI 'https://ilolink.com/embed/comment?doc=x' | grep -i -e x-frame -e content-security`
      → **no** `X-Frame-Options`, and `frame-ancestors 'self' https://view.ilolink.com`

The cookie boundary — the one that matters most
- [ ] Confirm the OpenNext production runtime behaves like `next dev` did, i.e.
      that the rewrite forwards `Cookie` to the content origin. It was measured
      under `next dev` only. The session cookie is `__Host-`-prefixed so the
      browser will never send it to `view.ilolink.com` directly, but confirm the
      server-side proxy hop too.

Teamspaces
- [ ] Publish signed-out → 401; signed-in → 200 and it appears on `/dashboard`
- [ ] Invite a second real address; accept; confirm they see the teamspace's
      documents and **cannot** see another teamspace's

MCP
- [ ] Reconnect the connector in Claude; approval screen shows the teamspace picker
- [ ] `publish_document` lands in the chosen teamspace
- [ ] `skills_put` then `skills_get` from a **different** project returns the same
      body behind the provenance header
- [ ] An old `w_…/mcp` URL returns the reconnect error, not a 404

Security repros from `SECURITY-AUDIT-2026-07-23.md`
- [ ] H1 report-flood
- [ ] H2 unmetered MCP writes

## 5. Known gaps at launch

- **The comment widget's composer swap has never rendered in a real browser
  against a published document.** Everything around it is tested; the iframe
  actually mounting is not. Check one published document before announcing.
- **~123 lines of "no account" copy across ~50 marketing pages are still
  accountless-era.** See `copy-sweep.md`. 21 of those are still true (reader
  claims); the rest are not. This is a launch blocker for credibility, not for
  function.
- `visibility='team'` (genuinely private documents) was deliberately left out of
  scope. Teamspaces work with `unlisted` in the interim.
