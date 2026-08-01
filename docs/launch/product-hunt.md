# ilolink — Product Hunt listing

Everything to paste into the Product Hunt submission form. MCP-connector-led
positioning. Character counts checked against PH field limits.

---

## Name

```
ilolink
```

## Tagline (PH limit 60 chars)

**Primary (53):**

```
Publish what your AI makes to a link — from your chat
```

**Backups:**

- `Turn any AI output into a shareable, tracked page` (49)
- `Share AI output as a real link. No account.` (43)

> If the em dash reads oddly in the PH preview, use the first backup.

## Description (PH limit ~260 chars)

```
ilolink turns anything an AI makes — Markdown, HTML, PDF, a diagram, a table — into a shareable page. Publish straight from Claude, Grok, or ChatGPT via MCP, or paste on the web. No account. Then see how it landed: cookieless analytics, heatmaps, and comments.
```

(258 chars.)

## Topics (pick 3–4)

- Artificial Intelligence
- Developer Tools
- Productivity
- Analytics

## Links

- **Website:** https://ilolink.com
- **Connect an assistant:** https://ilolink.com/connect
- **Live demo doc:** _(fill in the seeded demo slug once published — see Phase 2)_

---

## Maker's first comment

Post this the instant the listing goes live.

```
Hey Product Hunt 👋

I built ilolink to fix a small thing that kept annoying me: AI tools are great
at *making* stuff — a write-up, a landing page, a chart, a table — but the
moment you want to share it, you're back to copy-paste, screenshots, or spinning
up a repo. And once you send it, you have no idea if anyone actually read it.

ilolink does two things:

1. **Publish from inside your chat.** Add ilolink as an MCP connector in Claude,
   Grok, or ChatGPT, then just say "publish this as an ilolink page." You get a
   real share link back — without leaving the conversation. No account, no
   copy-paste. (Prefer the web? Paste Markdown/HTML or drop a PDF, DOCX, CSV, or
   image at ilolink.com.)

2. **See how it landed.** Every link comes with cookieless, privacy-first
   analytics: views, how far people read, referrers, a heatmap of where they
   stop, and Figma-style comments — no cookies, no fingerprinting, no login.

The whole thing is accountless. Your private dashboard is a link — the link is
the key. Nothing to sign up for.

Try it in ~30 seconds: add the connector in Claude/Grok (ilolink.com/connect),
or just paste something at ilolink.com and watch the analytics roll in.

I'd genuinely love feedback — especially on the publish-from-chat flow and what
formats you'd want next. I'm here all day. Thank you for taking a look 🙏
```

---

## Canned answers (keep these ready)

**"How do the analytics stay private if there's no account?"**

```
No cookies, no fingerprinting, no cross-site tracking. We count a view and how
far someone scrolled using a short-lived, salted hash that can't be tied back to
a person, and we honor Do-Not-Track / Global Privacy Control. There's no login
because there's no user profile to log into — your dashboard is a private link.
```

**"Which assistants actually work?"**

```
Anything that supports remote MCP connectors. Claude and Grok use the one-click
OAuth flow (add the connector, click Authorize). ChatGPT works via a tokenized
connector URL you mint at ilolink.com/connect (Developer Mode). Same tools
everywhere: publish, update, unpublish, list, analytics.
```

**"Is it free?"**

```
Yes — free to use right now, no account. Each workspace gets a generous document
limit. If ilolink grows I'll add paid tiers for heavier use, but the core
publish-and-track flow stays free.
```

**"Is my data safe / who can see my docs?"**

```
You choose per document: public, unlisted (link-only), password-protected, or
expiring. Docs render on an isolated origin, sandboxed, so a published page
can't touch your dashboard or other docs. Your dashboard link is the only key to
your analytics — treat it like a password and don't share it.
```

**"What formats can I publish?"**

```
Markdown, HTML, PDF (native viewer), DOCX (rendered to a clean page), JSON, CSV
(as a table), and images. From a chat you can send text inline or a base64 file;
on the web you can paste or drag-and-drop.
```

---

## Pre-flight checklist (listing)

- [ ] Tagline pasted, ≤60 chars, reads clean in the PH preview.
- [ ] Description pasted, ≤260 chars.
- [ ] 3–4 topics selected.
- [ ] All three links resolve (website, /connect, demo doc).
- [ ] Thumbnail (240×240) + 7 gallery images uploaded in order.
- [ ] Demo GIF uploaded (or first gallery slot).
- [ ] Maker's first comment saved as a draft, ready to paste.
- [ ] Canned answers open in a side tab.
