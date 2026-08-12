# Accountless copy sweep — CLOSED 2026-08-12

**Status: done. Nothing here is outstanding.** Kept as a record of what the sweep
covered and how the close-out was verified; the stale by-file worklist that used
to fill this file was removed on 2026-08-12 because every line it cited had
already been rewritten. `git log -- docs/launch/copy-sweep.md` has the original
if you want to see what the backlog looked like.

## What the problem was

ilolink launched accountless: publishing needed no account, and ownership was a
per-doc manage token in the publisher's browser. ~50 marketing pages said so, in
123 separate places. The v2 pivot (accounts, teamspaces, the registry) made the
publisher half of every one of those claims false while leaving the *reader* half
true — and the reader half is now the differentiator, so the fix was never
"delete the phrase", it was "scope it to readers".

## How it was closed

- The bulk pass ran 2026-08-09 as three multi-agent workflows (map → copy →
  accountless sweep), each ending in an adversarial verifier. Those verifiers
  earned their place twice: one caught that a sweep agent's own `grep "2 MB"`
  could not match `2&nbsp;MB` and had missed 5 live claims plus three
  user-facing error strings; the other caught 5 surviving false claims including
  one in `lib/seo/site.ts`, which no agent had searched because all four had
  grepped `app/**/*.tsx` only. Both sets were fixed by hand.
- Close-out verification, 2026-08-12: re-resolved **all 123 citations** in this
  file against the current tree, rather than sampling. Result — **97** cited
  lines no longer carry the phrase at all, **0** files or line numbers had gone
  missing, and **26** still contained a flagged phrase. All 26 were read in
  context: **25 are reader-scoped and true** ("readers need no account",
  "the client needs no login — the link opens immediately", "Can readers comment
  without an account?"). The 26th was the only real remnant.
- The one remnant: `app/(marketing)/_components/content.tsx:183`, a code comment
  reading *"ilolink is accountless — the composer is the signup"*. Rewritten in
  place. It was a comment, not page copy, which is exactly why five passes of
  page-copy greps had walked past it.
- Also re-checked corpus-wide, not just at the citations: `2 MB` / `2&nbsp;MB`
  now appears **nowhere** in `app/(marketing)` or `app/page.tsx` (the one "12 MB
  attachment" hit on the landing page is unrelated prose), and the single
  surviving "manage token" mention — `guides/where-hosted/page.tsx:74` — is a
  correct statement about origin isolation, not an ownership claim.

## What is deliberately left saying "no account"

Reader-side claims, everywhere they appear. Readers still never sign in to open a
document, react, or comment. Keep them, and keep them explicitly scoped — the
pattern that reads correctly is *"Readers need no account; publishing needs a
free one."*

## Still open elsewhere (not copy)

The four legal pages in the sitemap — `/privacy`, `/terms`, `/acceptable-use`,
`/report` — still carry "Draft — not yet legally reviewed" callouts, and
`/report` publishes `abuse@ilolink.com (placeholder)` in body copy and in two
FAQ answers that ship as FAQPage JSON-LD. That needs a decision about real legal
copy and a real abuse mailbox, not a copy sweep.
