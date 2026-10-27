/**
 * Sleep chart (DreamRave) end-to-end check — drives headless Chromium against a
 * running dev server at a real viewport, which is the only way to see whether
 * the shared graph shell actually sizes the reduced graph.
 *
 *   npx vite --host 127.0.0.1 --port 9962      # in one terminal
 *   E2E_URL=http://127.0.0.1:9962 node tests/dream-e2e.mjs
 *
 * Screenshots land in test-results/dream/ for visual review.
 */

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Pure data module: no DOM, so it imports cleanly here and keeps the stub paths
// in the assertion single-sourced with the renderer.
import { DREAM_PORTAL_STUBS, DREAM_VIEW_BOX } from '../src/lib/human-design/dream-topology.js';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:9962';
const CHROME = process.env.CHROME_PATH;
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'dream');
mkdirSync(SHOTS, { recursive: true });

const BIRTH = '?d=1990-05-20&t=06:30&tz=0&name=E2E%20Dream';
const EXPECTED_CENTERS = ['throat', 'g', 'spleen', 'sacral', 'root'];
const EXPECTED_GATES = [1, 5, 8, 12, 15, 19, 20, 27, 28, 38, 42, 50, 53, 57, 62].map(String);
/** src/bodygraph.js BODYGRAPH_PAD: the renderer pads the viewBox on every side. */
const BODYGRAPH_PAD = 16;
/** The `viewBox` attribute the shell must emit: DREAM_VIEW_BOX grown by the pad. */
const EXPECTED_VIEW_BOX = [
  DREAM_VIEW_BOX.x - BODYGRAPH_PAD,
  DREAM_VIEW_BOX.y - BODYGRAPH_PAD,
  DREAM_VIEW_BOX.w + BODYGRAPH_PAD * 2,
  DREAM_VIEW_BOX.h + BODYGRAPH_PAD * 2
].join(' ');
/** The graph is drawn rotated a quarter turn clockwise, so its box is landscape. */
const ROTATED_ASPECT = (DREAM_VIEW_BOX.w + BODYGRAPH_PAD * 2) / (DREAM_VIEW_BOX.h + BODYGRAPH_PAD * 2);

