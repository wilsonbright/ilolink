// GET /api/og?t=<title>&f=<format> — a 1200×630 branded Open Graph card for a
// shared document. The content worker points each doc's og:image here with the
// doc's title, so share links get a real preview card everywhere.
//
// Satori renders from literals, so the Modernist tokens are restated here as
// hex. They MUST match app/globals.css (light mode): a share card is the brand
// at its most public, and this file is exactly where the old blue survived the
// first redesign pass.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const ACCENT = "#ec3013"; // --color-accent
const INK = "#201e1d"; // --color-ink
const CANVAS = "#f3f2f2"; // --color-canvas
const FAINT = "#767271"; // ink-faint (60% ink over canvas, precomposited)
const BADGE_BG = "#ffe0d9"; // --color-accent-soft
const BADGE_INK = "#ae1800"; // --color-accent-strong

const FORMAT_LABEL: Record<string, string> = {
  md: "Markdown",
  html: "Web page",
  pdf: "PDF",
  json: "JSON",
  csv: "Table",
  image: "Image",
};

let archivoBold: ArrayBuffer | null = null;
let archivoReg: ArrayBuffer | null = null;

async function font(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  return res.arrayBuffer();
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawTitle = (url.searchParams.get("t") ?? "Untitled").slice(0, 140);
  const title = rawTitle.trim() || "Untitled";
  const fmt = url.searchParams.get("f") ?? "";
  const badge = FORMAT_LABEL[fmt] ?? "Document";

  // Fetch (and cache across invocations) the Archivo font faces once. 800 is
  // the DS heading weight; fontsource ships it as a static woff.
  if (!archivoBold)
    archivoBold = await font(
      "https://cdn.jsdelivr.net/npm/@fontsource/archivo@5/files/archivo-latin-800-normal.woff",
    );
  if (!archivoReg)
    archivoReg = await font(
      "https://cdn.jsdelivr.net/npm/@fontsource/archivo@5/files/archivo-latin-400-normal.woff",
    );

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CANVAS,
          padding: "72px 80px",
          fontFamily: "Archivo",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* The mark: two interlocking square links, the same six-rect
              evenodd geometry as lib/ui/logo.tsx — restated inline because
              Satori renders from literals, like every token in this file. */}
          <svg width="44" height="44" viewBox="0 0 32 32">
            <path
              fill={ACCENT}
              fillRule="evenodd"
              d="M3 3H22V22H3ZM8 8H17V17H8ZM8 17H17V22H8ZM10 10H29V29H10ZM15 15H24V24H15ZM15 10H24V15H15Z"
            />
          </svg>
          <div style={{ fontSize: "30px", fontWeight: 800, color: INK }}>ilolink</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              alignSelf: "flex-start",
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: BADGE_INK,
              background: BADGE_BG,
              padding: "8px 18px",
            }}
          >
            {badge}
          </div>
          <div
            style={{
              fontSize: title.length > 70 ? "58px" : "72px",
              fontWeight: 800,
              color: INK,
              lineHeight: 1.08,
              letterSpacing: "-0.015em",
              display: "flex",
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ fontSize: "26px", color: FAINT, fontWeight: 400 }}>
          Shared on ilolink.com · views, heatmaps &amp; comments
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Archivo", data: archivoBold, weight: 800, style: "normal" },
        { name: "Archivo", data: archivoReg, weight: 400, style: "normal" },
      ],
    },
  );
}
