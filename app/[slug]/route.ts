// GET /<slug> on the app origin (ilolink.com) — the branded short link.
//
// Untrusted document HTML must never render on the app origin (it would share
// the origin + localStorage with the dashboard). So this only 302-redirects to
// the isolated content origin, where the doc is actually served under a strict
// CSP. Reserved app paths (/publish, /dashboard, /api, …) are static routes and
// take precedence over this dynamic segment, so they never reach here.

import { VIEW_ORIGIN } from "@/lib/publish/pipeline";

// Slugs are 6-char generated or 3–32 custom [a-z0-9-]; reject anything else
// (favicon.ico, stray paths) so we don't redirect junk.
const SLUG_RE = /^[a-z0-9-]{3,32}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return new Response("Not found", { status: 404 });
  }
  return Response.redirect(`${VIEW_ORIGIN}/${encodeURIComponent(slug)}`, 302);
}
