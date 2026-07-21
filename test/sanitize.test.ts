import { describe, it, expect } from "vitest";
import { sanitizeDocument } from "@/lib/sanitize/html";
import { renderMarkdown } from "@/lib/sanitize/markdown";
import {
  buildDocCsp,
  buildChromeCsp,
  docSecurityHeaders,
} from "@/lib/sanitize/csp";

describe("sanitizeDocument — the core security boundary", () => {
  it("strips <script> entirely", () => {
    const { html } = sanitizeDocument(
      "<p>ok</p><script>alert(document.cookie)</script>",
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(");
    expect(html).toContain("ok");
  });

  it("strips inline event handlers", () => {
    const { html } = sanitizeDocument('<img src="x" onerror="steal()">');
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("steal(");
  });

  it("drops javascript: URLs on links", () => {
    const { html } = sanitizeDocument('<a href="javascript:evil()">x</a>');
    expect(html).not.toContain("javascript:");
  });

  it("removes iframes, forms, objects", () => {
    const { html } = sanitizeDocument(
      '<iframe src="https://evil.example"></iframe><form action="//evil"><object></object>',
    );
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<object");
  });

  it("drops the DOM-clobbering `name` attribute on anchors", () => {
    const { html } = sanitizeDocument('<a name="config" href="https://x.com">x</a>');
    expect(html).not.toContain('name="config"');
  });

  it("keeps safe formatting and images with https/data schemes", () => {
    const { html } = sanitizeDocument(
      '<h1>Title</h1><p><strong>bold</strong></p><img src="https://x.com/a.png" alt="a">',
    );
    expect(html).toContain("<strong>");
    expect(html).toContain("<h1>");
    expect(html).toContain('src="https://x.com/a.png"');
  });

  it("extracts a title from the first <h1>", () => {
    const { title } = sanitizeDocument("<h1>Quarterly Brief</h1><p>body</p>");
    expect(title).toBe("Quarterly Brief");
  });

  it("markdown output is still sanitized (html:true is safe downstream)", () => {
    const dirty = renderMarkdown("# Hi\n\n<script>bad()</script>\n\n**b**");
    const { html } = sanitizeDocument(dirty);
    expect(html).not.toContain("<script");
    expect(html).toContain("<strong>");
  });
});

describe("CSP builders", () => {
  it("doc CSP locks everything down with a nonce'd script only", () => {
    const { nonce, header } = buildDocCsp();
    expect(header).toContain("default-src 'none'");
    expect(header).toContain(`script-src 'nonce-${nonce}'`);
    expect(header).not.toContain("unsafe-inline'; script"); // no unsafe-inline on scripts
    expect(header).toContain("frame-ancestors 'none'");
    expect(header).toContain("object-src 'none'");
    expect(nonce.length).toBeGreaterThan(10);
  });

  it("fresh nonce per call", () => {
    expect(buildDocCsp().nonce).not.toBe(buildDocCsp().nonce);
  });

  it("chrome CSP allows the gate form to POST but no scripts", () => {
    const csp = buildChromeCsp();
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("script-src");
  });

  it("security headers include anti-framing + nosniff", () => {
    const h = docSecurityHeaders("default-src 'none'");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("no-referrer");
  });
});
