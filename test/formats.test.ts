import { describe, it, expect } from "vitest";
import { detectFormat, renderContent } from "@/lib/publish/formats";

describe("detectFormat", () => {
  it("detects JSON, CSV, image, html, markdown", () => {
    expect(detectFormat('{"a":1}', "md")).toBe("json");
    expect(detectFormat("[1,2,3]", "md")).toBe("json");
    expect(detectFormat("a,b,c\n1,2,3\n4,5,6", "md")).toBe("csv");
    expect(detectFormat("data:image/png;base64,iVBORw0KG", "md")).toBe("image");
    expect(detectFormat("<!doctype html><html></html>", "md")).toBe("html");
    expect(detectFormat("# Heading\n\ntext", "md")).toBe("markdown");
    // html hint wins even without doctype
    expect(detectFormat("<div>x</div>", "html")).toBe("html");
  });

  it("does not mistake prose or a single CSV-ish line for a table", () => {
    expect(detectFormat("Hello, world. This is prose.", "md")).toBe("markdown");
  });
});

describe("renderContent", () => {
  it("pretty-prints JSON and escapes it", () => {
    const { html } = renderContent('{"x":1,"y":"<b>hi</b>"}', "md");
    expect(html).toContain("<pre");
    expect(html).toContain('"x": 1'); // pretty-printed (2-space)
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt;"); // value escaped, not markup
    expect(html).not.toContain("<b>hi</b>");
  });

  it("renders CSV as a table with escaped cells", () => {
    const { html } = renderContent("name,note\nAlice,<script>x</script>", "md");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("Alice");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders an image as <img> with the data URL", () => {
    const url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    const { html, title } = renderContent(url, "md");
    expect(html).toContain("<img");
    expect(html).toContain(url);
    expect(title).toBe("Image");
  });

  it("still strips scripts from html content", () => {
    const { html } = renderContent("<p>ok</p><script>bad()</script>", "html");
    expect(html).not.toContain("<script");
    expect(html).toContain("ok");
  });
});
