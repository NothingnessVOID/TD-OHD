// Empty-state screenshots for the states that no birth data can produce.
//
// `variable` and `incarnationCross` always exist on a real chart, so the only way
// to see their empty branches is to render the components with the missing field.
// That injection lives here and in nothing else: the page is the real app on the
// Vite dev server, the component is the real component, the stylesheet is the real
// stylesheet, and the only thing that is synthetic is the data passed in.
//
//   node tests/panel-graphics-empty-shots.mjs <outDir> [devUrl]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const outDir = resolve(process.argv[2] || 'empty-shots');
const url = process.argv[3] || 'http://127.0.0.1:5217/';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, {
  key: PROFILE_STORAGE_KEY,
  stored: { id: 'empty', name: 'E', birthDate: '1979-11-04', birthTime: '06:05',
    location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 } }
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.bg-svg-wrap svg', { timeout: 120000 });
mkdirSync(outDir, { recursive: true });

const shoot = async (name, build) => {
  const result = await page.evaluate(build);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  return result;
};

// 1. variable missing -> four dashed empty corners
const variableState = await shoot('1440-empty-variable', async () => {
  const { variableQuad } = await import('/src/lib/panel-graphics/variable-quad.js');
  const host = document.getElementById('panel-content');
  host.innerHTML = `
    <div class="panel-title">Variable</div>
    <p class="panel-intro">Injected for the screenshot: variable is null.</p>
    ${variableQuad({
      variable: null,
      slotName: () => '',
      caption: key => ({ determination: 'Determination', motivation: 'Motivation', environment: 'Environment', perspective: 'Perspective' })[key],
      shortLabel: key => ({ determination: '摄取', motivation: '动机', environment: '环境', perspective: '视角' })[key],
      directionLabel: () => ''
    })}`;
  return {
    corners: host.querySelectorAll('.pg-var-corner').length,
    emptyCorners: host.querySelectorAll('.pg-var-corner--empty').length,
    arrows: host.querySelectorAll('.pg-var-arrow').length,
    names: [...host.querySelectorAll('.pg-var-name')].map(node => node.textContent)
  };
});

// 2. incarnationCross missing -> four empty palaces
const crossState = await shoot('1440-empty-cross', async () => {
  const { crossQuad } = await import('/src/lib/panel-graphics/cross-quad.js');
  const host = document.getElementById('panel-content');
  host.innerHTML = `
    <div class="panel-title">Incarnation Cross</div>
    <p class="panel-intro">Injected for the screenshot: incarnationCross is null.</p>
    ${crossQuad({ gates: [], angle: '', nameFor: () => '', labelFor: label => label, gateLabel: gate => String(gate), angleLabel: '' })}`;
  return {
    palaces: host.querySelectorAll('.pg-cross-palace').length,
    emptyPalaces: host.querySelectorAll('.pg-cross-palace--empty').length,
    angleBadge: host.querySelector('.pg-cross-angle')?.textContent?.trim() ?? null
  };
});

await context.close();
await browser.close();
writeFileSync(join(outDir, 'empty-states.json'), JSON.stringify({ variableState, crossState }, null, 1));
console.log(JSON.stringify({ variableState, crossState }, null, 1));
