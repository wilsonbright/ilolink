// Single source of truth for marketing pages: the sitemap, the /guides index,
// and cross-page internal links all derive from this registry. Add a page here
// once and it shows up everywhere it should — no second list to keep in sync.

export const SITE_URL = "https://ilolink.com";
export const SITE_NAME = "ilolink";

// The live conversion surface. ilolink is accountless — the composer *is* the
// signup, so every marketing CTA points here rather than at a /pricing page.
export const COMPOSE_URL = "/";

// Build date, kept explicit so sitemap output is deterministic across builds
// (Next would otherwise stamp `new Date()` at build time, churning the diff).
export const SITE_UPDATED = "2026-07-21";

export type PageGroup = "pillar" | "guide" | "legal";

export interface SitePage {
  /** Path relative to the origin, no trailing slash (except "/"). */
  path: string;
  title: string;
  /** One-line summary for the /guides index and internal-link cards. */
  blurb: string;
  group: PageGroup;
  /** sitemap priority hint 0–1. */
  priority: number;
}

// ── Pillars ──────────────────────────────────────────────────────────────
// P1 core how-to hub, P2 comparison hub, P3 analytics/differentiator hub.
export const PILLARS = {
  p1: {
    path: "/guides/share-ai-output",
    title: "Share anything an AI made, as a real link",
    blurb:
      "The full loop for turning ChatGPT, Claude, or Gemini output into a page anyone can open — then seeing how it read.",
    group: "pillar",
    priority: 0.9,
  },
  p2: {
    path: "/guides/best-way-to-share-ai-html",
    title: "The best way to share AI-generated HTML",
    blurb:
      "How the hosting options actually compare for AI output — free-tier caps, link permanence, and what you learn after you share.",
    group: "pillar",
    priority: 0.9,
  },
  p3: {
    path: "/guides/analytics-heatmaps-feedback",
    title: "Analytics, heatmaps & feedback for shared docs",
    blurb:
      "What you learn after you share a link: who opened it, how far they read, where they clicked, and what they said.",
    group: "pillar",
    priority: 0.9,
  },
} as const satisfies Record<string, SitePage>;

// ── Legal / operational ──────────────────────────────────────────────────
export const LEGAL = {
  privacy: {
    path: "/privacy",
    title: "Privacy policy",
    blurb: "What we collect (little), what we don't (cookies, profiles), and why.",
    group: "legal",
    priority: 0.3,
  },
  terms: {
    path: "/terms",
    title: "Terms of service",
    blurb: "The plain-language deal for using ilolink.",
    group: "legal",
    priority: 0.3,
  },
  acceptableUse: {
    path: "/acceptable-use",
    title: "Acceptable-use policy",
    blurb: "What you can and can't host, and how we moderate.",
    group: "legal",
    priority: 0.3,
  },
  report: {
    path: "/report",
    title: "Report abuse / DMCA",
    blurb: "Flag content or file a takedown.",
    group: "legal",
    priority: 0.3,
  },
  status: {
    path: "/status",
    title: "Status",
    blurb: "Uptime and link permanence at a glance.",
    group: "legal",
    priority: 0.3,
  },
} as const satisfies Record<string, SitePage>;

// Every real, indexable marketing page. `/` and the app routes live outside
// this registry (they're not part of the content plan's surface).
export const ALL_PAGES: SitePage[] = [
  ...Object.values(PILLARS),
  ...Object.values(LEGAL),
];

export const absolute = (path: string): string =>
  path === "/" ? SITE_URL : `${SITE_URL}${path}`;
