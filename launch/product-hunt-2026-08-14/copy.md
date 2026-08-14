# Product Hunt launch copy — ilolink (2026-08-14)

## Name

ilolink

## Tagline (PH limit 60 chars — all fit)

1. **Push it once. Every teammate's agent knows it.** (48)
2. The registry your team's AI agents actually read (48)
3. Team knowledge for agents — versioned, reviewed, shared (55)

## Topics

Artificial Intelligence · Developer Tools · Productivity · SaaS

## Links

- Site: https://ilolink.com
- Trending directory: https://ilolink.com/trending
- MCP setup: https://ilolink.com/mcp

## Description (PH "description" field, ~260 chars)

ilolink is a registry for what agents produce — skills, specs, plans,
runbooks, handoffs. Push once from any repo; every teammate's assistant
(Claude, Claude Code, ChatGPT — any MCP client) reads the same versioned,
reviewed set. Free solo. $9 once for a team of five.

## Maker first comment

Hey Product Hunt 👋

Every team using AI assistants has the same leak: an agent figures
something out — a working procedure, a decision and its reasoning, a
constraint that cost an hour — and it dies in one person's chat. The next
teammate's assistant re-learns it from zero.

ilolink is the fix we wanted for ourselves: a shared registry of ten kinds
of team knowledge (skills, agents, specs, designs, plans, workflows,
sessions, decisions, runbooks, evals). One name resolves to one artifact
for everyone. Push from a repo like you'd push code; member writes land as
proposals a human approves before any agent reads them — so nothing
unreviewed ever steers your teammates' assistants.

The parts I'm proudest of:

- **Agents contribute back.** Connected assistants propose what they learn
  at the end of a task — always as a proposal, never a live write, even
  for admins. Prompt-injection containment is structural, not a policy.
- **Everything is a link.** Anything worth showing the world publishes as
  a page anyone can open, no sign-in to read — with private analytics
  (views, scroll heatmaps, reactions) for you.
- **Trending** (ilolink.com/trending): a weekly, hand-approved directory
  of the skills, MCP servers and agents breaking out across GitHub.
  Curated velocity, not another 20,000-item index.

Pricing is deliberately boring: free for one person, $9 **once** — not
monthly — for a team of five.

Would love to hear how your team shares what your agents learn today. AMA.

## Gallery order (assets/)

| # | File | Why this order |
|---|---|---|
| 1 | 01-hook.png | The claim — same headline as the site |
| 2 | 02-landing.png | Proof the product looks like the claim |
| 3 | 03-registry.png | The ten-kind registry — the core idea |
| 4 | 04-connect.png | Works with the assistants people already use |
| 5 | 05-trending.png | The public wedge — trending directory |
| 6 | 06-pricing.png | $9 once lands last, sticks |

Thumbnail: assets/thumbnail-240.png (240×240; PH also accepts GIF — the
static mark is on-brand: one red, zero radius).

## Regenerating

Boards are plain HTML in boards/ (shared _board.css, Archivo via Google
Fonts, DS tokens inline). Serve the folder (`python3 -m http.server`) and
screenshot at 1270×760 (thumbnail at 240×240). Product screenshots in
shots/ were taken live at 1270×760 on 2026-08-14.
