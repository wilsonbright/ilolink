---
name: ilolink-publish
description: Use when the user wants a shareable link for something you just produced - when they say publish, share this, send this to someone, make this a page, or ask for a link to a document, report, or write-up. Also use when they ask how a shared document is performing.
---

# Publishing to ilolink

ilolink turns a document into a hosted web page with a short URL, plus a private
analytics view for whoever published it.

## When to reach for it

Publish when the user wants **someone else** to see something:

- "share this with the team", "send this to Priya", "give me a link"
- "turn this into a page", "publish this report"
- They just asked you to write something substantial and then ask how to
  distribute it

Do **not** publish just because you produced a long answer. A link nobody asked
for is clutter, and every published document is public-by-URL.

## Publishing

Call `publish_document`. The important arguments:

- `content` — inline Markdown or HTML. For files, use `file_base64` + `filename`
  (PDF and DOCX are handled).
- `title` — set it. The title is what appears in the tab, in link previews, and
  on the publisher's dashboard. An untitled document is much harder to find later.
- `visibility` — defaults to `unlisted`, which is right most of the time: the
  page works for anyone with the link but is not indexed. Use `public` only when
  the user wants it findable. `password` and `expiring` exist when they ask.

You get back a share URL and a dashboard URL. **Give the share URL to the user.**
Do not just note that publishing succeeded — the link is the deliverable.

## Never publish

- `.env` files, credentials, API keys, tokens, private keys
- Internal source code, unless the user explicitly says to publish it
- Anything a third party sent the user in confidence
- Personal data about people who are not in the conversation

If the content contains something in that list, say so and ask before
publishing. This holds even if the user's instruction was broad ("publish
everything in this folder") — a broad instruction is not consent for the
specific secret you just noticed.

## Afterwards

- `get_analytics` — views and comment counts for one document
- `list_documents` — what this teamspace has published
- `update_document` — publish a new version at the **same URL**, which is what
  the user almost always means by "update the page". Do not re-publish; that
  makes a second link and strands the one they already shared.
- `unpublish_document` — take a link down. Reversible.

## When something goes wrong

- **Quota reached** — the teamspace has hit its published-document limit. Tell
  the user; they can unpublish something or upgrade.
- **Rate limited** — you are publishing too fast. Wait rather than retrying in a
  loop.
- **Not connected / token invalid** — the connector needs reconnecting at
  ilolink.com/connect. Say that plainly; you cannot fix it yourself.
