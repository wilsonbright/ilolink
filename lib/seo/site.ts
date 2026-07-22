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

export type PageGroup =
  | "pillar"
  | "guide"
  | "compare"
  | "persona"
  | "reference"
  | "help"
  | "legal";

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

// ── Format how-tos (Group C10 format axis — only what's actually supported) ─
// Live formats: PDF (native viewer), DOCX (→ HTML, full analytics), CSV/TSV
// (→ table). Slides/diagram/audio/video are NOT built — no pages for them.
export const FORMAT_GUIDES = {
  pdf: {
    path: "/guides/share-pdf",
    title: "How to share a PDF as a link",
    blurb:
      "Publish a PDF (up to 15 MB) as a page that opens in the browser — and see that it was opened.",
    group: "guide",
    priority: 0.7,
  },
  docx: {
    path: "/guides/share-docx",
    title: "How to share a Word (.docx) document as a page",
    blurb:
      "Turn a .docx into a clean web page with full read analytics — scroll depth, heatmaps, and comments.",
    group: "guide",
    priority: 0.7,
  },
  spreadsheet: {
    path: "/guides/share-spreadsheet",
    title: "How to share a spreadsheet or CSV as a table",
    blurb:
      "Publish CSV or TSV as a readable table and see how far people scrolled through it.",
    group: "guide",
    priority: 0.7,
  },
} as const satisfies Record<string, SitePage>;

