// Pack PNGs into a single .ico.
//
// No image tool on the dev machine does this (no ImageMagick, no icotool, no
// sharp) and the container is trivial: a 6-byte ICONDIR, one 16-byte
// ICONDIRENTRY per image, then the payloads concatenated. Storing PNG
// payloads verbatim — rather than the legacy BMP + AND-mask form — is the
// PNG-in-ICO variant every browser since IE11 reads, and it keeps the alpha
// channel exact instead of quantising it to a 1-bit mask.
//
// Usage: node docs/brand/make-ico.mjs out.ico 16.png 32.png 48.png
import { readFileSync, writeFileSync } from "node:fs";

const [outPath, ...inPaths] = process.argv.slice(2);
if (!outPath || inPaths.length === 0) {
  console.error("usage: make-ico.mjs <out.ico> <in1.png> [in2.png ...]");
  process.exit(1);
}

const images = inPaths.map((p) => {
  const data = readFileSync(p);
  // Dimensions live at bytes 16..23 of the IHDR. Read them rather than
  // trusting the filename, so a mis-sized input fails here and not silently
  // in a browser tab six months from now.
  if (data.readUInt32BE(0) !== 0x89504e47) throw new Error(`${p}: not a PNG`);
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width > 256 || height > 256)
    throw new Error(`${p}: ${width}x${height} exceeds the 256px ICO ceiling`);
  return { data, width, height };
});

// Smallest first: some old consumers take the first entry rather than
// choosing by size, and a 16px tab is the worst place to guess wrong.
images.sort((a, b) => a.width - b.width);

const HEADER = 6;
const ENTRY = 16;

const header = Buffer.alloc(HEADER);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = icon
header.writeUInt16LE(images.length, 4);

const dir = Buffer.alloc(ENTRY * images.length);
let offset = HEADER + ENTRY * images.length;

images.forEach((img, i) => {
  const at = i * ENTRY;
  // 256 is encoded as 0 — the field is one byte, so 256 does not fit in it.
  dir.writeUInt8(img.width === 256 ? 0 : img.width, at);
  dir.writeUInt8(img.height === 256 ? 0 : img.height, at + 1);
  dir.writeUInt8(0, at + 2); // palette entries: 0 = truecolor
  dir.writeUInt8(0, at + 3); // reserved
  dir.writeUInt16LE(1, at + 4); // color planes
  dir.writeUInt16LE(32, at + 6); // bits per pixel
  dir.writeUInt32LE(img.data.length, at + 8);
  dir.writeUInt32LE(offset, at + 12);
  offset += img.data.length;
});

writeFileSync(outPath, Buffer.concat([header, dir, ...images.map((i) => i.data)]));
console.log(
  `${outPath}: ${images.length} frames (${images.map((i) => `${i.width}x${i.height}`).join(", ")}), ${offset} bytes`,
);
