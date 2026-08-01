# Accountless copy sweep — remaining work

Regenerated 2026-08-01 after the automated pass.

Already corrected by hand: privacy, terms, app/page.tsx, docs/launch/product-hunt.md.
Automated pass removed the unambiguous 'free and accountless' family across 16 files.

## What is left

| Category | Lines | What to do |
|---|---|---|
| READER | 21 | Leave alone — readers still never sign in, and this is now the differentiator. |
| PUBLISHER | 40 | Rewrite — publishing needs a free email-only account. |
| BOTH | 12 | Split: keep the reader half, rewrite the publisher half. |
| REVIEW | 50 | Read in context — usually a headline or meta description. |

## By file

### app/(marketing)/help/delete-or-replace/page.tsx (6)
- `40` **PUBLISHER** — text: "Use the same browser and device you published the doc from. The per-doc manage token is stored there — there is no account to sign into.",
- `68` **REVIEW** — you published from — no account.
- `118` **REVIEW** — account, no login — so that browser is what proves the doc is yours.
- `128` **REVIEW** — that authorizes it. That&apos;s the accountless trade-off: no email, no
- `154` **PUBLISHER** — a: "Not without the manage token. It lives only in the browser you published from, and there's no account to recover it through. If that browser or de
- `177` **PUBLISHER** — "The honest checklist: a file or pasted text under 2 MB, no account — and the browser that holds your manage token.",

### app/(marketing)/guides/host-ai-image/page.tsx (5)
- `48` **PUBLISHER** — text: "Open the composer at the ilolink home page and paste the HTML or Markdown, or drop the image file. No login is required.",
- `75` **REVIEW** — referrers, countries, and device class — with no account and no
- `123` **REVIEW** — file. No login.
- `159` **REVIEW** — doc, no account needed to leave one.
- `195` **READER** — a: "No. Anyone with the link opens it — no login, no account. It renders from the isolated view.ilolink.com origin under a strict CSP.",

### app/(marketing)/guides/markdown-to-web-page/page.tsx (5)
- `40` **PUBLISHER** — text: "Paste the Markdown into the composer at ilolink.com. No account, no login. The cap is 2 MB per doc.",
- `70` **REVIEW** — ilolink.com/&lt;slug&gt; — no account, no login. Then see how far
- `99` **REVIEW** — <a href="/">ilolink.com</a>. No account needed.
- `141` **REVIEW** — <strong>Comments</strong> — threaded, anchored to the doc, no account
- `172` **BOTH** — a: "No. Readers just open ilolink.com/<slug> — no login, no signup. You don't need an account to publish either; ownership is a per-doc manage token k

### app/(marketing)/guides/requirements/page.tsx (5)
- `17` **REVIEW** — "The honest checklist: just the output. A file or pasted text — Markdown, HTML, an image — under 2 MB. No account, no server, no repo, no build step."
- `30` **REVIEW** — "The only requirement is the output itself — a file or pasted text under 2 MB. No account, no server, no repo, no build step.",
- `52` **BOTH** — text: "Paste the text or drop the file into the composer at ilolink.com and get ilolink.com/<slug>. No account to publish or to view.",
- `70` **PUBLISHER** — no server, no repo, no build step, and no account to publish or to
- `99` **PUBLISHER** — <strong>No account.</strong> No signup, no login — to publish or to

### app/(marketing)/alternatives/tiiny-host/page.tsx (4)
- `31` **READER** — "A tiiny.host alternative for people who want drag-and-drop HTML hosting plus built-in cookieless view analytics, heatmaps, and reader feedback — no a
- `110` **PUBLISHER** — accountless publish flow:
- `181` **PUBLISHER** — a: "Yes — publishing is free. Paste or drop a file and get a link, no login and no card. There are no paid tiers to quote, so we won't invent pricing 
- `185` **PUBLISHER** — a: "No. There's no login. Ownership of a doc is a per-doc manage token kept in your browser, not a server account — so keep that link to manage the do

### app/(marketing)/for/developers/page.tsx (4)
- `17` **REVIEW** — "Share a README, API doc, changelog, or spec as a clean page — no repo, no build, no account — then see whether teammates actually read it.",
- `30` **REVIEW** — "Share a README, API doc, changelog, or spec as a clean page — no repo, no build, no account — then see whether teammates read it.",
- `47` **REVIEW** — repo, no build, no account — then see whether teammates actually
- `177` **PUBLISHER** — a: "Yes, it's free. Paste Markdown or HTML, or drop a file up to 2 MB, and get a link at no cost — no sign-up for you and none for the people reading 

