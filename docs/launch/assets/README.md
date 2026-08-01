# ilolink — Product Hunt assets

Specs + production notes for every visual in the launch. Files land in this
folder. Screenshots are captured from the **live product** (production), using a
clean seeded demo doc with no PII.

Product Hunt sizes:
- **Thumbnail:** 240×240 px (PNG). Shows in the feed. Keep it a simple mark.
- **Gallery:** 1270×760 px (PNG/GIF), first one is the hero. Up to ~8.
- **Social card:** 1200×630 (PNG) for X/LinkedIn when you share the link.

---

## Files (target)

| File | Size | What |
|---|---|---|
| `thumbnail.png` | 240×240 | ilolink mark + wordmark on canvas |
| `gallery-1-hero-mcp.png` | 1270×760 | Authorize screen → resulting share link |
| `gallery-2-publish.png` | 1270×760 | Composer with drag-drop + format chips |
| `gallery-3-analytics.png` | 1270×760 | Dashboard: views, scroll depth, referrers |
| `gallery-4-heatmap.png` | 1270×760 | Heatmap of where people read/stop |
| `gallery-5-comments.png` | 1270×760 | Figma-style pin/region comment on a doc |
| `gallery-6-formats.png` | 1270×760 | PDF + DOCX-as-page + CSV table collage |
| `gallery-7-noaccount.png` | 1270×760 | OG share card + "link is the key" dashboard |
| `social-card.png` | 1200×630 | Launch-day X/LinkedIn card |
| `demo.gif` | ≤1270×760 | ~12–15s flagship flow (you record; see below) |

Gallery order tells a story: **from your chat → publish anything → see how it
read → the proof (heatmap/comments) → every format → no account.**

---

## Capture notes (screenshots)

- Use production (`ilolink.com`, `mcp.ilolink.com`) so everything is real.
- Seed one clean demo doc first (see "Demo doc" below) and reuse it across shots.
- Capture at 1270×760 exactly (or 2540×1520 @2x and downscale for crispness).
- Light theme, no browser chrome in the frame (or a minimal clean chrome).
- No personal data, no real emails, no real workspace tokens visible. Blur or
  swap any `w_…` token before publishing an image.
- The `/api/og` card is already live — grab it with:
  `https://ilolink.com/api/og?t=Your%20demo%20title&f=md`

---

## Demo doc

Publish one polished, PII-free sample used in the gallery and as the listing's
"live demo" link. Good candidate: a short "What is ilolink?" one-pager in
Markdown (renders with a heading, a list, a small table) so the analytics,
heatmap, and comments shots all have real content to sit on.

- Visibility: **public** (it's a showcase).
- Title: something clean, e.g. "ilolink — publish AI output to a link".
- Keep the slug short and memorable if you set a custom one.

---

## Demo GIF — shot list

Flagship flow, ~12–15s, loops. You record the screen; captions can be burned in
after. Keep the assistant window and the ilolink page side by side if possible.

| Time | On screen | Caption (burn-in) |
|---|---|---|
| 0.0–2.5s | In Claude/Grok, type: "Publish this as an ilolink page and give me the link." | "Say it in your chat" |
| 2.5–5.0s | Assistant runs the ilolink tool; a share link appears in the reply. | "It publishes — no copy-paste" |
| 5.0–8.0s | Click the link; the published page opens at ilolink.com/<slug>. | "Real share link, instantly" |
| 8.0–11.0s | Open the private dashboard; views + scroll depth animate in. | "See how it landed" |
| 11.0–13.5s | Hover the heatmap / a comment pin. | "Cookieless analytics. No account." |
| loop | Fade back to the chat prompt. | — |

Recording tips:
- 1270×760 (or 2× and downscale). ~15–20 fps is plenty for a GIF; keep it under
  ~8 MB so PH accepts it.
- Pre-stage the chat so the tool call succeeds on the first take.
- If you send me the raw screen recording, I can trim and add the captions.

---

## Production status

- [ ] Demo doc published, URL recorded in `product-hunt.md`
- [ ] thumbnail.png
- [ ] gallery-1 … gallery-7
- [ ] social-card.png
- [ ] demo.gif (recorded by maker)
