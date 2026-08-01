import { describe, it, expect } from "vitest";
import { docxToHtml } from "@/lib/publish/formats";

// Pins the bug that made .docx uploads fail in production while every local
// test passed. mammoth's package.json remaps ./lib/unzip.js to
// ./browser/unzip.js for bundlers, and the builds accept different options:
// node takes { buffer }, the browser build takes { arrayBuffer } ONLY. Passing
// just `buffer` rejected under Workers with "Could not find file in options",
// surfaced to users as "the file may be corrupt".
//
// Node runs the node build here, so this test cannot by itself prove the
// Workers path works — what it CAN do is fail loudly if someone "tidies up"
// the call by dropping one of the two keys.
const DOCX_B64 =
  "UEsDBBQAAAAIAPOmAV0XmADX6wAAALIBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU4DMQy98xWRr2gmAweEUKc9sByBQ/kAK/HMRM2mOC3t3+NpoQdUONpvs99itQ9e7aiwS7GHm7YDRdEk6+LYw8f6pbkHxRWjRZ8i9XAghtXyarE+ZGIl4sg9TLXmB63ZTBSQ25QpCjKkErDKWEad0WxwJH3bdXfapFgp1qbOHiBmTzTg1lf1vJf96ZJCnkE9nphzWA+Ys3cGq+B6F+2vmOY7ohXlkcOTy3wtBNCXI2bo74Qf4ZuUU5wl9Y6lvmIQmv5MxWqbzDaItP3f58KlaRicobN+dsslGWKW1oNvz0hAF88f6GPlyy9QSwMEFAAAAAgA86YBXT+t/vqvAAAALAEAAAsAAABfcmVscy8ucmVsc43POw7CMAwA0J1TRN5pWgaEUEMXhNQVlQNEiZtWNB/F4dPbk4EBKgZG/57tunnaid0x0uidgKoogaFTXo/OCLh0p/UOGCXptJy8QwEzEjSHVX3GSaY8Q8MYiGXEkYAhpbDnnNSAVlLhA7pc6X20MuUwGh6kukqDfFOWWx4/DVigrNUCYqsrYN0c8B/c9/2o8OjVzaJLP3YsOrIso8Ek4OGj5vqdLjILPJ/Dv548vABQSwMEFAAAAAgA86YBXQOSiOrpAAAAVAEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2QPU/EMAyGd36FlZ2mx4BQ1fYGELoBxFeRWHONuUYkcZX4GvrvScsBC4vtV3792HK9/XQWJgzRkG/EpigFoO9JG39oxGt3e34lILLyWlny2IgZo9i2Z3WqNPVHh54hE3ysUiMG5rGSMvYDOhULGtHn3jsFpzjLcJCJgh4D9RhjXuCsvCjLS+mU8aLNyD3peWWPixofw5peeLYIqZqUbcQO1XLbRsi2lr+eNXD7dFSBMdgZnnEymBYHr77w7f6Dnya6wUS4ebh+g6Qi9OTzKxg1MMGuu7+D/QzGkjX+o/gPJk83L8XPP9ovUEsBAhQDFAAAAAgA86YBXReYANfrAAAAsgEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAACADzpgFdP63++q8AAAAsAQAACwAAAAAAAAAAAAAAgAEcAQAAX3JlbHMvLnJlbHNQSwECFAMUAAAACADzpgFdA5KI6ukAAABUAQAAEQAAAAAAAAAAAAAAgAH0AQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAADAMAAAAA";

function bytes(): Uint8Array {
  return Uint8Array.from(atob(DOCX_B64), (c) => c.charCodeAt(0));
}

describe("docxToHtml", () => {
  it("converts a real .docx to HTML", async () => {
    const html = await docxToHtml(bytes());
    expect(html).toContain("Quarterly Review");
    expect(html).toContain("converted to HTML by ilolink");
  });

  it("survives a Uint8Array that is a window onto a larger buffer", async () => {
    // The arrayBuffer we hand mammoth is sliced to the view's own range. If a
    // future edit passes bytes.buffer directly, a padded view corrupts the zip
    // and this fails — which is the whole reason the slice is there.
    const src = bytes();
    const padded = new Uint8Array(src.length + 64);
    padded.set(src, 32);
    const view = padded.subarray(32, 32 + src.length);
    expect(view.byteOffset).toBe(32);
    await expect(docxToHtml(view)).resolves.toContain("Quarterly Review");
  });
});
