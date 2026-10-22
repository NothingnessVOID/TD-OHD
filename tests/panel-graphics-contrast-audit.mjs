// Contrast audit for the right column's small graphics (issue #34, cut 3).
//
// Measures the tokens the marks actually paint with, in every registered Skin,
// and applies the thresholds from FINAL-spec-v1 §14.4:
//   graphic elements (fills, strokes, capsules, badges) ≥ 3:1 against the panel
//   text (the 11px group badge) ≥ 4.5:1
//
//   node tests/panel-graphics-contrast-audit.mjs [url]
//
// Colour resolution uses the browser: each token is applied as a `color` on a
// probe element and read back, so color-mix() and any other CSS syntax resolve
// exactly as they do in the page.
import { chromium } from 'playwright-core';
import { SKINS } from '../src/lib/skin-registry.js';
import { contrastRatio } from '../src/lib/source-contrast.js';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const url = process.argv[2] || 'http://127.0.0.1:5216/';
const profile = {
  id: 'style-ref-b', name: 'Style Reference B',
  birthDate: '1979-11-04', birthTime: '06:05',
  location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 }
};

// name → token, threshold (3 = graphic, 4.5 = text), and against which surface.
const PROBES = [
  { key: 'gate design fill', token: '--hd-design', against: '--bg-elevated', min: 3 },
  { key: 'gate personality fill', token: '--hd-personality', against: '--bg-elevated', min: 3 },
  { key: 'gate both edge', token: '--hd-both', against: '--bg-elevated', min: 3 },
  { key: 'gate inactive fill', token: '--bg-sunken', against: '--bg-elevated', min: 1 },
  { key: 'tube capsule soft', token: '--hd-circuit-individual-soft', against: '--bg-elevated', min: 1 },
  { key: 'tube cap', token: '--hd-circuit-individual', against: '--bg-elevated', min: 3 },
  { key: 'micro-bar active', token: '--accent-strong', against: '--bg-elevated', min: 3 },
  { key: 'fixing exalted', token: '--accent-strong', against: '--bg-elevated', min: 3 },
  { key: 'fixing detriment', token: '--text-tertiary', against: '--bg-elevated', min: 3 },
  { key: 'fixing juxtaposed', token: '--text-secondary', against: '--bg-elevated', min: 3 },
  { key: 'fixing none stroke', token: '--control-border', against: '--bg-elevated', min: 3 },
  { key: 'group badge text', token: '--text-tertiary', against: '--bg-elevated', min: 4.5 },

];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];

for (const skin of SKINS) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(({ stored, key, skinId }) => {
    localStorage.setItem(key, JSON.stringify([stored]));
    localStorage.setItem('ohd-last-person-id', stored.id);
    localStorage.setItem('ohd-language', 'zh-CN');
    localStorage.setItem('td-ohd-appearance-v3', JSON.stringify({
      version: 3, skinMode: 'manual', skinId, centerPaletteMode: 'skin-default', overridesBySkin: {}, preferences: {}
    }));
  }, { stored: profile, key: PROFILE_STORAGE_KEY, skinId: skin.id });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
  await page.waitForTimeout(600);

  const measured = await page.evaluate(tokens => {
    const probe = document.createElement('span');
    probe.hidden = true;
    document.body.appendChild(probe);
    const resolve = token => {
      probe.style.color = '';
      probe.style.color = `var(${token})`;
      const computed = getComputedStyle(probe).color;
      const match = computed.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(/[,/ ]+/).filter(Boolean).map(Number);
      return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
    };
    const values = Object.fromEntries(tokens.map(token => [token, resolve(token)]));
    // Sanity: the panel surface these marks sit on.
    const panel = document.querySelector('#panel-content');
    const panelBg = panel ? getComputedStyle(panel).backgroundColor : '';
    const panelMatch = panelBg.match(/rgba?\(([^)]+)\)/);
    const surface = panelMatch ? panelMatch[1].split(/[,/ ]+/).filter(Boolean).map(Number).slice(0, 3) : null;
    probe.remove();
    return { values, surface, skin: document.documentElement.dataset.skin, theme: document.documentElement.dataset.theme };
  }, [...new Set(PROBES.flatMap(probe => [probe.token, probe.against]))]);

  for (const probe of PROBES) {
    const foreground = measured.values[probe.token];
    const background = measured.values[probe.against];
    if (!foreground || !background) continue;
    const ratio = contrastRatio(foreground.rgb, background.rgb);
    rows.push({
      skin: skin.id, mode: measured.theme, mark: probe.key,
      ratio: Math.round(ratio * 100) / 100, min: probe.min, pass: ratio >= probe.min
    });
  }
  await context.close();
}

await browser.close();

// Report: one line per failure, then a compact skin summary.
const failures = rows.filter(row => !row.pass);
const bySkin = new Map();
for (const row of rows) {
  if (!bySkin.has(row.skin)) bySkin.set(row.skin, { pass: 0, fail: 0, worst: null });
  const entry = bySkin.get(row.skin);
  if (row.pass) entry.pass += 1; else entry.fail += 1;
  if (!entry.worst || row.ratio < entry.worst.ratio) entry.worst = row;
}
console.log(`skins audited: ${bySkin.size}`);
for (const [skin, entry] of bySkin) {
  const worst = entry.worst;
  console.log(`${skin.padEnd(20)} pass ${String(entry.pass).padStart(2)}  fail ${entry.fail}  worst ${worst.ratio}:1 (${worst.mark})`);
}
console.log(`\n${rows.length} measurements, ${failures.length} below threshold`);
for (const failure of failures) {
  console.log(`  FAIL ${failure.skin} (${failure.mode}) ${failure.mark}: ${failure.ratio}:1 < ${failure.min}:1`);
}
process.exit(failures.length ? 1 : 0);