// ── Getting started (Groups A1/A3 foundations, C7/C8 setup) ──────────────
// Top-of-funnel definition + why + the fast path + prerequisites. High intent;
// these link down into the source how-tos and up to the pillars.
export const GETTING_STARTED = {
  quickStart: {
    path: "/guides/quick-start",
    title: "Share a ChatGPT or Claude HTML page in under a minute",
    blurb:
      "The fastest path: copy the output, paste it in, get a link — then watch the first view land.",
    group: "guide",
    priority: 0.8,
  },
  whatIs: {
    path: "/guides/what-is-ai-output-hosting",
    title: "What is AI output hosting?",
    blurb:
      "Turning ChatGPT, Claude, and Gemini results into shareable pages — and why the raw output isn't shareable as-is.",
    group: "guide",
    priority: 0.7,
  },
  why: {
    path: "/guides/why-host-ai-output",
    title: "Why send an AI output as a real web page",
    blurb:
      "Screenshot, raw file, or chat-share link versus a clean hosted page you can measure.",
    group: "guide",
    priority: 0.7,
  },
  requirements: {
    path: "/guides/requirements",
    title: "What you need to share an AI output",
    blurb: "Spoiler: just the output. No server, no repo, no build step, no account.",
    group: "guide",
    priority: 0.7,
  },
  capabilities: {
    path: "/guides/capabilities",
    title: "What ilolink does",
    blurb:
      "Hosting plus cookieless analytics, heatmaps, and feedback — the full capability tour in one place.",
    group: "guide",
    priority: 0.7,
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
  perplexity: {
    path: "/guides/share-perplexity-output",
    title: "How to share a Perplexity answer as a page",
    blurb: "Turn a Perplexity answer or report into a clean, shareable link with read analytics.",
    group: "guide",
    priority: 0.7,
  },
  v0: {
    path: "/guides/share-v0-output",
    title: "How to share a v0 output as a live page",
    blurb: "Publish a v0-generated UI as a static page — and see how it was viewed.",
    group: "guide",
    priority: 0.7,
  },
  copilot: {
    path: "/guides/share-copilot-output",
    title: "How to share Microsoft Copilot output as a page",
    blurb: "Publish HTML or Markdown from Copilot as a link anyone can open.",
    group: "guide",
    priority: 0.7,
  },
  grok: {
    path: "/guides/share-grok-output",
    title: "How to share a Grok output as a page",
    blurb: "Turn Grok-generated HTML or Markdown into a shareable page with analytics.",
    group: "guide",
    priority: 0.7,
  },
  deepseek: {
    path: "/guides/share-deepseek-output",
    title: "How to share a DeepSeek output as a page",
    blurb: "Publish DeepSeek HTML or Markdown as a link and track how it's read.",
    group: "guide",
    priority: 0.7,
  },
  mistral: {
    path: "/guides/share-mistral-output",
    title: "How to share Mistral Le Chat output as a page",
    blurb: "Turn Le Chat HTML, Markdown, or a Canvas into a shareable page with analytics.",
    group: "guide",
    priority: 0.7,
  },
  lovable: {
    path: "/guides/share-lovable-output",
    title: "How to share a Lovable app as a page",
    blurb: "Publish a Lovable build as a static preview — layout and styles render; interactivity is frozen.",
    group: "guide",
    priority: 0.7,
  },
  bolt: {
    path: "/guides/share-bolt-output",
    title: "How to share a Bolt.new site as a page",
    blurb: "Export a Bolt.new build to a static file and share it as a link with read analytics.",
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
  founder: {
    path: "/for/founders",
    title: "ilolink for founders",
    blurb:
      "Share investor updates and pitches as a link, and see whether they got opened and read.",
    group: "persona",
    priority: 0.6,
  },
  marketer: {
    path: "/for/marketers",
    title: "ilolink for marketers",
    blurb:
      "Share landing-page mockups and campaign pages, and see where attention went with heatmaps.",
    group: "persona",
    priority: 0.6,
  },
  sales: {
    path: "/for/sales",
    title: "ilolink for sales teams",
    blurb:
      "Send proposals and one-pagers to prospects, then time your follow-up by how they engaged.",
    group: "persona",
    priority: 0.6,
  },
  teacher: {
    path: "/for/teachers",
    title: "ilolink for teachers",
    blurb:
      "Share handouts and lessons as a link and see how far students read — in aggregate, never per-student.",
    group: "persona",
    priority: 0.6,
  },
  developer: {
    path: "/for/developers",
    title: "ilolink for developers",
    blurb:
      "Share a README, API doc, or spec as a clean page — no repo, no build — and see if teammates read it.",
    group: "persona",
    priority: 0.6,
  },
  writer: {
    path: "/for/writers",
    title: "ilolink for writers",
    blurb:
      "Share a draft as a link and see how far readers got, plus notes and comments in place.",
    group: "persona",
    priority: 0.6,
  },
} as const satisfies Record<string, SitePage>;

// ── Go deeper (Groups D13 metrics, E15 location, B6 free) ────────────────
export const DEEP_GUIDES = {
  analytics: {
    path: "/guides/reading-your-analytics",
    title: "How to read your share analytics",
    blurb:
      "Views, scroll depth, heatmaps and feedback — what each one tells you and what 'good' looks like.",
    group: "guide",
    priority: 0.7,
  },
  whereHosted: {
    path: "/guides/where-hosted",
    title: "Where your shared docs live",
    blurb:
      "Cloudflare's edge, HTTPS, and cookieless measurement — what's collected and what isn't.",
    group: "guide",
    priority: 0.6,
  },
  freeHosting: {
    path: "/guides/free-html-hosting",
    title: "Free HTML hosting: what “free” actually costs",
    blurb:
      "What free hosts quietly charge you — expiry, caps, watermarks — and what ilolink includes free.",
    group: "guide",
    priority: 0.7,
  },
} as const satisfies Record<string, SitePage>;

// ── Reference (Groups F18 glossary, D11 use cases, F19 FAQ) ───────────────
// Glossary = short quotable definitions (prime AI-citation material). Use cases
// = examples paired with the analytics question each one answers.
export const REFERENCE = {
  glossary: {
    path: "/glossary",
    title: "Glossary: AI output, artifacts, static hosting & GEO",
    blurb:
      "Short, quotable definitions for the terms around sharing AI output — plus where to read more.",
    group: "reference",
    priority: 0.5,
  },
  useCases: {
    path: "/guides/use-cases",
    title: "What people share with ilolink",
    blurb:
      "Real examples — specs, prototypes, client reports — each paired with the question the analytics answer.",
    group: "reference",
    priority: 0.6,
  },
  faq: {
    path: "/faq",
    title: "Frequently asked questions",
    blurb: "Accounts, privacy, formats, size limits, link permanence — the direct answers.",
    group: "reference",
    priority: 0.6,
  },
} as const satisfies Record<string, SitePage>;

// ── Help center (Group E16) ──────────────────────────────────────────────
// Real troubleshooting for the common failure modes, grounded in the served-doc
// CSP (inline styles + Google Fonts allowed; other external assets blocked;
// relative paths break; https/data images only).
export const HELP = {
  hub: {
    path: "/help",
    title: "Help center",
    blurb: "Fix the common issues and get the most out of ilolink.",
    group: "help",
    priority: 0.5,
  },
  broken: {
    path: "/help/html-looks-broken",
    title: "My HTML looks broken",
    blurb: "Why a page can render differently once hosted — usually a blocked CDN link — and the fix.",
    group: "help",
    priority: 0.5,
  },
  images: {
    path: "/help/images-dont-load",
    title: "My images don't load",
    blurb: "Relative and http: image paths break; use an absolute https URL or embed the image.",
    group: "help",
    priority: 0.5,
  },
  large: {
    path: "/help/file-too-large",
    title: "My file is too large",
    blurb: "The 2 MB per-doc cap, why it exists, and how to get under it.",
    group: "help",
    priority: 0.5,
  },
  unlock: {
    path: "/help/page-wont-unlock",
    title: "My password page won't unlock",
    blurb: "Why a password-protected page won't open, and how to fix or reset it.",
    group: "help",
    priority: 0.5,
  },
  notFound: {
    path: "/help/link-shows-404",
    title: "My link shows 404 or expired",
    blurb: "Expired links, unpublished docs, and slug typos — how to tell which, and what to do.",
    group: "help",
    priority: 0.5,
  },
  deleteReplace: {
    path: "/help/delete-or-replace",
    title: "How to delete or replace a published doc",
    blurb: "Docs are immutable — how to publish a replacement and remove the old one.",
    group: "help",
    priority: 0.5,
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
  ...Object.values(GETTING_STARTED),
  ...Object.values(FORMAT_GUIDES),
  ...Object.values(HOW_TOS),
  ...Object.values(DEEP_GUIDES),
  ...Object.values(PAIN_POINTS),
  ...Object.values(COMPARISONS),
  ...Object.values(PERSONAS),
  ...Object.values(REFERENCE),
  ...Object.values(HELP),
  ...Object.values(LEGAL),
];

export const absolute = (path: string): string =>
  path === "/" ? SITE_URL : `${SITE_URL}${path}`;
