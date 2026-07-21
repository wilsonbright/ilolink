// GET /api/doc-html?slug=&token= — token-gated raw sanitized document HTML.
//
// The dashboard heatmap overlay needs the exact rendered doc body to place the
// canvas over. This returns the current version's sanitized HTML from R2, gated
// by the same accountless manage token as /api/stats and /api/heatmap. It is only
// ever embedded in a sandboxed, script-free iframe (srcdoc) by the owner, but we
// still ship a strict CSP so the payload can never execute or phone home even if
// the response is opened directly.

import { getDocumentBySlug, readSlugRecord } from "@/lib/db/documents";
import { verifyToken } from "@/lib/manage-token";
import { getBody } from "@/lib/r2/store";

export const runtime = "nodejs";

// Locks the served fragment down: no scripts, no network, inline styles only,
// images limited to https/data. frame-ancestors keeps it embeddable solely by
// our own dashboard origin.
const DOC_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; script-src 'none'; frame-ancestors 'self' https://ilolink.com";

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": DOC_CSP,
      "x-content-type-options": "nosniff",
      // Private body + token in the URL — never let a shared/browser cache retain it.
      "cache-control": "private, no-store",
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const token = url.searchParams.get("token");

  if (!slug || !token) {
    return text("<!-- missing slug or token -->", 400);
  }

  const doc = await getDocumentBySlug(slug);
  if (!doc) {
    return text("<!-- not found -->", 404);
  }

  if (!(await verifyToken(token, doc.manage_token_hash))) {
    return text("<!-- not authorized -->", 403);
  }

  // Prefer the hot KV slug record's rendered key; fall back to the doc row's
  // current version if KV is cold or missing.
  const rec = await readSlugRecord(slug);
  const key = rec?.rendered_r2_key;
  if (!key) {
    return text("<!-- no rendered content -->", 404);
  }

  const html = await getBody(key);
  if (html == null) {
    return text("<!-- no rendered content -->", 404);
  }

  return text(html, 200);
}
