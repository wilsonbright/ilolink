// GET /api/heatmap?slug=&token=&bucket= — private per-doc click/scroll heatmap.
//
// Same accountless ownership model as /api/stats: resolve the doc by its public
// slug, verify the presented manage token against the stored hash (constant-time),
// and only then return the per-bucket Heatmap. 403 on a bad/absent token; 404 for
// an unknown slug. `bucket` is a closed enum (sm|md|lg); anything else -> "lg".

import { NextResponse } from "next/server";
import { getDocumentBySlug } from "@/lib/db/documents";
import { verifyToken } from "@/lib/manage-token";
import { queryHeatmap } from "@/lib/analytics/heatmap";

export const runtime = "nodejs";

const BUCKETS = new Set(["sm", "md", "lg"]);

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const token = url.searchParams.get("token");
  const bucketParam = url.searchParams.get("bucket");
  const bucket = (
    bucketParam && BUCKETS.has(bucketParam) ? bucketParam : "lg"
  ) as "sm" | "md" | "lg";

  if (!slug || !token) {
    return NextResponse.json(
      { error: "Both 'slug' and 'token' are required." },
      { status: 400 },
    );
  }

  const doc = await getDocumentBySlug(slug);
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(await verifyToken(token, doc.manage_token_hash))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const heatmap = await queryHeatmap(doc.id, bucket);
  return NextResponse.json(heatmap, {
    headers: { "cache-control": "private, no-store" },
  });
}
