// The kind classifier is deliberately mechanical (phase 1 has no model in the
// loop), so its rule ORDER is the spec: these tests pin which signal wins when
// several match — an "agent framework" is a framework, an "agent benchmark" is
// an eval — and that the classifier never returns anything outside KINDS.

import { describe, it, expect } from "vitest";
import { classifyKind } from "@/trends-worker/src/classify";
import { KINDS } from "@/trends-worker/src/types";

// Shorthand: most cases only vary one field.
function kindOf(over: {
  topics?: string[];
  name?: string;
  description?: string | null;
}) {
  return classifyKind({
    topics: over.topics ?? [],
    name: over.name ?? "some-repo",
    description: over.description ?? null,
  });
}

describe("classifyKind", () => {
  it("topic mcp-server wins over everything else", () => {
    expect(
      kindOf({
        topics: ["mcp-server", "agents"],
        description: "An agent framework with workflows",
      }),
    ).toBe("mcp-server");
  });

  it("'mcp server' in the description is enough", () => {
    expect(kindOf({ description: "A weather MCP server for Claude" })).toBe(
      "mcp-server",
    );
  });

  it("claude-skills topic → skill", () => {
    expect(kindOf({ topics: ["claude-skills"] })).toBe("skill");
  });

  it("a SKILL.md mention → skill (the format's defining file)", () => {
    expect(kindOf({ description: "Drop the SKILL.md into your repo" })).toBe(
      "skill",
    );
  });

  it("'skill' in the repo name → skill", () => {
    expect(kindOf({ name: "pdf-skills" })).toBe("skill");
  });

  it("eval beats agent: an agent benchmark is an eval", () => {
    expect(kindOf({ description: "A benchmark for coding agents" })).toBe(
      "eval",
    );
    expect(kindOf({ topics: ["evals"] })).toBe("eval");
  });

  it("runbook keyword → runbook", () => {
    expect(kindOf({ description: "Incident runbooks for on-call agents" })).toBe(
      "runbook",
    );
  });

  it("specification keyword → spec (bare 'spec' is too noisy to match)", () => {
    expect(kindOf({ description: "The agent interop specification" })).toBe(
      "spec",
    );
  });

  it("workflow beats agent: an agent-workflow collection is a workflow", () => {
    expect(kindOf({ description: "Reusable workflows for Claude agents" })).toBe(
      "workflow",
    );
  });

  it("framework beats agent: an agent framework is a framework", () => {
    expect(
      kindOf({ description: "A framework for building AI agents" }),
    ).toBe("framework");
    expect(kindOf({ description: "Multi-agent orchestration engine" })).toBe(
      "framework",
    );
  });

  it("bare agent signal → agent", () => {
    expect(kindOf({ topics: ["ai-agents"] })).toBe("agent");
    expect(kindOf({ description: "An autonomous coding agent" })).toBe("agent");
  });

  it("bare 'mcp' topic with nothing more specific → mcp-server", () => {
    expect(kindOf({ topics: ["mcp"] })).toBe("mcp-server");
  });

  it("no signal at all → framework (the least-wrong default)", () => {
    expect(kindOf({ name: "zeta", description: "Fast and lightweight" })).toBe(
      "framework",
    );
  });

  it("is case-insensitive across topics, name, and description", () => {
    expect(kindOf({ topics: ["MCP-Server"] })).toBe("mcp-server");
    expect(kindOf({ description: "A Weather MCP Server" })).toBe("mcp-server");
    expect(kindOf({ name: "PDF-Skills" })).toBe("skill");
  });

  it("always returns a member of KINDS", () => {
    const weird = [
      { topics: ["🦄"], name: "###", description: "" },
      { topics: [], name: "", description: null },
      { topics: ["mcp", "agents", "evals"], name: "x", description: "y" },
    ];
    for (const input of weird) {
      expect(KINDS).toContain(classifyKind(input));
    }
  });
});
