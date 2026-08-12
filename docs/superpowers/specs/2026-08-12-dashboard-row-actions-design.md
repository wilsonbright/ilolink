# Dashboard row actions — copy URL, preview, move, inline views

**Date:** 2026-08-12
**Status:** approved, not yet implemented
**Surface:** `/dashboard`

## Problem

A document row on `/dashboard` reads `Working With Wilson · public md open` and a
date. Everything you might want to do with a published document — get its link,
look at it, see whether anyone read it, put it in the right teamspace — costs a
navigation or is impossible.

The last one is not a convenience. Until `02eb986` the composer never sent a
teamspace, so **every document published from the web landed in Personal**. Ten
documents on this account are in Personal that were never meant to be, and there
is currently no way to move any of them. Move is the repair for a shipped bug,
not a nice-to-have.

## Scope

Four affordances on each document row:

1. **Copy URL** — put the public link on the clipboard.
2. **Preview** — look at the published page without leaving the list.
3. **Move** — change which teamspace owns the document.
4. **Views** — one number, inline.

Explicitly out of scope: bulk selection, drag-and-drop between tabs, renaming,
unpublishing (already exists elsewhere), comment counts, uniques, per-row
heatmaps.

## Row layout

All four are always visible — no hover-reveal, no per-row overflow menu. Touch
devices have no hover, and a menu costs two clicks for what should cost one.

```
Working With Wilson                          Aug 11, 2026
public  md  ·  128 views              [↗] [👁] [⧉] [⇄]
                                       │    │    │   └── move
                                       │    │    └────── copy URL
                                       │    └─────────── preview
                                       └──────────────── open
```

The existing `open` text link becomes the `↗` icon, so the row gains three
controls rather than four. Icons are inline SVG (this project has no icon
library and will not gain one), 16px, `currentColor`, each with an `aria-label`
and a `title`.

Move is drawn as a move glyph, deliberately **not** an ellipsis. Move does open a
small popover — it has to ask which teamspace — but that popover contains
exactly one kind of thing, a list of destinations. An `⋯` would promise a general
actions menu the row does not have, and would undo the reason all four controls
are visible in the first place.

Below `sm` the icon cluster wraps under the metadata line rather than
compressing the title.

## Components

### `DocumentRowActions` (new client island)

`/dashboard` stays a server component. One client island per row holds the three
interactive controls and the views number. It receives only what it needs:
`slug`, `docId`, `url`, `title`, `currentTeamspaceId`, and the list of teamspaces
the viewer may move into.

### 1. Copy URL

`navigator.clipboard.writeText(url)`. On success the icon swaps to a check for
1.5s. `navigator.clipboard` is undefined in non-secure contexts, so the fallback
selects the URL in a hidden input and calls `document.execCommand("copy")`; if
that also fails, the URL is surfaced selected so it can be copied by hand. A
copy control that silently does nothing is worse than one that isn't there.

### 2. Preview overlay

A sandboxed iframe pointing at the live document URL, opened over the list.

**Security posture is copied exactly from `app/(app)/dashboard/heatmap-view.tsx`:**
`sandbox="allow-same-origin"` with **no** `allow-scripts`. The content worker
serves author HTML and, for `trusted=1` documents, arbitrary author JavaScript by
design. The preview must not become the place that executes it inside an
authenticated origin.

Behaviour: Esc closes, backdrop click closes, focus moves into the overlay on
open and returns to the triggering button on close, and the overlay is
`role="dialog"` + `aria-modal="true"` with the document title as its label. The
overlay carries its own Open and Copy URL actions, since wanting one of those is
the usual reason to have looked.

Password-protected and expiring documents render whatever a visitor would see —
the preview is not a privileged view, and pretending otherwise would misrepresent
what has been shared.

### 3. Views inline

`GET /api/counts?slug=` already exists and returns `{ views, comments }`. Its own
header comment says it is for the dashboard to fetch one per card, so this is the
use it was built for.

Fetched client-side **after** paint, one request per row, in parallel. The
server-rendered list must never block on it. Until a row's count resolves it
renders nothing — not `0 views`, which would be a wrong number that later
corrects itself.

Counts come from the `VIEW_COUNTER` Durable Object, which is keyed
`idFromName(docId)` — one object per document. There is no batched query across
documents, so N documents cost N round trips whatever we do; doing them from the
client, after paint, in parallel is the cheapest arrangement available.

