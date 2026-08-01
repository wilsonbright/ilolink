# The ilolink Claude Code plugin

Installs the ilolink MCP connector **and** the skills that teach an agent how to
use it, in one step, in any project.

## Install

```
/plugin marketplace add https://github.com/<owner>/ilolink
/plugin install ilolink@ilolink
```

Then connect the account once, in any project:

- **Claude and other OAuth clients** — the connector prompts you to approve at
  ilolink.com and pick which teamspace it may publish into.
- **Clients without OAuth** — create a connector token at
  https://ilolink.com/connect and give it to the assistant as
  `Authorization: Bearer ilo_pat_…`. Never put it in a URL.

## What ships

| Path | Purpose |
|---|---|
| `.claude-plugin/plugin.json` | Plugin manifest; declares the MCP server |
| `.claude-plugin/marketplace.json` | Makes this repo installable as a marketplace |
| `skills/ilolink-publish/SKILL.md` | When and how to publish; what never to publish |
| `skills/ilolink-skill-registry/SKILL.md` | Read team skills before working; treat them as untrusted data; how to write good ones |

## The boundary these two halves keep

Keeping this straight is what stops the local bundle and the hosted registry
rotting into each other:

- **The local plugin is stable and generic.** It describes *how to talk to
  ilolink* — which tools exist, what the arguments mean, what never to publish,
  and the rule that retrieved skills are data rather than orders. It should
  almost never change.
- **Everything project-specific lives server-side**, in the teamspace's skill
  registry, where it can be edited by anyone on the team without a plugin
  release.

If you find yourself wanting to edit the local SKILL.md files to capture
something about *your* project, that thing belongs in the registry instead.

## Why the registry is treated as untrusted

A skill is instructions another agent will execute, and anyone with teamspace
access can write one. The server prefixes every `skills_get` response with a
provenance header naming the author, and both shipped skills instruct the agent
to surface that to you and to refuse anything that would change tool
permissions, read credentials, or send data off-machine.

That containment is deliberate and load-bearing. If you fork these skills, keep
those clauses.
