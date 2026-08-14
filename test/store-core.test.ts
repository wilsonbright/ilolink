import { describe, it, expect } from "vitest";
import {
  storeVersionWith,
  createDocumentWith,
  writeSlugRecordWith,
  pruneSupersededVersionsWith,
  type PublishBindings,
} from "@/lib/publish/store-core";

// Minimal in-memory fakes for the three bindings — enough to prove the core
// writes to the bindings it is GIVEN (never a global env()).
function fakeBindings() {
  const sql: { text: string; params: unknown[] }[] = [];
  const r2 = new Map<string, unknown>();
  const kv = new Map<string, string>();

  const DB = {
    prepare(text: string) {
      const stmt = {
        _params: [] as unknown[],
        bind(...params: unknown[]) {
          this._params = params;
          return this;
        },
        run: async () => {
          sql.push({ text, params: stmt._params });
          return { success: true };
        },
        first: async () => null,
      };
      return stmt;
    },
  } as unknown as D1Database;

  const DOCS = {
    put: async (key: string, body: unknown) => {
      r2.set(key, body);
    },
    get: async (key: string) => {
      if (!r2.has(key)) return null;
      return { text: async () => String(r2.get(key)) };
    },
  } as unknown as R2Bucket;

  const KV = {
    put: async (key: string, value: string) => {
      kv.set(key, value);
    },
    get: async () => null,
  } as unknown as KVNamespace;

  return { bindings: { DB, DOCS, KV } as PublishBindings, sql, r2, kv };
}

// Map an INSERT's bound params to their column names by parsing the column
// list out of the SQL. The earlier version of these tests indexed params from
// the END of the array, so simply appending a column to the INSERT broke them
// while the code was correct — exactly the failure mode a schema change should
// not produce.
function boundColumns(
  insert: { text: string; params: unknown[] },
): Record<string, unknown> {
  const cols = insert.text
    .slice(insert.text.indexOf("(") + 1, insert.text.indexOf(")"))
    .split(",")
    .map((c) => c.trim());
  const out: Record<string, unknown> = {};
  cols.forEach((c, i) => (out[c] = insert.params[i]));
  return out;
}

describe("store-core (binding-parameterized)", () => {
  it("createDocumentWith inserts under the given workspace_id", async () => {
    const { bindings, sql } = fakeBindings();
    const row = await createDocumentWith(bindings.DB, {
      slug: "abc123",
      source_type: "md",
      workspace_id: "w_test",
    });
    expect(row.slug).toBe("abc123");
    const insert = sql.find((s) => s.text.includes("INSERT INTO documents"));
    expect(insert).toBeDefined();
    const cols = boundColumns(insert!);
    expect(cols.workspace_id).toBe("w_test");
    expect(cols.trusted).toBe(0);
    expect(row.trusted).toBe(false);
  });

  it("createDocumentWith persists the trusted flag as 1 when opted in", async () => {
    const { bindings, sql } = fakeBindings();
    const row = await createDocumentWith(bindings.DB, {
      slug: "trust1",
      source_type: "html",
      trusted: true,
    });
    expect(row.trusted).toBe(true);
    const insert = sql.find((s) => s.text.includes("INSERT INTO documents"));
    expect(boundColumns(insert!).trusted).toBe(1);
  });

  it("createDocumentWith persists teamspace ownership and provenance", async () => {
    const { bindings, sql } = fakeBindings();
    const row = await createDocumentWith(bindings.DB, {
      slug: "owned1",
      source_type: "md",
      teamspace_id: "t_team",
      created_by: "u_author",
    });
    const cols = boundColumns(
      sql.find((s) => s.text.includes("INSERT INTO documents"))!,
    );
    expect(cols.teamspace_id).toBe("t_team");
    expect(cols.created_by).toBe("u_author");
    expect(row.teamspace_id).toBe("t_team");
  });

  it("createDocumentWith leaves ownership null when not supplied", async () => {
    // The legacy web path publishes without a teamspace during the transition;
    // the column must be NULL rather than the string "undefined".
    const { bindings, sql } = fakeBindings();
    await createDocumentWith(bindings.DB, { slug: "anon1", source_type: "md" });
    const cols = boundColumns(
      sql.find((s) => s.text.includes("INSERT INTO documents"))!,
    );
    expect(cols.teamspace_id).toBeNull();
    expect(cols.created_by).toBeNull();
  });

  it("storeVersionWith writes raw + rendered bodies to the given R2 bucket", async () => {
    const { bindings, r2, sql } = fakeBindings();
    const v = await storeVersionWith(
      bindings,
      "doc1",
      "# hello",
      "<h1>hello</h1>",
      "md",
    );
    expect(r2.get(v.raw_r2_key)).toBe("# hello");
    expect(r2.get(v.rendered_r2_key)).toBe("<h1>hello</h1>");
    // set_current_version ran against the given DB.
    expect(sql.some((s) => s.text.includes("UPDATE documents SET current_version_id"))).toBe(true);
  });

  it("writeSlugRecordWith writes to the given KV under slug:<slug>", async () => {
    const { bindings, kv } = fakeBindings();
    await writeSlugRecordWith(bindings.KV, "abc123", {
      doc_id: "doc1",
      visibility: "unlisted",
      current_version_id: "v1",
      rendered_r2_key: "docs/doc1/v1/rendered",
      password_hash: null,
      expires_at: null,
    });
    expect(kv.get("slug:abc123")).toContain("doc1");
  });
});

