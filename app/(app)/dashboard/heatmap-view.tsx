"use client";

// ─────────────────────────────────────────────────────────────────────────
// HeatmapView — the private click + scroll heatmap surface for one doc.
//
// It renders the doc's own sanitized HTML inside a SANDBOXED, script-free iframe
// (fetched token-gated from /api/doc-html) and paints an aligned, non-interactive
// canvas overlay on top of it (data from /api/heatmap). Two toggles: device
// bucket (sm/md/lg) and layer (clicks / scroll depth).
//
// COORDINATE ALIGNMENT — the whole thing hinges on one contract:
//   The click beacon stored xFrac = (clientX+scrollX)/documentElement.scrollWidth
//   and yFrac = (clientY+scrollY)/documentElement.scrollHeight against the doc as
//   rendered at that viewport. Here we render the SAME doc at the bucket's width,
//   measure the iframe document's own scrollWidth/scrollHeight after load, size
//   the canvas to exactly those pixels, and place a point at (x*W, y*H). Because
//   the canvas shares the iframe's box 1:1, a fraction maps back to the same spot.
//
// The iframe uses sandbox="allow-same-origin" (NO allow-scripts): scripts remain
// fully disabled — both by the omitted allow-scripts token and by the response's
// script-src 'none' CSP — while allow-same-origin is the minimum needed to read
// the rendered document's scroll dimensions for overlay measurement.
// ─────────────────────────────────────────────────────────────────────────

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Heatmap } from "@/lib/analytics/heatmap";
import { TAG_BASE } from "@/lib/ui/tags";

type Bucket = "sm" | "md" | "lg";
type Layer = "click" | "scroll";

// Render width per device bucket (matches the coordinate contract's intent:
// clicks are bucketed by innerWidth, so we replay each bucket at a fixed width).
const BUCKET_WIDTH: Record<Bucket, number> = { sm: 375, md: 800, lg: 1200 };
const BUCKET_LABEL: Record<Bucket, string> = {
  sm: "≤640",
  md: "641–1024",
  lg: "≥1025",
};
const SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;

type Load<T> =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; data: T };

// ── Colour resolution ─────────────────────────────────────────────────────
// Canvas has no var(--color-*) the way the stats sparkline's SVG does, so the
// tokens are resolved to concrete channels here. Always resolved at DRAW time,
// never at module load: a dark-mode flip swaps the token values, and the next
// repaint must pick up the dark ramp rather than a cached light one.

type Rgba = { r: number; g: number; b: number; a: number };

// Let the browser do the parsing: assign the value to a probe element's color
// and read the computed rgb()/rgba() back. This survives color-mix() tokens,
// which getPropertyValue would hand back as an unparsed string.
function resolveCssColor(value: string): Rgba | null {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = value;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const m = resolved.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/,
  );
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] === undefined ? 1 : Number(m[4]),
  };
}

function resolveToken(name: string): Rgba | null {
  if (typeof document === "undefined") return null;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return null;
  return resolveCssColor(raw);
}

