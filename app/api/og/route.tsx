// GET /api/og?t=<title>&f=<format> — a 1200×630 branded Open Graph card for a
// shared document. The content worker points each doc's og:image here with the
// doc's title, so share links get a real preview card everywhere.

import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const ACCENT = "#3b5bdb";
const INK = "#1a1a17";
const CANVAS = "#fafaf8";
const FAINT = "#8a8a80";

const FORMAT_LABEL: Record<string, string> = {
  md: "Markdown",
  html: "Web page",
  pdf: "PDF",
  json: "JSON",
  csv: "Table",
  image: "Image",
};

let interBold: ArrayBuffer | null = null;
let interReg: ArrayBuffer | null = null;

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

  // Fetch (and cache across invocations) the Inter font faces once.
  if (!interBold)
    interBold = await font(
      "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-700-normal.woff",
    );
  if (!interReg)
    interReg = await font(
      "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-400-normal.woff",
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
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: ACCENT,
            }}
          />
          <div style={{ fontSize: "30px", fontWeight: 700, color: INK }}>ilolink</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              alignSelf: "flex-start",
              fontSize: "22px",
              fontWeight: 700,
              color: ACCENT,
              background: "#edf0fd",
              padding: "8px 18px",
              borderRadius: "999px",
            }}
          >
            {badge}
          </div>
          <div
            style={{
              fontSize: title.length > 70 ? "58px" : "72px",
              fontWeight: 700,
              color: INK,
              lineHeight: 1.1,
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
        { name: "Inter", data: interBold, weight: 700, style: "normal" },
        { name: "Inter", data: interReg, weight: 400, style: "normal" },
      ],
    },
  );
}
