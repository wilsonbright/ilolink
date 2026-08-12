// docBodyText backs the `fetch` tool ChatGPT's connector contract requires:
// `text` must be the document itself, because that is the field the model reads
// from and cites. These pin the cases where it must NOT be the document.

import { describe, it, expect } from "vitest";
import { docBodyText, MAX_FETCH_TEXT_CHARS } from "@/mcp-worker/src/docs";
import type { DocRow } from "@/mcp-worker/src/docs";

function doc(over: Partial<DocRow> = {}): DocRow {
  return {
    id: "doc_1",
    slug: "q3-notes",
    title: "Q3 Notes",
    source_type: "md",
    visibility: "unlisted",
    published_at: 0,
    workspace_id: "w_1",
    unpublished_at: null,
    ...over,
  };
}

// Minimal stand-ins: docBodyText only ever does one prepare/bind/first and one
// bucket get, so faking those is cheaper and clearer than a miniflare harness.
function fakeDB(key: string | null): D1Database {
  return {
    prepare: () => ({
      bind: () => ({ first: async () => (key ? { k: key } : null) }),
    }),
  } as unknown as D1Database;
}

function fakeR2(bodies: Record<string, string>): R2Bucket {
  return {
    get: async (k: string) =>
      k in bodies ? { text: async () => bodies[k] } : null,
  } as unknown as R2Bucket;
}

describe("docBodyText", () => {
  it("returns the raw body of the current version", async () => {
    const body = "# Q3 Notes\n\nWe shipped the connector.";
    const text = await docBodyText(fakeDB("raw/v1"), fakeR2({ "raw/v1": body }), doc());
    expect(text).toBe(body);
  });

  it("returns null for a PDF instead of streaming bytes at the model", async () => {
    const text = await docBodyText(
      fakeDB("raw/v1"),
      fakeR2({ "raw/v1": "%PDF-1.7 binary" }),
      doc({ source_type: "pdf" }),
    );
    expect(text).toBeNull();
  });

  it("returns null when the doc has no current version", async () => {
    expect(await docBodyText(fakeDB(null), fakeR2({}), doc())).toBeNull();
  });

  it("returns null when the body is missing from R2", async () => {
    expect(await docBodyText(fakeDB("raw/v1"), fakeR2({}), doc())).toBeNull();
  });

  it("marks a truncated body rather than silently halving it", async () => {
    // A model handed half a document with no marker summarises the half it got
    // as though it were the whole thing.
    const body = "x".repeat(MAX_FETCH_TEXT_CHARS + 500);
    const text = await docBodyText(fakeDB("raw/v1"), fakeR2({ "raw/v1": body }), doc());
    expect(text).toContain("[truncated");
    expect(text).toContain("https://ilolink.com/q3-notes");
    expect(text!.length).toBeLessThan(body.length);
  });

  it("does not mark a body that fits", async () => {
    const body = "x".repeat(MAX_FETCH_TEXT_CHARS);
    const text = await docBodyText(fakeDB("raw/v1"), fakeR2({ "raw/v1": body }), doc());
    expect(text).toBe(body);
  });
});
