import { describe, it, expect } from "vitest";
import {
  detectUpload,
  decodeDataUrl,
  isSourceType,
  MAX_BINARY_BYTES,
} from "@/lib/publish/pipeline";

describe("detectUpload", () => {
  it("detects pdf and docx from the data-URL MIME", () => {
    expect(detectUpload("data:application/pdf;base64,JVBERi0=")).toBe("pdf");
    expect(
      detectUpload(
        "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBB",
      ),
    ).toBe("docx");
  });

  it("returns null for text and image content", () => {
    expect(detectUpload("# Markdown")).toBeNull();
    expect(detectUpload("data:image/png;base64,iVBOR")).toBeNull();
    expect(detectUpload('{"a":1}')).toBeNull();
  });
});

describe("decodeDataUrl", () => {
  it("decodes a base64 data URL to the original bytes", () => {
    // "PDF" => UERG in base64
    const bytes = decodeDataUrl("data:application/pdf;base64,UERG");
    expect(bytes).not.toBeNull();
    expect(Array.from(bytes!)).toEqual([0x50, 0x44, 0x46]); // P D F
  });

  it("returns null for a non-base64 or malformed data URL", () => {
    expect(decodeDataUrl("data:text/plain,hello")).toBeNull(); // not base64
    expect(decodeDataUrl("not a data url")).toBeNull();
  });
});

describe("source type", () => {
  it("now accepts pdf", () => {
    expect(isSourceType("pdf")).toBe(true);
    expect(isSourceType("md")).toBe(true);
    expect(isSourceType("docx")).toBe(false); // docx is stored as html
  });

  it("caps binary uploads well above the 2 MB text cap", () => {
    expect(MAX_BINARY_BYTES).toBeGreaterThan(2_000_000);
  });
});
