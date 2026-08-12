// Guards the metadata layer that makes a page shareable and canonical.
//
// All three failures these cover shipped to production and none of them could
// break a build, a page, or a test:
//   - no metadataBase, so every canonical on the site was RELATIVE ("/faq") —
//     invalid per spec, and failed outright by Lighthouse;
//   - the home page declared no canonical at all, the only one of the 58 URLs
//     in the sitemap missing one;
//   - not a single og: or twitter: tag anywhere, so every share on Slack, X,
//     LinkedIn and iMessage unfurled with no title, description or image.
//
// The subtle one is the og:title contract. Next's resolver fills a missing
// openGraph title/description from the segment's own resolved metadata, which
// is the entire reason ~60 pages get correct per-page og: tags from one block
// in the root layout. Setting openGraph.title there — or declaring an openGraph
// object on a page without restating the defaults — silently flattens or strips
// it. Nothing about that is visible on the page itself, so it needs a test.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SITE_METADATA } from "@/lib/seo/metadata";
import { ALL_PAGES, SITE_URL, SITE_NAME } from "@/lib/seo/site";

const root = fileURLToPath(new URL("..", import.meta.url));

/**
 * Source with comments removed. These files document the very fields they set,
 * so a naive substring search matches the prose explaining a rule as readily as
 * the code obeying it — deleting the home page's canonical left this suite
 * green because a comment nearby mentioned it.
 */
const read = (rel: string) =>
  readFileSync(root + rel, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("site metadata defaults", () => {
  it("sets metadataBase to the canonical origin, so relative canonicals resolve", () => {
    expect(SITE_METADATA.metadataBase).toBeInstanceOf(URL);
    expect(SITE_METADATA.metadataBase?.origin).toBe(SITE_URL);
  });

  it("leaves og/twitter title and description unset so each page supplies its own", () => {
    // Next fills these from the rendering segment's resolved metadata. Setting
    // them here would give all ~60 pages the same og:title.
    const og = SITE_METADATA.openGraph as Record<string, unknown> | undefined;
    expect(og).toBeDefined();
    expect(og).not.toHaveProperty("title");
    expect(og).not.toHaveProperty("description");

    const tw = SITE_METADATA.twitter as Record<string, unknown> | undefined;
    expect(tw).toBeDefined();
    expect(tw).not.toHaveProperty("title");
    expect(tw).not.toHaveProperty("description");
  });

  it("declares the og fields that have no per-page value to inherit", () => {
    const og = SITE_METADATA.openGraph as Record<string, unknown>;
    expect(og.type).toBe("website");
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.locale).toBe("en_US");
    // og:url is intentionally absent: one value would claim every page is the
    // home page, and unlike title there is nothing per-page to inherit.
    expect(og).not.toHaveProperty("url");
  });

  it("uses a large summary card, matching the 1200x630 banner", () => {
    expect((SITE_METADATA.twitter as Record<string, unknown>).card).toBe(
      "summary_large_image",
    );
  });
});

describe("metadata file conventions", () => {
  // Next picks these up by filename; nothing references them in code, so a
  // rename or a deletion would go unnoticed until an unfurl or a tab looked
  // wrong. /favicon.ico and /apple-touch-icon.png both 404'd before these.
  it.each([
    "app/favicon.ico",
    "app/icon.svg",
    "app/apple-icon.png",
    "app/opengraph-image.png",
    "app/opengraph-image.alt.txt",
  ])("%s exists", (rel) => {
    expect(existsSync(root + rel)).toBe(true);
  });

  it("serves an og image at 1200x630", () => {
    // Parsed from the PNG IHDR rather than trusted: X and Slack both downgrade
    // a large-summary card to a thumbnail below 300px, and Twitter's large card
    // wants 1200x630 exactly.
    const png = readFileSync(root + "app/opengraph-image.png");
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it("ships a real multi-size ICO, not a renamed PNG", () => {
    const ico = readFileSync(root + "app/favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0); // reserved
    expect(ico.readUInt16LE(2)).toBe(1); // type 1 = icon
    expect(ico.readUInt16LE(4)).toBeGreaterThanOrEqual(2); // 16px and 32px
  });
});

describe("per-page canonicals", () => {
  const pageFile = (path: string) => `app/(marketing)${path}/page.tsx`;

  it("gives every registered marketing page a self-referencing canonical", () => {
    const missing = ALL_PAGES.filter((p) => {
      if (!existsSync(root + pageFile(p.path))) return true;
      return !read(pageFile(p.path)).includes(
        `alternates: { canonical: "${p.path}" }`,
      );
    }).map((p) => p.path);
    expect(missing).toEqual([]);
  });

  it("gives the home page one too", () => {
    // The home page lives outside the (marketing) group and outside ALL_PAGES,
    // which is exactly how it went 57-for-58 on canonicals.
    expect(read("app/page.tsx")).toContain('alternates: { canonical: "/" }');
  });

  it("keeps the canonical off the root layout, which app routes inherit", () => {
    // `alternates` is inherited wholesale by any segment that declares none, so
    // a canonical here would stamp "/" onto /signin, /dashboard and every other
    // app route.
    expect(read("app/layout.tsx")).not.toContain("canonical");
  });

  it("has no page overriding the shared openGraph object", () => {
    // Merging is shallow: a page-level `openGraph` REPLACES the layout's rather
    // than extending it, dropping type/siteName/locale and the og:image. If you
    // add one deliberately, restate those fields and then update this test.
    const overriding = ALL_PAGES.filter(
      (p) =>
        existsSync(root + pageFile(p.path)) &&
        read(pageFile(p.path)).includes("openGraph"),
    ).map((p) => p.path);
    expect(overriding).toEqual([]);
  });
});
