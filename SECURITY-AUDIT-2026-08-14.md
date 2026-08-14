# ilolink — Pre-Launch Security Audit (2026-08-14)

**Scope:** app worker + content-worker + mcp-worker + trends-worker
**Method:** 5 parallel surface auditors (payments/subscription, quota/file-bomb,
client secrets, auth/authz, launch-surface), each forced to adversarially
disprove its own findings; a synthesizer re-judged severity for launch and
spot-checked the high-severity items; the two blockers were then re-verified
line-by-line by hand against source (see "Hand-verification" per finding).

---

## Remediation status (updated 2026-08-14, same day)

| Finding | Status |
|---|---|
| 🔴 Blocker 1 — unbounded R2 (docs) | **FIXED** — superseded doc versions pruned on every write (`pruneSupersededVersionsWith` in `lib/publish/store-core.ts`, called from both store composites + `updateDoc`). Bounds every doc to one stored version; self-healing on existing bloat. |
| 🔴 Blocker 1 — unbounded R2 (artifacts) | **FIXED** — per-teamspace version ceiling `MAX_VERSIONS_PER_TEAMSPACE = 20_000` enforced in `putArtifact` before any insert. Abuse-stop set far above any legit registry, so no UX impact. |
| 🔴 Blocker 2 — docx decompression bomb | **FIXED** — converted HTML re-checked against the 15 MB text ceiling before storing, at all 3 sites (`docs.ts`, `publish-core.ts`, `app/api/publish/route.ts`). |
| 🟠 Medium — proposal flood | Open (recommended next). |
| 🟡 Low — webhook ordering | Open (recommended next). |
| 🟡 Low — `/_feedback` visibility | Open (recommended next). |

Deployed: app `877d1f14`, mcp `5b79941b`. Tests: 465/465 (5 new pinning the prune + cap). **Verification boundary:** prune/cap logic is unit-tested against the real functions and tsc-clean across all workers; a live `update_document` loop watching R2 stay flat was NOT run (needs an authenticated MCP session / PAT). Serving is unaffected by construction — prune deletes only non-current versions, after the KV slug swap.

---

## Bottom line — NO-GO until the two file-bomb holes are capped

The **auth, payments/subscription, and client-secret surfaces are genuinely
well-hardened.** No money-bypass, no cross-tenant IDOR, no leaked secret
survived verification. The launch blocker is a different class: **the MCP write
paths let a free account accumulate unbounded, never-pruned R2 storage** — a
direct, recurring bill, no attacker sophistication required.

---

## Findings, ranked (blockers first)

### 🔴 BLOCKER 1 — Unbounded R2 accumulation via MCP writes (agent file-bomb / plan-quota breach)

**Where:**
- `mcp-worker/src/docs.ts:186` (`updateDoc`) + `mcp-worker/src/agent.ts:556-563` (`update_document` handler)
- `lib/artifacts/store-core.ts:263` (`putArtifact`) + `mcp-worker/src/agent.ts` `artifacts_put` / `artifacts_push`

**Exploit — two vectors, one root defect (every write creates new R2 objects that are *never* deleted, gated only by a per-minute rate limit):**

1. **`update_document` loop.** A free teamspace publishes one doc (within the
   3-doc cap), grabs its `document_id`, then loops `update_document` (reachable
   via OAuth or an `ilo_pat_…` PAT). Each call: `createVersionWith` + two
   `putBodyWith` writes (raw ≤15 MB + rendered) + re-point `current_version_id`.
   The old version's R2 objects are **never pruned** — the only delete is the
   full-doc cascade in `lib/db/documents.ts:57`. The doc-count quota doesn't
   apply because the id is reused; the handler comment (`agent.ts:559`) says so
   outright: *"Update has no doc-count quota, so the rate limit is the only
   ceiling."* Sole gate: `enforceMcpRate(KV,'update',15,60)` = 15/min.
   **≈225 MB/min ≈ 324 GB/day of permanent R2 per free teamspace**, ×N accounts.

2. **`artifacts_push` / `artifacts_put`.** `putArtifact` checks body size
   (256 KB, real byte length, before the put — `store-core.ts:284`) but has **no
   artifact-count cap, no version-count cap, no total-bytes cap, and no
   plan-entitlement check anywhere.** `artifacts_push` = 50 files/call × 5
   calls/min = **250 objects/min ≈ 92 GB/day**, each distinct body a new
   permanent version. The registry is marketed as paid; a free personal
   teamspace can write the whole thing.

