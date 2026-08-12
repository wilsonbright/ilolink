// Serves robots.txt.
//
// A route handler rather than Next's typed metadata route (app/robots.ts, which
// this replaces): MetadataRoute.Robots can only express user-agent/allow/
// disallow/sitemap, and there is no way to emit the Content-Signal line the
// policy needs. The rules and the signal live in lib/seo/robots.ts so they stay
// testable without rendering.
import { renderRobotsTxt } from "@/lib/seo/robots";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(renderRobotsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Crawlers refetch this often; a day is long enough to spare the origin
      // and short enough that a policy change takes effect the same day.
      "cache-control": "public, max-age=86400",
    },
  });
}
