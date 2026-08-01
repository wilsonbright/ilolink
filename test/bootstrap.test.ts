import { describe, it, expect } from "vitest";
import {
  bootstrapTeamspace,
  STARTER_FOLDER,
  STARTER_SKILL_NAME,
} from "@/lib/teamspace/bootstrap";
import type { SkillBindings } from "@/lib/skills/store-core";

// In-memory D1/R2 good enough to observe what bootstrap actually writes, in the
// spirit of test/store-core.test.ts. Rows are keyed by table so assertions can
// talk about "the folders inserted" rather than statement indices — the same
// brittleness that bit the store-core tests when a column was added.
//
// Skills now live in the `artifacts` table alongside the other kinds, so the
// seeded rows carry a `kind` and the store's lookups key on (teamspace, kind,
// name). Seeds default to kind 'skill' because that is all bootstrap copies.
function fakeBindings(seed: {
  skills?: {
    id: string;
    teamspace_id: string;
    kind?: string;
    name: string;
    description: string;
    tags: string | null;
  }[];
  bodies?: Record<string, string>;
} = {}) {
  const inserted: Record<string, unknown[][]> = {};
  const r2 = new Map<string, string>(Object.entries(seed.bodies ?? {}));
  const skills = seed.skills ?? [];

  function tableOf(sql: string): string {
    return /INSERT INTO\s+(\w+)/i.exec(sql)?.[1] ?? "";
  }

  const DB = {
    prepare(text: string) {
      const stmt = {
        _p: [] as unknown[],
        bind(...p: unknown[]) {
          this._p = p;
          return this;
        },
        run: async () => {
          const t = tableOf(text);
          if (t) (inserted[t] ??= []).push(stmt._p);
          return { success: true, meta: { changes: 1 } };
        },
        first: async () => {
          // getArtifact / putArtifact look one up by (teamspace, kind, name) —
          // the unique key the artifacts table now carries.
          if (/FROM artifacts WHERE teamspace_id/i.test(text)) {
            const [ts, kind, name] = stmt._p as [string, string, string];
            return (
              skills.find(
                (s) =>
                  s.teamspace_id === ts &&
                  (s.kind ?? "skill") === kind &&
                  s.name === name,
              ) ?? null
            );
          }
          // The version row still keys on the column `skill_id`: the table was
          // renamed, its columns were not.
          if (/FROM artifact_versions/i.test(text)) {
            const [skillId] = stmt._p as [string];
            const s = skills.find((x) => x.id === skillId);
            if (!s) return null;
            return {
              version: 1,
              body_r2_key: `skills/${s.id}/1/SKILL.md`,
              body_sha256: "seeded",
              status: "published",
              created_by: "u_author",
              created_at: 1,
            };
          }
          if (/FROM users/i.test(text)) return { email: "author@example.com" };
          return null;
        },
        all: async () => {
          if (/FROM artifacts\b/i.test(text)) {
            const [ts, kind] = stmt._p as [string, string];
            return {
              results: skills.filter(
                (s) => s.teamspace_id === ts && (s.kind ?? "skill") === kind,
              ),
            };
          }
          return { results: [] };
        },
      };
      return stmt;
    },
  } as unknown as D1Database;

  const DOCS = {
    put: async (key: string, body: unknown) => {
      r2.set(key, String(body));
    },
    get: async (key: string) =>
      r2.has(key) ? { text: async () => r2.get(key)! } : null,
  } as unknown as R2Bucket;

  return { b: { DB, DOCS } as SkillBindings, inserted, r2 };
}

describe("teamspace bootstrap", () => {
  it("seeds a starter folder and skill when nothing is copied", async () => {
    const { b, inserted } = fakeBindings();
    const res = await bootstrapTeamspace(b, "t_new", "u_owner");

    expect(res.folderCreated).toBe(true);
    expect(res.starterSkillCreated).toBe(true);
    expect(res.skillsCopied).toBe(0);
    expect(res.warnings).toEqual([]);

    expect(inserted.folders?.[0]).toContain(STARTER_FOLDER);
    // Skills are rows of the `artifacts` table now, so that is the insert to
    // look at — and it must carry kind 'skill', or the starter skill would be
    // invisible to skills_list.
    expect(inserted.artifacts?.[0]).toContain(STARTER_SKILL_NAME);
    expect(inserted.artifacts?.[0]).toContain("skill");
    // Scoped to the new teamspace, not leaked into another.
    expect(inserted.artifacts?.[0]).toContain("t_new");
  });

  it("copies skills from the source teamspace instead of seeding", async () => {
    const { b, inserted, r2 } = fakeBindings({
      skills: [
        {
          id: "sk_a",
          teamspace_id: "t_src",
          name: "commit-style",
          description: "How we write commits.",
          tags: null,
        },
      ],
      bodies: { "skills/sk_a/1/SKILL.md": "# Commit style\n\nImperative mood." },
    });

    const res = await bootstrapTeamspace(b, "t_new", "u_owner", {
      copySkillsFrom: "t_src",
    });

    expect(res.skillsCopied).toBe(1);
    // A team that deliberately copied skills must not also get a placeholder
    // telling them to write some.
    expect(res.starterSkillCreated).toBe(false);
    expect(
      inserted.artifacts?.some((row) => row.includes(STARTER_SKILL_NAME)),
    ).toBe(false);

    // The copy lands under the NEW teamspace, and the body really moved.
    expect(inserted.artifacts?.[0]).toContain("t_new");
    expect([...r2.values()].filter((v) => v.includes("Imperative mood")).length)
      .toBeGreaterThan(1);
  });

  it("falls back to the starter skill when the source has none", async () => {
    const { b } = fakeBindings({ skills: [] });
    const res = await bootstrapTeamspace(b, "t_new", "u_owner", {
      copySkillsFrom: "t_empty",
    });

    expect(res.skillsCopied).toBe(0);
    expect(res.starterSkillCreated).toBe(true);
  });

  it("never fails the whole bootstrap when a step throws", async () => {
    // A teamspace row is already committed by the time bootstrap runs, so a
    // throw here would 500 a create that actually succeeded and push the user
    // to create a duplicate.
    const b = {
      DB: {
        prepare() {
          throw new Error("D1 unavailable");
        },
      },
      DOCS: {},
    } as unknown as SkillBindings;

    const res = await bootstrapTeamspace(b, "t_new", "u_owner");
    expect(res.folderCreated).toBe(false);
    expect(res.starterSkillCreated).toBe(false);
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
