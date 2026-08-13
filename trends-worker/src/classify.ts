// Mechanical kind classifier — pure, deterministic, unit-tested. Phase 1
// deliberately has NO model in the loop (spec §8): topics + name + description
// heuristics are good enough to bucket cards, and being pure means the exact
// rule order is pinned by tests instead of drifting with a prompt.
//
// Rule order goes most-specific-signal first. The compound checks matter:
// an "agent framework" is a framework and an "agent workflow" collection is a
// workflow, so those buckets are decided before the bare agent match.

import type { Kind } from "./types";

export interface ClassifyInput {
  topics: string[];
  name: string;
  description: string | null;
}

// Word-boundary test against the lowercased "name description" haystack.
function has(haystack: string, re: RegExp): boolean {
  return re.test(haystack);
}

export function classifyKind(input: ClassifyInput): Kind {
  const topics = new Set(input.topics.map((t) => t.toLowerCase()));
  const text = `${input.name} ${input.description ?? ""}`.toLowerCase();

  // MCP server: the topic is the ecosystem's own convention, and "mcp server"
  // in name/description is near-unambiguous.
  if (
    topics.has("mcp-server") ||
    topics.has("mcp-servers") ||
    has(text, /\bmcp[\s_-]server/)
  ) {
    return "mcp-server";
  }

  // Skill: claude-skills topics, a SKILL.md mention (the format's defining
  // file), or "skill" in the repo name itself.
  if (
    topics.has("claude-skills") ||
    topics.has("claude-skill") ||
    topics.has("agent-skills") ||
    text.includes("skill.md") ||
    has(input.name.toLowerCase(), /skill/)
  ) {
    return "skill";
  }

  // Eval before agent: "agent evals"/"agent benchmark" repos are evals.
  if (
    topics.has("evals") ||
    topics.has("evaluation") ||
    topics.has("benchmark") ||
    has(text, /\beval(s|uation)?\b|\bbenchmarks?\b/)
  ) {
    return "eval";
  }

  if (has(text, /\brunbooks?\b/)) return "runbook";

  // Spec: "specification"/"protocol spec" — bare "spec" is too noisy.
  if (topics.has("specification") || has(text, /\bspecifications?\b|\bprotocol spec\b/)) {
    return "spec";
  }

  // Workflow before agent: "agent workflows" collections are workflows.
  if (topics.has("workflows") || topics.has("workflow") || has(text, /\bworkflows?\b/)) {
    return "workflow";
  }

  // Framework before agent: an "agent framework" / "agents SDK" is a
  // framework, not an agent.
  if (has(text, /\bframeworks?\b|\bsdks?\b|\btoolkits?\b|\borchestrat/)) {
    return "framework";
  }

  if (
    topics.has("ai-agent") ||
    topics.has("ai-agents") ||
    topics.has("agent") ||
    topics.has("agents") ||
    topics.has("claude-agent") ||
    has(text, /\bagents?\b/)
  ) {
    return "agent";
  }

  // A bare "mcp" topic with nothing more specific: almost always a server.
  if (topics.has("mcp")) return "mcp-server";

  // Default: framework — the least-wrong bucket for uncategorized infra repos.
  return "framework";
}
