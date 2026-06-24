import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); // apps/mobile
const SYMBOL_SRC = join(ROOT, 'assets/icon-android-foreground.png'); // read-only input
const FONT_PATH = join(ROOT, 'node_modules/@expo-google-fonts/fraunces/Fraunces_500Medium_Italic.ttf');
const OUT = join(ROOT, 'assets/splash-icon.png');

// ── Tunable layout constants (px) ───────────────────────────────────────────
const CANVAS = 1242;                  // square output
const SYMBOL_W = 460;                 // on-canvas symbol width
const GAP = 64;                       // symbol → wordmark gap
const WORDMARK = 'Inceptio';
const FONT_FAMILY = 'Fraunces Medium'; // .ttf internal family name (name-table id 1)
const FONT_PX = 150;
const TEXT_FILL = '#F5EFE4';
const ALPHA_THRESHOLD = 8;

// 1. Read symbol + compute tight alpha bbox (mandatory auto-trim/re-center)
const png = PNG.sync.read(readFileSync(SYMBOL_SRC));
let minX = png.width, minY = png.height, maxX = -1, maxY = -1;
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const a = png.data[(png.width * y + x) * 4 + 3];
    if (a > ALPHA_THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const bw = maxX - minX + 1;
const bh = maxY - minY + 1;

// 2. Crop to bbox
const cropped = new PNG({ width: bw, height: bh });
for (let y = 0; y < bh; y++) {
  for (let x = 0; x < bw; x++) {
    const si = (png.width * (minY + y) + (minX + x)) * 4;
    const di = (bw * y + x) * 4;
    cropped.data[di] = png.data[si];
    cropped.data[di + 1] = png.data[si + 1];
    cropped.data[di + 2] = png.data[si + 2];
    cropped.data[di + 3] = png.data[si + 3];
  }
}
const symbolB64 = PNG.sync.write(cropped).toString('base64');

// 3. Geometry — symbol above wordmark, whole block vertically centered
const symbolH = Math.round((SYMBOL_W * bh) / bw);
const blockH = symbolH + GAP + FONT_PX;
const blockTop = Math.round((CANVAS - blockH) / 2);
const symbolX = Math.round((CANVAS - SYMBOL_W) / 2);
const symbolY = blockTop;
const textBaselineY = blockTop + symbolH + GAP + Math.round(FONT_PX * 0.72);

// 4. Build SVG (transparent background)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
  <image x="${symbolX}" y="${symbolY}" width="${SYMBOL_W}" height="${symbolH}" href="data:image/png;base64,${symbolB64}"/>
  <text x="${CANVAS / 2}" y="${textBaselineY}" text-anchor="middle" font-family="${FONT_FAMILY}" font-style="italic" font-size="${FONT_PX}" fill="${TEXT_FILL}">${WORDMARK}</text>
</svg>`;

// 5. Rasterize with the bundled Fraunces font (no background = transparent)
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: CANVAS },
  font: { fontFiles: [FONT_PATH], loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
});
writeFileSync(OUT, resvg.render().asPng());
console.log(`wrote ${OUT} — ${CANVAS}x${CANVAS}; symbol bbox ${bw}x${bh} @ (${minX},${minY})`);
