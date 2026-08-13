// contributeArtifact is the door an assistant writes through when it files
// something nobody asked it to file. The property under test is the one the
// whole feature rests on: what comes out is ALWAYS a proposal, for every role,
// in every teamspace, however the caller asks. If these tests go green while
// the invariant is broken they are worthless, so they assert on the actual SQL
// bound — the status literal on the version row, and the absence of the
// statement that would make it live.

import { describe, it, expect } from "vitest";
import {
  contributeArtifact,
  listArtifacts,
  putArtifact,
  AGENT_CONTRIBUTION,
  type ArtifactBindings,
  type ContributeInput,
} from "@/lib/artifacts/store-core";

interface Statement {
  sql: string;
  binds: unknown[];
}

// Records every prepare/bind in order, so a test can ask what was written AND
// what was not. `rowsFor` answers the reads putArtifact performs on the way
// through: the existing-artifact lookup, the latest-version lookup, and the
// duplicate-proposal probe.
function fakeStore(rows: Record<string, unknown | null> = {}) {
  const statements: Statement[] = [];
  const answer = (sql: string) => {
    if (/FROM artifacts\b/.test(sql) && /WHERE teamspace_id/.test(sql)) {
      return rows.existing ?? null;
    }
    if (/status = 'published'/.test(sql) && /ORDER BY version DESC/.test(sql)) {
      return rows.livePublished ?? null;
    }
    if (/status = 'proposed'/.test(sql)) return rows.pendingDupe ?? null;
    if (/MAX\(version\)/.test(sql) || /ORDER BY version DESC/.test(sql)) {
      return rows.latest ?? null;
    }
    return null;
  };
  const DB = {
    prepare: (sql: string) => {
      const stmt = {
        bind: (...binds: unknown[]) => {
          statements.push({ sql, binds });
          return {
            first: async () => answer(sql),
            run: async () => ({ meta: { changes: 1 } }),
            all: async () => ({ results: [] }),
          };
        },
        first: async () => answer(sql),
        run: async () => ({ meta: { changes: 1 } }),
      };
      return stmt;
    },
  } as unknown as D1Database;
  const DOCS = { put: async () => undefined } as unknown as R2Bucket;
  return { b: { DB, DOCS } as ArtifactBindings, statements };
}

const versionInsert = (s: Statement[]) =>
  s.find((x) => /INSERT INTO artifact_versions/.test(x.sql));

const input: ContributeInput = {
  kind: "runbook",
  name: "d1-migration-order",
  description: "Read before applying a migration to the remote database.",
  body: "Apply the migration before deploying any worker that writes it.",
  changelog:
    "We broke production for 72 seconds this session by deploying first; nobody should rediscover that.",
};

describe("contributeArtifact", () => {
  it("always proposes — even for an owner in a teamspace with review off", async () => {
    const { b, statements } = fakeStore();
    const res = await contributeArtifact(b, "ts_1", "u_owner", input);

    // Role is not even an argument. That is the design, and this test is where
    // it is written down: there is no path by which an owner's unattended
    // write becomes live.
    expect(res.status).toBe("proposed");
    const insert = versionInsert(statements);
    expect(insert).toBeDefined();
    expect(insert!.binds).toContain("proposed");
    expect(insert!.binds).not.toContain("published");

    // The statement that publishes a version is the one that must not appear.
    expect(
      statements.some((s) => /UPDATE artifacts SET current_version_id/.test(s.sql)),
    ).toBe(false);
  });

  it("ignores a publish flag forced past the input type", async () => {
    const { b, statements } = fakeStore();
    const forced = { ...input, publish: true } as unknown as ContributeInput;
    const res = await contributeArtifact(b, "ts_1", "u_owner", forced);

    expect(res.status).toBe("proposed");
    expect(versionInsert(statements)!.binds).toContain("proposed");
  });

  it("stamps origin so a reviewer can see no human wrote it", async () => {
    const { b, statements } = fakeStore();
    await contributeArtifact(b, "ts_1", "u_1", input);
    expect(versionInsert(statements)!.binds).toContain(AGENT_CONTRIBUTION);
  });

  it("putArtifact leaves origin NULL — the badge cannot be forged", async () => {
    const { b, statements } = fakeStore();
    await putArtifact(b, "ts_1", "u_1", { ...input, publish: true });
    expect(versionInsert(statements)!.binds).not.toContain(AGENT_CONTRIBUTION);
  });

  // Proves the assertions above discriminate. Without this, every "expect
  // binds to contain 'proposed'" could be passing because the harness never
  // produces anything else, and the invariant tests would be decoration.
  it("the same harness reports 'published' when a write really does publish", async () => {
    const { b, statements } = fakeStore();
    await putArtifact(b, "ts_1", "u_1", { ...input, publish: true });
    expect(versionInsert(statements)!.binds).toContain("published");
    expect(versionInsert(statements)!.binds).not.toContain("proposed");
    expect(
      statements.some((s) => /UPDATE artifacts SET current_version_id/.test(s.sql)),
    ).toBe(true);
  });

  it("stores the agent's rationale verbatim in changelog", async () => {
    const { b, statements } = fakeStore();
    await contributeArtifact(b, "ts_1", "u_1", input);
    expect(versionInsert(statements)!.binds).toContain(input.changelog);
  });

  it("leaves a brand-new contributed artifact unreadable (current_version_id NULL)", async () => {
    const { b, statements } = fakeStore();
    const res = await contributeArtifact(b, "ts_1", "u_1", input);
    expect(res.created).toBe(true);
    // The only UPDATE on the artifact row touches updated_at, never the
    // pointer agents read through.
    const updates = statements.filter((s) => /UPDATE artifacts SET/.test(s.sql));
    expect(updates.every((s) => !/current_version_id/.test(s.sql))).toBe(true);
  });

  it("reports deduped and writes nothing when the same proposal is already pending", async () => {
    const { b, statements } = fakeStore({
      existing: { id: "sk_1", kind: "runbook", archived_at: null },
      latest: { version: 3 },
      pendingDupe: { version: 4 },
    });
    const res = await contributeArtifact(b, "ts_1", "u_1", input);

    expect(res.deduped).toBe(true);
    expect(res.status).toBe("proposed");
    expect(versionInsert(statements)).toBeUndefined();
  });

  // Found by driving the real tool, not by reading the code: getArtifact
  // refuses an unapproved artifact, but the LISTING still carried its name and
  // description — the field agents match on, in the one call the server
  // instructions tell every agent to make at the start of a task. An assistant
  // could have laundered unreviewed text to every teammate's agent through it.
  it("agent-facing listing hides an artifact with nothing published", async () => {
    const { b, statements } = fakeStore();
    await listArtifacts(b, "ts_1", { publishedOnly: true });
    const select = statements.find((s) => /FROM artifacts a/.test(s.sql));
    expect(select!.sql).toMatch(/a\.current_version_id IS NOT NULL/);
  });

  it("human-facing listing still shows pending rows", async () => {
    const { b, statements } = fakeStore();
    await listArtifacts(b, "ts_1", {});
    const select = statements.find((s) => /FROM artifacts a/.test(s.sql));
    expect(select!.sql).not.toMatch(/current_version_id IS NOT NULL/);
  });

  it("refuses a body carrying a credential, and files nothing", async () => {
    const { b, statements } = fakeStore();
    await expect(
      contributeArtifact(b, "ts_1", "u_1", {
        ...input,
        body: "Export AKIAIOSFODNN7EXAMPLE before running the sync.",
      }),
    ).rejects.toThrow(/AWS access key/);
    expect(statements.length).toBe(0);
  });
});
