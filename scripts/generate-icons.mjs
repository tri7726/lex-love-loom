import fs from 'fs';
import path from 'path';

const svgContent = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size*0.2)}" fill="#fdf8f5"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.35}" fill="#e8547a" opacity="0.15"/>
  <g transform="translate(${size/2},${size/2})">
    <ellipse rx="${size*0.18}" ry="${size*0.09}" fill="#e8547a" transform="rotate(0) translate(${size*0.12},0)"/>
    <ellipse rx="${size*0.18}" ry="${size*0.09}" fill="#e8547a" transform="rotate(72) translate(${size*0.12},0)"/>
    <ellipse rx="${size*0.18}" ry="${size*0.09}" fill="#e8547a" transform="rotate(144) translate(${size*0.12},0)"/>
    <ellipse rx="${size*0.18}" ry="${size*0.09}" fill="#e8547a" transform="rotate(216) translate(${size*0.12},0)"/>
    <ellipse rx="${size*0.18}" ry="${size*0.09}" fill="#e8547a" transform="rotate(288) translate(${size*0.12},0)"/>
    <circle r="${size*0.06}" fill="#c0392b"/>
  </g>
  <text x="${size/2}" y="${size*0.82}" font-family="serif" font-size="${Math.round(size*0.14)}" fill="#e8547a" text-anchor="middle" font-weight="bold">JP</text>
</svg>`;

// Write SVG files
fs.writeFileSync(path.join('public','icons','icon-192x192.svg'), svgContent(192));
fs.writeFileSync(path.join('public','icons','icon-512x512.svg'), svgContent(512));
console.log('SVG icons written');

// Check if sharp is available for PNG conversion
try {
  const { default: sharp } = await import('sharp');
  await sharp(Buffer.from(svgContent(192))).resize(192,192).png().toFile('public/icons/icon-192x192.png');
  await sharp(Buffer.from(svgContent(512))).resize(512,512).png().toFile('public/icons/icon-512x512.png');
  console.log('PNG icons created via sharp');
} catch(e) {
  console.log('sharp not available, will use canvas fallback:', e.message);
  // Fallback: create minimal valid PNG using raw bytes
  // A 1x1 pink pixel PNG, scaled by browser
  const { createCanvas } = await import('canvas').catch(() => ({ createCanvas: null }));
  if (createCanvas) {
    for (const size of [192, 512]) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      // Background
      ctx.fillStyle = '#fdf8f5';
      ctx.roundRect(0, 0, size, size, size*0.2);
      ctx.fill();
      // Sakura petals
      ctx.fillStyle = '#e8547a';
      const cx = size/2, cy = size/2;
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i * 72 * Math.PI) / 180);
        ctx.translate(size*0.12, 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, size*0.18, size*0.09, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(cx, cy, size*0.06, 0, Math.PI*2);
      ctx.fill();
      // Text
      ctx.fillStyle = '#e8547a';
      ctx.font = `bold ${Math.round(size*0.14)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('JP', cx, size*0.82);
      fs.writeFileSync(`public/icons/icon-${size}x${size}.png`, canvas.toBuffer('image/png'));
      console.log(`PNG ${size}x${size} created via canvas`);
    }
  }
}