// The file-bomb fix (security audit 2026-08-14, Blocker 1): every version-
// creating path must drop the versions it supersedes, so an update loop cannot
// pile up permanent R2 objects. A doc serves only from its current version, so
// this is invisible to users.
describe("pruneSupersededVersionsWith", () => {
  // A fake that answers the prune's SELECT with stale rows, records which R2
  // keys get deleted, and remembers the DELETE it runs.
  function fakePrune(staleRows: { id: string; raw_r2_key: string; rendered_r2_key: string }[]) {
    const deletedKeys: string[] = [];
    const ran: { text: string; params: unknown[] }[] = [];
    const DB = {
      prepare(text: string) {
        let params: unknown[] = [];
        return {
          bind(...p: unknown[]) {
            params = p;
            return this;
          },
          all: async () => ({ results: staleRows }),
          run: async () => {
            ran.push({ text, params });
            return { success: true };
          },
          first: async () => null,
        };
      },
    } as unknown as D1Database;
    const DOCS = {
      delete: async (key: string) => {
        deletedKeys.push(key);
      },
    } as unknown as R2Bucket;
    const KV = {} as unknown as KVNamespace;
    return { bindings: { DB, DOCS, KV } as PublishBindings, deletedKeys, ran };
  }

  it("deletes both R2 bodies of every superseded version, then the rows", async () => {
    const { bindings, deletedKeys, ran } = fakePrune([
      { id: "v_old1", raw_r2_key: "docs/d/v_old1/raw", rendered_r2_key: "docs/d/v_old1/rendered" },
      { id: "v_old2", raw_r2_key: "docs/d/v_old2/raw", rendered_r2_key: "docs/d/v_old2/rendered" },
    ]);
    await pruneSupersededVersionsWith(bindings, "d", "v_new");
    expect(deletedKeys).toEqual([
      "docs/d/v_old1/raw",
      "docs/d/v_old1/rendered",
      "docs/d/v_old2/raw",
      "docs/d/v_old2/rendered",
    ]);
    // The DELETE keeps the current version (id != keep).
    const del = ran.find((r) => /DELETE FROM document_versions/.test(r.text));
    expect(del).toBeDefined();
    expect(del!.params).toEqual(["d", "v_new"]);
  });

  it("does nothing when there are no superseded versions (fresh doc)", async () => {
    const { bindings, deletedKeys, ran } = fakePrune([]);
    await pruneSupersededVersionsWith(bindings, "d", "v_only");
    expect(deletedKeys).toEqual([]);
    expect(ran.some((r) => /DELETE/.test(r.text))).toBe(false);
  });
});
