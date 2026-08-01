// The single entry gate for every private per-document endpoint.
//
// Before this, seven API routes each repeated the same four steps — read slug
// and token from the query, resolve the doc, verifyToken against the stored
// hash, 403 — which meant adding teamspace ownership would have meant editing
// the same logic seven times and getting it subtly different at least once.
//
// Routes now call guardDoc() and state WHICH capability they need. Authorization
// itself lives in the pure resolver (lib/teamspace/permissions.ts).

import { NextResponse } from "next/server";
import { getDocumentBySlug, getDocumentById } from "@/lib/db/documents";
import { verifyToken } from "@/lib/crypto/token";
import { currentUser } from "./current-user";
import { docAccessFor } from "@/lib/teamspace/store";
import type { DocCapabilities } from "@/lib/teamspace/permissions";
import type { DocumentRow } from "@/lib/types";

export interface GuardOk {
  ok: true;
  doc: DocumentRow;
  caps: DocCapabilities;
  userId: string | null;
}
export interface GuardFail {
  ok: false;
  response: NextResponse;
}
export type GuardResult = GuardOk | GuardFail;

export interface GuardOptions {
  // Which capability the route needs. Naming it at the call site is what keeps
  // "can read analytics" and "can delete" from collapsing into one check.
  require: keyof DocCapabilities;
  // Look the document up by id instead of slug (the moderate + MCP paths).
  byId?: string;
  // Explicit slug, when it isn't in the query string.
  slug?: string;
  // Explicit legacy manage token, when it isn't in the query string.
  token?: string | null;
}

export async function guardDoc(
  req: Request,
  opts: GuardOptions,
): Promise<GuardResult> {
  const url = new URL(req.url);
  const slug = opts.slug ?? url.searchParams.get("slug");
  // Bearer takes precedence: DELETE deliberately carries the token in a header
  // rather than the query, so it never lands in a log or a Referer.
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token =
    opts.token !== undefined
      ? opts.token
      : (bearer ?? url.searchParams.get("token"));

  if (!opts.byId && !slug) {
    return fail("A 'slug' is required.", 400);
  }

  const doc = opts.byId
    ? await getDocumentById(opts.byId)
    : await getDocumentBySlug(slug!);
  // 404 for an unknown document either way — slugs are public URLs, so this
  // leaks nothing, and it keeps "no such doc" indistinguishable from "not
  // yours" for anyone probing ids.
  if (!doc) return fail("Not found.", 404);

  const legacyManageToken = token
    ? await verifyToken(token, doc.manage_token_hash)
    : false;

  const user = await currentUser();
  const caps = await docAccessFor(user?.id ?? null, {
    id: doc.id,
    teamspace_id: doc.teamspace_id ?? null,
    created_by: doc.created_by ?? null,
  }, legacyManageToken);

  if (!caps[opts.require]) {
    // 401 when nobody is signed in and no token was presented — the client can
    // fix that by signing in. 403 once we know who they are: signing in as
    // somebody else will not help.
    return user || legacyManageToken
      ? fail("Not authorized.", 403)
      : fail("Sign in to continue.", 401);
  }

  return { ok: true, doc, caps, userId: user?.id ?? null };
}

function fail(error: string, status: number): GuardFail {
  return {
    ok: false,
    response: NextResponse.json(
      { error },
      { status, headers: { "cache-control": "private, no-store" } },
    ),
  };
}
