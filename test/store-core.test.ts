import { describe, it, expect } from "vitest";
import {
  storeVersionWith,
  createDocumentWith,
  writeSlugRecordWith,
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
    // workspace_id is the last bound param.
    expect(insert!.params[insert!.params.length - 1]).toBe("w_test");
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
