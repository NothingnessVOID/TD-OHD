// Batch evidence capture for the right-column redesign (issue #34).
// One preview server, one browser, N viewports × N tabs × N skins.
//
//   node shot-batch.mjs <outDir> [--url http://127.0.0.1:5216/]
//                                  [--dist dist-proto --port 5216]
//                                  [--sizes 1440x900,641x800,390x844]
//                                  [--tabs centers,channels,gates,planets,variable,cross]
//                                  [--skins light,dark,contrast]
//                                  [--profile <id>] [--scale 2]
//
// Every shot records rightWidth / foundation count / console errors so a bad
// build fails the evidence run instead of shipping a pretty screenshot.
//
// Sticky and fixed positioning is neutralised before the full-page capture.
// Chromium paints a `position: sticky` header at its stuck offset when the
// capture is taller than the viewport, which lands a nav bar across the middle
// of the image and hides whatever sits under it. The override is injected per
// shot and removed afterwards, so the page keeps its real layout while the
// screenshot is taken.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const outDir = resolve(argv[0] || 'evidence');
const flag = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? fallback : argv[at + 1];
};

const sizes = flag('sizes', '1440x900,641x800,390x844').split(',').map(pair => {
  const [w, h] = pair.split('x').map(Number);
  return { w, h, label: String(w) };
});
const tabs = flag('tabs', 'centers,channels,gates,planets,variable,cross').split(',');
const skins = flag('skins', 'light,dark,contrast').split(',');
const scale = Number(flag('scale', 2));
const distDir = flag('dist', null);
const port = Number(flag('port', 5216));
const profileId = flag('profile', 'synthetic-b');

// Tab ids are locale-independent; the visible label is translated.
const TAB_LABELS = {
  centers: 'Centers', channels: 'Channels', gates: 'Gates',
  planets: 'Planets', variable: 'Variable', cross: 'Cross'
};
const SKIN_IDS = {
  light: 'default-light',
  dark: 'default-dark',
  contrast: 'high-contrast'
};

// Synthetic profiles. Single source for every cut and for the #33 baseline, so
// before/after pairs differ only by code, never by birth data.
const PROFILES = {
  // #33 style-reference profile: 3 defined / 5 undefined / 1 open, 2 channels.
  'synthetic-a': { id: 'style-ref-a', name: 'Style Reference A', birthDate: '1990-06-15', birthTime: '08:30' },
  // Wider coverage: 6 defined / 2 undefined / 1 open, 4 channels, split
  // definition (two islands), emotional authority. Exercises every panel tab.
  'synthetic-b': { id: 'style-ref-b', name: 'Style Reference B', birthDate: '1979-11-04', birthTime: '06:05' },
  // Empty-state coverage: Reflector, lunar authority, no defined centre and no
  // complete channel. Everything the panels draw an empty state for.
  'synthetic-c': { id: 'style-ref-c', name: 'Style Reference C', birthDate: '1988-03-18', birthTime: '15:00' },
  // Fixing coverage: this birth carries 54.4, the one gate.line with no fixing
  // rule, so the planet table shows an `unknown` badge next to `none` ones.
  'synthetic-d': { id: 'style-ref-d', name: 'Style Reference D', birthDate: '1975-03-25', birthTime: '08:30' },
  // Third centre state: this birth has fully open centres (no definition and no
  // activated gate), which synthetic-b never exercises.
  'synthetic-e': { id: 'style-ref-e', name: 'Style Reference E', birthDate: '1993-09-07', birthTime: '11:15' }
};
const profileBase = PROFILES[profileId] || PROFILES['synthetic-b'];
const profile = {
  ...profileBase,
  location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 }
};

// ---------------------------------------------------------------- preview
let preview = null;
async function startPreview() {
  if (!distDir) return flag('url', 'http://127.0.0.1:5216/');
  if (!existsSync(distDir)) throw new Error(`missing build output: ${distDir}`);
  preview = spawn('./node_modules/.bin/vite',
    ['preview', '--outDir', distDir, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  preview.stdout.on('data', () => {});
  preview.stderr.on('data', () => {});
  const url = `http://127.0.0.1:${port}/`;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return url;
    } catch { /* not listening yet */ }
    await new Promise(done => setTimeout(done, 500));
  }
  throw new Error('preview server did not come up');
}
function stopPreview() {
  if (!preview) return;
  preview.kill('SIGTERM');
  preview = null;
}

// ---------------------------------------------------------------- capture
const report = [];
mkdirSync(outDir, { recursive: true });

// One rule, injected right before the screenshot: anything that would paint at a
// viewport-relative offset in a tall capture becomes a normal block. Scoped to
// the capture so the live page is never left in this state.
const FLATTEN_POSITIONING = `
  .header, .chart-column, .reference-back,
  [style*="position: fixed"], [style*="position: sticky"] {
    position: static !important;
    top: auto !important;
    bottom: auto !important;
    max-height: none !important;
    overflow: visible !important;
    backdrop-filter: none !important;
  }
  * { animation: none !important; transition: none !important; }
`;