**Hand-verification (2026-08-14):** Read `updateDoc` end-to-end (docs.ts:212-248)
— new version + two puts + `setCurrentVersionWith`, zero deletion. Read
`putArtifact` (store-core.ts:263-333) — 256 KB body cap + identical-body dedup
only; a distinct name/body bypasses the dedup and files a fresh version. No
plan/quota/total-bytes lookup exists in `lib/artifacts`. **CONFIRMED.**

**Fix (at least one; rate-limiting cannot bound an accumulating resource):**
- Prune superseded versions: after `setCurrentVersionWith`, delete the prior
  version's R2 bodies + row (docs are single-current-version; history retention
  buys little here).
- Enforce a plan-derived per-teamspace total-bytes and/or version-count ceiling
  inside `putArtifact` and `updateDoc`.
- Gate registry writes on plan entitlement if the registry is paid-only.

---

### 🔴 BLOCKER 2 — docx decompression bomb bypasses the 15 MB ceiling

**Where:** `mcp-worker/src/publish-core.ts:267-276` + `app/api/publish/route.ts:378-391` + `mcp-worker/src/docs.ts:227-233`

**Exploit:** The upload gate checks `bytes.byteLength > MAX_BINARY_BYTES` (15 MB)
on the **still-zip-compressed** .docx. A .docx is zipped XML; a repetitive
`document.xml` compresses >1000:1, so a 15 MB zip can hold hundreds of MB of
text. `docxToHtml` (mammoth) inflates that to an HTML string passed straight to
`putBodyWith`/`storeVersion` with **no re-check of the converted length against
`MAX_TEXT_BYTES`** — a multi-hundred-MB R2 object stored past the advertised
cap, or the 128 MB worker OOMs mid-conversion (DoS). Reachable free via
`publish_document`, repeatedly via `update_document` — compounds Blocker 1.

**Hand-verification (2026-08-14):** Read all three post-conversion paths — in
`updateDoc` (docs.ts:227-233) the docx→html result is `putBodyWith`-stored with
no size re-check, whereas the sibling text branch (docs.ts:238) *does* check
`byteLength(raw) > MAX_TEXT_BYTES`. The missing check is **CONFIRMED**.
**Residual uncertainty:** mammoth's real expansion ratio / whether it self-guards
against zip bombs was not measured empirically. The missing check is certain; the
magnitude is the unmeasured part. Blocker anyway — the downside (OOM/DoS +
oversized store) is cheap to trigger and cheap to fix.

**Fix:** After `docxToHtml`, check `byteLength(converted)` (and rendered HTML)
against `MAX_TEXT_BYTES` and reject before storing, on all three call sites;
ideally bound decompressed size during conversion.

---

### 🟠 MEDIUM — Review queue can be flooded (proposal DoS)

**Where:** `mcp-worker/src/agent.ts:1131-1136` (only `countProposals` call) vs. `artifacts_put` / `artifacts_push`

**Exploit:** The 25-pending-proposal ceiling exists **only** in the
`artifacts_contribute` handler. `artifacts_put` and `artifacts_push` never call
`countProposals`, so a member under review in a review-enabled teamspace can
file unbounded proposals (distinct names/bodies) at 20–250/min, burying the
admin review queue and bloating R2 with `proposed`-status versions. Needs an
already-admitted member → medium, not a money hole.

**Fix:** Apply the same `countProposals(>= N)` guard to `artifacts_put` and
`artifacts_push`.

---

### 🟡 LOW — Stripe webhook records idempotency marker *before* the plan grant commits (payment reliability, not attacker)

**Where:** `app/api/stripe/webhook/route.ts:55-113`

**Exploit:** Not attacker-triggerable. `INSERT OR IGNORE INTO stripe_events`
(line 55) commits the event id as "processed" before the `UPDATE teamspaces SET
plan` (line 102). If that UPDATE hits a transient D1 error, the POST 500s,
Stripe retries, line 61 sees `meta.changes === 0` and returns
`{ok:true,duplicate:true}` **without ever granting** — a real customer pays,
stays on free, needs manual reconciliation. Signature verify, dedup, and
`stripe_session_id` UNIQUE are all correct; this is the one soft spot on an
otherwise solid payments surface.

**Fix:** Put the `stripe_events` insert + plan UPDATEs in one D1 batch, or record
the event id only *after* the grant, or on the duplicate short-circuit re-verify
the teamspace actually reflects the paid plan before returning 200.

---

### 🟡 LOW — `/_feedback` POST does not gate on private/unpublished (content-worker)

**Where:** `content-worker/src/index.ts:654` (`postFeedback`)

