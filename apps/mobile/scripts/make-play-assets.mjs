// Generates Google Play graphic assets: 512x512 store icon + 1024x500 feature graphic.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); // apps/mobile
const SYMBOL = join(ROOT, 'assets/icon-android-foreground.png');
const FRAUNCES = join(ROOT, 'node_modules/@expo-google-fonts/fraunces/Fraunces_500Medium_Italic.ttf');
const OUT = join(ROOT, '../../docs/launch/play-assets');
try { mkdirSync(OUT, { recursive: true }); } catch { /* exists */ }

const symbolB64 = readFileSync(SYMBOL).toString('base64');

// ── Feature graphic 1024x500 ────────────────────────────────────────────────
const W = 1024, H = 500;
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="32%" cy="46%" r="60%">
      <stop offset="0%" stop-color="#8B6FE8" stop-opacity="0.38"/>
      <stop offset="55%" stop-color="#8B6FE8" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#0F0A1F" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0F0A1F"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <!-- subtle stars -->
  <g fill="#F5EFE4">
    <circle cx="120" cy="90" r="2" opacity="0.5"/>
    <circle cx="860" cy="110" r="2.5" opacity="0.6"/>
    <circle cx="930" cy="300" r="2" opacity="0.45"/>
    <circle cx="610" cy="70" r="1.6" opacity="0.4"/>
    <circle cx="760" cy="420" r="2" opacity="0.4"/>
    <circle cx="200" cy="410" r="1.8" opacity="0.4"/>
  </g>
  <!-- symbol -->
  <image href="data:image/png;base64,${symbolB64}" x="86" y="150" width="200" height="200"/>
  <!-- wordmark -->
  <text x="330" y="262" font-family="Fraunces Medium" font-style="italic" font-size="112" fill="#F5EFE4">Inceptio</text>
  <!-- tagline -->
  <text x="334" y="328" font-family="Fraunces Medium" font-style="italic" font-size="42" fill="#E5C77D">Know when to begin.</text>
</svg>`;

const resvg = new Resvg(svg, {
  background: '#0F0A1F',
  font: { fontFiles: [FRAUNCES], defaultFontFamily: 'Fraunces Medium', loadSystemFonts: true },
  fitTo: { mode: 'width', value: W },
});
writeFileSync(join(OUT, 'play-feature-1024x500.png'), resvg.render().asPng());
console.log('✓ play-feature-1024x500.png');
