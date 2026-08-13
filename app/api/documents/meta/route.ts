// /api/documents/meta — document metadata for the detail page.
//
// GET  ?slug=[&token=]        → { visibility, creatorLabel, canChangeVisibility }
// PATCH { slug, visibility }  → flip a live document between public / unlisted /
//                               private.
//
// GET exists because the detail page renders from a localStorage history entry
// written at publish time — its visibility is a snapshot that goes stale the
// moment anything changes it, and it never knew who published the document at
// all. Authorization is guardDoc canRead, the same gate /api/stats already
// holds this page's data behind; a request that can see the analytics can see
// who published them.
//
// PATCH mirrors /api/documents/move exactly: a session plus teamspace
// membership (canPublishInto), never a legacy manage token. A manage token
// proves you published a document, not that you belong to a teamspace — and
// "private" MEANS "members of the teamspace", so on a teamspace-less doc it
// would be a lock with no keyholders. Password and expiring documents are
// refused in both directions here: entering them needs inputs (a password, a
// deadline) this control does not collect, and leaving them is a republish
// decision, not a dropdown flick.
//
// The UPDATE writes D1 and then rewrites the KV slug record, because KV — not
// D1 — is what the content worker actually serves visibility from on the hot
// path (content-worker/src/index.ts readSlugRecord). Skipping KV would leave
// the published page enforcing the old visibility indefinitely.

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import { currentUser } from "@/lib/auth/current-user";
import { queryFirst, execute } from "@/lib/db/client";
import { getMembership } from "@/lib/teamspace/store";
import { canPublishInto } from "@/lib/teamspace/permissions";
import { readSlugRecord, writeSlugRecord } from "@/lib/db/documents";
import type { SlugRecord } from "@/lib/types";

export const runtime = "nodejs";

function bad(error: string, status = 400): NextResponse {
  return NextResponse.json(
    { error },
    { status, headers: { "cache-control": "private, no-store" } },
  );
}

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await guardDoc(req, { require: "canRead" });
  if (!guard.ok) return guard.response;
  const { doc, userId } = guard;

  // Provenance display: the publisher's name, or their email when they never
  // set one. created_by is null for pre-accounts docs — the client omits the
  // line rather than inventing an author.
  const creator = doc.created_by
    ? await queryFirst<{ label: string }>(
        "SELECT COALESCE(name, email) AS label FROM users WHERE id = ?",
        doc.created_by,
      )
    : null;

  // Whether PATCH below would say yes — computed here so the client can show a
  // control that works or a plain tag, never a control that 403s on first use.
  // Membership, not caps.canEdit: an editor SHARE satisfies canEdit without any
  // membership, and visibility governs who beyond the shares may read at all.
  const membership = userId
    ? await getMembership(doc.teamspace_id ?? null, userId)
    : null;

  return NextResponse.json(
    {
      visibility: doc.visibility,
      creatorLabel: creator?.label ?? null,
      canChangeVisibility: canPublishInto(membership),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

// What this control may set. Deliberately narrower than the full Visibility
// union: password and expiring carry extra inputs that only the composer
// collects, so both directions of those transitions stay a republish concern.
const CHANGEABLE = new Set(["public", "unlisted", "private"]);

export async function PATCH(req: Request): Promise<NextResponse> {
  const user = await currentUser();
  if (!user) return bad("Sign in to change visibility.", 401);

  const body: unknown = await req.json().catch(() => null);
  const b = (body ?? {}) as Record<string, unknown>;
  const slug = typeof b.slug === "string" ? b.slug : "";
  const visibility = typeof b.visibility === "string" ? b.visibility : "";
  if (!slug || !visibility) {
    return bad("Both 'slug' and 'visibility' are required.");
  }
  if (!CHANGEABLE.has(visibility)) {
    return bad("Visibility here can be 'public', 'unlisted' or 'private'.");
  }

  const doc = await queryFirst<{
    id: string;
    slug: string;
    visibility: string;
    teamspace_id: string | null;
  }>(
    "SELECT id, slug, visibility, teamspace_id FROM documents WHERE slug = ?",
    slug,
  );
  // Same non-disclosure as move: "no such document" and "not yours" must be
  // indistinguishable.
  if (!doc) return bad("You can't change that document.", 403);

  const role = doc.teamspace_id
    ? await getMembership(doc.teamspace_id, user.id)
    : null;
  if (!canPublishInto(role)) {
    return bad("You can't change that document.", 403);
  }

  if (doc.visibility === "password" || doc.visibility === "expiring") {
    return bad(
      "Password-protected and expiring documents change visibility when republished.",
    );
  }

  await execute(
    "UPDATE documents SET visibility = ?, updated_at = ? WHERE id = ?",
    visibility,
    Date.now(),
    doc.id,
  );

  // The content worker reads visibility from the KV slug record, not D1, so
  // this write is what makes the change real on view.ilolink.com. Mutate the
  // existing record in place — every other field (r2 keys, trusted,
  // comments_mode…) must survive. Absent record = unpublished doc; D1 alone is
  // then already the whole truth.
  const rec = await readSlugRecord(doc.slug);
  if (rec) {
    await writeSlugRecord(doc.slug, {
      ...rec,
      visibility: visibility as SlugRecord["visibility"],
    });
  }

  return NextResponse.json(
    { ok: true, visibility },
    { headers: { "cache-control": "private, no-store" } },
  );
}
