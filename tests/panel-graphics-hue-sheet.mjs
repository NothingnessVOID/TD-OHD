// Contact sheet: the nine centre colours beside the nine panel marks, per Skin.
// Pairs sit side by side so "how far did it move" reads at a glance.
//
//   node tests/panel-graphics-hue-sheet.mjs <outDir> [url]
//
// The sheet is generated from the browser's own resolved token values, so what it
// shows is what the panel paints, not a hand-copied palette.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SKINS } from '../src/lib/skin-registry.js';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const outDir = resolve(process.argv[2] || 'hue-sheet');
const url = process.argv[3] || 'http://127.0.0.1:5216/';
const CENTRES = ['head', 'ajna', 'throat', 'g', 'heart', 'spleen', 'solar', 'sacral', 'root'];
const LABELS = { head: 'head', ajna: 'ajna', throat: 'throat', g: 'G', heart: 'heart', spleen: 'spleen', solar: 'solar', sacral: 'sacral', root: 'root' };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const collected = [];
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
    key: PROFILE_STORAGE_KEY, skinId: skin.id,
    stored: { id: 'sheet', name: 'S', birthDate: '1979-11-04', birthTime: '06:05',
      location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 } }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.bg-svg-wrap svg', { timeout: 120000 });
  const values = await page.evaluate(centres => {
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.appendChild(probe);
    const read = token => {
      probe.style.color = '';
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const out = {};
    for (const key of centres) out[key] = { centre: read(`--hd-center-${key}`), mark: read(`--pd-center-mark-${key}`) };
    const paper = getComputedStyle(document.querySelector('#panel-content')).backgroundColor;
    probe.remove();
    return { out, theme: document.documentElement.dataset.theme, paper };
  }, CENTRES);
  collected.push({ skin: skin.id, ...values });
  await context.close();
}
await browser.close();

// One page, one row per Skin: [original][mark] pairs, labelled underneath.
const rows = collected.map(entry => `
  <section class="row" data-theme="${entry.theme}">
    <div class="meta"><strong>${entry.skin}</strong><span>${entry.theme}</span></div>
    <div class="pairs">
      ${CENTRES.map(key => `
        <figure class="pair">
          <div class="swatches" style="background:${entry.paper}">
            <span style="background:${entry.out[key].centre}"></span>
            <span style="background:${entry.out[key].mark}"></span>
          </div>
          <figcaption>${LABELS[key]}</figcaption>
        </figure>`).join('')}
    </div>
  </section>`).join('');

const html = `<!doctype html><meta charset="utf-8">
<style>
  body { margin: 0; padding: 20px 24px; background: #FEFDFB; color: #1E1B18;
         font: 13px/1.4 system-ui, -apple-system, sans-serif; }
  h1 { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
  p.lead { margin: 0 0 18px; color: #6E6862; font-size: 12px; }
  .row { display: flex; align-items: center; gap: 18px; padding: 8px 0; border-top: 1px solid #EAE6E0; }
  .meta { width: 190px; flex: none; display: flex; flex-direction: column; }
  .meta strong { font-weight: 600; }
  .meta span { color: #6E6862; font-size: 11px; }
  .pairs { display: flex; gap: 14px; }
  .pair { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .swatches { display: flex; gap: 2px; padding: 3px; border-radius: 4px; border: 1px solid #DDD7CF; }
  .swatches span { display: block; width: 22px; height: 22px; border-radius: 2px; }
  figcaption { font-size: 10px; color: #6E6862; }
  .legend { display: flex; gap: 16px; margin: 0 0 12px; font-size: 11px; color: #6E6862; }
  .legend i { display: inline-block; width: 10px; height: 10px; border: 1px solid #DDD7CF; border-radius: 2px; vertical-align: -1px; margin-right: 4px; }
</style>
<h1>Centre colour vs panel mark</h1>
<p class="lead">Left swatch = the Centre Palette colour the bodygraph paints. Right swatch = the panel mark token derived from it. Both on the panel background.</p>
<div class="legend"><span><i></i>palette</span><span><i></i>panel mark</span></div>
<p class="lead" style="margin-top:-6px">On light Skins the mark is darker than the palette; on the two dark Skins (midnight-contrast, and default-dark if present) the ink is lighter than the palette, so the mark is <em>lighter</em>. The direction is always "toward the Skin's ink".</p>
${rows}`;

mkdirSync(outDir, { recursive: true });
const htmlPath = join(outDir, 'hue-sheet.html');
writeFileSync(htmlPath, html);

const shot = await chromium.launch({ channel: 'chrome', headless: true });
const page = await shot.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + htmlPath, { waitUntil: 'load' });
await page.waitForTimeout(250);
const target = join(outDir, 'hue-sheet.png');
await page.screenshot({ path: target, fullPage: true });
await shot.close();
writeFileSync(join(outDir, 'hue-sheet.json'), JSON.stringify(collected, null, 1));
console.log(`sheet: ${target}`);
console.log(`data:  ${join(outDir, 'hue-sheet.json')}`);
