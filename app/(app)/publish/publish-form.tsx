"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SourceType, Visibility } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────
// The composer. One column, progressive disclosure: settings stay hidden
// until asked for. Paste OR drop a file; visibility reveals only the field
// its mode needs; the custom link hides behind a disclosure.
// ─────────────────────────────────────────────────────────────────────────

interface PublishResult {
  slug: string;
  url: string;
}

const VISIBILITY: { value: Visibility; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Anyone with the link. May be listed." },
  { value: "unlisted", label: "Unlisted", hint: "Only people you send the link to." },
  { value: "password", label: "Password", hint: "Opens only with a password you set." },
  { value: "expiring", label: "Expiring", hint: "Stops working after a date you choose." },
];

// A cheap, honest hint — not a parser. Enough to label the source type.
function detectSource(text: string): SourceType {
  const head = text.trimStart().slice(0, 800).toLowerCase();
  if (!head) return "md";
  if (head.startsWith("<!doctype") || head.startsWith("<html")) return "html";
  if (/<(p|div|h[1-6]|body|article|section|span|table|ul|ol|main|header|footer)[\s>/]/.test(head)) {
    return "html";
  }
  return "md";
}

export function PublishForm() {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState<SourceType>("md");
  const [sourceLocked, setSourceLocked] = useState(false);

  const [visibility, setVisibility] = useState<Visibility>("public");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [showSlug, setShowSlug] = useState(false);
  const [slug, setSlug] = useState("");

  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const detected = useMemo(() => detectSource(content), [content]);
  useEffect(() => {
    if (!sourceLocked) setSource(detected);
  }, [detected, sourceLocked]);

  const loadFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const ok = /\.(md|markdown|html?|txt)$/.test(name);
    if (!ok) {
      setError("That file type isn't supported. Use a .md or .html file.");
      return;
    }
    if (file.size > 2_000_000) {
      setError("That file is over 2 MB. Trim it down or paste the part you want to share.");
      return;
    }
    const text = await file.text();
    setError(null);
    setFileName(file.name);
    setContent(text);
    setSourceLocked(false); // let detection re-run on the new content
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  const canSubmit = content.trim().length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError("Add some content first.");
      return;
    }
    if (visibility === "password" && !password.trim()) {
      setError("Set a password, or choose a different visibility.");
      return;
    }
    let expiresMs: number | null = null;
    if (visibility === "expiring") {
      const ms = expiresAt ? new Date(expiresAt).getTime() : NaN;
      if (!Number.isFinite(ms) || ms <= Date.now()) {
        setError("Pick an expiry date in the future.");
        return;
      }
      expiresMs = ms;
    }
    const wantSlug = showSlug ? slug.trim() : "";
    if (wantSlug && !/^[a-z0-9-]{3,32}$/.test(wantSlug)) {
      setError("A custom link is 3–32 characters: lowercase letters, numbers, and hyphens.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          source_type: source,
          visibility,
          ...(visibility === "password" ? { password } : {}),
          ...(visibility === "expiring" ? { expires_at: expiresMs } : {}),
          ...(wantSlug ? { slug: wantSlug } : {}),
        }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const obj = (data ?? {}) as Record<string, unknown>;

      if (!res.ok || obj.ok === false) {
        setError(
          typeof obj.error === "string"
            ? obj.error
            : "Couldn't publish just now. Please try again.",
        );
        return;
      }

      const outSlug = typeof obj.slug === "string" ? obj.slug : "";
      const outUrl =
        typeof obj.url === "string"
          ? obj.url
          : outSlug
            ? `${window.location.origin}/${outSlug}`
            : "";
      if (!outUrl) {
        setError("Published, but no link came back. Check your dashboard.");
        return;
      }
      setResult({ slug: outSlug, url: outUrl });
    } catch {
      setError("Network hiccup. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setContent("");
    setFileName(null);
    setSourceLocked(false);
    setVisibility("public");
    setPassword("");
    setExpiresAt("");
    setShowSlug(false);
    setSlug("");
    setError(null);
  }

  if (result) {
    return <ShareCard result={result} onAnother={reset} />;
  }

  return (
    <form onSubmit={onSubmit} className="mt-12 space-y-12">
      {/* Composer ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <label htmlFor="doc" className="block text-sm font-medium text-ink">
          Your document
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-lg border bg-surface transition-colors duration-150 ${
            dragging ? "border-accent" : "border-hairline"
          }`}
        >
          <textarea
            id="doc"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste Markdown or HTML here — or drop a file anywhere in this box."
            spellCheck={false}
            className="block h-72 w-full resize-y rounded-lg bg-transparent px-4 py-3.5 font-mono text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-faint">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-accent transition-colors duration-150 hover:text-ink"
          >
            Choose a file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.html,.htm,.txt,text/markdown,text/html"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadFile(file);
              e.target.value = "";
            }}
          />

          {fileName && <span className="truncate text-ink-soft">{fileName}</span>}

          <span className="ml-auto flex items-center gap-2">
            {content.trim() ? (
              <>
                <span>Reading as {source === "md" ? "Markdown" : "HTML"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSourceLocked(true);
                    setSource((s) => (s === "md" ? "html" : "md"));
                  }}
                  className="text-accent transition-colors duration-150 hover:text-ink"
                >
                  switch to {source === "md" ? "HTML" : "Markdown"}
                </button>
              </>
            ) : (
              <span>Markdown or HTML</span>
            )}
          </span>
        </div>
      </section>

      {/* Visibility ───────────────────────────────────────── */}
      <section className="space-y-3">
        <span className="block text-sm font-medium text-ink">Who can see it</span>
        <div
          role="radiogroup"
          aria-label="Visibility"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {VISIBILITY.map((opt) => {
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setVisibility(opt.value)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "bg-surface text-ink-soft hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-ink-faint">
          {VISIBILITY.find((v) => v.value === visibility)?.hint}
        </p>

        {/* Progressive disclosure: only the field this mode needs. */}
        {visibility === "password" && (
          <div className="pt-1">
            <label htmlFor="pw" className="sr-only">
              Password
            </label>
            <input
              id="pw"
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password"
              className="w-full max-w-sm rounded-md border border-hairline bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />
          </div>
        )}
        {visibility === "expiring" && (
          <div className="pt-1">
            <label htmlFor="exp" className="sr-only">
              Expiry date and time
            </label>
            <input
              id="exp"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full max-w-sm rounded-md border border-hairline bg-surface px-3.5 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />
          </div>
        )}
      </section>

      {/* Custom link (disclosure) ─────────────────────────── */}
      <section>
        {showSlug ? (
          <div className="space-y-2">
            <label htmlFor="slug" className="block text-sm font-medium text-ink">
              Custom link
            </label>
            <div className="flex max-w-md items-stretch overflow-hidden rounded-md border border-hairline bg-surface transition-colors duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
              <span className="flex select-none items-center pl-3.5 pr-1 text-sm text-ink-faint">
                /
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="my-launch-notes"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-transparent py-2 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
            <p className="text-sm text-ink-faint">
              3–32 characters: lowercase letters, numbers, hyphens. Leave the box
              to let us pick a short one.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSlug(true)}
            className="text-sm text-accent transition-colors duration-150 hover:text-ink"
          >
            Add a custom link
          </button>
        )}
      </section>

      {/* Submit ───────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-hairline pt-8">
        {error && (
          <p role="alert" className="text-sm text-ink">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-canvas transition-opacity duration-150 hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Publishing…" : "Publish"}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// The result: a quiet share card. Link, copy, and a scannable QR.
// ─────────────────────────────────────────────────────────────────────────

function ShareCard({
  result,
  onAnother,
}: {
  result: PublishResult;
  onAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-12">
      <p className="text-sm font-medium text-accent">Published</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">Your link is ready</h2>

      <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-stretch overflow-hidden rounded-md border border-hairline bg-surface">
            <input
              readOnly
              value={result.url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full min-w-0 bg-transparent px-3.5 py-2.5 text-sm text-ink focus:outline-none"
              aria-label="Share link"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 border-l border-hairline px-4 text-sm font-medium text-accent transition-colors duration-150 hover:bg-accent-soft"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent transition-colors duration-150 hover:text-ink"
            >
              Open it
            </a>
            <button
              type="button"
              onClick={onAnother}
              className="text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              Publish another
            </button>
          </div>
        </div>

        <div className="shrink-0">
          <QrCode text={result.url} />
          <p className="mt-2 text-center text-xs text-ink-faint">Scan to open</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// QR code — dependency-free (byte mode, EC level M, versions 1–5). Enough for
// any share link; returns null past ~84 chars, and the card still shows a
// copyable URL. Ported from Nayuki's public-domain QR generator, trimmed.
// ─────────────────────────────────────────────────────────────────────────

function QrCode({ text }: { text: string }) {
  const matrix = useMemo(() => qrBuildMatrix(text), [text]);
  if (!matrix) return null;

  const { size, modules } = matrix;
  const quiet = 4;
  const total = size + quiet * 2;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={148}
      height={148}
      role="img"
      aria-label="QR code for the share link"
      shapeRendering="crispEdges"
      className="rounded-md border border-hairline"
    >
      <rect width={total} height={total} fill="var(--color-surface)" />
      <path d={d} fill="var(--color-ink)" />
    </svg>
  );
}

const ECC_M_PER_BLOCK: Record<number, number> = { 1: 10, 2: 16, 3: 26, 4: 18, 5: 24 };
const ECC_M_BLOCKS: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2 };

const getBit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function qrRawModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
  }
  return result;
}

function qrDataCodewords(ver: number): number {
  return Math.floor(qrRawModules(ver) / 8) - ECC_M_PER_BLOCK[ver] * ECC_M_BLOCKS[ver];
}

function qrAlignPositions(ver: number): number[] {
  if (ver === 1) return [];
  const size = ver * 4 + 17;
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

function rsDivisor(degree: number): number[] {
  const result: number[] = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result: number[] = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

// Encode text as byte-mode codewords for the smallest fitting version (1–5).
function qrEncode(text: string): { data: number[]; ver: number } | null {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 0;
  for (let v = 1; v <= 5; v++) {
    if (4 + 8 + 8 * bytes.length <= qrDataCodewords(v) * 8) {
      ver = v;
      break;
    }
  }
  if (ver === 0) return null;

  const cap = qrDataCodewords(ver);
  const bits: number[] = [];
  const append = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  append(0x4, 4); // byte mode
  append(bytes.length, 8); // char count (byte mode, versions 1–9)
  for (const b of bytes) append(b, 8);
  for (let i = 0; i < 4 && bits.length < cap * 8; i++) bits.push(0); // terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  const pad = [0xec, 0x11];
  for (let i = 0; codewords.length < cap; i++) codewords.push(pad[i % 2]);

  return { data: qrInterleave(codewords, ver), ver };
}

// Split into blocks, add Reed–Solomon ECC, and interleave (Nayuki's scheme).
function qrInterleave(data: number[], ver: number): number[] {
  const numBlocks = ECC_M_BLOCKS[ver];
  const eccLen = ECC_M_PER_BLOCK[ver];
  const rawCodewords = Math.floor(qrRawModules(ver) / 8);
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(eccLen);

  const blocks: number[][] = [];
  let k = 0;
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortLen - eccLen + (i < numShort ? 0 : 1);
    const dat = data.slice(k, k + datLen);
    k += datLen;
    const ecc = rsRemainder(dat, divisor);
    if (i < numShort) dat.push(0); // padding slot for even interleaving
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortLen - eccLen || j >= numShort) result.push(blocks[j][i]);
    }
  }
  return result;
}

function qrBuildMatrix(text: string): { size: number; modules: boolean[][] } | null {
  const enc = qrEncode(text);
  if (!enc) return null;
  const { data, ver } = enc;
  const size = ver * 4 + 17;

  const modules: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const isFunc: boolean[][] = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const set = (x: number, y: number, val: boolean) => {
    modules[y][x] = val;
    isFunc[y][x] = true;
  };

  // Timing patterns first, then finders overwrite the overlaps.
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const align = qrAlignPositions(ver);
  for (let i = 0; i < align.length; i++) {
    for (let j = 0; j < align.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === align.length - 1) ||
        (i === align.length - 1 && j === 0)
      ) {
        continue; // overlaps a finder
      }
      const cx = align[i];
      const cy = align[j];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  const drawFormat = (mask: number) => {
    const fmt = (0 << 3) | mask; // EC level M has format bits 0
    let rem = fmt;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((fmt << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, getBit(b, i));
    set(8, 7, getBit(b, 6));
    set(8, 8, getBit(b, 7));
    set(7, 8, getBit(b, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, getBit(b, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, getBit(b, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, getBit(b, i));
    set(8, size - 8, true); // dark module
  };
  drawFormat(0); // reserve the format regions

  // Zigzag data placement over the non-function modules.
  let idx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let v = 0; v < size; v++) {
      for (let c = 0; c < 2; c++) {
        const x = right - c;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - v : v;
        if (!isFunc[y][x] && idx < data.length * 8) {
          modules[y][x] = getBit(data[idx >>> 3], 7 - (idx & 7));
          idx++;
        }
      }
    }
  }

  const maskCond = (m: number, x: number, y: number): boolean => {
    switch (m) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  };
  const applyMask = (m: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!isFunc[y][x] && maskCond(m, x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };
  const penalty = (): number => {
    let score = 0;
    for (let y = 0; y < size; y++) {
      let run = 1;
      for (let x = 1; x < size; x++) {
        if (modules[y][x] === modules[y][x - 1]) run++;
        else run = 1;
        if (run === 5) score += 3;
        else if (run > 5) score++;
      }
    }
    for (let x = 0; x < size; x++) {
      let run = 1;
      for (let y = 1; y < size; y++) {
        if (modules[y][x] === modules[y - 1][x]) run++;
        else run = 1;
        if (run === 5) score += 3;
        else if (run > 5) score++;
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
          score += 3;
        }
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (modules[y][x]) dark++;
    const ratio = (dark / (size * size)) * 100;
    score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
    return score;
  };

  let bestMask = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m);
    drawFormat(m);
    const s = penalty();
    if (s < bestScore) {
      bestScore = s;
      bestMask = m;
    }
    applyMask(m); // undo
  }
  applyMask(bestMask);
  drawFormat(bestMask);

  return { size, modules };
}
