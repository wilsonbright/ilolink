# ilolink — Project Rules

## Scope (hard boundary)
- All work in this project's sessions stays **inside this project folder only**
  (`/Users/wilsonbright/Desktop/Filen/projects/ilolink`).
- Never create, modify, or move files outside this folder for this project's work.
  The one allowed exception is this project's own memory directory under
  `~/.claude/projects/-Users-wilsonbright-Desktop-Filen-projects-ilolink/memory/`.
- Whatever the user types in a session is scoped to this project — no spillover to
  other projects.

## Worklog
- `WORKLOG.md` is a dated running record, **newest entries at top**.
- After every meaningful task, append: date, what was asked, what was done, files touched.

## Global rules
- User's global preferences (`~/.claude/CLAUDE.md`) still apply on top of these project
  rules: delegate-friendly + self-verify, offer to commit after verified milestones,
  verify required tooling exists before starting a workflow that depends on it.

## Execution: ultracode & workflows
- **Ultracode** is a Claude Code effort setting (`/effort ultracode`) pairing max (xhigh)
  reasoning with automatic multi-agent workflow orchestration. Session-scoped, resets each
  session — only the user turns it on. When ON: default to authoring and running a workflow
  for every substantive task (often several in sequence: understand → design → implement →
  review) and stay thorough; token cost is not a constraint. Drop back with `/effort high`
  or `/effort xhigh`.
- **Dynamic Workflows** are JavaScript scripts orchestrating many subagents deterministically
  (primitives: `agent()`, `pipeline()` [default, no barrier], `parallel()` [barrier],
  `phase()`, `log()`, `budget`). Intermediate results live in script variables, not context.
  Runs in background; user watches/controls via `/workflows`. Default to `pipeline()`; use a
  barrier only for a genuine cross-item dependency (dedup/merge-all, early-exit on zero,
  cross-finding comparison). Caps: ~16 concurrent agents, 1000 per run.
- **Even when ultracode is OFF**, reach for a workflow WITHOUT asking when a task is clearly
  multi-part and parallelizable enough to justify it — codebase-wide audits or bug sweeps,
  large migrations/refactors across many files, multi-source research, or drafting/comparing
  several independent plans. For anything smaller (single-file edits, quick fixes, one-off
  questions), do it directly or use a single Agent — do not fan out. When unsure whether a
  workflow is worth it, briefly say what you'd run and roughly what it'd cost, then ask.
  Always prefer thoroughness for audits/reviews/research and brevity for quick checks.
- Quality patterns to compose inside workflows: adversarial / perspective-diverse
  verification, judge panels, loop-until-dry discovery, multi-modal sweeps, final
  completeness critic. Never silently cap coverage — `log()` anything dropped.
- User can trigger a one-off workflow any time via the keyword `ultracode` or "use a workflow".

## Discipline: verify, don't guess
- You cannot see what the user sees. When you change anything with a visible or runnable
  result — UI, layout, rendered page, chart, generated output, a file — editing the code is
  **NOT** evidence the result is correct. You do not get to reason it "should look fixed" and
  report success.
- Before claiming any such change works: actually produce the result and inspect it. Open the
  browser, run the thing, open the file, take a screenshot — then do a genuine, critical look,
  hunting for what is still broken rather than confirming your own work.
- Never say "it looks fixed now," "that's resolved," or "done" on reasoning alone. If you have
  not observed the actual result, say exactly that: "I changed X; I have not verified the
  result yet." Stating an unverified fix as fact is gaslighting — don't.
- Generalizes past visuals: tests are not passing until you have run them, a build is not
  working until it built, a bug is not fixed until you have reproduced the original failure and
  watched it stop. Prefer observed truth over inferred truth every time you can observe.
- When you genuinely cannot verify (no browser, no way to run it), do not fake confidence.
  State the limitation, say what you would check, tell the user exactly what to look at.