Only `views` is rendered. `comments` arrives in the same response and is ignored.

### 4. Move — `POST /api/documents/move`

Body: `{ documentId, teamspaceId }`.

**Guards, in order.** Each reuses an existing helper rather than restating the
rule:

| # | Check | Helper | Failure |
|---|---|---|---|
| 1 | Session present | `currentUser()` | 401 |
| 2 | Caller may manage the document where it currently is | `resolveDocAccess` | 403 |
| 3 | Caller may publish into the target | `canPublishInto` | 403 |
| 4 | Target teamspace is `status = 'active'` | direct read | 403 |
| 5 | Target has document capacity | `checkDocumentAllowance` | 403 + `documentLimitMessage` |

**Guard 5 is the one that is easy to omit and must not be.** `/api/publish`
refuses to create a document once a teamspace is at its plan's cap. If move
skipped that check, move would be a way to put unlimited documents into a
free teamspace — a billing bypass reachable from a button.

Guard 3 returns the same indistinguishable failure for "not a member" and "no
such teamspace", matching `resolveNamedTeamspace`'s existing behaviour so
teamspace ids cannot be probed.

**Two non-obvious correctness requirements:**

- **`folder_id` must be set to NULL in the same statement.** `folders.teamspace_id`
  is `NOT NULL` (migration `0010_folders.sql:13`) — folders belong to exactly one
  teamspace. A moved document that kept its `folder_id` would point at a folder
  in the teamspace it just left.
- **`slug` must not change.** Every already-shared URL keeps working. Move
  changes ownership, not identity. The UI says so, so nobody avoids the feature
  fearing they will break a link they have already sent.

The write is a single `UPDATE documents SET teamspace_id = ?, folder_id = NULL
WHERE id = ?`.

Direction is unrestricted: personal → team, team → personal, team → team. A
document moved by mistake must be movable back without shipping more code.

## Data flow

```
/dashboard (server component)
  └─ renders rows from listDashboardDocs()
       └─ DocumentRowActions (client)
            ├─ copy    → clipboard, local state only
            ├─ preview → overlay, no network beyond the iframe
            ├─ views   → GET /api/counts?slug=   (after paint)
            └─ move    → POST /api/documents/move
                           └─ on success: router.refresh()
```

`router.refresh()` rather than patching client state: moving a document changes
the tab counts and which tab the document belongs to, and re-deriving that on the
server is the only way those stay correct.

## Errors

Every failure says what happened and what to do about it.

- Target teamspace full → the existing `documentLimitMessage` text, including the
  upgrade link, shown inline on the row rather than as a toast that disappears.
- Not a member of the target → the target simply is not offered in the menu; the
  server still refuses independently, because a client-side list is a convenience
  and never a control.
- Clipboard unavailable → described above; never a silent no-op.
- `/api/counts` fails → the row renders no number. A missing number reads as
  "not loaded"; a zero reads as "nobody came", and only one of those is honest.

## Testing

**Unit (pure, no D1):** a new `lib/teamspace/move-targets.ts` answering "given the
viewer's teamspaces and the document's current one, which teamspaces may it move
to, and how are they labelled" — including that the current teamspace is marked
and not offered as a destination. Same extraction rationale as
`dashboard-tabs.ts` and `publish-target.ts`.

**Guards:** extend `test/permissions.test.ts` patterns to cover the move gate,
particularly that a target at its document cap is refused.

**Browser, against a seeded local D1:** move a document Personal → team and read
the row back from the database; confirm `folder_id` is NULL afterwards and the
slug is unchanged; confirm the published URL still resolves; confirm the preview
iframe does not execute script; confirm Esc closes the overlay and focus returns;
confirm views appear without blocking first paint.

## Files

| File | Change |
|---|---|
| `app/(app)/dashboard/page.tsx` | render the new island, pass move targets |
| `app/(app)/dashboard/document-row-actions.tsx` | new client island |
| `app/(app)/dashboard/preview-overlay.tsx` | new sandboxed iframe overlay |
| `app/api/documents/move/route.ts` | new endpoint |
| `lib/teamspace/move-targets.ts` | new pure helper |
| `test/move-targets.test.ts` | new unit tests |