function rgba(c: Rgba, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// ── Colour ramp for the click density map ────────────────────────────────
// The ramp is the DS accent ramp: sparse clicks sit in accent-soft, clusters
// climb through the accent to accent-strong — one red, more of it where more
// happened. Sampled into a 256-entry LUT that density (accumulated alpha)
// indexes; the alpha stops keep the low end translucent.
function buildPalette(): Uint8ClampedArray | null {
  if (typeof document === "undefined") return null;
  const soft = resolveToken("--color-accent-soft");
  const accent = resolveToken("--color-accent");
  const strong = resolveToken("--color-accent-strong");
  if (!soft || !accent || !strong) return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0.0, rgba(soft, 0));
  g.addColorStop(0.25, rgba(soft, 0.55));
  g.addColorStop(0.55, rgba(accent, 0.8));
  g.addColorStop(1.0, rgba(strong, 0.92));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

export function HeatmapView({ slug, token }: { slug: string; token: string }) {
  const [bucket, setBucket] = useState<Bucket>("lg");
  const [layer, setLayer] = useState<Layer>("click");
  const [doc, setDoc] = useState<Load<string>>({ state: "loading" });
  const [heat, setHeat] = useState<Load<Heatmap>>({ state: "loading" });
  // Measured intrinsic dimensions of the rendered doc (device pixels of CSS).
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = BUCKET_WIDTH[bucket];

  // ── Fetch the sanitized doc HTML once (it does not vary by bucket) ────────
  useEffect(() => {
    let alive = true;
    setDoc({ state: "loading" });
    const q = new URLSearchParams({ slug, token }).toString();
    fetch(`/api/doc-html?${q}`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => alive && setDoc({ state: "ready", data: html }))
      .catch(() => alive && setDoc({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [slug, token]);

  // ── Fetch heatmap data for the active bucket ──────────────────────────────
  useEffect(() => {
    let alive = true;
    setHeat({ state: "loading" });
    const q = new URLSearchParams({ slug, token, bucket }).toString();
    fetch(`/api/heatmap?${q}`)
      .then((r) => (r.ok ? (r.json() as Promise<Heatmap>) : Promise.reject()))
      .then((data) => alive && setHeat({ state: "ready", data }))
      .catch(() => alive && setHeat({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [slug, token, bucket]);

  // ── Measure the rendered doc + fit the iframe height to it ────────────────
  // Reads the iframe document's own scrollWidth/scrollHeight (available because
  // the frame is allow-same-origin) and sizes the iframe to remove inner scroll,
  // so the overlay canvas can cover the doc 1:1. Re-runs on width change.
  const measure = useCallback(() => {
    const el = iframeRef.current;
    if (!el) return;
    let d: Document | null = null;
    try {
      d = el.contentDocument;
    } catch {
      d = null;
    }
    if (!d || !d.documentElement) return;
    const root = d.documentElement;
    const h = Math.max(root.scrollHeight, root.offsetHeight, 1);
    const w = Math.max(root.scrollWidth, width);
    el.style.height = `${h}px`;
    setDims({ w, h });
  }, [width]);

  // After a width change the frame reflows; measure on the next couple frames.
  useEffect(() => {
    if (doc.state !== "ready") return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [doc.state, width, measure]);

  // ── Paint the overlay whenever data, layer, or dimensions change ──────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dims) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(dims.w * dpr);
    canvas.height = Math.round(dims.h * dpr);
    canvas.style.width = `${dims.w}px`;
    canvas.style.height = `${dims.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dims.w, dims.h);
    if (heat.state !== "ready") return;

    if (layer === "click") {
      // The palette is rebuilt per paint, not cached: it is a 256×1 canvas
      // read, and rebuilding is what keeps a dark-mode flip honest.
      paintClicks(ctx, heat.data.clicks, dims.w, dims.h, buildPalette());
    } else {
      paintScroll(ctx, heat.data.scroll, dims.w, dims.h);
    }
  }, [heat, layer, dims, bucket]);

  const clickCount = heat.state === "ready" ? heat.data.clicks.length : 0;
  const scrollBase =
    heat.state === "ready"
      ? heat.data.scroll.reduce((s, r) => (r.pct >= 25 ? s + r.n : s), 0)
      : 0;
  const emptyMsg =
    layer === "click"
      ? "No clicks yet."
      : "No scroll data yet.";
  const isEmpty =
    heat.state === "ready" &&
    (layer === "click" ? clickCount === 0 : scrollBase === 0);

  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-center gap-3.5">
        <h2 className="mr-auto text-[13px] uppercase tracking-[0.08em] text-ink">
          Heatmap
        </h2>
        <Toggle<Layer>
          value={layer}
          onChange={setLayer}
          options={[
            { value: "click", label: "Clicks" },
            { value: "scroll", label: "Scroll" },
          ]}
        />
        <Toggle<Bucket>
          value={bucket}
          onChange={setBucket}
          options={(["sm", "md", "lg"] as Bucket[]).map((b) => ({
            value: b,
            label: BUCKET_LABEL[b],
          }))}
        />
      </div>

      <div className="border-2 border-divider bg-canvas p-9">
        {doc.state === "error" ? (
          <Quiet>Couldn’t load the document preview.</Quiet>
        ) : heat.state === "error" ? (
          <Quiet>Couldn’t load heatmap data.</Quiet>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="relative mx-auto"
              style={{ width, maxWidth: "100%" }}
            >
              {doc.state === "ready" ? (
                <iframe
                  ref={iframeRef}
                  title="Document preview"
                  srcDoc={doc.data}
                  onLoad={measure}
                  sandbox="allow-same-origin"
                  scrolling="no"
                  className="block w-full bg-surface"
                  style={{ width, minHeight: 320 }}
                />
              ) : (
                <div className="flex h-80 items-center justify-center bg-surface">
                  <Quiet>Loading preview…</Quiet>
                </div>
              )}

              <canvas
                ref={canvasRef}
                aria-hidden
                className="pointer-events-none absolute left-0 top-0"
                style={{ opacity: layer === "click" ? 0.85 : 0.7 }}
              />

              {(heat.state === "loading" || isEmpty) && (
                // A floating status over the preview — square per the DS; its
                // overlay shadow stays.
                <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 border border-hairline bg-surface px-3 py-1 text-xs text-ink-soft shadow-sm">
                  {heat.state === "loading" ? "Loading…" : emptyMsg}
                </div>
              )}
            </div>
          </div>
        )}

        {layer === "click" && heat.state === "ready" && clickCount > 0 && (
          <p className="mt-5 text-[13px] text-ink-faint">
            Red is where readers clicked and stopped, drawn over the document
            at this width.
          </p>
        )}
        {layer === "scroll" && heat.state === "ready" && scrollBase > 0 && (
          <ScrollLegend scroll={heat.data.scroll} base={scrollBase} />
        )}
      </div>
    </section>
  );
}

// ── Canvas painters ───────────────────────────────────────────────────────

// Two-pass density map: pass 1 accumulates soft radial blobs into the alpha
// channel (source-over accumulates alpha toward opaque), pass 2 recolours each
// pixel through the accent-ramp LUT keyed on that accumulated density.
function paintClicks(
  ctx: CanvasRenderingContext2D,
  clicks: { x: number; y: number }[],
  w: number,
  h: number,
  palette: Uint8ClampedArray | null,
): void {
  if (clicks.length === 0) return;
  // Radius scales gently with canvas width; kept soft for a calm read.
  const radius = Math.max(18, Math.min(48, w / 22));
  for (const p of clicks) {
    const cx = p.x * w;
    const cy = p.y * h;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    g.addColorStop(0, "rgba(0,0,0,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!palette) return;
  const img = ctx.getImageData(0, 0, Math.round(w), Math.round(h));
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a === 0) continue;
    const idx = a * 4;
    px[i] = palette[idx];
    px[i + 1] = palette[idx + 1];
    px[i + 2] = palette[idx + 2];
    // Cap output alpha so even dense clusters stay muted, not neon.
    px[i + 3] = Math.min(180, Math.round(a * 0.72));
  }
  ctx.putImageData(img, 0, 0);
}

// Horizontal depth bands: each quarter of the doc height is shaded by how many
// readers reached at least that depth (cumulative — reaching 75% implies 25/50).
function paintScroll(
  ctx: CanvasRenderingContext2D,
  scroll: { pct: number; n: number }[],
  w: number,
  h: number,
): void {
  const byPct = new Map(scroll.map((s) => [s.pct, s.n]));
  const atLeast = (t: number) => {
    let sum = 0;
    for (const [pct, n] of byPct) if (pct >= t) sum += n;
    return sum;
  };
  const base = atLeast(25);
  if (base <= 0) return;
  // Resolved at draw time, same as the click ramp, so dark mode repaints in
  // the dark tokens. Bands are the accent, labels ink, rules the divider.
  const accent = resolveToken("--color-accent");
  const ink = resolveToken("--color-ink");
  const divider = resolveToken("--color-divider");
  if (!accent || !ink || !divider) return;
  ctx.textBaseline = "middle";
  // The DS face, not a system stack: the body already computes the resolved
  // var(--font-sans) list, so read it from there.
  ctx.font = `12px ${getComputedStyle(document.body).fontFamily}`;
  SCROLL_THRESHOLDS.forEach((t, i) => {
    const n = atLeast(t);
    const frac = n / base;
    const y0 = (i / 4) * h;
    const bandH = h / 4;
    // Accent fill; more readers => more opaque. Calm ceiling of ~0.5.
    ctx.fillStyle = rgba(accent, frac * 0.5);
    ctx.fillRect(0, y0, w, bandH);
    // Faint divider + a small right-aligned "depth · count" label. The divider
    // token carries its own alpha (40% ink), so it is used as-is.
    ctx.fillStyle = rgba(divider, divider.a);
    ctx.fillRect(0, y0, w, 1);
    ctx.fillStyle = rgba(ink, 0.75);
    ctx.textAlign = "right";
    ctx.fillText(`${t}% · ${n}`, w - 10, y0 + 12);
  });
}

// ── Small UI atoms ────────────────────────────────────────────────────────

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  // Adjoining DS tags as a segmented control: the active option is a filled
  // tag-accent, the rest are tag-outlines. A transparent border on the active
  // one keeps both states the same height.
  return (
    <div className="inline-flex">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`${TAG_BASE} tabular-nums transition-colors duration-150 ${
            value === o.value
              ? "border border-transparent bg-accent-wash text-accent-strong"
              : "cursor-pointer border border-accent text-accent-strong hover:bg-accent-wash"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-faint">{children}</p>;
}

function ScrollLegend({
  scroll,
  base,
}: {
  scroll: { pct: number; n: number }[];
  base: number;
}) {
  const byPct = new Map(scroll.map((s) => [s.pct, s.n]));
  const atLeast = (t: number) => {
    let sum = 0;
    for (const [pct, n] of byPct) if (pct >= t) sum += n;
    return sum;
  };
  return (
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-faint">
      {SCROLL_THRESHOLDS.map((t) => {
        const n = atLeast(t);
        const pct = base > 0 ? Math.round((n / base) * 100) : 0;
        return (
          <span key={t} className="tabular-nums">
            <span className="text-ink-soft">{t}%</span> reached by {n} ({pct}%)
          </span>
        );
      })}
    </div>
  );
}