### app/(marketing)/for/marketers/page.tsx (4)
- `17` **PUBLISHER** — "Publish a landing-page mockup or campaign page as a link and see where attention went — click and scroll heatmaps, cookieless, no account.",
- `48` **REVIEW** — where attention went with click and scroll heatmaps — no account,
- `63` **REVIEW** — 2&nbsp;MB per doc, and it&apos;s accountless — no login for you or the
- `116` **REVIEW** — built around a sanitized, tracked, accountless link, and interactive

### app/(marketing)/for/product-managers/page.tsx (4)
- `17` **REVIEW** — "Share a PRD, spec, or update as a clean link, then see if stakeholders read it: scroll depth, time on page, and where they clicked. No cookies, no ac
- `48` **REVIEW** — they clicked. No cookies, no accounts, no sign-in wall between them
- `69` **READER** — in any browser. No login for you, no login for the reader. Pick how
- `174` **READER** — a: "No. The link opens as a normal web page in any browser — no sign-in wall between a reader and the doc, and no account for you either.",

### app/(marketing)/for/teachers/page.tsx (4)
- `47` **READER** — class got — in aggregate, never per student. No accounts for
- `60` **READER** — any browser. Students just open the link. No account for them, no
- `74` **REVIEW** — fingerprint, no login, and no personal profile. It <em>cannot</em>{" "}
- `146` **READER** — a: "No. The link opens as a normal web page in any browser. There's no sign-in wall between a student and the reading, and no account for you either."

### app/(marketing)/for/writers/page.tsx (4)
- `47` **PUBLISHER** — comments they leave in place. No account for you to publish, and none
- `59` **REVIEW** — download, no login wall, no app to install before someone can read the
- `113` **READER** — q: "Can readers comment without an account?",
- `114` **READER** — a: "Yes. Anyone with the link can leave reactions, short notes, and threaded anchored comments on a specific paragraph — no login, no account. It all 

### app/(marketing)/guides/quick-start/page.tsx (4)
- `44` **PUBLISHER** — text: "Paste the Markdown or HTML, or drop the file, into the composer at ilolink.com. No account and no login.",
- `76` **REVIEW** — land — no account, nothing to install.
- `93` **REVIEW** — <a href="/">ilolink.com</a>. There&apos;s no account and no login —
- `174` **PUBLISHER** — a: "No. Publishing needs a free account — you land on the composer, paste or drop your file, and get a link. No sign-up and no login.",

### app/(marketing)/guides/share-docx/page.tsx (4)
- `40` **PUBLISHER** — text: "Drop your Word .docx into the composer at ilolink.com. No account, no login. The cap is 15 MB per file.",
- `82` **REVIEW** — <a href="/">ilolink.com</a>. No account needed. The cap is 15 MB per
- `125` **REVIEW** — <strong>Comments</strong> — threaded, anchored to the doc, no login
- `174` **BOTH** — a: "No. Readers just open ilolink.com/<slug> — no login, no signup. You don't need an account to publish either; ownership is a per-doc manage token k

### app/(marketing)/guides/share-mistral-output/page.tsx (4)
- `95` **PUBLISHER** — <code>ilolink.com/&lt;slug&gt;</code> — no account for you to publish,
- `96` **READER** — no account for anyone to read it.
- `151` **REVIEW** — leave a short note, or thread a comment, no account.
- `180` **BOTH** — a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in

### app/(marketing)/for/consultants/page.tsx (3)
- `67` **READER** — It&apos;s accountless — no login for you, none for the client. The link
- `97` **REVIEW** — doc, plus quick reactions — no account required. A question sits
- `117` **REVIEW** — better — ilolink is built around a sanitized, tracked, accountless

### app/(marketing)/for/designers/page.tsx (3)
- `59` **PUBLISHER** — type, spacing, color, grid. No login; ownership is a per-doc manage
- `77` **REVIEW** — region, or a specific piece of text on the page — no account needed to
- `136` **READER** — a: "No. Anyone with the link can open the page and leave comments, reactions, or notes — no login, no account. It renders from the isolated view.iloli