const flattenForCapture = page => page.addStyleTag({ content: FLATTEN_POSITIONING });

const url = await startPreview();
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  for (const size of sizes) {
    for (const skin of skins) {
      const context = await browser.newContext({
        viewport: { width: size.w, height: size.h },
        deviceScaleFactor: scale
      });
      const page = await context.newPage();
      const errs = [];
      page.on('pageerror', err => errs.push('PAGEERROR ' + err.message));
      page.on('console', msg => { if (msg.type() === 'error') errs.push('CONSOLE ' + msg.text()); });

      await page.addInitScript(({ p, key, skinId }) => {
        localStorage.setItem(key, JSON.stringify([p]));
        localStorage.setItem('ohd-last-person-id', p.id);
        localStorage.setItem('ohd-language', 'zh-CN');
        localStorage.setItem('td-ohd-appearance-v3', JSON.stringify({
          version: 3, skinMode: 'manual', skinId,
          centerPaletteMode: 'skin-default', overridesBySkin: {}, preferences: {}
        }));
        localStorage.removeItem('bodygraph-theme');
      }, { p: profile, key: PROFILE_STORAGE_KEY, skinId: SKIN_IDS[skin] });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
        .catch(err => errs.push('GOTO ' + err.message));
      await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 })
        .catch(err => errs.push('NO_SVG ' + err.message));
      await page.waitForTimeout(2500);

      const appliedSkin = await page.evaluate(() => document.documentElement.dataset.skin);
      if (appliedSkin !== SKIN_IDS[skin]) errs.push(`SKIN ${appliedSkin} != ${SKIN_IDS[skin]}`);

      for (const tab of tabs) {
        const button = page.locator(`.panel-tab[data-panel="${tab}"]`).first();
        if (await button.count()) {
          await button.click().catch(err => errs.push(`TAB ${tab} ` + err.message));
          await page.waitForTimeout(700);
        } else {
          errs.push(`TAB_MISSING ${tab}`);
        }

        const state = await page.evaluate(() => ({
          activeTab: document.querySelector('.panel-tab.active')?.dataset.panel ?? null,
          panelTitle: document.querySelector('#panel-content .panel-title')?.textContent?.trim() ?? null,
          leftWidth: Math.round(document.querySelector('.chart-column')?.getBoundingClientRect().width ?? 0),
          rightWidth: Math.round(document.querySelector('.info-column')?.getBoundingClientRect().width ?? 0),
          // Old foundation cards and the #34 fact rail both count here so the
          // number stays comparable across the redesign.
          foundation: document.querySelectorAll('#foundation-panel .foundation-item, #foundation-panel [data-panel-fact]').length,
          foundationBand: !!document.querySelector('#foundation-panel .panel-foundation'),
          centerRows: document.querySelectorAll('#panel-content [data-center]').length,
          svgBox: (() => {
            const svg = document.querySelector('.bg-svg-wrap svg');
            if (!svg) return null;
            const box = svg.getBoundingClientRect();
            return { w: Math.round(box.width), h: Math.round(box.height) };
          })(),
          skin: document.documentElement.dataset.skin ?? null,
          theme: document.documentElement.dataset.theme ?? null,
          locale: document.documentElement.lang || null
        }));

        const file = `${size.label}x${size.h}-${tab}${skin === 'light' ? '' : '-' + skin}.png`;
        // Inject the flattening rule, capture, then drop it so the next tab and
        // the live page see the real layout again.
        const flattenHandle = await flattenForCapture(page);
        await page.waitForTimeout(120);
        await page.screenshot({ path: join(outDir, file), fullPage: true });
        await flattenHandle.evaluate(node => node.remove());
        await page.waitForTimeout(60);
        report.push({ file, viewport: `${size.w}x${size.h}`, tab, skin: SKIN_IDS[skin], ...state, errs });
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  stopPreview();
}

const summaryPath = join(outDir, 'summary.json');
writeFileSync(summaryPath, JSON.stringify({
  profile: { id: profile.id, birthDate: profile.birthDate, birthTime: profile.birthTime, location: profile.location.name, timezone: 'UTC+0 (Europe/London)' },
  url, generatedAt: new Date().toISOString(), shots: report
}, null, 1));

const failing = report.filter(shot => shot.errs.length);
for (const shot of report) {
  const errs = shot.errs.length ? ` errs=${shot.errs.length}` : '';
  console.log(`${shot.file}  right=${shot.rightWidth}  foundation=${shot.foundation}  centers=${shot.centerRows}${errs}`);
}
console.log(`\n${report.length} shots -> ${outDir}\nsummary: ${summaryPath}`);
if (failing.length) {
  console.error(`\n${failing.length} shot(s) reported errors:`);
  for (const shot of failing) console.error(` ${shot.file}: ${shot.errs.join(' | ')}`);
  process.exit(1);
}
