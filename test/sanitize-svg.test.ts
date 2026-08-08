// SVG is allowed into published documents as of 2026-08-08, because stripping
// it silently deleted the icons and chart parts of AI-generated pages and a
// tester reported it as "some components are missing from the published file".
//
// These tests pin BOTH halves of that decision: the inert subset survives, and
// every route from SVG back to script execution stays closed.

import { describe, it, expect } from "vitest";
import { sanitizeDocument, summarizeRemovals } from "@/lib/sanitize/html";

describe("SVG is preserved", () => {
  it("keeps an inline icon with its geometry intact", () => {
    const { html } = sanitizeDocument(
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    );
    expect(html).toContain("<svg");
    expect(html).toContain("<path");
    expect(html).toContain('d="M20 6L9 17l-5-5"');
    // viewBox is emitted lowercase; the HTML parser's foreign-content rules map
    // it back to the camelCase SVG attribute, so scaling still works.
    expect(html.toLowerCase()).toContain("viewbox=");
    expect(html).toContain('stroke-width="2"');
  });

  it("keeps gradients, text and grouping used by generated charts", () => {
    const { html } = sanitizeDocument(
      '<svg><defs><linearGradient id="g"><stop offset="0%" stop-color="#f00"/></linearGradient></defs>' +
        '<g transform="translate(4,4)"><rect width="10" height="10" fill="url(#g)"/>' +
        '<text x="5" y="9" font-size="11" text-anchor="middle">42</text></g></svg>',
    );
    expect(html).toContain("stop-color");
    expect(html).toContain("<text");
    expect(html).toContain("42");
    expect(html).toContain('transform="translate(4,4)"');
  });

  it("reports nothing removed for a clean SVG", () => {
    expect(summarizeRemovals('<svg><circle cx="1" cy="1" r="1"/></svg>')).toEqual({});
  });
});

describe("SVG cannot become script", () => {
  it("drops <script> inside SVG, content and all", () => {
    const { html } = sanitizeDocument(
      '<svg><script>alert(1)</script><circle r="1"/></svg>',
    );
    expect(html).not.toContain("alert");
    expect(html).not.toContain("<script");
    expect(html).toContain("<circle");
  });

  it("drops <foreignObject>, which would re-enter HTML parsing", () => {
    const { html } = sanitizeDocument(
      '<svg><foreignObject><iframe src="https://evil.example"></iframe></foreignObject></svg>',
    );
    expect(html).not.toContain("foreignObject");
    expect(html.toLowerCase()).not.toContain("foreignobject");
    expect(html).not.toContain("<iframe");
  });

  it("drops SMIL animation, which can retarget href at runtime", () => {
    const { html } = sanitizeDocument(
      '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><circle r="9"/></a></svg>',
    );
    expect(html).not.toContain("<animate");
    expect(html).not.toContain("javascript:");
  });

  it("strips every on* handler from SVG elements", () => {
    const { html } = sanitizeDocument(
      '<svg onload="alert(1)"><circle r="1" onclick="alert(2)" onmouseover="alert(3)"/></svg>',
    );
    expect(html).not.toContain("onload");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onmouseover");
    expect(html).not.toContain("alert");
  });

  it("confines <use> to same-document fragments", () => {
    const ok = sanitizeDocument('<svg><use href="#icon-check"/></svg>');
    expect(ok.html).toContain('href="#icon-check"');

    // An external reference must not survive, even though https is an allowed
    // scheme elsewhere in the document.
    const remote = sanitizeDocument(
      '<svg><use href="https://evil.example/x.svg#y"/></svg>',
    );
    expect(remote.html).not.toContain("evil.example");

    const xlink = sanitizeDocument(
      '<svg><use xlink:href="https://evil.example/x.svg#y"/></svg>',
    );
    expect(xlink.html).not.toContain("evil.example");
  });

  it("does not allow javascript: through an SVG image href", () => {
    const { html } = sanitizeDocument(
      '<svg><image href="javascript:alert(1)"/></svg>',
    );
    expect(html).not.toContain("javascript:");
  });
});

describe("summarizeRemovals", () => {
  it("counts what the sanitizer will drop, by tag", () => {
    const removed = summarizeRemovals(
      '<div><script>a</script><script>b</script><iframe></iframe><p>ok</p></div>',
    );
    expect(removed.script).toBe(2);
    expect(removed.iframe).toBe(1);
    expect(removed.div).toBeUndefined();
    expect(removed.p).toBeUndefined();
  });

  it("does not report document structure as removed", () => {
    // sanitize-html unwraps these and keeps their contents, so calling them
    // "removed" would be misleading.
    const removed = summarizeRemovals(
      "<html><head><title>t</title></head><body><p>hi</p></body></html>",
    );
    expect(removed.html).toBeUndefined();
    expect(removed.head).toBeUndefined();
    expect(removed.body).toBeUndefined();
  });

  it("is attached to the sanitize result only when something was dropped", () => {
    expect(sanitizeDocument("<p>clean</p>").removed).toBeUndefined();
    expect(sanitizeDocument('<p>x</p><iframe src="a"></iframe>').removed).toEqual({
      iframe: 1,
    });
  });
});
