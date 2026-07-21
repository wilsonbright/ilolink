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

export type PageGroup = "pillar" | "guide" | "compare" | "persona" | "legal";

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

// ── Source-specific how-tos (Group C10) ──────────────────────────────────
// Long-tail, low-competition, highest ROI. One page per output origin. Each
// links up to P1 and sideways to the comparison (P2) and analytics (P3) hubs.
export const HOW_TOS = {
  claude: {
    path: "/guides/share-claude-artifact",
    title: "How to share a Claude artifact as a live web page",
    blurb:
      "Export a Claude artifact to a single file, publish it, and see how it was read.",
    group: "guide",
    priority: 0.7,
  },
  chatgpt: {
    path: "/guides/publish-chatgpt-html",
    title: "How to publish HTML from ChatGPT canvas",
    blurb:
      "Turn a ChatGPT canvas or HTML block into a real page anyone can open — with analytics.",
    group: "guide",
    priority: 0.7,
  },
  gemini: {
    path: "/guides/share-gemini-output",
    title: "How to share a Gemini output as a page",
    blurb: "Publish Gemini-generated HTML or Markdown as a shareable link.",
    group: "guide",
    priority: 0.7,
  },
  markdown: {
    path: "/guides/markdown-to-web-page",
    title: "How to turn Markdown into a shareable web page",
    blurb: "Paste Markdown, get a clean reading page, and track how far people read.",
    group: "guide",
    priority: 0.7,
  },
  image: {
    path: "/guides/host-ai-image",
    title: "How to host and share an AI-generated image",
    blurb: "Publish an AI image as its own page and see who opened it.",
    group: "guide",
    priority: 0.7,
  },
} as const satisfies Record<string, SitePage>;

// ── Pain-point pages (Groups E14, D12) ────────────────────────────────────
// Problem-aware queries mapped to real incumbent limitations. Honesty here is
// the citation/trust wedge.
export const PAIN_POINTS = {
  expiry: {
    path: "/guides/do-links-expire",
    title: "Do shared links expire? ilolink's link permanence",
    blurb:
      "The direct answer on link permanence, and how expiry works as an opt-in, not a penalty.",
    group: "guide",
    priority: 0.7,
  },
  limitations: {
    path: "/guides/limitations",
    title: "Limits and safety of hosting AI-generated HTML",
    blurb:
      "An honest guide to what ilolink strips, what won't render, and the size cap — and why.",
    group: "guide",
    priority: 0.7,
  },
} as const satisfies Record<string, SitePage>;

// ── Comparison / alternative (Group B5) ──────────────────────────────────
// Commercial-investigation intent. Lean on the P2 pillar; lead with ilolink's
// analytics/heatmap/feedback wedge, hedge competitor specifics (they change).
export const COMPARISONS = {
  vsTiiny: {
    path: "/vs/tiiny-host",
    title: "ilolink vs tiiny.host",
    blurb:
      "An honest comparison for sharing AI HTML — link permanence, safety, and the analytics a pure host doesn't give you.",
    group: "compare",
    priority: 0.6,
  },
  altTiiny: {
    path: "/alternatives/tiiny-host",
    title: "A tiiny.host alternative with analytics",
    blurb:
      "Looking for a host that also shows who read your page? What to weigh, and where ilolink fits.",
    group: "compare",
    priority: 0.6,
  },
} as const satisfies Record<string, SitePage>;

// ── Persona landing pages (Group B4) ──────────────────────────────────────
// Role-specific use cases tied to real features (heatmaps for PMs, anchored
// comments for designers, password + logs for consultants).
export const PERSONAS = {
  pm: {
    path: "/for/product-managers",
    title: "ilolink for product managers",
    blurb:
      "Share specs and PRDs as a link, then see whether stakeholders actually read them.",
    group: "persona",
    priority: 0.6,
  },
  designer: {
    path: "/for/designers",
    title: "ilolink for designers",
    blurb:
      "Share prototypes and mockups and collect anchored comments on the exact spot.",
    group: "persona",
    priority: 0.6,
  },
  consultant: {
    path: "/for/consultants",
    title: "ilolink for consultants",
    blurb:
      "Send client deliverables with password protection and see how they were read.",
    group: "persona",
    priority: 0.6,
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
  ...Object.values(HOW_TOS),
  ...Object.values(PAIN_POINTS),
  ...Object.values(COMPARISONS),
  ...Object.values(PERSONAS),
  ...Object.values(LEGAL),
];

export const absolute = (path: string): string =>
  path === "/" ? SITE_URL : `${SITE_URL}${path}`;
