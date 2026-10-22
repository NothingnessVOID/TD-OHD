// Sweep the panel mark mix for the Skins whose hue drifted past the tolerance.
//
// Raising the centre-colour share pulls the hue back toward the palette and pushes
// contrast down; lowering it does the opposite. This measures both ends of that
// trade on the same page, so the value written into CSS is chosen from numbers
// rather than guessed.
//
//   node tests/panel-graphics-mark-mix-sweep.mjs [url]
import { chromium } from 'playwright-core';
import { contrastRatio } from '../src/lib/source-contrast.js';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const url = process.argv.slice(2).find(arg => !arg.startsWith('--')) || 'http://127.0.0.1:5216/';
const SKINS = ['coral', 'grass-aroma', 'contemplation', 'default-light'];
const MIXES = [56, 62, 68, 72, 76, 80, 84, 88, 92, 96];
const CENTRES = ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'];

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
const hueOf = rgb => {
  const [, a, b] = rgbToOklab(rgb);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
};
const hueDelta = (a, b) => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};
const mixRgb = (a, b, amount) => a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
for (const skin of SKINS) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(({ stored, key, skinId }) => {
    localStorage.setItem(key, JSON.stringify([stored]));
    localStorage.setItem('ohd-last-person-id', stored.id);
    localStorage.setItem('ohd-language', 'zh-CN');
    localStorage.setItem('td-ohd-appearance-v3', JSON.stringify({
      version: 3, skinMode: 'manual', skinId, centerPaletteMode: 'skin-default', overridesBySkin: {}, preferences: {}
    }));
  }, {
    key: PROFILE_STORAGE_KEY, skinId: skin,
    stored: { id: 'mix', name: 'M', birthDate: '1979-11-04', birthTime: '06:05',
      location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 } }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.bg-svg-wrap svg', { timeout: 120000 });
  const base = await page.evaluate(centres => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.appendChild(probe);
    const read = token => {
      probe.style.color = '';
      probe.style.color = `var(${token})`;
      const css = getComputedStyle(probe).color;
      const sample = background => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = background; ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const black = sample('#000'), white = sample('#fff');
      const alpha = 1 - white.map((v, i) => v - black[i]).reduce((s, v) => s + v, 0) / (3 * 255);
      if (alpha <= 0.002) return null;
      return black.map(v => Math.min(255, Math.round(v / alpha)));
    };
    const ink = read('--text');
    const panel = read('--bg-elevated');
    const palette = Object.fromEntries(centres.map(key => [key, read(`--hd-center-${key}`)]));
    probe.remove();
    return { ink, panel, palette };
  }, CENTRES);

  for (const mix of MIXES) {
    const ratio = mix / 100;
    let worstDrift = 0, worstCentre = '', worstContrast = 99;
    for (const key of CENTRES) {
      const centre = base.palette[key];
      const mark = mixRgb(centre, base.ink, ratio);
      const drift = hueDelta(hueOf(centre), hueOf(mark));
      if (drift > worstDrift) { worstDrift = drift; worstCentre = key; }
      const contrast = contrastRatio(mark, base.panel);
      if (contrast < worstContrast) worstContrast = contrast;
    }
    out.push({
      skin, mix, worstDrift: Math.round(worstDrift * 10) / 10, worstCentre,
      worstContrast: Math.round(worstContrast * 100) / 100,
      driftPass: worstDrift <= 12, contrastPass: worstContrast >= 3
    });
  }
  await context.close();
}
await browser.close();

console.log('skin              mix   worst drift      worst contrast   verdict');
for (const row of out) {
  const verdict = row.driftPass && row.contrastPass ? 'ok'
    : row.driftPass ? 'contrast<3' : row.contrastPass ? 'drift>12' : 'both';
  console.log(`${row.skin.padEnd(17)} ${String(row.mix).padStart(3)}%  ${String(row.worstDrift).padStart(5)}° (${row.worstCentre.padEnd(7)})  ${String(row.worstContrast).padStart(5)}:1   ${verdict}`);
}
console.log('\nsmallest mix per skin that satisfies both:');
for (const skin of SKINS) {
  const ok = out.filter(row => row.skin === skin && row.driftPass && row.contrastPass)
    .sort((a, b) => a.mix - b.mix)[0];
  console.log(`  ${skin.padEnd(17)} ${ok ? ok.mix + '%' : 'none — constraints collide'}`);
}
