// GET /private/<slug> — the members-only door to a private document.
//
// view.ilolink.com never sees the session cookie (deliberately — it renders
// untrusted author HTML; see lib/auth/cookies.ts), so it cannot check
// membership itself. This route is where the check happens: a signed-in member
// of the document's teamspace gets a short-lived view-gate token and a 302 to
// the content origin; everyone else learns nothing.
//
// Anti-oracle: an unknown slug and a real document the caller is not a member
// of return the IDENTICAL 404. A stranger must not be able to distinguish
// "does not exist" from "exists but private" — that difference is exactly the
// existence detail private visibility promises to hide. The content origin
// holds the same line: view.ilolink.com serves a private doc without a valid
// gate token the same 404 page an unknown slug gets (notFoundPage in
// content-worker/src/index.ts), so the two cases are indistinguishable on
// BOTH origins.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { getMembership } from "@/lib/teamspace/store";
import { queryFirst } from "@/lib/db/client";
import { VIEW_ORIGIN } from "@/lib/publish/pipeline";
import { mintViewToken } from "@/lib/view-gate";
import { env } from "@/lib/cf";

export const runtime = "nodejs";

// Same binding-access pattern as MCP_HANDOFF_SECRET in
// app/api/auth/mcp-approve/route.ts: the secret is set at deploy time (and in
// .dev.vars locally), so it is not in the generated CloudflareEnv type.
function viewGateSecret(): string {
  const s = (env() as unknown as { VIEW_GATE_SECRET?: string }).VIEW_GATE_SECRET;
  if (!s) throw new Error("VIEW_GATE_SECRET is not configured.");
  return s;
}

// One response object for both "no such document" and "not a member", built in
// one place so the two can never drift apart.
function notFound(): NextResponse {
  return new NextResponse("Not found", { status: 404 });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  // No session → sign in and come straight back here. This is the URL members
  // get sent around in chat, so the round-trip has to land on the document.
  const user = await currentUser();
  if (!user) {
    const signin = new URL("/signin", req.url);
    signin.searchParams.set("next", `/private/${slug}`);
    return NextResponse.redirect(signin, 302);
  }

  // Only what the membership check needs — never the title or body.
  const doc = await queryFirst<{ teamspace_id: string | null }>(
    "SELECT teamspace_id FROM documents WHERE slug = ?",
    slug,
  );
  if (!doc) return notFound();

  // getMembership is null-safe on a NULL teamspace_id (unclaimed legacy docs),
  // which folds into the same 404 as everything else.
  const role = await getMembership(doc.teamspace_id ?? null, user.id);
  if (!role) return notFound();

  const vt = await mintViewToken(viewGateSecret(), slug, Date.now());
  const dest = new URL(`/${slug}`, VIEW_ORIGIN);
  dest.searchParams.set("vt", vt);
  return NextResponse.redirect(dest, 302);
}
