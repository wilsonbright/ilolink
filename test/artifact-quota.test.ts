// The per-teamspace version ceiling (security audit 2026-08-14, Blocker 1):
// artifacts_put/push had no count, byte, or plan cap, so a free teamspace could
// loop distinct bodies through the registry and accumulate unbounded R2. The
// cap must refuse at the ceiling BEFORE any insert (no orphan artifact row) and
// stay out of the way below it.

import { describe, it, expect } from "vitest";
import {
  putArtifact,
  MAX_VERSIONS_PER_TEAMSPACE,
  type ArtifactBindings,
} from "@/lib/artifacts/store-core";

interface Statement {
  sql: string;
  binds: unknown[];
}

// Fake store whose only configured read is the version-count query; everything
// else answers null (brand-new artifact path).
function fakeStore(versionCount: number) {
  const statements: Statement[] = [];
  const answer = (sql: string) => {
    if (/COUNT\(\*\) AS n FROM artifact_versions/.test(sql)) {
      return { n: versionCount };
    }
    return null;
  };
  const DB = {
    prepare: (sql: string) => ({
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
    }),
  } as unknown as D1Database;
  const DOCS = { put: async () => undefined } as unknown as R2Bucket;
  return { b: { DB, DOCS } as ArtifactBindings, statements };
}

const input = {
  kind: "runbook",
  name: "deploy-order",
  description: "The order to apply migrations and deploy workers.",
  body: "Migrate the remote D1 before deploying any worker that writes it.",
  publish: true,
};

describe("per-teamspace artifact version ceiling", () => {
  it("refuses at the ceiling and writes nothing (no orphan artifact row)", async () => {
    const { b, statements } = fakeStore(MAX_VERSIONS_PER_TEAMSPACE);
    await expect(putArtifact(b, "t_full", "u_1", input)).rejects.toThrow(
      /registry storage limit/i,
    );
    // The refusal happens before any INSERT — no artifact and no version row.
    expect(statements.some((s) => /INSERT INTO artifacts/.test(s.sql))).toBe(false);
    expect(statements.some((s) => /INSERT INTO artifact_versions/.test(s.sql))).toBe(false);
  });

  it("allows the write when the teamspace is below the ceiling", async () => {
    const { b, statements } = fakeStore(MAX_VERSIONS_PER_TEAMSPACE - 1);
    const res = await putArtifact(b, "t_ok", "u_1", input);
    expect(res.status).toBe("published");
    expect(statements.some((s) => /INSERT INTO artifact_versions/.test(s.sql))).toBe(true);
  });

  it("counts by the write's target teamspace", async () => {
    const { b, statements } = fakeStore(0);
    await putArtifact(b, "t_target", "u_1", input);
    const countStmt = statements.find((s) =>
      /COUNT\(\*\) AS n FROM artifact_versions/.test(s.sql),
    );
    expect(countStmt).toBeDefined();
    expect(countStmt!.binds).toEqual(["t_target"]);
  });
});
