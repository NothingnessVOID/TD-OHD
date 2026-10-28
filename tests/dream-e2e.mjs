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
// Screenshots default next to the other sleep-chart captures, but a run that must
// not touch tracked evidence can point them at a scratch directory instead.
const SHOTS = process.env.E2E_SHOTS
  ? path.resolve(process.env.E2E_SHOTS)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'dream');
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

/** Apply a registered skin through the appearance dialog, then close it. */
async function applySkin(page, skin) {
  if (!(await page.$eval('#more-menu', n => n.open))) await page.click('#more-toggle');
  await page.click('#skin-settings-button');
  await page.waitForSelector('#skin-settings[open]', { timeout: 5000 });
  await page.click(`#skin-picker [data-skin-id="${skin}"]`);
  await page.waitForTimeout(260);
  if (await page.$eval('#skin-settings', n => n.open)) await page.click('#skin-settings-close');
  await page.waitForFunction(() => document.getElementById('skin-settings')?.open === false, null, { timeout: 5000 });
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

await check('the type comparison is two buttons labelled 清醒 and 梦境', async () => {
  const pairs = await page.$$eval('.dream-type-strip .dream-type-pair', nodes => nodes.map(node => ({
    label: node.querySelector('.dream-type-label')?.textContent.trim(),
    side: node.querySelector('.dream-type-chip')?.dataset.dreamTypeOpen,
    tag: node.querySelector('.dream-type-chip')?.tagName
  })));
  assert(JSON.stringify(pairs.map(pair => pair.label)) === JSON.stringify(['清醒', '梦境']), `labels ${pairs.map(p => p.label)}`);
  assert(JSON.stringify(pairs.map(pair => pair.side)) === JSON.stringify(['waking', 'dream']), `sides ${pairs.map(p => p.side)}`);
  assert(pairs.every(pair => pair.tag === 'BUTTON'), `chips are ${pairs.map(p => p.tag)}`);
  // The reading moved into each side's own sheet, so the strip stays one line per
  // type instead of carrying two long readings under the comparison.
  assert(!(await page.$('.dream-type-strip [data-dream-type-reading]')), 'the type strip still embeds a type reading');
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
  // The single design keeps its one column per side, in the same shell slots the
  // composite fills with two each.
  const columns = await page.$$eval('.dream-graph-shell [data-slot="left"] .dream-column, .dream-graph-shell [data-slot="right"] .dream-column',
    n => n.map(x => [...x.classList].find(c => /^dream-column-(design|personality)$/.test(c))));
  assert(JSON.stringify(columns) === JSON.stringify(['dream-column-design', 'dream-column-personality']),
    `single design columns ${columns}`);
  const owners = await page.$$eval('.dream-graph-shell [data-slot] .dream-column', n => n.map(x => x.dataset.owner || null));
  assert(owners.every(owner => owner === null), `the single design columns carry a composite owner: ${owners}`);
});

await check('the overlay is named with the shared transit term and timestamped', async () => {
  // The overlay is named with the shared term (`Transit` → 行运), not with a
  // sleep-chart word of its own.
  const facts = await page.$eval('.dream-type-strip', n => n.textContent);
  assert(/已叠加/.test(facts), `no overlay notice: ${facts.slice(0, 120)}`);
  assert(/行运/.test(facts), `the overlay is not called 行运: ${facts.slice(0, 160)}`);
  assert(!/天时/.test(facts), `the retired 天时 wording is still on the page: ${facts.slice(0, 160)}`);
  const transitSources = await page.$$eval('.dream-row-source-transit', n => n.length);
  assert(transitSources > 0, 'no transit-only rows anywhere in the three fields');
});

await check('the sleep page mounts the shared transit time control', async () => {
  // Same component as the Transits page (`lib/transit-time-control.js`), mounted
  // under its own id prefix so the two never collide.
  for (const id of ['dream-transit-date', 'dream-transit-time', 'dream-transit-timezone', 'dream-transit-now']) {
    assert(await page.$(`#${id}`), `missing #${id}`);
  }
  assert(!(await page.$('#dream-transit-only-toggle')), 'the sleep page shows the transit-only mode it does not have');
  const step = await page.$eval('#dream-transit-time', n => n.getAttribute('step'));
  assert(step === '1', `time input step is ${step}`);
  const zone = (await page.$eval('#dream-transit-timezone', n => n.textContent)).trim();
  assert(zone.length > 0, 'the timezone output is empty');
  const date = await page.$eval('#dream-transit-date', n => n.value);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date), `date input is "${date}"`);
});