### app/(marketing)/guides/capabilities/page.tsx (3)
- `48` **PUBLISHER** — and anchored comments. No account. Paste or drop a file, get{" "}
- `58` **REVIEW** — link in seconds. No account, no setup. Images work: an AI-generated
- `185` **BOTH** — a: "No. Paste Markdown or HTML, or drop a file up to 2 MB, and you get an ilolink.com/<slug> link. Publishing and reading analytics are accountless, a

### app/(marketing)/guides/free-html-hosting/page.tsx (3)
- `17` **REVIEW** — "Free HTML hosting often means expiring links, small size caps, or watermarks. ilolink publishes HTML free — no account, no forced expiry, analytics i
- `96` **PUBLISHER** — <strong>No account.</strong> Publishing is accountless; control over
- `173` **PUBLISHER** — in one paste, safe to hand a stranger, permanent without an account,

### app/(marketing)/guides/share-ai-output/page.tsx (3)
- `71` **REVIEW** — ilolink.com/&lt;slug&gt;. No account. Then see how it was read: views,
- `173` **REVIEW** — short note, no account.
- `202` **PUBLISHER** — a: "No. There's no login and no server-side account. You paste or drop your content and get a link. Ownership is a per-doc manage token kept in your b

### app/(marketing)/guides/share-deepseek-output/page.tsx (3)
- `71` **REVIEW** — a link at ilolink.com/&lt;slug&gt;. No account. Then see how it was
- `149` **REVIEW** — leave a short note, or thread an anchored comment, no account.
- `175` **BOTH** — a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in

### app/(marketing)/guides/share-gemini-output/page.tsx (3)
- `71` **READER** — ilolink.com/&lt;slug&gt;. No account. Then see how far readers got:
- `149` **REVIEW** — leave a short note, or thread a comment, no account.
- `176` **BOTH** — a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in

### app/(marketing)/guides/why-host-ai-output/page.tsx (3)
- `104` **REVIEW** — browser — no download, no login, no conversation attached. It renders
- `120` **READER** — comments right on the page — no account on their end either.
- `147` **READER** — a: "Yes. Readers can leave reactions, short notes, and threaded comments anchored to a spot on the page — with no account required on their end.",

### app/(app)/publish/page.tsx (2)
- `10` **PUBLISHER** — // Accountless: anyone can publish. Ownership is proved later by the per-doc
- `28` **REVIEW** — can see how people actually read it. No account needed.

### app/(marketing)/faq/page.tsx (2)
- `16` **PUBLISHER** — "Straight answers: no account needed, publishing is free, no cookies, publish Markdown/HTML/images/files up to 2 MB, and links don't expire unless you
- `107` **READER** — a: "Yes, and without an account. Readers can leave reactions, short notes, and threaded comments anchored to the page.",

### app/(marketing)/for/founders/page.tsx (2)
- `61` **READER** — investor opens in a browser. It&apos;s accountless, opens immediately,
- `121` **PUBLISHER** — a: "Yes. Publishing a doc and seeing its analytics is free, and it's accountless — no login for you and none for the people you send the link to.",

### app/(marketing)/for/sales/page.tsx (2)
- `67` **READER** — It&apos;s accountless — no login for you, none for the prospect. The
- `120` **REVIEW** — tool fits better. ilolink is built around a clean, tracked, accountless

### app/(marketing)/guides/analytics-heatmaps-feedback/page.tsx (2)
- `142` **READER** — q: "Can readers comment or react without an account?",
- `158` **PUBLISHER** — "Paste Markdown or HTML, or drop a file, and get a shareable ilolink.com link — no account.",

### app/(marketing)/guides/best-way-to-share-ai-html/page.tsx (2)
- `80` **REVIEW** — on the same page, with no account.
- `173` **PUBLISHER** — a: "Publishing is free — paste or drop a file and get a link, no login. There are no paid tiers to quote, so we won't invent pricing here.",

### app/(marketing)/guides/publish-chatgpt-html/page.tsx (2)
- `160` **REVIEW** — short note, no account.
- `197` **PUBLISHER** — a: "Yes — publishing is free. You paste the HTML, or drop a file up to 2 MB, and get a link at no cost. No account and no login.",

### app/(marketing)/guides/share-claude-artifact/page.tsx (2)
- `71` **REVIEW** — ilolink.com/&lt;slug&gt; — a real link anyone can open, no account.
- `154` **REVIEW** — short note, no account.

