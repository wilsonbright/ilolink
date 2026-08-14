#!/usr/bin/env bash
# Regenerate every raster that has the ilolink mark baked into it:
#
#   app/opengraph-image.png   1200x630  site-wide share card
#   app/apple-icon.png         180x180  iOS home screen
#   app/favicon.ico          16/32/48   browser tabs, and what most unfurlers read
#
# Run after ANY change to the mark geometry (lib/ui/logo.tsx, app/icon.svg,
# app/api/og/route.tsx) or to --color-accent / --color-canvas in globals.css.
# Then LOOK at the four files it prints. Nothing in CI can see them.
#
#   npm run brand
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRAND="$ROOT/docs/brand"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true' EXIT

# A headless browser is the renderer because the boards are HTML/CSS and this
# machine has no SVG rasteriser (no ImageMagick, no rsvg, no inkscape). Prefer
# Playwright's headless shell — already on disk for the e2e screenshots — and
# fall back to an installed Chrome.
CHROME=""
for candidate in \
  "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell \
  "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
do
  [ -x "$candidate" ] && CHROME="$candidate" && break
done
if [ -z "$CHROME" ]; then
  echo "No headless Chrome found. Install one with: npx playwright install chromium" >&2
  exit 1
fi

# file:// is blocked for subresources in headless Chrome, so _board.css and the
# webfont only load over http — same reason the Product Hunt boards are served.
( cd "$BRAND" && python3 -m http.server 8901 >/dev/null 2>&1 ) &
SERVER_PID=$!
for _ in $(seq 1 40); do
  curl -sf -o /dev/null "http://localhost:8901/app-icon.html" && break
  sleep 0.25
done

shot () { # url width height out
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="$2,$3" \
    --virtual-time-budget=6000 --screenshot="$4" "$1" >/dev/null 2>&1
}

# ── The share card ────────────────────────────────────────────────────────
shot "http://localhost:8901/opengraph-image.html" 1200 630 "$ROOT/app/opengraph-image.png"

# ── The icons, all downsampled from one 512 master ────────────────────────
# See app-icon.html for why a single master beats rendering each size natively.
shot "http://localhost:8901/app-icon.html" 512 512 "$WORK/master.png"
for size in 180 48 32 16; do
  cp "$WORK/master.png" "$WORK/icon-$size.png"
  sips -z "$size" "$size" "$WORK/icon-$size.png" >/dev/null
done
cp "$WORK/icon-180.png" "$ROOT/app/apple-icon.png"
node "$BRAND/make-ico.mjs" "$ROOT/app/favicon.ico" \
  "$WORK/icon-16.png" "$WORK/icon-32.png" "$WORK/icon-48.png"

echo
echo "Wrote — now open all three and actually look at them:"
for f in app/opengraph-image.png app/apple-icon.png app/favicon.ico; do
  printf '  %-28s %s\n' "$f" "$(sips -g pixelWidth -g pixelHeight "$ROOT/$f" 2>/dev/null | awk '/pixel/{printf "%s ", $2}')"
done