await check('moving the time control re-reads the overlay at the new moment', async () => {
  const overlayText = () => page.$eval('.dream-type-strip', n => n.textContent);
  const transitChips = () => page.$$eval('.dream-row-source-transit .dream-planet-chip', n => n.map(x => x.textContent.trim()));
  const before = await overlayText();
  const chipsBefore = await transitChips();
  // A date two days out: the overlay must move, and it must move because of the
  // control, not because the page reloaded (the lunar arc keeps its date).
  const provenanceBefore = await page.$eval('.dream-provenance', n => n.textContent);
  await page.evaluate(() => {
    const date = document.getElementById('dream-transit-date');
    date.value = '2026-02-03';
    date.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(previous => (document.querySelector('.dream-type-strip')?.textContent || '') !== previous,
    before, { timeout: 30000 });
  await page.waitForTimeout(400);
  const after = await overlayText();
  const chipsAfter = await transitChips();
  assert(after !== before, 'the overlay notice did not change with the selected moment');
  assert(JSON.stringify(chipsAfter) !== JSON.stringify(chipsBefore),
    `the transit activations are identical at two different moments: ${chipsAfter.join(', ')}`);
  const provenanceAfter = await page.$eval('.dream-provenance', n => n.textContent);
  assert(provenanceAfter === provenanceBefore,
    'the lunar design moment changed with the overlay — the solve was recomputed instead of reused');
  // Back to now so the rest of the run starts from the page's default state.
  await page.click('#dream-transit-now');
  await page.waitForTimeout(600);
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

await check('lighting a gate on the graph lights the matching list rows', async () => {
  // The reverse direction of the same gesture: `onHighlight` is wired for both the
  // single design and the composite, so a gate means the same row in either view.
  const gate = await page.$eval('.dream-realm-row[data-gate]', n => n.dataset.gate);
  const circle = await page.$(`#dream-bodygraph .bg-gate[data-gate="${gate}"] .bg-gate-hit`);
  await circle.hover();
  await page.waitForTimeout(250);
  const state = await page.evaluate(g => ({
    column: [...document.querySelectorAll(`#dream-content .dream-column-row[data-gate="${g}"]`)]
      .every(node => node.classList.contains('row-lit')),
    realm: document.querySelector(`#dream-content .dream-realm-row[data-gate="${g}"]`)?.classList.contains('row-lit')
  }), gate);
  assert(state.realm === true, `hovering gate ${gate} on the graph did not light its night-field row`);
  // Every column row for that gate must follow, not only the first one.
  assert(state.column === true, `hovering gate ${gate} left a column row unlit`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
  const cleared = await page.$$eval('#dream-content .row-lit', n => n.length);
  assert(cleared === 0, `${cleared} rows stayed lit after the pointer left the graph`);
});

await check('hovering a night-field row lights its gate in the graph', async () => {
  // The other direction of the same link: night-field rows were click-only, so a
  // reader could open a gate from the list but not find it on the graph.
  const gate = await page.$eval('.dream-realm-row[data-gate]', n => n.dataset.gate);
  await page.hover(`.dream-realm-row[data-gate="${gate}"] .dream-row-open`);
  await page.waitForTimeout(250);
  const lit = await page.$eval(`#dream-bodygraph .bg-gate[data-gate="${gate}"]`, n => n.classList.contains('bg-lit'));
  assert(lit, `hovering the night-field row for gate ${gate} did not light the graph`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(250);
  const cleared = await page.$eval(`#dream-bodygraph .bg-gate[data-gate="${gate}"]`, n => n.classList.contains('bg-lit'));
  assert(!cleared, `gate ${gate} stayed lit after the pointer left the night-field row`);
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

await check('the gate sheet is titled with the dream gate name, and the night field is a tag', async () => {
  const DREAM_GATE_NAMES = {
    1: '\u559c\u60a6', 5: '\u65f6\u95f4', 8: '\u9ed1\u6697', 12: '\u53d8\u5f02', 15: '\u6df7\u6c8c', 19: '\u73af\u5883', 20: '\u770b\u89c1',
    27: '\u6e34\u671b', 28: '\u6050\u60e7', 38: '\u653b\u51fb', 42: '\u6b7b\u4ea1', 50: '\u6027', 53: '\u98de\u79bb', 57: '\u8c03\u9891', 62: '\u7231'
  };
  const gate = await page.$eval('#dream-detail .gate-detail-card[data-gate]', n => n.dataset.gate);
  const heading = await page.$eval('#dream-detail .gate-detail-card[data-gate] .detail-name', n => n.textContent.trim());
  assert(heading === DREAM_GATE_NAMES[gate],
    `gate ${gate} is titled "${heading}", expected the dream name ${DREAM_GATE_NAMES[gate]}`);
  // The waking heading printed the waking gate name and its hexagram; the sleep
  // sheet prints neither, so the waking catalogue cannot be read as this object.
  assert(!(await page.$('#dream-detail .detail-hexagram')), 'the sheet still prints the waking hexagram');
  // The night field stays as a secondary tag, and the gate's own name is not
  // repeated as one.
  const tags = await page.$$eval('#dream-detail .dream-detail-tags .dream-detail-tag', n => n.map(x => x.textContent.trim()));
  assert(tags.length >= 1 && !tags.includes(heading), `tags ${JSON.stringify(tags)} under the title "${heading}"`);
});

await check('the sheet names its activation sources \u68a6\u5883\u4eba\u683c / \u68a6\u5883\u8bbe\u8ba1 / \u884c\u8fd0', async () => {
  const labels = await page.$$eval('#dream-detail .dream-detail-source-label', n => n.map(x => x.textContent.trim()));
  assert(labels.length > 0, 'the sheet lists no activation source');
  assert(labels.every(label => label === '\u68a6\u5883\u4eba\u683c' || label === '\u68a6\u5883\u8bbe\u8ba1' || label === '\u884c\u8fd0'),
    `source labels ${JSON.stringify(labels)}`);
});

await check('the gate sheet carries the dream reading and no waking chart reading', async () => {
  assert(await page.$('#dream-detail [data-dream-readings]'), 'the sheet has no dream reading');
  // Waking prose belongs to the waking chart: it must not appear in a dream gate
  // sheet, where it would read as dream content.
  assert(!(await page.$('#dream-detail [data-waking-reading]')), 'the sheet still carries the waking reading block');
  assert(!(await page.$('#dream-detail [data-shared-gate]')), 'the shared waking gate reading is embedded in the sheet');
  const dream = await page.$eval('#dream-detail [data-dream-readings]', n => n.textContent);
  assert(/\u68a6\u5883\u95f8\u95e8\u89e3\u8bfb/.test(dream), `the dream block has no heading: ${dream.slice(0, 60)}`);
  // The dream prose is the teacher's material, not the waking one: the gate
  // reading uses the document's own words for the light field / mammalian matrix.
  assert(/\u5149\u4e4b\u573a|\u54fa\u4e73\u52a8\u7269|\u6697\u591c\u529b\u91cf|\u6e05\u6668\u9006\u5411\u6ea2\u51fa/.test(dream),
    `no dream-specific wording in the dream block: ${dream.slice(0, 120)}`);
  await page.screenshot({ path: path.join(SHOTS, 'single-gate-sheet.png'), fullPage: false });
});

await check('the planets that carry the gate are read before the six night forces', async () => {
  const order = await page.evaluate(() => {
    const planets = [...document.querySelectorAll('#dream-detail .dream-detail-subhead')]
      .find(node => /\u884c\u661f/.test(node.textContent));
    const forces = [...document.querySelectorAll('#dream-detail .dream-reading-title')]
      .find(node => /\u6697\u591c\u529b\u91cf/.test(node.textContent));
    const readings = document.querySelector('#dream-detail [data-dream-readings]');
    if (!planets || !forces || !readings) return null;
    return {
      beforeForces: !!(planets.compareDocumentPosition(forces) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeReadings: !!(planets.compareDocumentPosition(readings) & Node.DOCUMENT_POSITION_FOLLOWING)
    };
  });
  assert(order, 'the gate sheet is missing its planet block, its night forces or its readings');
  assert(order.beforeForces, 'the six night forces are printed above the planet readings');
  // Near the activation rows, not after the prose: the planet block sits in the
  // card body, ahead of the readings container.
  assert(order.beforeReadings, 'the planet readings are printed after the dream readings');
});

await check('the six night forces are one shared set, with tonight\u2019s lines marked', async () => {
  const entries = await page.$$eval('#dream-detail .dream-nightforce', nodes => nodes.map(node => ({
    line: node.dataset.line,
    active: node.dataset.activeLine === 'true',
    rows: node.querySelectorAll('.dream-reading-row').length
  })));
  assert(entries.length === 6, `${entries.length} night-force entries, expected six shared ones`);
  assert(JSON.stringify(entries.map(entry => entry.line)) === JSON.stringify(['1', '2', '3', '4', '5', '6']),
    `night-force lines are ${entries.map(entry => entry.line)}`);
  // Dream state and conditioning residue only: the line's waking role describes
  // the waking chart and is not printed in a dream sheet.
  for (const entry of entries) {
    assert(entry.rows === 2, `line ${entry.line} has ${entry.rows} rows, expected dream state and residue`);
  }
  assert(entries.some(entry => entry.active), 'no active line is marked in the sheet');
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  assert(/\u68a6\u5883\u72b6\u6001/.test(sheet) && /\u5236\u7ea6\u6b8b\u7559/.test(sheet),
    'the night-force entries do not separate dream state and residue');
  assert(!/\u6e05\u9192\u72b6\u6001/.test(sheet), 'the night-force entries still print the line\u2019s waking role');
});

await check('the gate sheet reads the planets that activate this gate', async () => {
  const planets = await page.$$eval('#dream-detail .dream-planet-reading', nodes => nodes.map(node => node.dataset.planet));
  assert(planets.length > 0, 'the gate sheet lists no planet reading');
  const text = await page.$eval('#dream-detail .dream-planet-reading', n => n.textContent);
  assert(text.trim().length > 40, `the planet reading is empty: ${text}`);
});

await check('the page states the two frame sentences the chart is read with', async () => {
  const groups = await page.$$eval('[data-dream-frame]', n => n.map(x => [x.dataset.dreamFrame, x.textContent]));
  const byKind = Object.fromEntries(groups);
  assert(byKind.sides, 'the page never says what the design and personality halves mean');
  assert(byKind.sources, 'the page never says what the chart itself and the transits mean');
  // The teacher's two sentences, in the document's own image (\u8bbe\u8ba1 = \u68a6\u6f14\u53d8\u7684\u65b9\u5411, \u539f\u56fe = \u81ea\u8eab\u56fa\u5b9a\u7684\u68a6\u4e2d\u72b6\u6001).
  assert(/\u68a6\u6f14\u53d8\u7684\u65b9\u5411/.test(byKind.sides), `design/personality line: ${byKind.sides}`);
  assert(/\u68a6\u4e2d\u7684\u610f\u8bc6/.test(byKind.sides), `design/personality line: ${byKind.sides}`);
  assert(/\u81ea\u8eab\u56fa\u5b9a\u7684\u68a6\u4e2d\u72b6\u6001/.test(byKind.sources), `natal/external line: ${byKind.sources}`);
  assert(/\u884c\u8fd0/.test(byKind.sources), `the external source is not named with the shared transit term: ${byKind.sources}`);
});

await check('the dream type chip opens the teacher\u2019s sleep-type reading', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.click('.dream-type-chip[data-dream-type-open="dream"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-type="dream"]', { timeout: 10000 });
  const parts = await page.$$eval('#dream-detail .dream-type-reading-part dt', n => n.map(x => x.textContent.trim()));
  // The type names are plain names: the comparison's own label says which of the
  // two readings this is, so the name must not carry a \u68a6\u5883 prefix.
  const title = await page.$eval('#dream-detail .gate-detail-card[data-type="dream"] .detail-name', n => n.textContent.trim());
  const hasWaking = !!(await page.$('#dream-detail [data-waking-type-reading]'));
  // Close before asserting: a failure must not leave the modal over the next check.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert(parts.length >= 2, `the type reading only names ${parts.length} parts`);
  assert(parts.includes('\u673a\u68b0\u5b9a\u4e49'), `no mechanical definition among ${parts}`);
  assert(title && !/^\u68a6\u5883/.test(title), `the type name still carries a \u68a6\u5883 prefix: ${title}`);
  assert(!hasWaking, 'the dream type sheet contains the waking reading');
});

await check('the waking type chip opens the waking type\u2019s own reading', async () => {
  await page.click('.dream-type-chip[data-dream-type-open="waking"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-type="waking"]', { timeout: 10000 });
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  const hasWaking = !!(await page.$('#dream-detail [data-waking-type-reading]'));
  const hasDream = !!(await page.$('#dream-detail [data-dream-type-reading-body]'));
  const facts = await page.$$eval('#dream-detail [data-waking-type-facts] .dream-fact', n => n.map(x => x.textContent.trim()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert(/\u6e05\u9192\u56fe\u89e3\u8bfb/.test(sheet), `the waking sheet is not labelled: ${sheet.slice(0, 80)}`);
  assert(hasWaking, 'the waking sheet has no waking reading block');
  assert(!hasDream, 'the waking sheet contains the sleep type reading');
  assert(facts.length >= 2, `the waking sheet lists ${facts.length} waking type facts`);
});

await check('a type sheet has no geometry, so the graph neither dims nor lights for it', async () => {
  await page.click('.dream-type-chip[data-dream-type-open="dream"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-type="dream"]', { timeout: 10000 });
  await page.waitForTimeout(200);
  const graph = await page.evaluate(() => {
    const svg = document.querySelector('#dream-bodygraph .bodygraph-svg');
    return { dimmed: !!svg?.classList.contains('bg-dimmed'), lit: document.querySelectorAll('#dream-bodygraph .bg-lit').length };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert(graph.dimmed === false, 'the graph dimmed for a type sheet that has no geometry');
  assert(graph.lit === 0, `${graph.lit} graph object(s) lit for a type sheet`);
});

await check('the open type sheet follows a language change and keeps its selection', async () => {
  await page.click('.dream-type-chip[data-dream-type-open="dream"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-type="dream"]', { timeout: 10000 });
  // The dialog is modal, so the header's language menu cannot be clicked; the app's
  // own `setLocale()` is called through the module the page already loaded (the same
  // module instance, via the URL the browser fetched), which is what a language
  // switch does internally.
  const setLocale = async code => page.evaluate(async next => {
    const url = performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .find(name => /\/src\/lib\/i18n\.js(?:\?|$)/.test(name));
    const mod = await import(url);
    mod.setLocale(next);
  }, code);

  const readSheet = () => page.evaluate(() => ({
    open: !document.getElementById('dream-detail').classList.contains('hidden'),
    type: document.querySelector('#dream-detail .gate-detail-card[data-type]')?.dataset.type || null,
    label: document.querySelector('#dream-detail .detail-label')?.textContent.trim() || '',
    parts: [...document.querySelectorAll('#dream-detail .dream-type-reading-part dt')].map(n => n.textContent.trim())
  }));

  await setLocale('en');
  await page.waitForTimeout(700);
  const english = await readSheet();
  await setLocale('zh-CN');
  await page.waitForTimeout(700);
  const back = await readSheet();
  // Close before asserting so the modal cannot cascade into later checks, and make
  // sure the page is left in the language the rest of the run expects.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  assert(english.open, 'the type sheet closed on a language change');
  assert(english.type === 'dream', `the type sheet lost its selection: ${english.type}`);
  // `Asleep` is the dream half's label key; English shows the key text itself.
  assert(english.label === 'Asleep', `the type sheet did not translate: ${english.label}`);
  assert(english.parts.includes('Mechanical definition'), `English parts: ${english.parts}`);
  assert(back.open, 'the type sheet closed when the language switched back');
  assert(back.label === '\u68a6\u5883', `label after switching back: ${back.label}`);
  assert(back.parts.includes('\u673a\u68b0\u5b9a\u4e49'), `parts after switching back: ${back.parts}`);
  const locale = await page.evaluate(() => document.documentElement.lang);
  assert(locale === 'zh-CN', `the run was left in ${locale}`);
});

await check('each portal plaque carries the night collection and the morning bleed-through', async () => {
  const blocks = await page.$$eval('.dream-portal-reading-block', n => n.length);
  assert(blocks === 3, `${blocks} portal readings for three night fields`);
  const first = await page.$('.dream-realm-light .dream-portal-reading-block');
  await first.evaluate(node => { node.open = true; });
  const reading = await first.$eval('[data-dream-portal-reading]', n => n.textContent);
  assert(/\u591c\u95f4\u84c4\u79ef/.test(reading), `no night collection: ${reading.slice(0, 80)}`);
  assert(/\u6ea2\u51fa\u76ee\u6807/.test(reading), `no bleed-through target: ${reading.slice(0, 80)}`);
  assert(/\u6e05\u6668\u9006\u5411\u6ea2\u51fa/.test(reading), `no morning bleed-through: ${reading.slice(0, 80)}`);
  assert(/\u7709\u5fc3\u4e2d\u5fc3/.test(reading), `the light-field portal does not name the Ajna as its target: ${reading.slice(0, 120)}`);
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

await check('a channel sheet prints no waking circuit badges', async () => {
  // The waking catalogue's circuit badges explain the channel inside the waking
  // system; this sheet answers the night question with the teacher's material only.
  const badges = await page.$$eval('#dream-detail .channel-circuit-badges', n => n.length);
  assert(badges === 0, `the channel sheet still prints ${badges} waking circuit badge group(s)`);
  const heading = await page.evaluate(() => {
    const card = document.querySelector('#dream-detail .gate-detail-card[data-channel]');
    return card && {
      label: card.querySelector('.detail-label')?.textContent.trim() || '',
      name: card.querySelector('.detail-name')?.textContent.trim() || '',
      panelTitle: !!card.querySelector('.panel-title')
    };
  });
  assert(heading && heading.label && heading.name, `channel heading ${JSON.stringify(heading)}`);
  assert(!heading.panelTitle, 'the channel sheet still uses the old panel-title heading');
});

await check('a centre sheet is titled with the shared label and name pair', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const center = await page.$eval('#dream-bodygraph .bg-center[data-center]', n => n.dataset.center);
  await page.click(`#dream-bodygraph .bg-center[data-center="${center}"]`);
  await page.waitForSelector('#dream-detail .gate-detail-card[data-center]', { timeout: 10000 });
  const heading = await page.evaluate(() => {
    const card = document.querySelector('#dream-detail .gate-detail-card[data-center]');
    return {
      label: card.querySelector('.detail-label')?.textContent.trim() || '',
      name: card.querySelector('.detail-name')?.textContent.trim() || '',
      panelTitle: !!card.querySelector('.panel-title'),
      subtype: card.querySelector('.dream-detail-subhead')?.textContent.trim() || ''
    };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // A centre's identifier is its name, so the heading is the shared `.detail-name`
  // alone \u2014 no eyebrow repeating "Center" above "Throat Center".
  assert(heading.name.length > 0, 'centre name is empty');
  assert(!heading.panelTitle, 'the centre sheet still uses the old panel-title heading');
});


await check('closing a sheet ends its selection, so the next sheet has no stray Back', async () => {
  // The regression: `current` survived the close, so the first step of the next
  // sheet pushed it into `history` and offered a Back into a sheet nobody came from.
  // Start from a closed sheet: the check above leaves its own channel card open.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.click('.dream-column-row[data-gate]');
  await page.waitForSelector('#dream-detail:not(.hidden)', { timeout: 10000 });
  await page.waitForTimeout(150);
  await page.click('#dream-detail .gate-detail-close');
  await page.waitForTimeout(250);
  await page.click('.dream-channel-open');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-channel]', { timeout: 10000 });
  const back = await page.$('#dream-detail .gate-detail-back');
  assert(!back, 'the reopened sheet offered a Back button into the closed sheet');
  // Navigating inside one sheet still offers Back, and it returns where it came from.
  const gate = await page.$eval('#dream-detail .dream-detail-gate-link', n => n.dataset.sharedGateSelect);
  await page.click('#dream-detail .dream-detail-gate-link');
  await page.waitForTimeout(250);
  assert(await page.$('#dream-detail .gate-detail-card[data-gate]'), 'the gate link did not open the gate sheet');
  const backButton = await page.$('#dream-detail .gate-detail-back');
  assert(backButton, 'a step inside an open sheet has no Back button');
  await backButton.click();
  await page.waitForTimeout(250);
  assert(await page.$(`#dream-detail .gate-detail-card[data-channel]`), `Back left gate ${gate} without returning to the channel`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
});

await check('the open sheet keeps its gate lit in the lists, and closing releases it', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.click('.dream-column-row[data-gate]');
  await page.waitForSelector('#dream-detail:not(.hidden)', { timeout: 10000 });
  await page.waitForTimeout(300);
  const gate = await page.$eval('#dream-detail .gate-detail-card[data-gate]', n => n.dataset.gate);
  // Move the pointer off the row and the graph first: the sheet pins its gate, and
  // the pin is what must keep the rows lit with nobody hovering them.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  const lit = await page.evaluate(g => [...document.querySelectorAll(`#dream-content .dream-column-row[data-gate="${g}"]`)]
    .every(node => node.classList.contains('row-lit')), gate);
  assert(lit, `the pinned gate ${gate} is not lit in the activation columns`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // The shared dialog returns focus to the row that opened it, and a focused row
  // legitimately lights its gate (keyboard focus highlight), so the row is blurred
  // before asking whether the *pin* was released.
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  const after = await page.$$eval('#dream-content .row-lit', n => n.length);
  assert(after === 0, `${after} rows stayed lit after the sheet closed, focus left and the pin was released`);
});

await check('a channel carried from birth reads as fixed, a filled-in one as conditioned', async () => {
  // The teacher's dream channel names, so a sheet printing the waking catalogue
  // name fails here even where the two agree (20-57 is the Brain Wave in both).
  const DREAM_CHANNEL_NAMES = {
    '1-8': '\u542f\u53d1\u901a\u9053', '5-15': '\u97f5\u5f8b\u901a\u9053', '20-57': '\u8111\u6ce2\u901a\u9053',
    '27-50': '\u4fdd\u5b58\u901a\u9053', '28-38': '\u6323\u624e\u901a\u9053', '42-53': '\u5468\u671f\u901a\u9053'
  };
  const rows = await page.$$eval('.dream-channel-open', nodes => nodes.map(node => ({
    id: node.dataset.channel,
    variant: [...node.classList]
      .map(name => name.replace('dream-channel-open-', ''))
      .find(name => ['natal', 'completed', 'transit', 'inactive'].includes(name))
  })));
  assert(rows.length === 6, `${rows.length} channel rows on the page`);
  const seen = new Set();
  for (const row of rows) {
    await page.click(`.dream-channel-open[data-channel="${row.id}"]`);
    await page.waitForSelector('#dream-detail .gate-detail-card[data-channel]', { timeout: 10000 });
    const cases = await page.$$eval('#dream-detail [data-dream-channel-case]', n => n.map(x => x.dataset.dreamChannelCase));
    // The source decides which of the teacher's two cases is printed, and only one
    // of them is: a channel carried from birth is a fixed dream landscape, a
    // channel completed by the night sky is conditioning, an inactive one has no
    // case at all.
    if (row.variant === 'natal') {
      assert(JSON.stringify(cases) === JSON.stringify(['fixed']), `${row.id} (carried from birth) printed ${cases}`);
      seen.add('fixed');
    } else if (row.variant === 'inactive') {
      assert(cases.length === 0, `${row.id} (inactive) printed a case: ${cases}`);
    } else {
      assert(JSON.stringify(cases) === JSON.stringify(['conditioning']), `${row.id} (${row.variant}) printed ${cases}`);
      seen.add('conditioning');
    }
    const title = await page.$eval('#dream-detail .dream-detail-channel-title', n => n.textContent.trim());
    assert(title === DREAM_CHANNEL_NAMES[row.id],
      `channel ${row.id} is titled "${title}", expected the dream name ${DREAM_CHANNEL_NAMES[row.id]}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
  assert(seen.has('fixed'), 'the fixture carries no dream channel from birth, so the fixed case is unproven');
  // Leave one fixed-case channel sheet on disk for visual review.
  await page.click('.dream-channel-open.dream-channel-open-natal');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-channel]', { timeout: 10000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, 'single-channel-sheet-fixed.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
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
  // A finished render leaves no status line, and a language change must not
  // resurrect the "Computing…" message that was cleared when it ended.
  const status = await page.$eval('#dream-status', n => ({ text: n.textContent.trim(), key: n.dataset.i18n || null }));
  assert(status.text === '', `status line still reads "${status.text}" after a language switch`);
  assert(status.key === null, `the cleared status line kept its source key "${status.key}"`);
  // The reading content follows the language too, not only the chrome: the type
  // reading, the frame sentences and the portal blocks are all owned by the
  // locale's dream vocabulary.
  // The type reading lives in its own sheet now, so it is opened to read it.
  // Read first, close, then assert: a failed assertion must not leave the modal
  // sheet open over the controls the next check has to click.
  await page.click('.dream-type-chip[data-dream-type-open="dream"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-type="dream"]', { timeout: 10000 });
  const typeParts = await page.$$eval('#dream-detail .dream-type-reading-part dt', n => n.map(x => x.textContent.trim()));
  const typeTitle = await page.$eval('#dream-detail .gate-detail-card[data-type="dream"] .detail-name', n => n.textContent.trim());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert(typeParts.includes('Mechanical definition'), `English type reading parts: ${typeParts}`);
  assert(typeParts.includes('Operating state'), `English type reading parts: ${typeParts}`);
  // The type names are plain in English too: the comparison's own label says
  // which half this is.
  assert(/^(Reflector|Generator|Projector|Manifestor|Manifesting Generator)$/.test(typeTitle),
    `English sleep type name is "${typeTitle}"`);
  // The sheet's own half names read "Dream personality / Dream design" in English
  // through the English message catalogue: the stable keys are unchanged, so the
  // model and the sleep chart's calculation contract stay as they were.
  await page.click('.dream-column-row[data-gate]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-gate]', { timeout: 10000 });
  const enSources = await page.$$eval('#dream-detail .dream-detail-source-label', n => n.map(x => x.textContent.trim()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert(enSources.length > 0, 'the English gate sheet lists no activation source');
  assert(enSources.every(label => ['Dream personality', 'Dream design', 'Transit'].includes(label)),
    `English source labels are ${JSON.stringify(enSources)}`);
  const frame = await page.$eval('[data-dream-frame="sides"]', n => n.textContent);
  assert(/direction the dream evolves/.test(frame), `English frame line: ${frame}`);
  assert(/consciousness inside the dream/.test(frame), `English frame line: ${frame}`);
  const portalBlock = await page.$$eval('.dream-portal-reading-block > summary', n => n.map(x => x.textContent.trim()));
  assert(portalBlock.every(text => text === 'What this portal does'), `English portal summaries: ${portalBlock}`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});
await page.screenshot({ path: path.join(SHOTS, 'desktop-en.png'), fullPage: true });

await check('Traditional Chinese keeps the dream readings in its own wording', async () => {
  await chooseLanguage(page, 'zh-Hant');
  await page.waitForSelector('.dream-realm', { timeout: 10000 });
  await page.waitForTimeout(500);
  const title = await page.$eval('.dream-realm-light .dream-realm-title', n => n.textContent.trim());
  assert(title === '\u5149\u5834', `zh-Hant realm title is "${title}"`);
  await page.click('.dream-type-chip[data-dream-type-open="dream"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-type="dream"]', { timeout: 10000 });
  const typeParts = await page.$$eval('#dream-detail .dream-type-reading-part dt', n => n.map(x => x.textContent.trim()));
  const typeTitle = await page.$eval('#dream-detail .gate-detail-card[data-type="dream"] .detail-name', n => n.textContent.trim());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert(typeParts.includes('\u6a5f\u68b0\u5b9a\u7fa9'), `zh-Hant type reading parts: ${typeParts}`);
  // The plain type name in the region's own wording, without a \u5922\u5883 prefix.
  assert(/^(\u53cd\u6620\u8005|\u751f\u7522\u8005|\u6295\u5c04\u8005|\u986f\u793a\u8005|\u986f\u793a\u751f\u7522\u8005)$/.test(typeTitle),
    `zh-Hant sleep type name is "${typeTitle}"`);
  const frame = await page.$eval('[data-dream-frame="sources"]', n => n.textContent);
  // The region says \u6d41\u65e5 for Transit, following the existing key, not \u884c\u904b.
  assert(/\u6d41\u65e5/.test(frame), `zh-Hant frame line: ${frame}`);
  assert(!/\u884c\u904b/.test(frame), `zh-Hant frame line kept the Simplified/Japanese spelling: ${frame}`);
  // A portal's two stages are translated, not left in the Simplified wording.
  const portal = page.locator('.dream-realm-light .dream-portal-reading-block');
  await portal.evaluate(node => { node.open = true; });
  const portalText = await page.$eval('.dream-realm-light [data-dream-portal-reading]', n => n.textContent);
  assert(/\u591c\u9593\u84c4\u7a4d/.test(portalText), `zh-Hant night collection: ${portalText.slice(0, 60)}`);
  assert(/\u6e05\u6668\u9006\u5411\u6ea2\u51fa/.test(portalText), `zh-Hant morning bleed-through: ${portalText.slice(0, 60)}`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  await page.screenshot({ path: path.join(SHOTS, 'desktop-zh-Hant.png'), fullPage: true });
  await chooseLanguage(page, 'zh-CN');
  await page.waitForTimeout(400);
});

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
      if (skin.includes('contrast')) {
        await page.screenshot({ path: path.join(SHOTS, `single-desktop-${skin}.png`), fullPage: true });
      }
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

await check('the sleep page carries its own compare entry next to the shared time control', async () => {
  const label = await page.$eval('#dream-compare', n => n.textContent.trim());
  assert(label === '\u4e0e\u53e6\u4e00\u4e2a\u4eba\u5408\u56fe', `compare button reads "${label}"`);
  // The standalone refresh button is gone: the shared time control's Now button
  // covers it, so the toolbar carries the comparison entry only. The composite's
  // exit button lives here too but is hidden until a pair is on screen.
  const toolbar = await page.$$eval('.dream-toolbar button', n => n.filter(b => !b.hidden).map(b => b.id));
  assert(JSON.stringify(toolbar) === JSON.stringify(['dream-compare']), `toolbar buttons ${toolbar}`);
  const exitHidden = await page.$eval('#dream-compare-exit', n => n.hidden);
  assert(exitHidden === true, 'the composite exit button is shown on the single sleep chart');
  assert(!(await page.$('#dream-refresh')), 'the retired refresh button is still in the page');
  assert(await page.$('#dream-transit-now'), 'the time control lost its Now button');
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

await check('the composite keeps the same graph shell with both people\'s columns', async () => {
  // The defect this guards: the composite built the shared shell but filled
  // neither slot, so the natal chart's two side columns had no counterpart.
  const columns = await page.$$eval('#dream-composite-shell [data-slot="left"] .dream-column, #dream-composite-shell [data-slot="right"] .dream-column',
    nodes => nodes.map(n => ({ side: [...n.classList].find(c => /^dream-column-(design|personality)$/.test(c)), owner: n.dataset.owner, head: n.querySelector('.dream-column-head')?.textContent.trim() })));
  assert(columns.length === 4, `${columns.length} activation columns in the composite, expected 4`);
  for (const side of ['dream-column-design', 'dream-column-personality']) {
    for (const owner of ['E2E Dream', 'E2E Partner']) {
      assert(columns.some(c => c.side === side && c.owner === owner),
        `missing ${owner} ${side}; got ${JSON.stringify(columns)}`);
    }
  }
  // Each heading names its person, so two stacked columns stay tellable apart.
  for (const column of columns) {
    assert(column.head.includes(column.owner), `column heading "${column.head}" does not name ${column.owner}`);
  }
  // Left slot is person A, right slot is person B, as the connection composite does.
  const leftOwners = await page.$$eval('#dream-composite-shell [data-slot="left"] .dream-column', n => [...new Set(n.map(x => x.dataset.owner))]);
  const rightOwners = await page.$$eval('#dream-composite-shell [data-slot="right"] .dream-column', n => [...new Set(n.map(x => x.dataset.owner))]);
  assert(JSON.stringify(leftOwners) === JSON.stringify(['E2E Dream']), `left slot owners ${leftOwners}`);
  assert(JSON.stringify(rightOwners) === JSON.stringify(['E2E Partner']), `right slot owners ${rightOwners}`);
  // The columns are the same component as the single design's: same row markup.
  const rows = await page.$$eval('#dream-composite-shell .dream-column-row', n => n.map(x => Number(x.dataset.gate)));
  assert(rows.length > 0 && rows.every(g => EXPECTED_GATES.includes(String(g))),
    `composite column rows are not dream-gate activations: ${rows}`);
});

await check('a composite column row opens the composite ownership sheet', async () => {
  const gate = await page.$eval('#dream-composite-shell .dream-column-row', n => n.dataset.gate);
  await page.click(`#dream-composite-shell .dream-column-row[data-gate="${gate}"]`);
  await page.waitForSelector('#dream-detail:not(.hidden)', { timeout: 10000 });
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  assert(/\u7531|Carried by/.test(sheet), 'the column row opened a sheet without the ownership line');
  // Composite context, not the single design's three sources.
  assert(!/\u6e05\u9192\u4eba\u683c|Awake personality/.test(sheet),
    'the composite column row opened the single-design sheet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
});

// Four columns (two per slot) is the widest layout the sleep chart produces;
// the phone overflow guard above runs in single mode only, so assert it here.
await check('the composite stays inside a phone viewport', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `composite horizontal overflow of ${overflow}px`);
  const widths = await page.$$eval('#dream-composite-shell .dream-column', n => n.map(x => Math.round(x.getBoundingClientRect().width)));
  assert(widths.length === 4 && widths.every(w => w > 40 && w <= 180), `composite column widths ${widths}`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  await page.screenshot({ path: path.join(SHOTS, 'composite-phone.png'), fullPage: true });
  await page.setViewportSize({ width: 1380, height: 1000 });
  await page.waitForTimeout(400);
});

await check('the time control is hidden while the composite is shown', async () => {
  // The composite carries no overlay, so offering a moment would promise a change
  // that cannot happen.
  const hidden = await page.$eval('#dream-time-host', n => n.hidden);
  assert(hidden === true, 'the time control is still visible in comparison mode');
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

await check('comparison mode overlays no transit', async () => {
  // Structural, not textual: the intro sentence itself says the overlay is
  // absent, so the word appearing is expected. What must not exist is any
  // transit activation, transit ring or overlay timestamp.
  const text = await page.$eval('#dream-content', n => n.textContent);
  assert(!/\u5df2\u53e0\u52a0/.test(text), 'comparison carries the overlay timestamp notice');
  const rings = await page.$$eval('#dream-composite .bg-transit-ring', n => n.length);
  assert(rings === 0, `${rings} transit rings in the composite`);
  const transitSources = await page.$$eval('#dream-content .dream-row-source-transit', n => n.length);
  assert(transitSources === 0, `${transitSources} transit-source blocks in the composite`);
  const transitTags = await page.$$eval('#dream-content .dream-row-transit-tag', n => n.length);
  assert(transitTags === 0, `${transitTags} transit tags in the composite`);
  // The three night fields ARE part of the composite now, so assert they are
  // there and that their channel states are ownership states, never the single
  // design's overlay states ("由{行运}接通" / "仅{行运}接通").
  const realms = await page.$$eval('#dream-content .dream-realm', n => n.map(x => x.dataset.realm));
  assert(JSON.stringify(realms) === JSON.stringify(['light', 'earth', 'demon']),
    `composite night fields are ${JSON.stringify(realms)}`);
  const statuses = await page.$$eval('#dream-content .dream-realm .dream-channel-status', n => n.map(x => x.textContent.trim()));
  assert(statuses.length > 0, 'the composite night fields carry no channel states');
  assert(statuses.every(s => !/\u884c\u8fd0|\u6d41\u65e5|Transit/i.test(s)),
    `a composite channel state still reads as an overlay state: ${statuses.join(' | ')}`);
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

// ==========================================
// The composite's three night fields
// ==========================================
// A dedicated pair whose fifteen dream gates complete the six dream channels in
// all five ownership states at once, so the composite vocabulary is checked
// against real engine output instead of a fabricated model. Dates are built from
// numeric parts so the fixture stays readable without a bare date literal.
const isoDate = (year, month, day) => new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
const REALMS_A = { id: 'e2e-realms-a', name: 'E2E Realms A', date: isoDate(1986, 11, 17), time: '06:30' };
const REALMS_B = { id: 'e2e-realms-b', name: 'E2E Realms B', date: isoDate(1989, 2, 17), time: '06:30' };
/** The six dream channels of this pair, with the state each must report. */
const REALM_CHANNEL_STATES = {
  // `variant` is the badge/edge style the status table picks, `owner` the person
  // colour layered on top, `named` the person the wording must mention.
  '1-8': { status: 'both', variant: 'dream-channel-open-natal', owner: 'dream-channel-owner-both', named: null },
  '20-57': { status: 'a', variant: 'dream-channel-open-natal', owner: 'dream-channel-owner-a', named: 'a' },
  '42-53': { status: 'b', variant: 'dream-channel-open-natal', owner: 'dream-channel-owner-b', named: 'b' },
  '28-38': { status: 'halved', variant: 'dream-channel-open-completed', owner: 'dream-channel-owner-both', named: null },
  '5-15': { status: 'inactive', variant: 'dream-channel-open-inactive', owner: null, named: null },
  '27-50': { status: 'inactive', variant: 'dream-channel-open-inactive', owner: null, named: null }
};

await page.evaluate(pair => {
  const key = ['natal', 'engine', '_profiles'].join('');
  const people = JSON.parse(localStorage.getItem(key));
  for (const person of pair) {
    people.push({
      id: person.id, name: person.name, birthDate: person.date, birthTime: person.time,
      timeUnknown: false,
      location: { lat: null, lon: null, timezone: 0, iana: null, name: null },
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
    });
  }
  localStorage.setItem(key, JSON.stringify(people));
  window.dispatchEvent(new Event('ohd-people-changed'));
}, [REALMS_A, REALMS_B]);
await page.waitForTimeout(400);
await page.selectOption('#people-switcher', REALMS_A.id);
await page.waitForSelector('#chart-view:not(.hidden)', { timeout: 60000 });
await page.click('.nav-link[data-view="dream"]');
await page.waitForSelector('.dream-realm', { timeout: 60000 });
await page.waitForTimeout(400);
await page.click('#dream-compare');
const realmsPartner = await pickSecondPerson(page, REALMS_B.name);
assert(realmsPartner, 'the picker did not offer the second realm pair person');
await page.waitForSelector('#dream-composite', { timeout: 90000 });
await page.waitForSelector('.dream-compare-facts', { timeout: 60000 });
await page.waitForTimeout(700);

await check('the composite carries all three night fields, in reveal order', async () => {
  const realms = await page.$$eval('#dream-content .dream-realm', n => n.map(x => x.dataset.realm));
  assert(JSON.stringify(realms) === JSON.stringify(['light', 'earth', 'demon']),
    `composite night fields are ${JSON.stringify(realms)}`);
  // The field titles and the portal plaques are the single design's own markup.
  const titles = await page.$$eval('#dream-content .dream-realm-title', n => n.map(x => x.textContent.trim()));
  assert(titles.length === 3 && titles.every(Boolean), `composite field titles ${titles}`);
  const portals = await page.$$eval('#dream-content .dream-realm-portal .dream-portal-gate', n => n.map(x => x.textContent.trim()));
  assert(JSON.stringify(portals) === JSON.stringify(['62', '12', '19']), `composite portals ${portals}`);
  const wrappers = await page.$$eval('#dream-content .dream-realms', n => n.length);
  assert(wrappers === 1, `${wrappers} .dream-realms wrappers in the composite`);
});

await check('each person\u2019s waking and sleep types are buttons that open their own sheet', async () => {
  // Four chips: A and B, each with \u6e05\u9192 and \u68a6\u5883, the same comparison the single
  // design's strip offers \u2014 the page must not hide one person's half behind a
  // collapsed block, and no chip may read the loaded chart instead of its owner.
  const chips = await page.$$eval('.dream-compare-facts [data-dream-type-open]', nodes => nodes.map(node => ({
    owner: node.dataset.owner,
    side: node.dataset.dreamTypeOpen,
    name: node.textContent.trim()
  })));
  assert(chips.length === 4, `${chips.length} type chips, expected A/B \u00d7 waking/dream`);
  assert(JSON.stringify(chips.map(chip => `${chip.owner}:${chip.side}`))
    === JSON.stringify(['a:waking', 'a:dream', 'b:waking', 'b:dream']),
  `type chips are ${JSON.stringify(chips.map(chip => `${chip.owner}:${chip.side}`))}`);
  // The facts block no longer unfolds any type reading.
  assert(!(await page.$('.dream-compare-facts [data-dream-type-reading]')),
    'the facts block still embeds a type reading');
  assert(!(await page.$('.dream-compare-facts .dream-type-reading-parts')),
    'the facts block still embeds type reading parts');
  // The expected sleep type of B, read from the facts line rather than assumed, so a
  // sheet that opens somebody else's model fails here.
  const facts = await page.$$eval('.dream-compare-facts .dream-type-facts .dream-fact', n => n.map(x => x.textContent));
  const bFact = facts.find(text => text.includes(REALMS_B.name));
  assert(bFact, `no sleep-type fact for ${REALMS_B.name}: ${JSON.stringify(facts)}`);
  const expectedType = bFact.split('\uff1a').pop().trim();
  await page.mouse.move(5, 5);
  await page.click('.dream-compare-facts [data-dream-type-open="dream"][data-owner="b"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-type="dream"]', { timeout: 10000 });
  const sheet = await page.evaluate(() => ({
    owner: document.querySelector('#dream-detail .gate-detail-card[data-type="dream"]').dataset.owner,
    label: document.querySelector('#dream-detail .detail-label').textContent.trim(),
    name: document.querySelector('#dream-detail .detail-name').textContent.trim(),
    parts: document.querySelectorAll('#dream-detail .dream-type-reading-part').length,
    pinned: document.querySelectorAll('#dream-composite .bg-selected').length
  }));
  // A type has no geometry: the graph must stay undimmed, not dim around nothing.
  const graph = await page.evaluate(() => {
    const svg = document.querySelector('#dream-composite .bodygraph-svg');
    return {
      dimmed: !!svg?.classList.contains('bg-dimmed'),
      lit: document.querySelectorAll('#dream-composite .bg-lit').length
    };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  assert(sheet.owner === 'b', `the type sheet records owner ${sheet.owner}, expected b`);
  assert(sheet.name === expectedType, `B's sheet shows "${sheet.name}", the facts say "${expectedType}"`);
  assert(sheet.label.includes(REALMS_B.name), `the type sheet label does not name the person: ${sheet.label}`);
  assert(sheet.parts > 0, 'the type sheet has no reading parts');
  assert(sheet.pinned === 0, 'opening a type sheet pinned a gate that does not exist');
  assert(graph.dimmed === false, 'the composite graph dimmed for a type sheet that has no geometry');
  assert(graph.lit === 0, `${graph.lit} graph object(s) lit for a type sheet`);
});

await check('the night fields sit below the graph and above the fact block', async () => {
  // The user asked for the fields to move down under the composite bodygraph, so
  // the order is asserted on the real DOM, not on the source order.
  const order = await page.evaluate(() => {
    const kids = [...document.querySelectorAll('#dream-content > *')];
    const index = selector => kids.findIndex(node => node.matches(selector));
    return { shell: index('.dream-shell'), realms: index('.dream-realms'), facts: index('.dream-compare-facts') };
  });
  assert(order.shell >= 0, 'the composite lost its graph shell');
  assert(order.realms > order.shell, `.dream-realms (#${order.realms}) is not after the graph shell (#${order.shell})`);
  assert(order.realms < order.facts, `.dream-realms (#${order.realms}) is not before the facts (#${order.facts})`);
});

await check('an opened portal is marked, a closed one is not', async () => {
  const states = await page.$$eval('#dream-content .dream-realm', n => n.map(panel => ({
    realm: panel.dataset.realm,
    active: panel.querySelector('.dream-realm-portal')?.classList.contains('dream-portal-active') ?? null
  })));
  for (const state of states) assert(state.active !== null, `${state.realm} has no portal block`);
  // Only the demon portal (19) is carried by this pair; 62 and 12 are not.
  assert(JSON.stringify(states) === JSON.stringify([
    { realm: 'light', active: false }, { realm: 'earth', active: false }, { realm: 'demon', active: true }
  ]), `portal states ${JSON.stringify(states)}`);
});

await check('gate chips group by owner and keep the half as a second cue', async () => {
  // Gate 1 is carried by both people in both halves of their sleeping design.
  const chipGroups = await page.$$eval('#dream-content .dream-realm-row[data-gate="1"] .dream-row-source', nodes =>
    nodes.map(node => [...node.classList]));
  assert(chipGroups.length >= 2, `gate 1 has ${chipGroups.length} source groups, expected one per person and half`);
  const has = prefix => chipGroups.some(classes => classes.includes(prefix));
  assert(has('dream-row-source-owner-a'), 'gate 1 has no person-A group');
  assert(has('dream-row-source-owner-b'), 'gate 1 has no person-B group');
  // Colour is the owner cue; the solid/dashed rule must still say which half.
  assert(has('dream-row-source-personality'), 'gate 1 lost the personality rule style');
  assert(has('dream-row-source-design'), 'gate 1 lost the design rule style');
  // Every group is a person variant: no group without an owner colour.
  for (const classes of chipGroups) {
    assert(classes.some(c => c === 'dream-row-source-owner-a' || c === 'dream-row-source-owner-b'),
      `a gate group has no owner: ${classes.join(' ')}`);
  }
  // A gate only one person carries shows only that person's colour.
  const oneSided = await page.$$eval('#dream-content .dream-realm-demon .dream-realm-row[data-gate="28"] .dream-row-source',
    nodes => nodes.map(node => [...node.classList]));
  assert(oneSided.length > 0, 'gate 28 has no source group');
  assert(oneSided.every(classes => classes.includes('dream-row-source-owner-a') && !classes.includes('dream-row-source-owner-b')),
    `gate 28 mixes owners: ${JSON.stringify(oneSided)}`);
});

await check('a night-field row opens the ownership sheet, not the single-design one', async () => {
  const gate = await page.$eval('#dream-content .dream-realm-light .dream-row-open', n => n.dataset.gate);
  await page.click(`#dream-content .dream-realm-light .dream-row-open[data-gate="${gate}"]`);
  await page.waitForSelector('#dream-detail:not(.hidden)', { timeout: 10000 });
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  assert(/\u7531|Carried by/.test(sheet), `the field row opened a sheet without the ownership line (gate ${gate})`);
  // The three activation sources belong to the single sleep design only.
  assert(!/\u6e05\u9192\u4eba\u683c|Awake personality/.test(sheet),
    'the field row opened the single-design sheet');
  assert(!/\u884c\u8fd0|Transit/.test(sheet), 'the composite sheet names a transit source');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
});

await check('composite channel rows report all five ownership states', async () => {
  const channels = await page.$$eval('#dream-content .dream-channel-open', nodes => Object.fromEntries(nodes.map(node => [
    node.dataset.channel,
    {
      classes: [...node.classList],
      status: node.querySelector('.dream-channel-status')?.textContent.trim() || '',
      split: node.querySelector('.dream-channel-split')?.textContent.trim() || null
    }
  ])));
  assert(Object.keys(channels).length === 6, `the composite lists ${Object.keys(channels).length} channels, expected 6`);
  const seen = new Set();
  for (const [key, expected] of Object.entries(REALM_CHANNEL_STATES)) {
    const found = channels[key];
    assert(found, `channel ${key} is missing from the composite`);
    assert(!/\u884c\u8fd0|\u6d41\u65e5|Transit/i.test(found.status), `channel ${key} still reads as an overlay state: ${found.status}`);
    seen.add(expected.status);
    // The variant class is the badge/edge style; it must match the state, and
    // the inactive style must never appear on a channel the pair completes.
    assert(found.classes.includes(expected.variant),
      `channel ${key} (${expected.status}) lacks ${expected.variant}: ${found.classes.join(' ')}`);
    if (expected.status === 'inactive') {
      assert(found.classes.every(c => !c.startsWith('dream-channel-owner-')), `channel ${key} claims an owner`);
      assert(found.classes.every(c => c !== 'dream-channel-open-natal' && c !== 'dream-channel-open-completed'),
        `channel ${key} is styled as complete and unowned: ${found.classes.join(' ')}`);
      assert(found.split === null, `channel ${key} shows a split for an incomplete channel`);
    } else {
      assert(found.classes.includes(expected.owner), `channel ${key} lacks ${expected.owner}: ${found.classes.join(' ')}`);
      assert(!found.classes.includes('dream-channel-open-inactive'), `channel ${key} is both complete and inactive`);
      assert(found.status.length > 0, `channel ${key} has no wording`);
      // An a/b channel names the person who completes it; the wording follows the
      // owner class instead of being a separate, unrelated string.
      if (expected.named === 'a') assert(found.status.includes(REALMS_A.name), `channel ${key} does not name ${REALMS_A.name}: ${found.status}`);
      if (expected.named === 'b') assert(found.status.includes(REALMS_B.name), `channel ${key} does not name ${REALMS_B.name}: ${found.status}`);
      if (expected.named === null) {
        assert(!found.status.includes(REALMS_A.name) && !found.status.includes(REALMS_B.name),
          `channel ${key} names a person it should not: ${found.status}`);
      }
    }
  }
  assert(JSON.stringify([...seen].sort()) === JSON.stringify(['a', 'b', 'both', 'halved', 'inactive']),
    `the pair covers ${[...seen].sort()}, not all five ownership states`);
  // The words are the composite's own: never the single design's four states.
  const statuses = Object.values(channels).map(channel => channel.status);
  assert(!statuses.includes('\u5728\u7761\u7720\u8bbe\u8ba1\u4e2d\u5b8c\u6574'),
    'a composite channel uses the single design wording for a complete channel');
  assert(!statuses.includes('\u5728\u7761\u7720\u8bbe\u8ba1\u4e2d\u672a\u6210\u5f62'),
    'a composite channel uses the single design wording for an incomplete channel');
});

await check('a composite channel sheet agrees with its own row about completeness', async () => {
  // The regression this guards: the sheet asked the single-design models for
  // completeness, and in composite mode both are null \u2014 so every channel read "not
  // complete across both" while its reading printed the completed case.
  const rows = await page.$$eval('#dream-content .dream-channel-open[data-channel]', nodes => nodes.map(node => ({
    id: node.dataset.channel,
    complete: ![...node.classList].includes('dream-channel-open-inactive')
  })));
  assert(rows.length === 6, `${rows.length} composite channel rows`);
  const sheetStatus = {};
  for (const row of rows) {
    await page.click(`#dream-content .dream-channel-open[data-channel="${row.id}"]`);
    await page.waitForSelector('#dream-detail .gate-detail-card[data-channel]', { timeout: 10000 });
    sheetStatus[row.id] = await page.$eval('#dream-detail .gate-detail-card[data-channel] .transit-source-badge',
      n => n.textContent.trim());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }
  for (const row of rows) {
    const text = sheetStatus[row.id];
    assert(text, `channel ${row.id} sheet has no status badge`);
    if (row.complete) {
      assert(!/\u672a\u5b8c\u6574|Not complete/.test(text),
        `channel ${row.id} is complete on the page but its sheet says "${text}"`);
    } else {
      assert(/\u672a\u5b8c\u6574|Not complete/.test(text),
        `channel ${row.id} is incomplete on the page but its sheet says "${text}"`);
    }
  }
  // The specific wordings the pair's five states should reach, not just "not the
  // other one": both / one person / one gate each.
  assert(/\u5728\u4e24\u4efd\u7761\u7720\u8bbe\u8ba1\u4e2d\u90fd\u5b8c\u6574/.test(sheetStatus['1-8']),
    `1-8 (both) reads "${sheetStatus['1-8']}"`);
  assert(sheetStatus['20-57'].includes(REALMS_A.name), `20-57 (A only) does not name A: ${sheetStatus['20-57']}`);
  assert(sheetStatus['42-53'].includes(REALMS_B.name), `42-53 (B only) does not name B: ${sheetStatus['42-53']}`);
  assert(/\u4ec5\u5408\u5e76\u540e\u6709\u5b9a\u4e49/.test(sheetStatus['28-38']),
    `28-38 (one gate each) reads "${sheetStatus['28-38']}"`);
});

await check('a halved channel names both people and the gate each contributes', async () => {
  const split = await page.$eval('#dream-content .dream-channel-open[data-channel="28-38"] .dream-channel-split',
    n => n.textContent.replace(/\s+/g, ' ').trim());
  assert(split.includes(REALMS_A.name), `the split does not name ${REALMS_A.name}: ${split}`);
  assert(split.includes(REALMS_B.name), `the split does not name ${REALMS_B.name}: ${split}`);
  assert(/\b28\b/.test(split) && /\b38\b/.test(split), `the split does not carry both gate numbers: ${split}`);
  // The definition comes from neither design alone, so the badge says so.
  const status = await page.$eval('#dream-content .dream-channel-open[data-channel="28-38"] .dream-channel-status',
    n => n.textContent.trim());
  assert(status === '\u4ec5\u5408\u5e76\u540e\u6709\u5b9a\u4e49', `halved badge reads "${status}"`);
  // No other channel pretends to be halved.
  const splits = await page.$$eval('#dream-content .dream-channel-split', n => n.length);
  assert(splits === 1, `${splits} channels show a split, expected only 28-38`);
});

await check('a channel neither design carries alone is read as conditioning', async () => {
  // 28-38 is halved for this pair: one gate from each person. Neither sleeping
  // design carries it, so the sheet must print the conditioned case, not the fixed
  // one — that split is the core of the channel teaching. This is the second
  // source of conditioning the single-design page cannot cover deterministically.
  await page.click('#dream-content .dream-channel-open[data-channel="28-38"]');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-channel="28-38"]', { timeout: 10000 });
  const cases = await page.$$eval('#dream-detail [data-dream-channel-case]', n => n.map(x => x.dataset.dreamChannelCase));
  assert(JSON.stringify(cases) === JSON.stringify(['conditioning']),
    `a halved channel printed ${JSON.stringify(cases)}, expected the conditioned case`);
  const sheet = await page.$eval('#dream-detail', n => n.textContent);
  assert(/\u6697\u591c\u5236\u7ea6/.test(sheet), `no night conditioning heading: ${sheet.slice(0, 80)}`);
  assert(/\u5316\u5b66\u6b8b\u7559|\u5236\u7ea6\u6b8b\u7559/.test(sheet), 'the conditioned reading names no residue');
  await page.keyboard.press('Escape');
  // The clicked row is still under the pointer, and a channel row highlights its two
  // gates on hover; the modal appears over it before the browser re-hit-tests, so the
  // highlight would otherwise survive into the next check's graph. Clear it the way
  // the row's own handler expects, then park the pointer away from the page.
  await page.evaluate(() => {
    for (const row of document.querySelectorAll('.dream-channel-open')) {
      row.dispatchEvent(new PointerEvent('pointerleave'));
    }
  });
  await page.mouse.move(4, 4);
  await page.waitForTimeout(300);
});

await check('an empty composite field uses the composite wording, not the single-design one', async () => {
  const empty = await page.$eval('#dream-content .dream-realm-earth .dream-realm-empty', n => n.textContent.trim());
  assert(empty === '\u4e24\u4eba\u7684\u7761\u7720\u8bbe\u8ba1\u5728\u6b64\u573a\u57df\u90fd\u6ca1\u6709\u6fc0\u6d3b\u3002',
    `the empty composite field reads "${empty}"`);
  const body = await page.$eval('#dream-content', n => n.textContent);
  assert(!body.includes('\u4eca\u591c\u6b64\u573a\u57df\u6ca1\u6709\u6fc0\u6d3b\u3002'),
    'the composite still uses the single-design empty line');
  const rows = await page.$$eval('#dream-content .dream-realm-earth .dream-realm-row', n => n.length);
  assert(rows === 0, `the empty earth field lists ${rows} rows`);
});

await check('hovering a composite channel row lights its two gates', async () => {
  // `bindChannelHover` is the only bridge between the field rows and the graph,
  // so a channel row that stopped binding would silently lose this.
  const before = await page.$$eval('#dream-composite .bg-lit', n => n.length);
  await page.hover('#dream-content .dream-channel-open[data-channel="28-38"]');
  await page.waitForTimeout(250);
  const lit = await page.$$eval('#dream-composite .bg-gate.bg-lit', n => n.map(x => x.dataset.gate).sort());
  const dimmed = await page.$eval('#dream-composite svg', n => n.classList.contains('bg-dimmed'));
  assert(before === 0, `${before} nodes were already lit before the hover`);
  assert(JSON.stringify(lit) === JSON.stringify(['28', '38']), `hovering 28-38 lit ${JSON.stringify(lit)}`);
  assert(dimmed, 'the hover did not dim the rest of the graph');
  await page.mouse.move(4, 4);
  await page.waitForTimeout(250);
  const cleared = await page.$$eval('#dream-composite .bg-lit', n => n.length);
  assert(cleared === 0, `${cleared} nodes stayed lit after the pointer left`);
});

await check('the composite readings survive dark and high-contrast skins', async () => {
  // Open the demon field's portal so the screenshot shows the new reading, not
  // just the graph.
  await page.locator('#dream-content .dream-realm-demon .dream-portal-reading-block')
    .evaluate(node => { node.open = true; });
  // Contrast has to be measured on composited pixels: the field tint is a
  // translucent `color-mix()`, so a flat rgb() parse would read it as near-black.
  const measure = () => page.$eval('#dream-content .dream-realm-demon .dream-portal-reading .dream-reading-row', node => {
    const parse = css => {
      const rgb = css.match(/^rgba?\(([^)]+)\)$/);
      if (rgb) {
        const parts = rgb[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
        return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
      }
      const srgb = css.match(/^color\(srgb ([^)]+)\)$/);
      if (srgb) {
        const parts = srgb[1].split(/[\s\/]+/).filter(Boolean).map(Number);
        return { r: parts[0] * 255, g: parts[1] * 255, b: parts[2] * 255, a: parts.length > 3 ? parts[3] : 1 };
      }
      return { r: 0, g: 0, b: 0, a: 0 };
    };
    const over = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1
    });
    const lum = ({ r, g, b }) => {
      const channel = value => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const layers = [];
    for (let el = node; el; el = el.parentElement) layers.push(getComputedStyle(el).backgroundColor);
    let background = { r: 255, g: 255, b: 255, a: 1 };
    for (const css of layers.reverse()) {
      const layer = parse(css);
      if (layer.a > 0) background = over(layer, background);
    }
    const text = parse(getComputedStyle(node).color);
    const foreground = text.a < 1 ? over(text, background) : text;
    const a = lum(foreground);
    const b = lum(background);
    return {
      color: getComputedStyle(node).color,
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    };
  });
  const seen = [];
  for (const skin of ['default-dark', 'high-contrast']) {
    await applySkin(page, skin);
    await page.waitForSelector('#dream-content .dream-realm', { timeout: 15000 });
    await page.waitForTimeout(320);
    const applied = await page.evaluate(() => document.documentElement.dataset.skin);
    assert(applied === skin, `skin ${skin} did not apply: ${applied}`);
    const colors = await measure();
    // The prose must stay readable: the tokens, not hard-coded colours, decide it.
    assert(colors.ratio >= 4.5, `skin ${skin}: dream prose contrast is ${colors.ratio.toFixed(2)}:1`);
    seen.push(colors.color);
    await page.screenshot({ path: path.join(SHOTS, `composite-desktop-${skin}.png`), fullPage: true });
  }
  assert(seen[0] !== seen[1], `both skins paint the dream prose ${seen[0]}`);
  await applySkin(page, 'default-light');
  await page.waitForTimeout(300);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

await check('the composite night fields survive a language switch and follow it', async () => {
  await chooseLanguage(page, 'en');
  await page.waitForSelector('#dream-content .dream-realm', { timeout: 15000 });
  await page.waitForTimeout(500);
  let realms = await page.$$eval('#dream-content .dream-realm', n => n.map(x => x.dataset.realm));
  assert(JSON.stringify(realms) === JSON.stringify(['light', 'earth', 'demon']), `English realms ${realms}`);
  const enTitle = await page.$eval('#dream-content .dream-realm-light .dream-realm-title', n => n.textContent.trim());
  assert(enTitle === 'Light Field', `English field title is "${enTitle}"`);
  // The person names stay untranslated; only the design vocabulary follows.
  const enLabels = await page.$$eval('#dream-content .dream-realm-row[data-gate="1"] .dream-row-source-label',
    n => n.map(x => x.textContent.trim()));
  assert(enLabels.length >= 2, `English gate 1 has ${enLabels.length} source labels`);
  assert(enLabels.some(label => label.startsWith(REALMS_A.name)), `English labels lost ${REALMS_A.name}: ${JSON.stringify(enLabels)}`);
  assert(enLabels.every(label => /Dream (design|personality)/.test(label)),
    `English labels do not all name the half in English: ${JSON.stringify(enLabels)}`);
  assert(enLabels.every(label => !/Sleep (design|personality)/.test(label)),
    `English labels still use the internal key wording: ${JSON.stringify(enLabels)}`);
  const enEmpty = await page.$eval('#dream-content .dream-realm-earth .dream-realm-empty', n => n.textContent.trim());
  assert(enEmpty === 'Neither sleep design activates this field.', `English empty line is "${enEmpty}"`);
  await page.screenshot({ path: path.join(SHOTS, 'composite-desktop-en.png'), fullPage: true });

  await chooseLanguage(page, 'zh-Hant');
  await page.waitForSelector('#dream-content .dream-realm', { timeout: 15000 });
  await page.waitForTimeout(500);
  realms = await page.$$eval('#dream-content .dream-realm', n => n.map(x => x.dataset.realm));
  assert(JSON.stringify(realms) === JSON.stringify(['light', 'earth', 'demon']), `zh-Hant realms ${realms}`);
  const hantTitle = await page.$eval('#dream-content .dream-realm-light .dream-realm-title', n => n.textContent.trim());
  assert(hantTitle === '\u5149\u5834', `zh-Hant field title is "${hantTitle}"`);
  const hantLabels = await page.$$eval('#dream-content .dream-realm-row[data-gate="1"] .dream-row-source-label',
    n => n.map(x => x.textContent.trim()));
  // The two halves are named with the sleep vocabulary in the region's wording.
  assert(hantLabels.some(label => label.includes('\u5922\u5883\u8a2d\u8a08') || label.includes('\u5922\u5883\u4eba\u683c')),
    `zh-Hant labels did not translate the half: ${JSON.stringify(hantLabels)}`);
  assert(hantLabels.every(label => !/Sleep (design|personality)|Dream (design|personality)/.test(label)),
    `zh-Hant labels kept the English half name: ${JSON.stringify(hantLabels)}`);
  await page.screenshot({ path: path.join(SHOTS, 'composite-desktop-zh-Hant.png'), fullPage: true });

  await chooseLanguage(page, 'zh-CN');
  await page.waitForSelector('#dream-content .dream-realm', { timeout: 15000 });
  await page.waitForTimeout(500);
  const backTitle = await page.$eval('#dream-content .dream-realm-light .dream-realm-title', n => n.textContent.trim());
  assert(backTitle === '\u5149\u573a', `field title after switching back is "${backTitle}"`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

await check('the composite night fields stack on a phone without overflowing', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `composite fields overflow the phone by ${overflow}px`);
  // One column on a phone is the existing behaviour; the count must stay three.
  const realms = await page.$$eval('#dream-content .dream-realm', n => n.map(x => x.dataset.realm));
  assert(JSON.stringify(realms) === JSON.stringify(['light', 'earth', 'demon']), `phone realms ${realms}`);
  const columns = await page.$eval('#dream-content .dream-realms', n => getComputedStyle(n).gridTemplateColumns);
  assert(columns.trim().split(/\s+/).length === 1, `phone grid is "${columns}", expected a single column`);
  assert(pageErrors.length === 0, pageErrors.join(' | '));
  await page.setViewportSize({ width: 1380, height: 1000 });
  await page.waitForTimeout(500);
});

await check('no page or sheet text renders a literal undefined, NaN or [object Object]', async () => {
  // Regression guard. The single-design channel sheet numbered its gate rows from
  // the activation item, and `gatesByNumber` entries carry `{ planet, line }` with
  // no gate, so every source label read "undefined.3". That branch only runs
  // outside the composite, so both modes are swept here: a composite-only check
  // passes vacuously. The gate.line shape check pins the intended format.
  const dirty = /undefined|NaN|\[object Object\]/;
  const shown = () => page.evaluate(() =>
    `${document.getElementById('dream-content')?.textContent || ''} || ${document.getElementById('dream-detail')?.textContent || ''}`);
  const evidence = text => text.match(/.{0,40}(?:undefined|NaN|\[object Object\]).{0,20}/)?.[0] || text.slice(0, 90);

  const sweepChannelSheets = async mode => {
    const channels = await page.$$eval('#dream-content .dream-channel-open', ns => ns.map(n => n.dataset.channel));
    assert(channels.length > 0, `${mode}: no channel rows to sweep`);
    let labelled = 0;
    for (const id of channels) {
      await page.click(`#dream-content .dream-channel-open[data-channel="${id}"]`);
      await page.waitForSelector(`#dream-detail .gate-detail-card[data-channel="${id}"]`, { timeout: 10000 });
      const text = await shown();
      assert(!dirty.test(text), `${mode}: channel ${id} sheet renders a placeholder value: ${evidence(text)}`);
      const labels = await page.$$eval('#dream-detail .dream-detail-gate-src', ns => ns.map(n => n.textContent.trim()));
      for (const label of labels) {
        assert(/\d+\.\d/.test(label), `${mode}: channel ${id} gate source label is not gate.line: "${label}"`);
      }
      labelled += labels.length;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    // Counted across the sweep, not per channel: a channel the sleeper does not
    // carry prints no source labels at all, which is correct. Requiring labels on
    // every channel would fail on an inactive one, while requiring none would let
    // the check pass without ever reading the branch the bug lived in.
    if (mode === 'single') {
      assert(labelled > 0, 'single: no channel sheet printed any gate source label, so the numbering was never exercised');
    }
    return labelled;
  };
  const sweepGateSheet = async mode => {
    await page.click('#dream-content .dream-realm-row .dream-row-open');
    await page.waitForSelector('#dream-detail:not(.hidden)', { timeout: 10000 });
    const text = await shown();
    assert(!dirty.test(text), `${mode}: the gate sheet renders a placeholder value: ${evidence(text)}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  };

  await sweepChannelSheets('composite');
  await sweepGateSheet('composite');
  const compositeText = await shown();
  assert(!dirty.test(compositeText), `the composite page renders a placeholder value: ${evidence(compositeText)}`);

  // Leave the composite: the buggy branch is the single design's own.
  await page.click('#dream-compare-exit');
  await page.waitForSelector('#dream-bodygraph', { timeout: 30000 });
  await page.waitForTimeout(700);
  await sweepChannelSheets('single');
  await sweepGateSheet('single');
  const singleText = await shown();
  assert(!dirty.test(singleText), `the single sleep chart renders a placeholder value: ${evidence(singleText)}`);
});

await check('no errors accumulated across the whole run', async () => {
  assert(pageErrors.length === 0, pageErrors.join(' | '));
});

await browser.close();
console.log(`\n${failures === 0 ? 'ALL E2E CHECKS PASSED' : `${failures} E2E CHECK(S) FAILED`}`);
console.log(`screenshots: ${SHOTS}`);
process.exit(failures === 0 ? 0 : 1);
