// Regression tests for the connector-URL near-misses that produced a real
// support incident: a trailing full stop copied off our own /connect page let
// the entire OAuth flow succeed and then 404'd the first transport call, so the
// assistant showed "connected" and immediately went "Disconnected".
//
// The 404 column below is what production actually returned on 2026-08-08,
// measured before the fix.

import { describe, it, expect } from "vitest";
import {
  canonicalPath,
  canonicalResource,
  isMcpPath,
  isCanonicalMcpPath,
} from "../mcp-worker/src/canonical-path";

describe("canonicalPath", () => {
  it("leaves an already-correct path alone", () => {
    expect(canonicalPath("/mcp")).toBe("/mcp");
  });

  it("strips the trailing punctuation a pasted sentence brings with it", () => {
    // The exact string from the failed grants in OAUTH_KV.
    expect(canonicalPath("/mcp.")).toBe("/mcp");
    expect(canonicalPath("/mcp,")).toBe("/mcp");
    expect(canonicalPath("/mcp;")).toBe("/mcp");
    expect(canonicalPath("/mcp:")).toBe("/mcp");
    expect(canonicalPath("/mcp!")).toBe("/mcp");
    expect(canonicalPath("/mcp?")).toBe("/mcp");
  });

  it("strips brackets and quotes from a URL pasted out of prose or markdown", () => {
    expect(canonicalPath("/mcp)")).toBe("/mcp");
    expect(canonicalPath("/mcp]")).toBe("/mcp");
    expect(canonicalPath("/mcp>")).toBe("/mcp");
    expect(canonicalPath("/mcp'")).toBe("/mcp");
    expect(canonicalPath('/mcp"')).toBe("/mcp");
  });

  it("strips a trailing slash — the one browsers add unprompted", () => {
    expect(canonicalPath("/mcp/")).toBe("/mcp");
    expect(canonicalPath("/mcp//")).toBe("/mcp");
  });

  it("handles punctuation and slashes combined, in either order", () => {
    expect(canonicalPath("/mcp/.")).toBe("/mcp");
    expect(canonicalPath("/mcp./")).toBe("/mcp");
    expect(canonicalPath("/mcp/).")).toBe("/mcp");
  });

  it("decodes and trims escaped whitespace", () => {
    expect(canonicalPath("/mcp%20")).toBe("/mcp");
    expect(canonicalPath("/mcp ")).toBe("/mcp");
  });

  it("lowercases, so /MCP resolves", () => {
    expect(canonicalPath("/MCP")).toBe("/mcp");
    expect(canonicalPath("/Mcp/")).toBe("/mcp");
  });

  it("never returns an empty string", () => {
    expect(canonicalPath("/")).toBe("/");
    expect(canonicalPath("...")).toBe("/");
    expect(canonicalPath("")).toBe("/");
  });

  it("does not throw on a malformed percent-escape", () => {
    // decodeURIComponent would throw on this; the raw path must survive.
    expect(() => canonicalPath("/mcp%")).not.toThrow();
    expect(canonicalPath("/mcp%")).toBe("/mcp%");
  });

  it("does NOT collapse genuinely different paths onto /mcp", () => {
    // The forgiveness must not become a wildcard: these are other routes and
    // must keep 404ing rather than being served the MCP transport.
    expect(isMcpPath("/mcpx")).toBe(false);
    expect(isMcpPath("/mcp/extra")).toBe(false);
    expect(isMcpPath("/token")).toBe(false);
    expect(isMcpPath("/authorize")).toBe(false);
    expect(isMcpPath("/")).toBe(false);
    expect(isMcpPath("/.well-known/oauth-protected-resource")).toBe(false);
  });
});

describe("isMcpPath", () => {
  it("accepts every near-miss that returned 404 in production", () => {
    for (const p of ["/mcp", "/mcp.", "/mcp/", "/mcp,", "/mcp%20", "/MCP", "/mcp;"]) {
      expect(isMcpPath(p), `${p} should route to the MCP transport`).toBe(true);
    }
  });
});

describe("canonicalResource", () => {
  // This is the one that actually broke the connection. The `resource` sent to
  // /authorize becomes the ACCESS TOKEN'S AUDIENCE, so a trailing full stop
  // mints a token for ".../mcp." that the ".../mcp" resource server rejects on
  // every request with "Token audience does not match resource server" —
  // reproduced against production on 2026-08-08 before this fix.
  it("repairs the audience so the issued token is usable", () => {
    expect(canonicalResource("https://mcp.ilolink.com/mcp.")).toBe(
      "https://mcp.ilolink.com/mcp",
    );
    expect(canonicalResource("https://mcp.ilolink.com/mcp/")).toBe(
      "https://mcp.ilolink.com/mcp",
    );
    expect(canonicalResource("https://mcp.ilolink.com/MCP")).toBe(
      "https://mcp.ilolink.com/mcp",
    );
  });

  it("leaves an already-correct resource byte-identical", () => {
    const good = "https://mcp.ilolink.com/mcp";
    expect(canonicalResource(good)).toBe(good);
  });

  it("preserves the origin and never invents one", () => {
    expect(canonicalResource("https://other.example/mcp.")).toBe(
      "https://other.example/mcp",
    );
  });

  it("drops a fragment only when it is already repairing the path", () => {
    // Deliberately conservative: a resource whose path is already correct is
    // returned untouched, fragment and all. Rewriting a value that the OAuth
    // provider would have accepted risks breaking a working client to fix a
    // problem nobody has. Once we ARE rebuilding the URL, the fragment goes,
    // because RFC 8707 forbids one on a resource indicator.
    expect(canonicalResource("https://mcp.ilolink.com/mcp.#frag")).toBe(
      "https://mcp.ilolink.com/mcp",
    );
    const untouched = "https://mcp.ilolink.com/mcp#frag";
    expect(canonicalResource(untouched)).toBe(untouched);
  });

  it("returns unparseable input untouched rather than guessing", () => {
    expect(canonicalResource("not a url")).toBe("not a url");
    expect(canonicalResource("")).toBe("");
  });
});

describe("isCanonicalMcpPath", () => {
  it("is true only for the exact path, so the hot path skips rewriting", () => {
    expect(isCanonicalMcpPath("/mcp")).toBe(true);
    expect(isCanonicalMcpPath("/mcp/")).toBe(false);
    expect(isCanonicalMcpPath("/MCP")).toBe(false);
  });
});