let failures = 0;
const ok = name => console.log(`✔ ${name}`);
const fail = (name, err) => { failures++; console.error(`✖ ${name}\n  ${err}`); };
async function check(name, fn) {
  try { await fn(); ok(name); } catch (err) { fail(name, err.message || err); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/**
 * Pick a language through the real controls. `#language-switcher` is the hidden
 * state mirror (aria-hidden, tabindex -1) that keeps screen readers and the
 * stored preference in sync; the interactive control is the `<details
 * id="language-menu">` inside `#more-menu`, which must be opened first.
 */
async function chooseLanguage(page, code) {
  if (!(await page.$eval('#more-menu', n => n.open))) await page.click('#more-toggle');
  if (!(await page.$eval('#language-menu', n => n.open))) await page.click('#language-menu > summary');
  await page.click(`.language-actions button[data-language="${code}"]`);
}

const browser = await chromium.launch({ ...(CHROME ? { executablePath: CHROME } : { channel: process.env.CHROME_CHANNEL || 'chromium' }), headless: true });
const page = await browser.newPage({ viewport: { width: 1380, height: 1000 }, locale: 'zh-CN' });
page.setDefaultTimeout(15000);
await page.addInitScript(() => localStorage.setItem('ohd-language', 'zh-CN'));
const pageErrors = [];
page.on('pageerror', err => pageErrors.push(err.message));
page.on('console', msg => { if (msg.type() === 'error') pageErrors.push(`console: ${msg.text()}`); });

await page.goto(`${BASE}/${BIRTH}&view=dream`, { waitUntil: 'load' });
await page.waitForSelector('.dream-realm', { timeout: 30000 });
await page.waitForTimeout(600);

await check('navigation registers the sleep chart page', async () => {
  const nav = await page.$$eval('.nav-link', nodes => nodes.map(n => n.dataset.view));
  assert(nav.includes('dream'), `nav is ${nav.join(',')}`);
  const active = await page.$eval('.nav-link.active', n => n.dataset.view);
  assert(active === 'dream', `active view is ${active}`);
});

await check('graph draws exactly the five sleep centres', async () => {
  const centers = await page.$$eval('#dream-bodygraph .bg-center', n => n.map(x => x.dataset.center));
  assert(JSON.stringify(centers) === JSON.stringify(EXPECTED_CENTERS), `centers ${centers}`);
});

await check('graph draws exactly the fifteen sleep gates', async () => {
  const gates = await page.$$eval('#dream-bodygraph .bg-gate', n => n.map(x => x.dataset.gate).sort((a, b) => a - b));
  assert(JSON.stringify(gates) === JSON.stringify(EXPECTED_GATES), `gates ${gates}`);
});

await check('the three portals draw a stub instead of a dangling half-channel', async () => {
  const all = await page.$$eval('#dream-bodygraph .bg-gate-path', n => n.length);
  const gated = await page.$$eval('#dream-bodygraph .bg-gate-path[data-gate]', n => n.map(x => x.dataset.gate));
  // Every sleep gate draws now: the twelve channelled gates keep their waking
  // path, the three portals draw a short stub so nothing hangs over the empty
  // space where a removed centre used to be.
  assert(gated.length === 15, `${gated.length} gated half-paths, expected 15`);
  for (const portal of ['12', '19', '62']) assert(gated.includes(portal), `portal ${portal} draws no path`);
  // 20-57 is a dream channel, so the shared integration trunk contributes two spans.
  assert(all === gated.length + 2, `${all} paths total, expected ${gated.length + 2}`);
});

await check('the portals 12 and 19 really draw the stub, not the full waking path', async () => {
  for (const gate of [12, 19]) {
    const d = await page.$eval(`#dream-bodygraph .bg-gate-path[data-gate="${gate}"]`, n => n.getAttribute('d'));
    assert(d === DREAM_PORTAL_STUBS[gate], `gate ${gate} path is "${d}", expected the stub "${DREAM_PORTAL_STUBS[gate]}"`);
  }
  // Gate 62 has no override: its waking path is already stub length.
  const d62 = await page.$eval('#dream-bodygraph .bg-gate-path[data-gate="62"]', n => n.getAttribute('d'));
  assert(!Object.values(DREAM_PORTAL_STUBS).includes(d62), 'gate 62 should keep its own waking path');
});

await check('the graph is rotated a quarter turn with upright gate numbers', async () => {
  const rotations = await page.$$eval('#dream-bodygraph .bodygraph-svg > g[transform]', n => n.map(x => x.getAttribute('transform')));
  assert(rotations.length === 1, `${rotations.length} rotated groups directly under the svg, expected 1`);
  assert(/^rotate\(90[ ,]/.test(rotations[0]), `geometry group transform is "${rotations[0]}"`);
  // Every gate number counter-rotates, so a rotated graph still reads upright.
  const numbers = await page.$$eval('#dream-bodygraph .bg-gate text', n => n.map(x => x.getAttribute('transform')));
  assert(numbers.length === 15, `${numbers.length} gate numbers, expected 15`);
  for (const transform of numbers) {
    assert(/^rotate\(-90[ ,]/.test(transform || ''), `gate number transform is "${transform}", expected a -90 counter-rotation`);
  }
  // A rotated graph that forgot to swap its viewBox would still pass the group
  // check above; the next check owns the box itself.
});

await check('the shared shell gives the reduced graph a real canvas', async () => {
  const box = await page.$eval('#dream-bodygraph .bodygraph-svg', n => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  assert(box.w > 600, `canvas is only ${box.w}px wide — the shell fell back to its floor`);
  assert(box.w > box.h, `sleep graph is rotated sideways, so it should be wider than tall, got ${box.w}x${box.h}`);
  const ratio = box.w / box.h;
  assert(ratio > 1.6 && ratio < 1.9, `aspect ${ratio.toFixed(3)} outside the measured ${ROTATED_ASPECT.toFixed(3)} range`);
});

await check('viewBox matches the measured dream geometry', async () => {
  const vb = await page.$eval('#dream-bodygraph .bodygraph-svg', n => n.getAttribute('viewBox'));
  assert(vb === EXPECTED_VIEW_BOX, `viewBox is ${vb}, expected ${EXPECTED_VIEW_BOX}`);
});

await check('type strip reports waking and sleeping types', async () => {
  const chips = await page.$$eval('.dream-type-strip .dream-type-chip', n => n.map(x => x.textContent.trim()));
  assert(chips.length === 2 && chips.every(Boolean), `chips ${JSON.stringify(chips)}`);
  const facts = await page.$eval('.dream-type-facts', n => n.textContent);
  assert(/睡眠类型/.test(facts), `facts: ${facts.slice(0, 80)}`);
});

await check('three night fields render with their portals', async () => {
  const realms = await page.$$eval('.dream-realm', n => n.map(x => x.dataset.realm));
  assert(JSON.stringify(realms) === JSON.stringify(['light', 'earth', 'demon']), `realms ${realms}`);
  const portals = await page.$$eval('.dream-portal-gate', n => n.map(x => x.textContent.trim()));
  assert(JSON.stringify(portals) === JSON.stringify(['62', '12', '19']), `portals ${portals}`);
  const names = await page.$$eval('.dream-portal-name', n => n.map(x => x.textContent.trim()));
  assert(names.every(Boolean), `portal names ${names}`);
});

await check('activation columns list only dream-gate planets', async () => {
  const rows = await page.$$eval('.dream-column-row', n => n.map(x => Number(x.dataset.gate)));
  assert(rows.length > 0, 'no activation rows');
  assert(rows.every(g => EXPECTED_GATES.includes(String(g))), `non-dream gate in a column: ${rows}`);
});

await check('night sky is overlaid and its timestamp is shown', async () => {
  const facts = await page.$eval('.dream-type-strip', n => n.textContent);
  assert(/已叠加/.test(facts), `no overlay notice: ${facts.slice(0, 120)}`);
  const transitSources = await page.$$eval('.dream-row-source-transit', n => n.length);
  assert(transitSources > 0, 'no transit-only rows anywhere in the three fields');
});

await check('provenance line reports the lunar design moment', async () => {
  const text = await page.$eval('.dream-provenance', n => n.textContent);
  assert(/88/.test(text) && /天/.test(text), `provenance: ${text}`);
});

await page.screenshot({ path: path.join(SHOTS, 'desktop-zh-CN.png'), fullPage: true });

await check('no page or console errors on first render', async () => {
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

// --- interaction: hovering a column row lights the matching gate ---
await check('hovering an activation row lights its gate in the graph', async () => {
  const gate = await page.$eval('.dream-column-row', n => n.dataset.gate);
  await page.hover('.dream-column-row');
  await page.waitForTimeout(200);
  const lit = await page.$eval(`#dream-bodygraph .bg-gate[data-gate="${gate}"]`, n => n.classList.contains('bg-lit'));
  assert(lit, `gate ${gate} was not lit`);
});

// --- detail sheet: sleep-chart data, never the waking design ---
await check('clicking a gate opens the sleep-chart detail sheet', async () => {
  const gate = await page.$eval('.dream-column-row', n => n.dataset.gate);
  await page.click(`#dream-bodygraph .bg-gate[data-gate="${gate}"] .bg-gate-hit`);
  await page.waitForSelector('#dream-detail:not(.hidden)', { timeout: 10000 });
  const title = await page.$eval('#dream-detail', n => n.textContent);
  assert(/Gate|\u95f8\u95e8/.test(title), `sheet did not open for gate ${gate}`);
});

await check('the gate sheet shows sleep activations only, never the waking design', async () => {
  // The regression this guards: the waking detail path reads chart.js's own
  // current chart for the design side, which would list the Sun-minus-88
  // activations instead of the Moon-minus-88 ones.
  const sleepSet = new Set(await page.$$eval('.dream-column-row', rows =>
    rows.map(row => row.querySelector('.dream-column-act')?.textContent.trim()).filter(Boolean)));
  const transitChips = await page.$$eval('.dream-row-planets .dream-planet-chip', chips =>
    chips.map(chip => chip.textContent.match(/(\d+\.\d)/)?.[1]).filter(Boolean));
  transitChips.forEach(v => sleepSet.add(v));
  const sheetTokens = await page.$$eval('#dream-detail .dream-detail-source-planets',
    nodes => nodes.flatMap(n => [...n.textContent.matchAll(/\b(\d+\.\d)\b/g)].map(m => m[1])));
  assert(sheetTokens.length > 0, 'the sheet listed no activations at all');
  const foreign = [...new Set(sheetTokens)].filter(token => !sleepSet.has(token));
  assert(foreign.length === 0,
    `activations in the sheet that are not in the sleep design (waking design leaked in?): ${foreign.join(', ')}`);
});

await check('the gate sheet carries the dream-specific facts', async () => {
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  assert(/\u7231|\u770b\u89c1|\u8c03\u9891|\u9ed1\u6697|\u559c\u60a6|\u53d8\u5f02|\u6e34\u671b|\u6027|\u65f6\u95f4|\u6df7\u6d8c|\u73af\u5883|\u98de\u79bb|\u6b7b\u4ea1|\u653b\u51fb|\u6050\u60e7|Love|Sight|Time|Fear/.test(sheet),
    'no dream gate name in the sheet');
  assert(/\u79d8\u5bc6|\u5360\u6709|\u52a8\u8361|\u75f4\u8ff7|\u5e7b\u60f3|\u613f\u666f|Secrets|Possession|Obsession|Vision/.test(sheet),
    'no dream line theme in the sheet');
  assert(/\u5149\u573a|\u5730\u7403\u5c42\u9762|\u5669\u68a6\u9886\u57df|Light Field|Earth Plane|Demon Realm/.test(sheet),
    'no night field tag in the sheet');
});

await check('a realm channel row opens the channel sheet', async () => {
  // The gate sheet from the checks above is still open and is modal, so it would
  // swallow the click. Dismiss it first.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const row = await page.$('.dream-channel-open');
  if (!row) return; // a field holding no channel has nothing to open
  const id = await row.getAttribute('data-channel');
  await row.click();
  await page.waitForSelector('#dream-detail .gate-detail-card[data-channel]', { timeout: 10000 });
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  assert(sheet.includes(id) || sheet.includes(id.replace('-', '\u2013')), `channel sheet did not mention ${id}`);
});

await check('closing the sheet dismisses it', async () => {
  await page.click('#dream-detail .gate-detail-close');
  await page.waitForTimeout(200);
  const hidden = await page.$eval('#dream-detail', n => n.classList.contains('hidden'));
  assert(hidden, 'sheet did not close');
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

// --- language switch redraws from cache without recomputing ---
await check('switching to English redraws the sleep chart', async () => {
  await chooseLanguage(page, 'en');
  await page.waitForSelector('.dream-realm', { timeout: 10000 });
  await page.waitForTimeout(400);
  const locale = await page.evaluate(() => document.documentElement.lang);
  assert(locale === 'en', `document language is ${locale}`);
  const title = await page.$eval('.dream-realm-light .dream-realm-title', n => n.textContent.trim());
  assert(title === 'Light Field', `realm title is "${title}"`);
  const chip = await page.$eval('.dream-type-strip .dream-type-chip', n => n.textContent.trim());
  assert(/^[A-Z]/.test(chip), `type chip not translated: ${chip}`);
  // The redraw must keep the whole page, not just the graph.
  assert(await page.$$eval('.dream-realm', n => n.length) === 3, 'the three night fields did not survive the redraw');
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});
await page.screenshot({ path: path.join(SHOTS, 'desktop-en.png'), fullPage: true });

await check('switching back to Simplified Chinese restores the terms', async () => {
  await chooseLanguage(page, 'zh-CN');
  await page.waitForTimeout(400);
  const title = await page.$eval('.dream-realm-light .dream-realm-title', n => n.textContent.trim());
  assert(title === '光场', `realm title is "${title}"`);
});

// --- every registered skin must render the reduced graph without error ---
await check('every skin re-renders the sleep graph', async () => {
  // Skins live in the appearance dialog: `#skin-picker` holds one
  // `button[data-skin-id]` per skin, and the dialog only renders them once
  // opened. `#theme-toggle` and `#skin-settings-button` are inside `#more-menu`.
  if (!(await page.$eval('#more-menu', n => n.open))) await page.click('#more-toggle');
  await page.click('#skin-settings-button');
  await page.waitForSelector('#skin-settings[open]', { timeout: 5000 });
  try {
    const skins = await page.$$eval('#skin-picker [data-skin-id]', n => n.map(b => b.dataset.skinId));
    assert(skins.length > 1, `no skin picker buttons found (got ${skins.length})`);
    for (const skin of skins) {
      await page.click(`#skin-picker [data-skin-id="${skin}"]`);
      await page.waitForTimeout(220);
      const applied = await page.evaluate(() => document.documentElement.dataset.skin);
      assert(applied === skin, `clicking skin ${skin} left data-skin=${applied}`);
      const centers = await page.$$eval('#dream-bodygraph .bg-center', n => n.length);
      assert(centers === 5, `skin ${skin}: ${centers} centres`);
      assert(pageErrors.length === 0, `skin ${skin}: ${pageErrors.join(' | ')}`);
    }
  } finally {
    // The dialog is modal: leaving it open would block every later check. Its
    // closed state is hidden, so poll the property instead of waiting for a
    // visible selector.
    await page.click('#skin-picker [data-skin-id="default-light"]').catch(() => {});
    if (await page.$eval('#skin-settings', n => n.open)) await page.click('#skin-settings-close');
    await page.waitForFunction(() => document.getElementById('skin-settings')?.open === false, null, { timeout: 5000 });
  }
});

// --- dark theme ---
await check('dark theme re-renders the sleep graph', async () => {
  // The theme toggle sits in the `#more-menu` panel, which is closed by CSS
  // until the summary is clicked.
  if (!(await page.$eval('#more-menu', n => n.open))) await page.click('#more-toggle');
  await page.click('#theme-toggle');
  await page.waitForTimeout(300);
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  assert(theme === 'dark', `theme is ${theme}`);
  const centers = await page.$$eval('#dream-bodygraph .bg-center', n => n.length);
  assert(centers === 5, `${centers} centres in ${theme}`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  await page.screenshot({ path: path.join(SHOTS, 'desktop-dark.png'), fullPage: true });
  if (!(await page.$eval('#more-menu', n => n.open))) await page.click('#more-toggle');
  await page.click('#theme-toggle');
  await page.waitForTimeout(200);
});

// --- phone layout must not overflow horizontally ---
await check('phone viewport keeps the page inside the screen', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `horizontal overflow of ${overflow}px`);
  const box = await page.$eval('#dream-bodygraph .bodygraph-svg', n => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
  assert(box.w > 120 && box.w <= 390, `phone canvas ${box.w}px`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  await page.screenshot({ path: path.join(SHOTS, 'phone-zh-CN.png'), fullPage: true });
  await page.setViewportSize({ width: 1380, height: 1000 });
  await page.waitForTimeout(400);
});

// --- the sleep page itself picks the second person ---
// Two saved people, written straight into the people store so the page has a
// stable current person (person A) and one candidate to compare against (B).
// Seeding storage keeps the fixture out of the UI flow being tested.
const SEEDED_PEOPLE = [
  {
    id: 'e2e-dream-a', name: 'E2E Dream', birthDate: '1990-05-20', birthTime: '06:30',
    timeUnknown: false,
    location: { lat: null, lon: null, timezone: 0, iana: null, name: null },
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'e2e-dream-b', name: 'E2E Partner', birthDate: '1992-08-08', birthTime: '10:15',
    timeUnknown: false,
    location: { lat: null, lon: null, timezone: 0, iana: null, name: null },
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

await page.evaluate(people => {
  localStorage.setItem(['natal', 'engine', '_profiles'].join(''), JSON.stringify(people));
  localStorage.setItem('ohd-last-person-id', people[0].id);
}, SEEDED_PEOPLE);
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForSelector('#chart-view:not(.hidden)', { timeout: 30000 });
await page.click('.nav-link[data-view="dream"]');
await page.waitForSelector('.dream-realm', { timeout: 30000 });
await page.waitForTimeout(500);

await check('the sleep page carries its own compare entry next to the night-sky refresh', async () => {
  const label = await page.$eval('#dream-compare', n => n.textContent.trim());
  assert(label === '\u4e0e\u53e6\u4e00\u4e2a\u4eba\u5408\u56fe', `compare button reads "${label}"`);
  const toolbar = await page.$$eval('.dream-toolbar button', n => n.map(b => b.id));
  assert(JSON.stringify(toolbar) === JSON.stringify(['dream-refresh', 'dream-compare']), `toolbar buttons ${toolbar}`);
  // The relationship page no longer offers the handover.
  await page.click('.nav-link[data-view="connection"]');
  await page.waitForTimeout(400);
  const connEntry = await page.$('#conn-view-dreams');
  assert(!connEntry, 'the connection view still offers a sleep-chart jump button');
  await page.click('.nav-link[data-view="dream"]');
  await page.waitForSelector('.dream-realm', { timeout: 30000 });
  await page.waitForTimeout(300);
});

/**
 * The shared person picker (`src/lib/person-picker.js`) is the Team picker
 * extracted: rows are `[data-add-person]` buttons inside a modal overlay, with
 * the historical `#team-person-search` input. Single selection commits on the
 * row click, so no confirm button is involved.
 */
async function pickSecondPerson(page, name) {
  await page.waitForSelector('.modal-overlay [data-add-person]', { timeout: 15000 });
  const search = await page.$('.modal-overlay #team-person-search');
  if (search) { await search.fill(name); await page.waitForTimeout(250); }
  const rows = await page.$$('.modal-overlay [data-add-person]');
  for (const row of rows) {
    if (!(await row.isVisible())) continue;
    const text = (await row.textContent()) || '';
    if (!text.includes(name)) continue;
    await row.click();
    return true;
  }
  return false;
}

await page.click('#dream-compare');
await page.waitForSelector('.modal-overlay [data-add-person]', { timeout: 15000 });

await check('the compare button opens the shared person picker without the loaded person', async () => {
  const names = await page.$$eval('.modal-overlay [data-add-person] strong', n => n.map(x => x.textContent.trim()));
  assert(!names.includes('E2E Dream'), `the picker lists the loaded person: ${names}`);
  assert(names.includes('E2E Partner'), `the picker does not list the second person: ${names}`);
  // Single selection: no confirm button, the row is the commit.
  const confirm = await page.$('.modal-overlay #team-selection-confirm');
  assert(!confirm, 'single-selection mode still shows a confirm button');
  await page.click('.modal-overlay [data-close]');
  await page.waitForTimeout(300);
  assert(!(await page.$('.modal-overlay')), 'cancelling left the picker open');
  assert(!(await page.$('#dream-composite')), 'cancelling still built a comparison');
  // Reopen for the flow below.
  await page.click('#dream-compare');
  const committed = await pickSecondPerson(page, 'E2E Partner');
  assert(committed, 'the picker did not offer the second person to commit');
});

await check('choosing a second person on the sleep page builds the comparison', async () => {
  await page.waitForSelector('#dream-composite', { timeout: 60000 });
  await page.waitForSelector('.dream-compare-facts', { timeout: 30000 });
  await page.waitForTimeout(600);
  // One shared body: both sleeping designs on a single five-centre graph.
  const centers = await page.$$eval('#dream-composite .bg-center', n => n.length);
  assert(centers === 5, `${centers} centres in the composite (expected one five-centre body)`);
  const gates = await page.$$eval('#dream-composite .bg-gate', n => n.length);
  assert(gates === 15, `${gates} gates in the composite`);
  const legend = await page.$$eval('.dream-view .composite-legend .lg', n => n.length);
  assert(legend === 4, `${legend} legend entries (expected A / B / both / defined-together)`);
  const facts = await page.$eval('.dream-compare-facts', n => n.textContent);
  assert(/\u7761\u7720\u7c7b\u578b|Sleep type/.test(facts), `no per-person sleep type in the facts: ${facts.slice(0, 80)}`);
  const heading = await page.$eval('.dream-compare-head', n => n.textContent);
  assert(/E2E Dream/.test(heading) && /E2E Partner/.test(heading), `comparison heading is "${heading}"`);
  // The picker excluded the loaded person, so the pair is A + the chosen B.
  const active = await page.$eval('.nav-link.active', n => n.dataset.view);
  assert(active === 'dream', `landed on ${active}`);
  // The entry point turns into a swap once a pair exists.
  const label = await page.$eval('#dream-compare', n => n.textContent.trim());
  assert(label === '\u66f4\u6362\u4eba\u9009', `compare button reads "${label}" in comparison mode`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  await page.screenshot({ path: path.join(SHOTS, 'comparison.png'), fullPage: true });
});

await check('composite gates open an ownership sheet', async () => {
  const gate = await page.$eval('#dream-composite .bg-gate[data-gate]', n => n.dataset.gate);
  await page.click(`#dream-composite .bg-gate[data-gate="${gate}"] .bg-gate-hit`);
  await page.waitForSelector('#dream-detail:not(.hidden)', { timeout: 10000 });
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  assert(/\u7531|Carried by/.test(sheet), 'composite sheet does not report who carries the gate');
  // The three-source activation block belongs to the single sleep design only.
  assert(!/\u6e05\u9192\u4eba\u683c|Awake personality/.test(sheet), 'composite sheet shows single-person activation sources');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
});

await check('comparison mode overlays no night sky', async () => {
  // Structural, not textual: the intro sentence itself says the night sky is
  // absent, so the word appearing is expected. What must not exist is any
  // transit activation, transit ring or overlay timestamp.
  const text = await page.$eval('#dream-content', n => n.textContent);
  assert(!/\u5df2\u53e0\u52a0/.test(text), 'comparison carries the overlay timestamp notice');
  const rings = await page.$$eval('#dream-composite .bg-transit-ring', n => n.length);
  assert(rings === 0, `${rings} transit rings in the composite`);
  const transitRows = await page.$$eval('#dream-content .dream-row-source-transit, #dream-content .dream-realm', n => n.length);
  assert(transitRows === 0, `${transitRows} night-field or transit-source blocks in the composite`);
});

await check('a language switch redraws the composite without dropping it', async () => {
  await chooseLanguage(page, 'en');
  await page.waitForSelector('#dream-composite', { timeout: 15000 });
  await page.waitForTimeout(400);
  const head = await page.$eval('.dream-compare-head', n => n.textContent);
  assert(/Sleep charts of/.test(head), `composite heading after the switch: ${head}`);
  const centers = await page.$$eval('#dream-composite .bg-center', n => n.length);
  assert(centers === 5, `${centers} centres after switching language in comparison mode`);
  await chooseLanguage(page, 'zh-CN');
  await page.waitForSelector('#dream-composite', { timeout: 15000 });
  await page.waitForTimeout(400);
  const back = await page.$eval('.dream-compare-head', n => n.textContent);
  assert(/\u7761\u7720\u56fe/.test(back), `composite heading back in Chinese: ${back}`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

await check('leaving the comparison returns to the single sleep chart', async () => {
  await page.click('#dream-compare-exit');
  await page.waitForSelector('.dream-realms', { timeout: 30000 });
  await page.waitForTimeout(500);
  const realms = await page.$$eval('.dream-realm', n => n.length);
  assert(realms === 3, `${realms} realms after exiting comparison`);
  const label = await page.$eval('#dream-compare', n => n.textContent.trim());
  assert(label === '\u4e0e\u53e6\u4e00\u4e2a\u4eba\u5408\u56fe', `compare button reads "${label}" after exiting`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

// --- a partner with no known birth time compares like any other person ---
await check('a partner whose birth time is unknown still compares, at noon', async () => {
  await page.evaluate(() => {
    const key = ['natal', 'engine', '_profiles'].join('');
    const people = JSON.parse(localStorage.getItem(key));
    people.push({
      id: 'e2e-dream-c', name: 'E2E Noon', birthDate: '1992-08-08', birthTime: '12:00',
      timeUnknown: true,
      location: { lat: null, lon: null, timezone: 0, iana: null, name: null },
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
    });
    localStorage.setItem(key, JSON.stringify(people));
    window.dispatchEvent(new Event('ohd-people-changed'));
  });
  await page.waitForTimeout(300);
  await page.click('#dream-compare');
  const used = await pickSecondPerson(page, 'E2E Noon');
  assert(used, 'the picker did not list the person with no known birth time');
  await page.waitForSelector('#dream-composite', { timeout: 60000 });
  await page.waitForTimeout(500);
  const heading = await page.$eval('.dream-compare-head', n => n.textContent);
  assert(/E2E Noon/.test(heading), `comparison heading is "${heading}"`);
  // The noon estimate is the existing rule (birthFromPerson keeps timeUnknown,
  // the engine reads 12:00); nothing about it is invented on this page.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem(['natal', 'engine', '_profiles'].join('')))
    .find(p => p.id === 'e2e-dream-c'));
  assert(stored.timeUnknown === true && stored.birthTime === '12:00', `stored partner ${JSON.stringify(stored)}`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  await page.click('#dream-compare-exit');
  await page.waitForSelector('.dream-realms', { timeout: 30000 });
  await page.waitForTimeout(300);
});

// --- a partner whose birth record cannot be computed reports it in the toolbar ---
await check('an incomplete partner birth reports the error in the toolbar, not a new dialog', async () => {
  await page.evaluate(() => {
    const key = ['natal', 'engine', '_profiles'].join('');
    const people = JSON.parse(localStorage.getItem(key));
    people.push({
      id: 'e2e-dream-bad', name: 'E2E Broken', birthDate: '', birthTime: '12:00',
      timeUnknown: false,
      location: { lat: null, lon: null, timezone: 0, iana: null, name: null },
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
    });
    localStorage.setItem(key, JSON.stringify(people));
    window.dispatchEvent(new Event('ohd-people-changed'));
  });
  await page.waitForTimeout(300);
  await page.click('#dream-compare');
  const used = await pickSecondPerson(page, 'E2E Broken');
  assert(used, 'the picker did not list the broken record');
  await page.waitForFunction(() => /\u7761\u7720\u56fe\u8ba1\u7b97\u5931\u8d25/.test(document.getElementById('dream-status')?.textContent || ''),
    null, { timeout: 30000 });
  const status = await page.$eval('#dream-status', n => n.textContent.trim());
  assert(/\u7761\u7720\u56fe\u8ba1\u7b97\u5931\u8d25\uff1a/.test(status), `status reads "${status}"`);
  // No second dialog: the only overlay left is nothing at all.
  assert(!(await page.$('.modal-overlay')), 'the failure opened a dialog');
  // The single sleep chart is still what the page shows.
  assert(!(await page.$('#dream-composite')), 'a comparison was drawn from a broken record');
  const realms = await page.$$eval('.dream-realm', n => n.length);
  assert(realms === 3, `${realms} realms after the failure`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  // The entry point stays available so the user can pick someone else.
  const label = await page.$eval('#dream-compare', n => n.textContent.trim());
  assert(label === '\u4e0e\u53e6\u4e00\u4e2a\u4eba\u5408\u56fe', `compare button reads "${label}"`);
});

// --- switching the loaded person must not keep the stale pair ---
await check('switching people drops the comparison that belonged to the old pair', async () => {
  // Build a pair again, then change the loaded person through the header switcher.
  await page.click('#dream-compare');
  const used = await pickSecondPerson(page, 'E2E Partner');
  assert(used, 'the picker did not offer a second person the second time');
  await page.waitForSelector('#dream-composite', { timeout: 60000 });
  await page.selectOption('#people-switcher', 'e2e-dream-b');
  await page.waitForSelector('#chart-view:not(.hidden)', { timeout: 30000 });
  await page.click('.nav-link[data-view="dream"]');
  await page.waitForSelector('.dream-realm', { timeout: 30000 });
  await page.waitForTimeout(400);
  const composite = await page.$('#dream-composite');
  assert(!composite, 'the sleep page still shows the previous pair\'s composite');
  const label = await page.$eval('#dream-compare', n => n.textContent.trim());
  assert(label === '\u4e0e\u53e6\u4e00\u4e2a\u4eba\u5408\u56fe', `compare button reads "${label}" for the new person`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

await check('no errors accumulated across the whole run', async () => {
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

await browser.close();
console.log(`\n${failures === 0 ? 'ALL E2E CHECKS PASSED' : `${failures} E2E CHECK(S) FAILED`}`);
console.log(`screenshots: ${SHOTS}`);
process.exit(failures === 0 ? 0 : 1);
