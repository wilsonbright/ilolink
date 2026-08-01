// The artifact taxonomy.
//
// Pure data — no bindings — so the UI, the MCP tools, and the sync client all
// agree on one list rather than three that drift.
//
// The set is deliberately CLOSED. An open `kind` string would let two projects
// invent "adr" and "decision-record" for the same thing, and the registry's
// value is that a name resolves to one thing for everyone on the team.

export const ARTIFACT_KINDS = [
  "skill",
  "agent",
  "spec",
  "design",
  "plan",
  "workflow",
  "session",
  "decision",
  "runbook",
  "eval",
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export interface KindInfo {
  kind: ArtifactKind;
  label: string;
  plural: string;
  // The directory a sync client projects this kind into. This is the ONLY
  // place the on-disk layout is defined; the registry itself stays flat and
  // name-keyed so `skills_get("commit-style")` remains something an agent can
  // type from memory.
  dir: string;
  // Shown in the UI and used in the MCP tool description, so an agent picks
  // the right kind without being told.
  description: string;
  // Whether a reading agent is expected to ACT on this, as opposed to consult
  // it. Both get the provenance preamble — the injection risk is identical
  // because an agent reads both — but the wording differs.
  executable: boolean;
}

export const KINDS: Record<ArtifactKind, KindInfo> = {
  skill: {
    kind: "skill",
    label: "Skill",
    plural: "Skills",
    dir: ".claude/skills",
    description:
      "Reusable instructions for a recurring task. Read at the start of work to see whether the team already has guidance.",
    executable: true,
  },
  agent: {
    kind: "agent",
    label: "Agent",
    plural: "Agents",
    dir: ".claude/agents",
    description:
      "A subagent definition: its role, the tools it may use, and how it should behave.",
    executable: true,
  },
  spec: {
    kind: "spec",
    label: "Spec",
    plural: "Specs",
    dir: "docs/specs",
    description:
      "What is being built and why, including the behaviour an agent should implement. The agreed shape of the work.",
    executable: false,
  },
  design: {
    kind: "design",
    label: "Design doc",
    plural: "Design docs",
    dir: "docs/design",
    description:
      "How something is built: architecture, data model, and the trade-offs that were weighed.",
    executable: false,
  },
  plan: {
    kind: "plan",
    label: "Plan",
    plural: "Plans",
    dir: "docs/plans",
    description:
      "An ordered implementation plan: phases, dependencies, and what 'done' means for each step.",
    executable: false,
  },
  workflow: {
    kind: "workflow",
    label: "Workflow",
    plural: "Workflows",
    dir: ".claude/workflows",
    description:
      "A multi-step orchestration an agent runs: the stages, what fans out, and what verifies.",
    executable: true,
  },
  session: {
    kind: "session",
    label: "Session transfer",
    plural: "Session transfers",
    dir: "docs/handoffs",
    description:
      "A handoff from one working session to the next: what was done, what was learned, what is still open. Read this to resume someone else's work.",
    executable: false,
  },
  // ── Added beyond the original list, because each is something teams keep
  //    and currently has nowhere to live. ──
  decision: {
    kind: "decision",
    label: "Decision",
    plural: "Decisions",
    dir: "docs/decisions",
    description:
      "A decision that has been made and should not be silently reopened, with the reasoning that produced it. The answer to 'why is it like this'.",
    executable: false,
  },
  runbook: {
    kind: "runbook",
    label: "Runbook",
    plural: "Runbooks",
    dir: "docs/runbooks",
    description:
      "An operational procedure to follow exactly: deploys, migrations, incident response, rollbacks.",
    executable: true,
  },
  eval: {
    kind: "eval",
    label: "Eval",
    plural: "Evals",
    dir: "docs/evals",
    description:
      "Cases an agent's output is checked against: the input, the expected behaviour, and what counts as a failure.",
    executable: false,
  },
};

export function isArtifactKind(v: unknown): v is ArtifactKind {
  return typeof v === "string" && (ARTIFACT_KINDS as readonly string[]).includes(v);
}

// Falls back to 'skill' rather than throwing: an unknown kind arriving from an
// older client should degrade to the original behaviour, not fail the write.
export function coerceKind(v: unknown): ArtifactKind {
  return isArtifactKind(v) ? v : "skill";
}

// Map a repo-relative path back to a kind, for pushes that do not name one.
// Longest directory match wins so `.claude/skills` beats `.claude`.
export function kindFromPath(path: string): ArtifactKind | null {
  const p = path.replace(/^\.\//, "").toLowerCase();
  let best: { kind: ArtifactKind; len: number } | null = null;
  for (const info of Object.values(KINDS)) {
    const dir = info.dir.toLowerCase();
    if (p.startsWith(dir + "/") && (!best || dir.length > best.len)) {
      best = { kind: info.kind, len: dir.length };
    }
  }
  return best?.kind ?? null;
}
