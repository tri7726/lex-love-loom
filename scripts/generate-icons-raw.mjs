/**
 * Generate minimal valid PNG icons using raw PNG encoding (no external deps)
 * Uses zlib (built-in Node.js) for deflate compression
 */
import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, pixelFn) {
  // pixelFn(x, y) => [r, g, b, a]
  const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    const table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
      }
      return t;
    })();
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBytes, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([len, typeBytes, data, crcVal]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB (no alpha for simplicity, use 6 for RGBA)
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Image data: filter byte (0) + RGBA pixels per row
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      row[1 + x * 4] = r;
      row[1 + x * 4 + 1] = g;
      row[1 + x * 4 + 2] = b;
      row[1 + x * 4 + 3] = a;
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 6 });

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.2; // corner radius for background

  return (x, y) => {
    // Background: rounded rect #fdf8f5
    const dx = Math.max(0, Math.abs(x - cx) - (cx - radius));
    const dy = Math.max(0, Math.abs(y - cy) - (cy - radius));
    const inRoundedRect = Math.sqrt(dx*dx + dy*dy) <= radius;

    if (!inRoundedRect) return [0, 0, 0, 0]; // transparent outside

    // Default background color #fdf8f5
    let r = 253, g = 248, b = 245, a = 255;

    // Soft pink circle background
    const distCenter = Math.sqrt((x-cx)**2 + (y-cy)**2);
    if (distCenter < size * 0.35) {
      // blend pink tint
      r = Math.round(r * 0.9 + 232 * 0.1);
      g = Math.round(g * 0.9 + 84 * 0.1);
      b = Math.round(b * 0.9 + 122 * 0.1);
    }

    // Draw 5 sakura petals
    const petalColor = [232, 84, 122];
    const petalRx = size * 0.18;
    const petalRy = size * 0.09;
    const petalDist = size * 0.12;

    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 * Math.PI) / 180;
      // Petal center
      const pcx = cx + Math.cos(angle) * petalDist;
      const pcy = cy + Math.sin(angle) * petalDist;
      // Rotate point back to petal local space
      const lx = (x - pcx) * Math.cos(-angle) - (y - pcy) * Math.sin(-angle);
      const ly = (x - pcx) * Math.sin(-angle) + (y - pcy) * Math.cos(-angle);
      if ((lx/petalRx)**2 + (ly/petalRy)**2 <= 1) {
        r = petalColor[0]; g = petalColor[1]; b = petalColor[2];
      }
    }

    // Center circle #c0392b
    if (distCenter < size * 0.06) {
      r = 192; g = 57; b = 43;
    }

    return [r, g, b, a];
  };
}

for (const size of [192, 512]) {
  const png = createPNG(size, size, drawIcon(size));
  fs.writeFileSync(`public/icons/icon-${size}x${size}.png`, png);
  console.log(`Created public/icons/icon-${size}x${size}.png (${png.length} bytes)`);
}
