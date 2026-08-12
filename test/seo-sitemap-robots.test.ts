// Guards the two things that make the marketing surface findable: the sitemap
// says what exists and when it changed, and robots.txt keeps crawlers off the
// app WITHOUT shadowing anything in the sitemap.
//
// Both had rotted silently. `SITE_UPDATED` sat at 2026-07-21 through a landing
// rewrite, a new /pricing and a corpus-wide copy sweep, so every URL claimed to
// be three weeks stale. And robots.txt still listed only the three routes the
// app had at launch. Neither failure could break a build or a page, which is
// exactly why they need tests rather than care.
import { describe, expect, it } from "vitest";
import { DISALLOW, CONTENT_SIGNAL, renderRobotsTxt } from "@/lib/seo/robots";
import sitemap from "@/app/sitemap";
import { ALL_PAGES, CORPUS_UPDATED, SITE_URL } from "@/lib/seo/site";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Paths a crawler could reach on the app surface, one per route group. */
const APP_PATHS = [
  "/api/publish",
  "/dashboard",
  "/dashboard/gnt3pg",
  "/publish",
  "/connect",
  "/signin",
  "/invite",
  "/oauth/authorize",
  "/w/w_abc123",
  "/t",
  "/t/t_abc123",
  "/t/t_abc123/registry",
  "/t/t_abc123/skills/house-style",
];

/**
 * robots.txt Disallow semantics, as much as we rely on: a plain rule is a
 * PREFIX match, a trailing `$` anchors to the end of the path.
 */
function blocks(rule: string, path: string): boolean {
  return rule.endsWith("$")
    ? path === rule.slice(0, -1)
    : path.startsWith(rule);
}

// robots.txt moved from Next's typed metadata route to a route handler, so the
// rules could sit alongside a Content-Signal line the typed route cannot emit.
// The rules are plain data now, so this no longer has to unpick a union type.
function disallowRules(): string[] {
  return [...DISALLOW];
}

/** Sitemap URLs as origin-relative paths. */
function sitemapPaths(): string[] {
  return sitemap().map((entry) =>
    entry.url === SITE_URL ? "/" : entry.url.slice(SITE_URL.length),
  );
}

describe("sitemap", () => {
  it("carries every registry page plus the two hand-added indexes", () => {
    const paths = sitemapPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/guides");
    for (const page of ALL_PAGES) expect(paths).toContain(page.path);
    expect(paths).toHaveLength(ALL_PAGES.length + 2);
  });

  it("lists each URL exactly once", () => {
    const paths = sitemapPaths();
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("dates every URL, and never in the future", () => {
    // A lastmod ahead of now is the one form of staleness crawlers penalise
    // outright, and it is what a hand-typed date gets wrong.
    const now = Date.now();
    for (const entry of sitemap()) {
      const stamp = new Date(entry.lastModified as Date).getTime();
      expect(Number.isNaN(stamp), `unparseable lastmod on ${entry.url}`).toBe(
        false,
      );
      expect(stamp, `lastmod in the future on ${entry.url}`).toBeLessThanOrEqual(
        now,
      );
    }
  });

  it("falls back to the corpus date and honours a per-page override", () => {
    const corpus = new Date(CORPUS_UPDATED).getTime();
    const byPath = new Map(
      sitemap().map((e) => [
        e.url === SITE_URL ? "/" : e.url.slice(SITE_URL.length),
        new Date(e.lastModified as Date).getTime(),
      ]),
    );
    for (const page of ALL_PAGES) {
      const expected = page.updated
        ? new Date(page.updated).getTime()
        : corpus;
      expect(byPath.get(page.path), `lastmod for ${page.path}`).toBe(expected);
    }
  });
});

describe("rendered robots.txt", () => {
  // The file is hand-assembled now rather than serialised by Next, so the shape
  // is ours to get wrong.
  it("declares one wildcard group with the signal and every rule", () => {
    const txt = renderRobotsTxt();
    expect(txt.match(/^User-agent:/gm)).toHaveLength(1);
    expect(txt).toContain(`Content-Signal: ${CONTENT_SIGNAL}`);
    expect(txt).toContain("Allow: /");
    for (const rule of DISALLOW) expect(txt).toContain(`Disallow: ${rule}`);
    expect(txt).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  // Citing is distribution and we want it; training is a one-way transfer.
  // Losing this line is how the reservation quietly disappears.
  it("permits search and AI citation while refusing training", () => {
    expect(CONTENT_SIGNAL).toMatch(/\bsearch=yes\b/);
    expect(CONTENT_SIGNAL).toMatch(/\bai-input=yes\b/);
    expect(CONTENT_SIGNAL).toMatch(/\bai-train=no\b/);
  });

  it("never blocks a named AI crawler outright", () => {
    // The whole point of turning Cloudflare's managed robots.txt off was that it
    // paired the signals with `Disallow: /` for every AI crawler. If a
    // per-agent block reappears here, citation stops working again.
    const txt = renderRobotsTxt();
    expect(txt).not.toMatch(/User-agent:\s*(GPTBot|ClaudeBot|Google-Extended)/i);
    expect(txt).not.toMatch(/^Disallow:\s*\/$/m);
  });
});

describe("registry dates", () => {
  it("keeps the corpus date a plain past YYYY-MM-DD", () => {
    expect(CORPUS_UPDATED).toMatch(DATE_ONLY);
    expect(new Date(CORPUS_UPDATED).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("only carries a per-page date when it is newer than the corpus pass", () => {
    // An `updated` older than CORPUS_UPDATED would make a page look staler than
    // the sweep that rewrote it — worse than having no per-page date at all.
    const corpus = new Date(CORPUS_UPDATED).getTime();
    for (const page of ALL_PAGES) {
      if (!page.updated) continue;
      expect(page.updated, `${page.path} updated format`).toMatch(DATE_ONLY);
      expect(
        new Date(page.updated).getTime(),
        `${page.path} predates the corpus sweep`,
      ).toBeGreaterThanOrEqual(corpus);
    }
  });
});

describe("robots.txt", () => {
  it("blocks every app route group", () => {
    const rules = disallowRules();
    for (const path of APP_PATHS) {
      expect(
        rules.some((rule) => blocks(rule, path)),
        `${path} is crawlable`,
      ).toBe(true);
    }
  });

  it("shadows nothing that is in the sitemap", () => {
    // The trap this exists for: `Disallow: /t` is a prefix match, so it blocks
    // /terms — a sitemap URL — as well as the teamspace app. Any future rule
    // that swallows a marketing page fails here instead of in production.
    const rules = disallowRules();
    for (const path of sitemapPaths()) {
      const hit = rules.find((rule) => blocks(rule, path));
      expect(hit, `robots rule "${hit}" blocks sitemap URL ${path}`).toBe(
        undefined,
      );
    }
  });

  it("points at the sitemap on the canonical origin", () => {
    expect(renderRobotsTxt()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});