**Exploit:** `postFeedback` checks honeypot + rate limit + `docExists` but **not**
visibility or `unpublished_at` — unlike `postComment` (961-977). Someone who
knows a private doc's UUID (surfaced post-gate in `<meta name="ilo:doc">`, e.g. a
since-removed member) can POST `/_feedback {doc:<id>,kind:'note',value:…}` from
outside the gate, spoofing "reader notes" that surface to the owner. Reactions
read back as zeros for private docs, so realistic impact is **spoofed notes
only**, and the actor needs the UUID (`crypto.randomUUID`, not enumerable).

**Fix:** After `docExists`, load visibility + `unpublished_at` (the SELECT
`postComment` already does) and refuse — returning the honeypot's silent
`{ok:true}` to preserve the no-oracle invariant — when private/unpublished.

---

## Requested categories, explicitly

| Category | Verdict |
|---|---|
| **(a) Payment gaps** | One LOW reliability defect (webhook marks processed before grant commits). **No attacker money-bypass.** Signature/replay/idempotency/price-derivation all solid. |
| **(b) Subscription hijack** | **None.** Checkout owner-only, price server-derived, teamspace/plan bound server-side, `teamspaces.plan` written only by the signed webhook, one-time lifetime model (no downgrade/expiry lifecycle to abuse). |
| **(c) Agent file-bombing** | **BLOCKER 1 + BLOCKER 2 + MEDIUM.** The launch risk. |
| **(d) Plan-quota breach** | Folded into Blocker 1: the paid-marketed registry has no plan gate; `update_document` has no doc-count cap. The doc-*publish* count path itself is correctly teamspace-capped (old `workspace_id` bypass is fixed). |
| **(e) Client-side tokens/keys** | **None.** Only `NEXT_PUBLIC_TURNSTILE_SITEKEY` (publishable) reaches a client component; grep of `.next/static` + `.open-next/assets` for every secret name = zero hits; PATs returned once, stored SHA-256 only. |
| **(f) Other launch risks** | LOW `/_feedback` visibility gap. Sanitizer/XSS, SQLi, SSRF, open-redirect, session/OTP/invite authz all audited solid. |

---

## GO / NO-GO

**NO-GO** until the accumulating-storage holes are capped — a real recurring
bill, not a hypothetical.

**Must-fix before launch:**
1. Cap cumulative R2 in the MCP write paths — prune superseded versions on
   `update_document`, add a per-teamspace count/byte ceiling (+ plan gate) in
   `putArtifact`. *(Blocker 1 — the reason for NO-GO.)*
2. Re-check converted docx size against `MAX_TEXT_BYTES` before storing, on all
   three call sites. *(Blocker 2 — cheap fix, prevents oversized store + OOM.)*

**Strongly recommended, same sprint (not launch-blocking):**
3. Add the `countProposals` guard to `artifacts_put`/`artifacts_push`.
4. Make the webhook grant atomic with its idempotency marker.
5. Gate `/_feedback` on visibility/unpublished like `/_comments`.

**Residual uncertainty:** the docx expansion ratio (Blocker 2) is reasoned, not
measured — mammoth was not run against a crafted zip bomb. The fix is trivial and
worth doing regardless; a ~10-min empirical test would give the exact multiplier.
Everything in Blocker 1 was read line-by-line and is confirmed.

---

## What was verified SOLID (coverage, not just problems)

- **Payments:** raw-body signature verify (fail-closed on empty secret), 300s
  replay window, `stripe_events` PK dedup, `stripe_session_id` UNIQUE, price
  derived server-side from `plans.ts`, checkout owner-only, plan never granted
  from the success redirect, atomic seat gate folded into the invite INSERT.
- **Auth/authz:** opaque SHA-256 session (immediate revocation), `__Host-` cookie
  host-locked off the content origin, PBKDF2 OTP with 5-attempt cap + single
  consume, 190-bit magic link, `requireMember()` re-reads role/status/token_epoch
  from D1 on every MCP tool call, invite role server-stored, last-owner
  protection atomic, doc/folder/proposal mutations all membership-gated, no
  client-trusted userId/role, signed HMAC OAuth handoff bound to `reqHash`.
- **Client secrets:** only a publishable Turnstile key in any client component;
  no secret in the built bundle; PAT shown once, stored hashed.
- **Launch surface:** SVG/HTML sanitizer allowlist (no `foreignObject`/SMIL/
  in-SVG `<a>`), CSP `default-src 'none'` + nonce, trusted docs sandboxed without
  `allow-same-origin`, all SQL uses `.bind()`, `global_fetch_strictly_public` on
  all four workers, SSRF-safe repo-name regex in trends-worker, byte-identical
  404s across origins (no existence oracle), `safeRedirect` guards open redirect.
