# Brand rasters

The mark lives as vector source in three files a compiler can see:

| File | Why it restates the geometry |
|---|---|
| `lib/ui/logo.tsx` | The React component every chrome context uses |
| `app/icon.svg` | A standalone favicon file — cannot import a component |
| `app/api/og/route.tsx` | Satori renders from literals — cannot import a component |

It also lives in three files **nothing can see**, with the artwork baked into
pixels:

| File | Size | Where it shows |
|---|---|---|
| `app/opengraph-image.png` | 1200×630 | Slack / X / LinkedIn / iMessage unfurls, Product Hunt |
| `app/apple-icon.png` | 180×180 | iOS home screen |
| `app/favicon.ico` | 16/32/48 | Browser tabs, and most scrapers |

**This folder regenerates that second group.** Run it whenever the path in
`logo.tsx` changes, or `--color-accent` / `--color-canvas` in `globals.css`
change:

```bash
npm run brand
```

Then open the three files and look at them.

## Why this folder exists

The Modernist redesign (`9b2a090`) changed the mark from a blue rounded pill to
the red interlocked squares and updated all three *source* files. The three
rasters kept shipping the old blue mark for two days — on the live site, in
every share unfurl, and on the Product Hunt listing, where the launch card had
already been uploaded from the stale file.

Nothing failed, and nothing could have. `test/seo-metadata.test.ts` asserts
those files exist, are non-empty, and that the OG image is 1200×630 — every one
of which a two-year-old image satisfies. There is no assertion a test can make
about whether a PNG shows the current logo.

So the guard is procedural, not automated: the rasters are regenerable from
checked-in sources in one command, `logo.tsx` names them in the same comment
that names the other three copies, and the last step is a human looking.

## How the rendering works

There is no SVG rasteriser on the dev machine — no ImageMagick, no `rsvg`, no
`sharp`. The boards are therefore plain HTML/CSS rendered by Playwright's
headless Chrome (already on disk for the e2e screenshots), served over
`http://localhost` because headless Chrome blocks `file://` subresources, which
would silently drop both `_board.css` and the Archivo webfont — and a board
that renders in the fallback system font looks close enough to pass a glance.

`_board.css` restates the Modernist tokens as flat hex. It has to: a bare
browser has no Tailwind and no `@theme`. Keep it in step with `app/globals.css`
light mode — the same duty `app/api/og/route.tsx` already carries.

`make-ico.mjs` packs the `.ico` by hand, because nothing installed can. It
writes PNG-in-ICO, which every browser since IE11 reads.

## Files

| File | What |
|---|---|
| `_board.css` | Modernist tokens + Archivo, restated flat for a bare browser |
| `opengraph-image.html` | Board for the 1200×630 site share card |
| `app-icon.html` | 512×512 master; every icon size downsamples from it |
| `make-ico.mjs` | Packs PNG frames into a multi-size `.ico` |
| `render.sh` | Drives all of the above; `npm run brand` |

The Product Hunt launch boards are a separate set with their own frame — see
`launch/product-hunt-2026-08-14/boards/`.