### app/(marketing)/guides/share-grok-output/page.tsx (2)
- `149` **REVIEW** — leave a short note, or thread a comment, no account.
- `176` **BOTH** — a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in

### app/(marketing)/guides/share-perplexity-output/page.tsx (2)
- `74` **REVIEW** — ilolink.com/&lt;slug&gt;: a real link anyone can open, no account.
- `158` **REVIEW** — short note, no account.

### app/(marketing)/guides/share-spreadsheet/page.tsx (2)
- `44` **PUBLISHER** — text: "Paste the CSV or TSV into the composer at ilolink.com, or drop a .csv file. No account, no login.",
- `213` **BOTH** — a: "No. Readers just open ilolink.com/<slug> — no login, no signup. You don't need an account to publish either; ownership is a per-doc manage token k

### app/(marketing)/guides/what-is-ai-output-hosting/page.tsx (2)
- `118` **REVIEW** — browser, no account. The branded link 302-redirects to an isolated
- `154` **PUBLISHER** — a: "No. You paste Markdown or HTML, or drop a file, and get a link. There's no account, no deploy step, and nothing to configure. If the chatbot gave 

### app/(marketing)/vs/tiiny-host/page.tsx (2)
- `85` **READER** — No account for the reader either.
- `188` **PUBLISHER** — a: "Publishing is free — paste or drop a file and get a link, no login. There are no paid tiers to quote, so we won't invent pricing here.",

### app/(app)/dashboard/[slug]/page.tsx (1)
- `3` **PUBLISHER** — // Per-document detail, accountless. Ownership is proved by the per-doc manage

### app/(app)/dashboard/stats-view.tsx (1)
- `12` **PUBLISHER** — // The manage token is the accountless proof of ownership; it is passed in from

### app/(app)/w/[token]/page.tsx (1)
- `79` **REVIEW** — no login — this link is the key, keep it private.

### app/(marketing)/_components/content.tsx (1)
- `183` **PUBLISHER** — // accountless — the composer is the signup).

### app/(marketing)/acceptable-use/page.tsx (1)
- `136` **PUBLISHER** — <Cta sub="Paste Markdown or HTML, get a link. No account." />

### app/(marketing)/glossary/page.tsx (1)
- `241` **PUBLISHER** — "Paste Markdown or HTML, or drop a file, and get a shareable ilolink.com link — no account.",

### app/(marketing)/guides/do-links-expire/page.tsx (1)
- `63` **PUBLISHER** — Ownership works without an account: publishing is accountless, and

### app/(marketing)/guides/reading-your-analytics/page.tsx (1)
- `159` **PUBLISHER** — "Paste Markdown or HTML, or drop a file, and get a shareable ilolink.com link — no account.",

### app/(marketing)/guides/share-copilot-output/page.tsx (1)
- `181` **BOTH** — a: "No. Anyone with the link can open the page — no account and no login. Only the publish side is accountless too; you paste or drop the output and g

### app/(marketing)/guides/share-lovable-output/page.tsx (1)
- `178` **BOTH** — a: "No. Anyone with the link can open the page. There's no login to view, and no login to publish either — ownership is a per-doc manage token kept in

### app/(marketing)/guides/share-pdf/page.tsx (1)
- `40` **PUBLISHER** — text: "Drop a PDF into the composer at ilolink.com. No account, no login. The cap is 15 MB per PDF.",

### app/(marketing)/help/file-too-large/page.tsx (1)
- `153` **REVIEW** — "The honest checklist: a file or pasted text under 2 MB. No account, no server, no build step.",

### app/(marketing)/help/page-wont-unlock/page.tsx (1)
- `128` **PUBLISHER** — a: "From your dashboard, on the browser you published from. ilolink is accountless, so each doc's manage token lives in that browser and device.",

### app/(marketing)/help/page.tsx (1)
- `120` **REVIEW** — "The honest checklist — a file or text under 2 MB, no account, no server, no build step.",

### app/(marketing)/terms/page.tsx (1)
- `124` **BOTH** — a: "To publish, yes — creating an account and publishing a document both mean you accept these terms. To read a published page you need no account and

### app/page.tsx (1)
- `19` **READER** — body: "Readers can react or leave a note without signing in. No account, no friction.",

