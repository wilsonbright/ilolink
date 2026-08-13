// The excerpt extractor is the one piece of org memory (0017) that decides
// what a teamspace's page says a document contains — plain extraction only, so
// what matters is that markdown/html syntax never leaks into the excerpt and
// that binary kinds yield nothing rather than garbage. auditTargetOf feeds
// mcp_audit.target and must tolerate being handed a schema-less tool's request
// extra instead of parsed input.

import { describe, it, expect } from "vitest";
import {
  extractExcerpt,
  auditTargetOf,
  EXCERPT_MAX,
} from "@/lib/org/store";

describe("extractExcerpt (md)", () => {
  it("strips heading markers, list markers, and emphasis", () => {
    const md = "# Q3 Plan\n\n- ship the **connector**\n- write _docs_\n";
    expect(extractExcerpt(md, "md")).toBe("Q3 Plan ship the connector write docs");
  });

  it("reduces links and images to their text", () => {
    const md = "See [the spec](https://example.com/spec) and ![diagram](img.png).";
    expect(extractExcerpt(md, "md")).toBe("See the spec and diagram.");
  });

  it("drops fenced code blocks, including an unterminated one", () => {
    expect(extractExcerpt("Intro\n```js\nlet x = 1;\n```\nOutro", "md")).toBe(
      "Intro Outro",
    );
    expect(extractExcerpt("Intro\n```js\nlet x = 1;", "md")).toBe("Intro");
  });

  it("unwraps inline code and strips blockquote markers", () => {
    expect(extractExcerpt("> run `npm test` first", "md")).toBe(
      "run npm test first",
    );
  });

  it("strips inline HTML that markdown allows through", () => {
    expect(extractExcerpt("hello <b>world</b>", "md")).toBe("hello world");
  });
});

describe("extractExcerpt (html)", () => {
  it("strips tags and decodes common entities", () => {
    const html = "<h1>Notes</h1><p>Fish &amp; chips &lt;fast&gt;</p>";
    expect(extractExcerpt(html, "html")).toBe("Notes Fish & chips <fast>");
  });

  it("drops script and style bodies entirely", () => {
    const html =
      "<style>p { color: red }</style><p>Visible</p><script>alert(1)</script>";
    expect(extractExcerpt(html, "html")).toBe("Visible");
  });
});

describe("extractExcerpt (limits and binary kinds)", () => {
  it("returns empty for pdf and unknown binary kinds", () => {
    expect(extractExcerpt("%PDF-1.4 …", "pdf")).toBe("");
    expect(extractExcerpt("anything", "docx")).toBe("");
  });

  it("returns empty for an empty body", () => {
    expect(extractExcerpt("", "md")).toBe("");
  });

  it("caps at ~EXCERPT_MAX chars, cut on a word boundary", () => {
    const long = Array(100).fill("wordy").join(" ");
    const out = extractExcerpt(long, "md");
    expect(out.length).toBeLessThanOrEqual(EXCERPT_MAX + 1); // +1 for the ellipsis
    expect(out.endsWith("…")).toBe(true);
    // No mid-word cut: the char before the ellipsis ends a whole word.
    expect(out.slice(0, -1).endsWith("wordy")).toBe(true);
  });

  it("collapses runs of whitespace", () => {
    expect(extractExcerpt("a\n\n\n   b\t\tc", "md")).toBe("a b c");
  });

  it("never cuts through a surrogate pair (emoji/CJK-heavy input)", () => {
    // One ASCII char then astral-plane emoji, no spaces: the EXCERPT_MAX index
    // cut lands mid-pair, leaving a lone high surrogate before the fix.
    const out = extractExcerpt("x" + "🙂".repeat(EXCERPT_MAX), "md");
    expect(out.endsWith("…")).toBe(true);
    const wellFormed = (
      out as unknown as { isWellFormed?: () => boolean }
    ).isWellFormed?.();
    expect(wellFormed !== false).toBe(true);
    // Manual pair check for runtimes without isWellFormed: the char before the
    // ellipsis must not be a lone high surrogate.
    const last = out.charCodeAt(out.length - 2);
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
  });
});

describe("auditTargetOf", () => {
  it("picks the document/artifact argument out of parsed input", () => {
    expect(auditTargetOf({ document_id: "doc_1" })).toBe("doc_1");
    expect(auditTargetOf({ kind: "skill", name: "commit-style" })).toBe(
      "commit-style",
    );
    expect(auditTargetOf({ id: "doc_2" })).toBe("doc_2");
    expect(auditTargetOf({ slug: "q3-notes" })).toBe("q3-notes");
  });

  it("prefers document_id over the other keys", () => {
    expect(auditTargetOf({ document_id: "doc_1", name: "x" })).toBe("doc_1");
  });

  it("yields null for a schema-less tool's request extra", () => {
    // A shape like RequestHandlerExtra: none of the target keys present.
    expect(auditTargetOf({ signal: {}, requestId: 1, sessionId: "s" })).toBeNull();
    expect(auditTargetOf(undefined)).toBeNull();
    expect(auditTargetOf("nope")).toBeNull();
  });

  it("ignores empty and non-string values, and caps length", () => {
    expect(auditTargetOf({ name: "  " })).toBeNull();
    expect(auditTargetOf({ name: 42 })).toBeNull();
    expect(auditTargetOf({ name: "x".repeat(500) })?.length).toBe(200);
  });
});
