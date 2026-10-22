// Offline mix sweep: reads the Skin and Center Palette CSS files directly and
// computes hue drift + contrast for every candidate mix, without a browser.
//
// The browser-based sweep kept dying with the preview server under repeated
// Chromium launches. The values it needs are static CSS declarations, so parsing
// them is both faster and more reliable - and it makes the arithmetic auditable.
//
//   node tests/panel-graphics-mark-mix-offline.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { contrastRatio } from '../src/lib/source-contrast.js';

const root = new URL('../src/styles/', import.meta.url);
const CENTRES = ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'];
const MIXES = [100, 96, 92, 88, 84, 80, 76, 72, 68, 62, 56, 50, 44];

const srgbToLinear = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
function rgbToOklab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(value => srgbToLinear(value / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const hueOf = rgb => { const [, a, b] = rgbToOklab(rgb); const h = (Math.atan2(b, a) * 180) / Math.PI; return h < 0 ? h + 360 : h; };
const hueDelta = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const mix = (a, b, amount) => a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)));

const hexToRgb = hex => {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
};
/** Read every `--name: value` pair in a CSS file, keyed by the selector block. */
function tokenBlocks(css) {
  const blocks = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(css))) {
    const tokens = {};
    for (const line of match[2].split(';')) {
      const token = /^\s*(--[\w-]+)\s*:\s*([^;]+)$/.exec(line);
      if (token) tokens[token[1]] = token[2].trim();
    }
    if (Object.keys(tokens).length) blocks.push({ selector: match[1].trim(), tokens });
  }
  return blocks;
}

// Skins: one file each, with the selector that activates it.
const skins = [];
for (const file of readdirSync(new URL('skins/', root)).filter(name => name.endsWith('.css'))) {
  const css = readFileSync(new URL(`skins/${file}`, root), 'utf8');
  for (const block of tokenBlocks(css)) {
    const id = /\[data-skin="([^"]+)"\]/.exec(block.selector)?.[1];
    if (!id || !block.tokens['--text'] || !block.tokens['--bg-elevated']) continue;
    if (block.tokens['--text'].startsWith('color-mix')) continue;
    if (!block.tokens['--text'].startsWith('#')) continue;
    skins.push({ id, text: hexToRgb(block.tokens['--text']), panel: hexToRgb(block.tokens['--bg-elevated']) });
  }
}

// Palettes: the skin's default palette comes from skin-registry.
const { SKINS } = await import('../src/lib/skin-registry.js');
const paletteCache = new Map();
const paletteFor = id => {
  if (paletteCache.has(id)) return paletteCache.get(id);
  const css = readFileSync(new URL(`center-palettes/${id}.css`, root), 'utf8');
  const tokens = Object.assign({}, ...tokenBlocks(css).map(block => block.tokens));
  const values = Object.fromEntries(CENTRES.map(key => [key, hexToRgb(tokens[`--hd-center-${key}`])]));
  paletteCache.set(id, values);
  return values;
};

console.log('skin                 mix   worst drift (centre)    worst contrast   verdict');
const best = [];
const rows = [];
for (const skin of skins) {
  const registry = SKINS.find(item => item.id === skin.id);
  const palette = paletteFor(registry?.defaultCenterPalette || 'classic');
  for (const mixPct of MIXES) {
    let drift = 0, driftCentre = '', worstContrast = 99, contrastCentre = '';
    for (const key of CENTRES) {
      const mark = mix(palette[key], skin.text, mixPct / 100);
      const d = hueDelta(hueOf(palette[key]), hueOf(mark));
      if (d > drift) { drift = d; driftCentre = key; }
      const c = contrastRatio(mark, skin.panel);
      if (c < worstContrast) { worstContrast = c; contrastCentre = key; }
    }
    const driftPass = drift <= 12, contrastPass = worstContrast >= 3;
    const verdict = driftPass && contrastPass ? 'ok' : driftPass ? 'contrast<3' : contrastPass ? 'drift>12' : 'both';
    if (driftPass && contrastPass) best.push({ skin: skin.id, mix: mixPct });
    rows.push({ skin: skin.id, mix: mixPct, worstContrast, worstCentre: contrastCentre, drift });
    console.log(`${skin.id.padEnd(19)} ${String(mixPct).padStart(3)}%  ${drift.toFixed(1).padStart(5)}° (${driftCentre.padEnd(7)})  ${worstContrast.toFixed(2).padStart(5)}:1 (${contrastCentre.padEnd(7)}) ${verdict}`);
  }
}
// The share is how much of the CENTRE colour survives; 100% means "no mixing at
// all", which is what a Skin wants whenever its own palette already clears 3:1.
// The chosen value is the LARGEST passing share: least ink, least hue drift.
console.log('\nchosen centre-colour share (largest that still clears 3:1):');
for (const skin of skins) {
  const passing = best.filter(item => item.skin === skin.id).sort((a, b) => b.mix - a.mix);
  const chosen = passing[0];
  const at100 = rows.find(row => row.skin === skin.id && row.mix === 100);
  console.log(`  ${skin.id.padEnd(19)} ${chosen ? String(chosen.mix).padStart(3) + '%' : 'none — constraints collide'}   (unmixed: ${at100.worstContrast}:1 at ${at100.worstCentre})`);
}
