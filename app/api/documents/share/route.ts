// GET    /api/documents/share?slug=        — who this document is shared with
// POST   /api/documents/share              — share or assign it to an address
// DELETE /api/documents/share?slug=&id=    — revoke a grant
// PATCH  /api/documents/share              — mark an assignment done / reopen
//
// All four require canManageShares, which only a teamspace owner (or a legacy
// manage-token holder) has. An editor share deliberately cannot re-share:
// otherwise access would spread transitively beyond what the owner granted.

import { NextResponse } from "next/server";
import { guardDoc } from "@/lib/auth/doc-guard";
import {
  listShares,
  revokeShare,
  setAssignmentState,
  shareDocument,
  ShareError,
  SHARE_ROLES,
} from "@/lib/teamspace/shares";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/otp";
import type { ShareRole } from "@/lib/teamspace/permissions";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
  const guard = await guardDoc(req, { require: "canManageShares" });
  if (!guard.ok) return guard.response;
  const shares = await listShares(guard.doc.id);
  return NextResponse.json(
    { shares },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: {
    slug?: unknown;
    email?: unknown;
    role?: unknown;
    kind?: unknown;
    note?: unknown;
    dueAt?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug) {
    return NextResponse.json({ error: "A 'slug' is required." }, { status: 400 });
  }

  const guard = await guardDoc(req, { require: "canManageShares", slug });
  if (!guard.ok) return guard.response;

  const rawEmail = typeof body.email === "string" ? body.email : "";
  if (!isPlausibleEmail(rawEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  const role = (
    SHARE_ROLES.includes(body.role as ShareRole) ? body.role : "viewer"
  ) as ShareRole;
  const kind = body.kind === "assignment" ? "assignment" : "share";

  try {
    const share = await shareDocument(
      guard.doc.id,
      normalizeEmail(rawEmail),
      role,
      kind,
      guard.userId ?? "legacy",
      {
        note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
        dueAt: typeof body.dueAt === "number" ? body.dueAt : null,
      },
    );
    return NextResponse.json({ share }, { status: 201 });
  } catch (e) {
    if (e instanceof ShareError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const shareId = new URL(req.url).searchParams.get("id");
  if (!shareId) {
    return NextResponse.json({ error: "An 'id' is required." }, { status: 400 });
  }
  const guard = await guardDoc(req, { require: "canManageShares" });
  if (!guard.ok) return guard.response;

  await revokeShare(guard.doc.id, shareId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request): Promise<NextResponse> {
  let body: { slug?: unknown; id?: unknown; state?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  const id = typeof body.id === "string" ? body.id : "";
  if (!slug || !id) {
    return NextResponse.json(
      { error: "Both 'slug' and 'id' are required." },
      { status: 400 },
    );
  }

  const guard = await guardDoc(req, { require: "canManageShares", slug });
  if (!guard.ok) return guard.response;

  await setAssignmentState(
    guard.doc.id,
    id,
    body.state === "done" ? "done" : "open",
  );
  return NextResponse.json({ ok: true });
}
