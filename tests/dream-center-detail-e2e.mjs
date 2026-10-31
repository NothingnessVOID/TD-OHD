/**
 * Sleep chart — centre sheet, end-to-end.
 *
 *   npx vite --host 127.0.0.1 --port 10025 --strictPort    # one terminal
 *   E2E_URL=http://127.0.0.1:10025 node tests/dream-center-detail-e2e.mjs
 *
 * The sheet answers "what sits in this centre at night", so it must not be a list
 * of tonight's activations:
 *
 * 1. A centre holds every dream gate of the topology — the natal one, the gate only
 *    the transit overlay fills, the portal with no channel, and the gate nobody
 *    carries. The old sheet filtered `data.dream.gates.all`, so the last two were
 *    missing and a reader could not open them.
 * 2. The centre's state is the state of the graph on screen (`model.definedCenters`),
 *    and it says whether the sleep design or the overlay defines it. Reading
 *    `data.dream.centers.defined` answered the natal question only.
 * 3. Two sleeping designs have no overlay, so ownership replaces the sources and
 *    the sheet must still list the gates: A only, B only, both, neither.
 * 4. The channel list is the six-channel sleep topology that touches the centre,
 *    with its real state — one natal gate beside an empty one is not "complete".
 *
 * The first block is a deterministic fixture: the models are built from a fixed
 * activation list in the page, never from the engine or the clock, so the same
 * three sources exist on every run. The second block drives the real page.
 *
 * Both blocks run on the modules the application itself loaded, resolved from the
 * browser's resource timings. A dev server under HMR serves them as
 * `/src/lib/x.js?t=<stamp>`; importing the bare path would build a second module
 * instance, and a language change would then repaint a copy nobody renders while
 * the page stayed in the old language.
 *
 * Screenshots land in /tmp by default; point E2E_SHOTS at a scratch directory to
 * move them. Nothing here writes into the repository.
 */

import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:10025';
const SHOTS = process.env.E2E_SHOTS
  ? path.resolve(process.env.E2E_SHOTS)
  : path.join('/tmp', 'tdohd-dream-center-shots');
mkdirSync(SHOTS, { recursive: true });

/**
 * The sleep topology these sheets describe, written out here rather than imported:
 * the assertion is that the sheet lists this set, so deriving it from the same
 * module the sheet reads would assert nothing. Failing here is the signal that the
 * topology changed and the sheet's promises need re-reading.
 */
const CENTER_GATES = {
  throat: [8, 12, 20, 62],
  g: [1, 15],
  spleen: [28, 50, 57],
  sacral: [5, 27, 42],
  root: [19, 38, 53]
};
const CENTER_CHANNELS = {
  throat: ['1-8', '20-57'],
  g: ['1-8', '5-15'],
  spleen: ['20-57', '27-50', '28-38'],
  sacral: ['5-15', '27-50', '42-53'],
  root: ['28-38', '42-53']
};

const BIRTH_A = `?d=1990-05-20&t=06:30&tz=0&name=Fixture%20Dream`;

let failures = 0;
const ok = name => console.log(`✔ ${name}`);
const fail = (name, error) => { failures++; console.error(`✖ ${name}\n  ${error?.stack || error}`); };
async function check(name, fn) {
  try { await fn(); ok(name); } catch (error) { fail(name, error); }
}

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
page.setDefaultTimeout(15000);
await page.addInitScript(() => localStorage.setItem('ohd-language', 'zh-CN'));
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`); });

// ==========================================
// Deterministic fixture: three sources in one centre
// ==========================================

/**
 * Build both sheets from fixed activations, in the shape `computeDreamChart()`
 * returns, and hang the controllers on `window.__fx` for the checks below.
 *
 * Single design:
 *   gate 1  personality — completes 1-8, so the Throat and the G are defined by the
 *           sleeper's own design
 *   gate 8  personality AND transit — the `both` case
 *   gate 12 design — a portal, and the only natal gate of the Throat besides 8
 *   gate 38 design + gate 28 transit — completes 28-38 from the sky alone, so the
 *           Root is defined but not natally (`Defined by transits`)
 *   gate 20 transit — the transit-only gate
 *   gate 62 — untouched, the inactive gate of the same centre
 *
 * Composite: A carries 8 and 12, B carries 8 and 20, so the Throat has a `both`
 * gate, an A-only gate, a B-only gate and an inactive one. A's gate 5 and B's gate
 * 15 complete 5-15 only together, which is the `bridged` centre branch.
 */
async function mountFixture() {
  /**
   * The URL the app itself loaded for a source module, query included.
   *
   * HMR serves app modules as `/src/lib/x.js?t=<stamp>`; a bare import resolves to
   * a different module instance, so `setLocale()` would change that copy while the
   * rendered page (and the controller built from the app's own instance) kept the
   * old language. The resource timings are the browser's record of what was
   * actually loaded; the earliest entry is the app's own, because a later one can
   * only come from a bare import made by an earlier step of a run.
   */
  const loadedModule = path => {
    const entries = performance.getEntriesByType('resource')
      .filter(entry => { try { return new URL(entry.name).pathname === path; } catch { return false; } })
      .sort((a, b) => a.startTime - b.startTime);
    return entries[0]?.name || path;
  };
  const urls = {
    topology: loadedModule('/src/lib/human-design/dream-topology.js'),
    chart: loadedModule('/src/lib/dream-chart.js'),
    detail: loadedModule('/src/lib/dream-detail.js'),
    i18n: loadedModule('/src/lib/i18n.js')
  };
  const topo = await import(urls.topology);
  const chart = await import(urls.chart);
  const detail = await import(urls.detail);
  const i18n = await import(urls.i18n);

  const model = list => {
    const raw = { personality: {}, design: {}, transit: {} };
    const byNumber = { personality: new Map(), design: new Map(), transit: new Map() };
    for (const [source, planet, gate, line] of list) {
      raw[source][planet] = { gate, line, color: 1, tone: 1, base: 1 };
      if (!byNumber[source].has(gate)) byNumber[source].set(gate, []);
      byNumber[source].get(gate).push({ planet, line, color: 1, tone: 1, base: 1 });
    }
    const natal = new Set([...byNumber.personality.keys(), ...byNumber.design.keys()]);
    const transit = new Set(byNumber.transit.keys());
    const channels = topo.DREAM_CHANNELS.filter(channel => channel.gates.every(gate => natal.has(gate)));
    const transitChannels = topo.DREAM_CHANNELS.filter(channel =>
      channel.gates.every(gate => natal.has(gate) || transit.has(gate)));
    const defined = new Set(channels.flatMap(channel => channel.centers));
    return {
      gates: {
        personality: raw.personality,
        design: raw.design,
        transit: raw.transit,
        byNumber,
        all: [...natal].sort((a, b) => a - b),
        everyDreamGate: topo.DREAM_GATES
      },
      channels,
      centers: { defined, definedNames: [...defined].sort() },
      transit: {
        gates: transit,
        channels: transitChannels,
        definedCenters: new Set(transitChannels.flatMap(channel => channel.centers)),
        mode: 'overlay',
        instant: 0,
        iso: '2026-01-01T00:00:00.000Z'
      },
      hasTransit: true,
      type: { id: 'generator', name: 'Generator' },
      wakingType: { id: 'generator', name: 'Generator' }
    };
  };

  const single = model([
    ['personality', 'sun', 1, 4],
    ['personality', 'moon', 8, 3],
    ['design', 'earth', 12, 5],
    ['design', 'mars', 38, 2],
    ['transit', 'jupiter', 8, 1],
    ['transit', 'mars', 20, 2],
    ['transit', 'venus', 28, 6]
  ]);

  const mount = (id, options) => {
    const host = document.createElement('div');
    host.id = `${id}-host`;
    document.body.appendChild(host);
    const pinned = [];
    const controller = detail.createDreamDetail(options);
    controller.element.id = id;
    host.appendChild(controller.element);
    return { controller, pinned };
  };

  // Stands in for the graph API: records the pin, so "the sheet pinned its own
  // selection" is observable without a renderer.
  const singleApi = {
    setPinned: selection => window.__fx.single.pinned.push(selection),
    highlightGate: () => {},
    highlightSelection: () => {}
  };
  const singleMount = mount('fixture-single', { dream: single, model: chart.buildDreamTransitGraph(single) });
  singleMount.controller.setApi(singleApi);

  /**
   * Composite ownership, mirroring bodygraph.js: channel completeness over the
   * union of both gate sets, centres from the complete channels, `bridged` when
   * neither design holds the centre alone.
   */
  const compositeApi = (a, b) => {
    const gatesA = new Set(a.gates.all);
    const gatesB = new Set(b.gates.all);
    const union = new Set([...gatesA, ...gatesB]);
    const complete = topo.DREAM_CHANNELS.filter(channel => channel.gates.every(gate => union.has(gate)));
    const centres = new Set(complete.flatMap(channel => channel.centers));
    const centresA = new Set(a.channels.flatMap(channel => channel.centers));
    const centresB = new Set(b.channels.flatMap(channel => channel.centers));
    return {
      gateOwner: gate => gatesA.has(gate) && gatesB.has(gate) ? 'both' : gatesA.has(gate) ? 'a' : gatesB.has(gate) ? 'b' : null,
      centerOwner: key => !centres.has(key) ? null
        : centresA.has(key) && centresB.has(key) ? 'both'
          : centresA.has(key) ? 'a' : centresB.has(key) ? 'b' : 'bridged',
      channelDynamic: channel => {
        const [left, right] = channel.gates;
        const aFull = gatesA.has(left) && gatesA.has(right);
        const bFull = gatesB.has(left) && gatesB.has(right);
        if (aFull && bFull) return 'companionship';
        if (aFull || bFull) return (aFull ? gatesB.has(left) || gatesB.has(right) : gatesA.has(left) || gatesA.has(right))
          ? 'compromise' : 'dominance';
        if ((gatesA.has(left) && gatesB.has(right)) || (gatesA.has(right) && gatesB.has(left))) return 'electromagnetic';
        return null;
      },
      setPinned: selection => window.__fx.composite.pinned.push(selection),
      highlightGate: () => {},
      highlightSelection: () => {}
    };
  };

  const a = model([
    ['personality', 'sun', 8, 3],
    ['personality', 'moon', 5, 2],
    ['design', 'earth', 12, 5]
  ]);
  const b = model([
    ['personality', 'jupiter', 8, 2],
    ['design', 'mars', 20, 2],
    ['personality', 'venus', 15, 4]
  ]);
  const compositeMount = mount('fixture-composite', {
    composite: { labelA: 'Person A', labelB: 'Person B' },
    a, b, dream: null, model: null
  });
  compositeMount.controller.setApi(compositeApi(a, b));

  window.__fx = {
    single: {
      pinned: singleMount.pinned,
      show: (key, push = true) => singleMount.controller.showCenter(key, push),
      refresh: () => singleMount.controller.refresh(),
      close: () => singleMount.controller.close(),
      get open() { return singleMount.controller.open; }
    },
    composite: {
      pinned: compositeMount.pinned,
      show: (key, push = true) => compositeMount.controller.showCenter(key, push),
      refresh: () => compositeMount.controller.refresh(),
      close: () => compositeMount.controller.close(),
      get open() { return compositeMount.controller.open; }
    },
    urls,
    setLocale: (code, persist = false) => i18n.setLocale(code, { persist }),
    getLocale: () => i18n.getLocale(),
    t: (key, params) => i18n.t(key, params)
  };
  return { centers: Object.keys(window.__fx) };
}

/** Everything the sheet says about one centre, as data, from its card. */
async function readCenter(selector) {
  return page.$eval(selector, card => {
    const badge = card.querySelector('[data-center-status]');
    const owner = card.querySelector('[data-center-owner]');
    return {
      center: card.dataset.center,
      name: card.querySelector('.detail-name')?.textContent.trim() || '',
      status: badge?.dataset.centerStatus || null,
      statusText: badge?.textContent.trim() || null,
      owner: owner?.dataset.centerOwner || null,
      ownerText: owner?.textContent.trim() || null,
      back: !!card.querySelector('.gate-detail-back'),
      gates: [...card.querySelectorAll('[data-center-gate]')].map(row => ({
        gate: Number(row.dataset.centerGate),
        state: row.dataset.gateState,
        owner: row.querySelector('.dream-detail-gate-owner')?.textContent.trim() || null,
        inactive: row.querySelector('.dream-detail-gate-state')?.textContent.trim() || null,
        groups: [...row.querySelectorAll('.dream-detail-gate-src')].map(group => ({
          label: group.querySelector('.dream-detail-gate-src-label')?.textContent.trim() || '',
          chips: [...group.querySelectorAll('.dream-planet-chip')].map(chip => chip.textContent.trim()),
          classes: [...group.classList],
          // The source block's rule is read from the browser, not from the class list:
          // the ruling "natal solid / transit dashed" is a computed fact.
          rule: getComputedStyle(group).borderLeftStyle,
          ruleWidth: getComputedStyle(group).borderLeftWidth
        }))
      })),
      channels: [...card.querySelectorAll('.dream-detail-channel')].map(button => ({
        id: button.dataset.sharedChannelSelect,
        classes: [...button.classList],
        status: button.querySelector('.circuit-badge')?.textContent.trim() || '',
        rule: getComputedStyle(button).borderLeftStyle
      }))
    };
  });
}

await page.goto(`${BASE}/${BIRTH_A}&view=dream`, { waitUntil: 'load' });
// The sleep view is what loads `lib/dream-detail.js` and `lib/i18n.js` into the
// page's module graph, so this must happen before the fixture resolves them.
await page.waitForSelector('.dream-realm', { timeout: 30000 });
await page.waitForTimeout(400);
await page.evaluate(mountFixture);

await check('the fixture imports the modules the app loaded, HMR query included', async () => {
  const urls = await page.evaluate(() => window.__fx.urls);
  console.log('modules imported by the fixture:', JSON.stringify(urls));
  for (const [name, url] of Object.entries(urls)) {
    assert(new URL(url).pathname.startsWith('/src/lib/'), `${name} resolved to ${url}`);
  }
  assert(await page.evaluate(() => window.__fx.getLocale()) === 'zh-CN', 'the fixture did not start in zh-CN');
  // The real header switcher must move the fixture's own catalog. That is only
  // possible when both are the same module instance: a bare import would leave the
  // fixture in Simplified Chinese while the app moved on.
  if (!(await page.$eval('#more-menu', node => node.open))) await page.click('#more-toggle');
  if (!(await page.$eval('#language-menu', node => node.open))) await page.click('#language-menu > summary');
  await page.click('.language-actions button[data-language="zh-Hant"]');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__fx.getLocale());
  const label = await page.evaluate(() => window.__fx.t('Sleep channels'));
  assert(after === 'zh-Hant', `fixture locale after the real switcher is ${after}`);
  assert(label === '睡眠通道', `fixture catalog after the real switcher reads "${label}"`);
  if (!(await page.$eval('#more-menu', node => node.open))) await page.click('#more-toggle');
  if (!(await page.$eval('#language-menu', node => node.open))) await page.click('#language-menu > summary');
  await page.click('.language-actions button[data-language="zh-CN"]');
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => window.__fx.getLocale()) === 'zh-CN', 'the fixture did not return to zh-CN');
});

await check('fixture: the Throat lists every dream gate with its own source state', async () => {
  await page.evaluate(() => window.__fx.single.show('throat'));
  const center = await readCenter('#fixture-single .gate-detail-card[data-center]');
  assert(center.center === 'throat', `open card is ${center.center}`);
  assert(JSON.stringify(center.gates.map(row => row.gate)) === JSON.stringify(CENTER_GATES.throat),
    `throat gates are ${JSON.stringify(center.gates.map(row => row.gate))}`);
  const states = Object.fromEntries(center.gates.map(row => [row.gate, row.state]));
  // 8 is carried by the sleeper and the sky, 12 only natally, 20 only by the sky,
  // 62 by nobody. All four states exist in one centre on purpose.
  assert(states[8] === 'both', `gate 8 state is ${states[8]}`);
  assert(states[12] === 'natal', `gate 12 state is ${states[12]}`);
  assert(states[20] === 'transit', `gate 20 state is ${states[20]}`);
  assert(states[62] === 'inactive', `gate 62 state is ${states[62]}`);
  const gate62 = center.gates.find(row => row.gate === 62);
  assert(gate62.inactive && gate62.groups.length === 0, `gate 62 renders ${JSON.stringify(gate62)}`);
});

await check('fixture: an activated gate prints every source with its planet and line', async () => {
  const center = await readCenter('#fixture-single .gate-detail-card[data-center]');
  const gate8 = center.gates.find(row => row.gate === 8);
  const groups8 = Object.fromEntries(gate8.groups.map(group => [group.label, group.chips]));
  assert(groups8['梦境人格']?.some(chip => chip.includes('月亮 8.3')), `gate 8 personality ${JSON.stringify(gate8.groups)}`);
  assert(groups8['行运']?.some(chip => chip.includes('木星 8.1')), `gate 8 transit ${JSON.stringify(gate8.groups)}`);
  const gate12 = center.gates.find(row => row.gate === 12);
  const groups12 = Object.fromEntries(gate12.groups.map(group => [group.label, group.chips]));
  assert(groups12['梦境设计']?.some(chip => chip.includes('地球 12.5')), `gate 12 design ${JSON.stringify(gate12.groups)}`);
  const gate20 = center.gates.find(row => row.gate === 20);
  assert(gate20.groups.length === 1 && gate20.groups[0].label === '行运', `gate 20 groups ${JSON.stringify(gate20.groups)}`);
  assert(gate20.groups[0].chips.some(chip => chip.includes('火星 20.2')), `gate 20 chips ${JSON.stringify(gate20.groups[0].chips)}`);
});

await check('fixture: the centre state comes from the drawn model, with its source named', async () => {
  const throat = await readCenter('#fixture-single .gate-detail-card[data-center]');
  // 1-8 is complete in the sleeper's own design, so the Throat is natally defined.
  assert(throat.status === 'natal', `throat status ${throat.status}`);
  assert(throat.statusText === '睡眠中有定义', `throat badge reads "${throat.statusText}"`);
  await page.evaluate(() => window.__fx.single.show('root'));
  const root = await readCenter('#fixture-single .gate-detail-card[data-center]');
  // 28 arrives from the sky only and completes 28-38, so the Root is defined but
  // not by the sleeper: the natal set would have called this centre undefined.
  assert(root.status === 'transit', `root status ${root.status}`);
  assert(root.statusText === '由行运定义', `root badge reads "${root.statusText}"`);
  assert(JSON.stringify(root.gates.map(row => [row.gate, row.state]))
    === JSON.stringify([[19, 'inactive'], [38, 'natal'], [53, 'inactive']]),
  `root gates ${JSON.stringify(root.gates.map(row => [row.gate, row.state]))}`);
  await page.evaluate(() => window.__fx.single.show('sacral'));
  const sacral = await readCenter('#fixture-single .gate-detail-card[data-center]');
  assert(sacral.status === 'inactive', `sacral status ${sacral.status}`);
  assert(sacral.statusText === '睡眠中未定义', `sacral badge reads "${sacral.statusText}"`);
  assert(sacral.gates.every(row => row.state === 'inactive' && row.inactive === '未激活'),
    `sacral gates ${JSON.stringify(sacral.gates)}`);
});

await check('fixture: the channel list is the dream channels touching the centre, in their real state', async () => {
  await page.evaluate(() => window.__fx.single.show('throat'));
  const throat = await readCenter('#fixture-single .gate-detail-card[data-center]');
  assert(JSON.stringify(throat.channels.map(row => row.id)) === JSON.stringify(CENTER_CHANNELS.throat),
    `throat channels ${JSON.stringify(throat.channels.map(row => row.id))}`);
  const byId = Object.fromEntries(throat.channels.map(row => [row.id, row]));
  // 1-8 is complete in the sleep design; 20-57 has one gate from the sky and no
  // partner, so it is not connected — the old `channelSource()` alone would have
  // called it "completed".
  assert(byId['1-8'].classes.includes('natal') && byId['1-8'].status === '在睡眠设计中完整',
    `1-8 is ${JSON.stringify(byId['1-8'])}`);
  assert(byId['20-57'].classes.includes('inactive') && byId['20-57'].status === '未接通',
    `20-57 is ${JSON.stringify(byId['20-57'])}`);
  await page.evaluate(() => window.__fx.single.show('root'));
  const root = await readCenter('#fixture-single .gate-detail-card[data-center]');
  const rootChannels = Object.fromEntries(root.channels.map(row => [row.id, row]));
  assert(rootChannels['28-38'].status === '由行运接通', `28-38 is ${JSON.stringify(rootChannels['28-38'])}`);
  assert(rootChannels['42-53'].status === '未接通', `42-53 is ${JSON.stringify(rootChannels['42-53'])}`);
});

await check('fixture: both natal sources are solid, only the transit source is dashed', async () => {
  await page.evaluate(() => window.__fx.single.show('throat'));
  const center = await readCenter('#fixture-single .gate-detail-card[data-center]');
  const rules = center.gates.flatMap(row => row.groups.map(group => ({ gate: row.gate, label: group.label, rule: group.rule, width: group.ruleWidth })));
  const personality = rules.filter(group => group.label === '梦境人格');
  const design = rules.filter(group => group.label === '梦境设计');
  const transit = rules.filter(group => group.label === '行运');
  assert(personality.length && design.length && transit.length, `rules ${JSON.stringify(rules)}`);
  // Personality and design share the natal solid rule at the block's own 3px, so a
  // gate carried by the sleeper and by the sky cannot be told apart by border style.
  assert(personality.every(group => group.rule === 'solid'), `personality rules ${JSON.stringify(personality)}`);
  assert(design.every(group => group.rule === 'solid'), `design rules ${JSON.stringify(design)}`);
  assert(personality.concat(design).every(group => group.width === '3px'),
    `natal rule widths ${JSON.stringify(personality.concat(design))}`);
  // Only the external overlay keeps a second style.
  assert(transit.every(group => group.rule === 'dashed'), `transit rules ${JSON.stringify(transit)}`);
  // The channel rows keep their own status borders; the source ruling never reaches them.
  const natalChannel = center.channels.find(channel => channel.id === '1-8');
  assert(natalChannel.rule === 'solid', `the natal channel border became ${natalChannel.rule}`);
  await page.evaluate(() => window.__fx.single.show('root'));
  const root = await readCenter('#fixture-single .gate-detail-card[data-center]');
  assert(root.channels.find(channel => channel.id === '28-38').rule === 'dashed', 'a completed channel lost its dashed status rule');
  assert(root.channels.find(channel => channel.id === '42-53').rule === 'solid', 'an inactive channel lost its solid status rule');
  assert(root.gates.find(row => row.gate === 38).groups.every(group => group.rule === 'solid'),
    'the design source of gate 38 is no longer solid');
});

await check('fixture: composite natal groups keep the solid rule for both people', async () => {
  await page.evaluate(() => window.__fx.composite.show('throat'));
  const center = await readCenter('#fixture-composite .gate-detail-card[data-center]');
  const groups = center.gates.flatMap(row => row.groups);
  assert(groups.length >= 3, `composite groups ${JSON.stringify(groups)}`);
  assert(groups.every(group => group.rule === 'solid'), `composite rules ${JSON.stringify(groups.map(group => [group.label, group.rule]))}`);
  await page.evaluate(() => window.__fx.composite.close());
  await page.waitForFunction(() => window.__fx.composite.open === false, null, { timeout: 5000 });
});

await check('fixture: a gate opens from the centre and Back returns to the centre', async () => {
  await page.evaluate(() => window.__fx.single.show('throat'));
  await page.click('#fixture-single [data-center-gate="8"] [data-shared-gate-select]');
  await page.waitForSelector('#fixture-single .gate-detail-card[data-gate="8"]', { timeout: 5000 });
  const back = await page.$('#fixture-single .gate-detail-back');
  assert(back, 'the gate sheet opened from a centre has no Back button');
  await back.click();
  await page.waitForSelector('#fixture-single .gate-detail-card[data-center="throat"]', { timeout: 5000 });
  const pinned = await page.evaluate(() => window.__fx.single.pinned.at(-1));
  assert(pinned && pinned.kind === 'center' && pinned.id === 'throat', `pin after Back is ${JSON.stringify(pinned)}`);
});

await check('fixture: a channel opens from the centre and Back returns to the centre', async () => {
  await page.click('#fixture-single [data-shared-channel-select="20-57"]');
  await page.waitForSelector('#fixture-single .gate-detail-card[data-channel="20-57"]', { timeout: 5000 });
  await page.click('#fixture-single .gate-detail-back');
  await page.waitForSelector('#fixture-single .gate-detail-card[data-center="throat"]', { timeout: 5000 });
});

await check('fixture: closing releases the selection, so the next sheet has no stray Back', async () => {
  await page.click('#fixture-single .gate-detail-close');
  await page.waitForFunction(() => window.__fx.single.open === false, null, { timeout: 5000 });
  const pinned = await page.evaluate(() => window.__fx.single.pinned.at(-1));
  assert(pinned === null, `pin after close is ${JSON.stringify(pinned)}`);
  await page.evaluate(() => window.__fx.single.show('throat'));
  const center = await readCenter('#fixture-single .gate-detail-card[data-center]');
  assert(!center.back, 'the reopened centre sheet offers a Back into the closed one');
});

await check('fixture: a language change redraws the same centre, not another one', async () => {
  const before = await readCenter('#fixture-single .gate-detail-card[data-center]');
  await page.evaluate(() => { window.__fx.setLocale('zh-Hant'); window.__fx.single.refresh(); });
  assert(await page.evaluate(() => window.__fx.getLocale()) === 'zh-Hant', 'the fixture did not switch its own catalog');
  let after = await readCenter('#fixture-single .gate-detail-card[data-center]');
  assert(after.center === before.center, `centre changed to ${after.center}`);
  assert(after.name === '喉嚨中心', `traditional centre name is "${after.name}"`);
  assert(after.statusText === '睡眠中有定義', `traditional badge reads "${after.statusText}"`);
  assert(JSON.stringify(after.gates.map(row => [row.gate, row.state]))
    === JSON.stringify(before.gates.map(row => [row.gate, row.state])), 'the gate list changed with the language');
  const inactive = after.gates.find(row => row.gate === 62);
  assert(inactive.inactive === '未啟動', `traditional inactive label is "${inactive.inactive}"`);
  assert(after.channels.find(row => row.id === '20-57').status === '未接通', 'a channel lost its state in translation');
  await page.evaluate(() => { window.__fx.setLocale('en'); window.__fx.single.refresh(); });
  after = await readCenter('#fixture-single .gate-detail-card[data-center]');
  assert(after.name === 'Throat', `English centre name is "${after.name}"`);
  assert(after.gates.find(row => row.gate === 62).inactive === 'Inactive', 'the inactive label is not translated to English');
  await page.evaluate(() => { window.__fx.setLocale('zh-CN'); window.__fx.single.refresh(); });
  await page.evaluate(() => window.__fx.single.close());
  await page.waitForFunction(() => window.__fx.single.open === false, null, { timeout: 5000 });
});

await check('fixture: the composite centre lists every gate with A / B / both / neither', async () => {
  await page.evaluate(() => window.__fx.composite.show('throat'));
  const center = await readCenter('#fixture-composite .gate-detail-card[data-center]');
  assert(center.center === 'throat', `open card is ${center.center}`);
  assert(center.owner === 'none', `throat owner is ${center.owner}`);
  assert(center.ownerText === '未定义', `throat owner text is "${center.ownerText}"`);
  assert(JSON.stringify(center.gates.map(row => row.gate)) === JSON.stringify(CENTER_GATES.throat),
    `composite throat gates ${JSON.stringify(center.gates.map(row => row.gate))}`);
  const states = Object.fromEntries(center.gates.map(row => [row.gate, row.state]));
  assert(states[8] === 'both' && states[12] === 'a' && states[20] === 'b' && states[62] === 'none',
    `composite gate states ${JSON.stringify(states)}`);
  const gate8 = center.gates.find(row => row.gate === 8);
  assert(gate8.owner === 'Person A + Person B', `gate 8 owner is "${gate8.owner}"`);
  const labels = gate8.groups.map(group => group.label);
  assert(labels.includes('Person A · 梦境人格') && labels.includes('Person B · 梦境人格'),
    `gate 8 groups ${JSON.stringify(labels)}`);
  assert(gate8.groups.find(group => group.label.startsWith('Person A')).chips.some(chip => chip.includes('太阳 8.3')),
    `gate 8 A chips ${JSON.stringify(gate8.groups)}`);
  const gate12 = center.gates.find(row => row.gate === 12);
  assert(gate12.owner === 'Person A' && gate12.groups[0].label === 'Person A · 梦境设计',
    `gate 12 is ${JSON.stringify(gate12)}`);
  const gate20 = center.gates.find(row => row.gate === 20);
  assert(gate20.owner === 'Person B' && gate20.groups[0].label === 'Person B · 梦境设计',
    `gate 20 is ${JSON.stringify(gate20)}`);
  const gate62 = center.gates.find(row => row.gate === 62);
  assert(gate62.owner === '双方都没有' && gate62.groups.length === 0, `gate 62 is ${JSON.stringify(gate62)}`);
});

await check('fixture: the composite centre reports a bridged centre and its channels', async () => {
  await page.evaluate(() => window.__fx.composite.show('sacral'));
  const center = await readCenter('#fixture-composite .gate-detail-card[data-center]');
  assert(center.owner === 'bridged', `sacral owner is ${center.owner}`);
  assert(center.ownerText === '关系中新定义', `sacral owner text is "${center.ownerText}"`);
  const states = Object.fromEntries(center.gates.map(row => [row.gate, row.state]));
  assert(states[5] === 'a' && states[27] === 'none' && states[42] === 'none',
    `sacral gate states ${JSON.stringify(states)}`);
  assert(JSON.stringify(center.channels.map(row => row.id)) === JSON.stringify(CENTER_CHANNELS.sacral),
    `sacral channels ${JSON.stringify(center.channels.map(row => row.id))}`);
  const byId = Object.fromEntries(center.channels.map(row => [row.id, row]));
  assert(byId['5-15'].classes.includes('completed') && byId['5-15'].status === '仅合并后有定义',
    `5-15 is ${JSON.stringify(byId['5-15'])}`);
  assert(byId['27-50'].status === '未接通' && byId['42-53'].status === '未接通',
    `sacral inactive channels ${JSON.stringify(center.channels)}`);
});

await check('fixture: composite gate navigation keeps each person, and Back returns', async () => {
  await page.click('#fixture-composite [data-center-gate="5"] [data-shared-gate-select]');
  await page.waitForSelector('#fixture-composite .gate-detail-card[data-gate="5"]', { timeout: 5000 });
  // The gate sheet's own ownership block names A, and the centre is still behind it.
  const sheet = await page.$eval('#fixture-composite .gate-detail-card', card => ({
    gate: card.dataset.gate,
    owner: card.querySelector('.dream-detail-owner')?.textContent.trim() || ''
  }));
  assert(sheet.gate === '5', `composite gate sheet is ${sheet.gate}`);
  assert(sheet.owner.includes('Person A'), `composite gate 5 owner line is "${sheet.owner}"`);
  await page.click('#fixture-composite .gate-detail-back');
  await page.waitForSelector('#fixture-composite .gate-detail-card[data-center="sacral"]', { timeout: 5000 });
});

await check('fixture: the composite sheet survives a language redraw', async () => {
  await page.evaluate(() => { window.__fx.setLocale('zh-Hant'); window.__fx.composite.refresh(); });
  const center = await readCenter('#fixture-composite .gate-detail-card[data-center]');
  assert(center.center === 'sacral', `centre after translation is ${center.center}`);
  assert(center.name === '薦骨中心', `traditional centre name is "${center.name}"`);
  assert(center.gates.length === 3, `gates after translation ${center.gates.length}`);
  assert(center.channels.length === 3, `channels after translation ${center.channels.length}`);
  await page.evaluate(() => { window.__fx.setLocale('zh-CN'); window.__fx.composite.close(); });
  await page.waitForFunction(() => window.__fx.composite.open === false, null, { timeout: 5000 });
});

// ==========================================
// The real page
// ==========================================

await page.goto(`${BASE}/${BIRTH_A}&view=dream`, { waitUntil: 'load' });
await page.waitForSelector('.dream-realm', { timeout: 30000 });
await page.waitForTimeout(600);

async function openCenter(selector) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.click(selector);
  await page.waitForSelector('#dream-detail .gate-detail-card[data-center]', { timeout: 10000 });
  await page.waitForTimeout(150);
}

/** Close the modal sheet before touching the header: a modal owns the pointer. */
async function closeSheet() {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
}

/** Change the interface language the way the app does, without the header menu. */
async function setLocale(code) {
  // The app's own module, query and all: on an HMR dev server the bare path is a
  // second instance whose catalog nothing renders.
  await page.evaluate(async next => {
    const entries = performance.getEntriesByType('resource')
      .filter(entry => { try { return new URL(entry.name).pathname === '/src/lib/i18n.js'; } catch { return false; } })
      .sort((a, b) => a.startTime - b.startTime);
    const i18n = await import(entries[0]?.name || '/src/lib/i18n.js');
    i18n.setLocale(next, { persist: false });
  }, code);
  await page.waitForTimeout(500);
}

await check('the page lists all four Throat gates, however tonight is activated', async () => {
  await openCenter('#dream-bodygraph .bg-center[data-center="throat"]');
  const center = await readCenter('#dream-detail .gate-detail-card');
  assert(JSON.stringify(center.gates.map(row => row.gate)) === JSON.stringify(CENTER_GATES.throat),
    `page throat gates ${JSON.stringify(center.gates.map(row => row.gate))}`);
  assert(JSON.stringify(center.channels.map(row => row.id)) === JSON.stringify(CENTER_CHANNELS.throat),
    `page throat channels ${JSON.stringify(center.channels.map(row => row.id))}`);
  assert(['natal', 'transit', 'inactive'].includes(center.status), `page throat status ${center.status}`);
});

await check('every centre on the page lists its whole dream topology', async () => {
  for (const [center, gates] of Object.entries(CENTER_GATES)) {
    await openCenter(`#dream-bodygraph .bg-center[data-center="${center}"]`);
    const sheet = await readCenter('#dream-detail .gate-detail-card');
    assert(JSON.stringify(sheet.gates.map(row => row.gate)) === JSON.stringify(gates),
      `${center} lists ${JSON.stringify(sheet.gates.map(row => row.gate))}`);
    assert(JSON.stringify(sheet.channels.map(row => row.id)) === JSON.stringify(CENTER_CHANNELS[center]),
      `${center} channels ${JSON.stringify(sheet.channels.map(row => row.id))}`);
    assert(sheet.gates.every(row => row.state), `${center} has a gate without a state`);
  }
  await page.screenshot({ path: path.join(SHOTS, 'page-center-sacral.png'), fullPage: false });
});

await check('a gate opened from the page centre returns to that centre', async () => {
  await openCenter('#dream-bodygraph .bg-center[data-center="root"]');
  const gate = await page.$eval('#dream-detail [data-center-gate] [data-shared-gate-select]', node => node.dataset.sharedGateSelect);
  await page.click(`#dream-detail [data-center-gate="${gate}"] [data-shared-gate-select]`);
  await page.waitForSelector(`#dream-detail .gate-detail-card[data-gate="${gate}"]`, { timeout: 5000 });
  await page.click('#dream-detail .gate-detail-back');
  await page.waitForSelector('#dream-detail .gate-detail-card[data-center="root"]', { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
});

await check('the open centre survives a language switch', async () => {
  await openCenter('#dream-bodygraph .bg-center[data-center="throat"]');
  const before = await readCenter('#dream-detail .gate-detail-card');
  await setLocale('zh-Hant');
  const after = await readCenter('#dream-detail .gate-detail-card');
  assert(after.center === before.center, `centre changed to ${after.center}`);
  assert(after.name === '喉嚨中心', `centre name after switching is "${after.name}"`);
  assert(after.gates.length === 4, `gates after switching ${after.gates.length}`);
  assert(after.status === before.status, `status changed from ${before.status} to ${after.status}`);
  await setLocale('en');
  const english = await readCenter('#dream-detail .gate-detail-card');
  assert(english.name === 'Throat', `English centre name is "${english.name}"`);
  // The real night sky decides which gates are activated; the label assertion is
  // about the copy, so it runs on whichever gate the overlay leaves empty.
  const inactiveGate = english.gates.find(row => row.state === 'inactive');
  if (inactiveGate) assert(inactiveGate.inactive === 'Inactive', `English inactive label is "${inactiveGate.inactive}"`);
  await setLocale('zh-CN');
  await closeSheet();
});

await check('applying a dark and a high-contrast skin keeps the sheet inside its card', async () => {
  for (const skin of ['default-dark', 'high-contrast']) {
    await closeSheet();
    if (!(await page.$eval('#more-menu', node => node.open))) await page.click('#more-toggle');
    await page.click('#skin-settings-button');
    await page.waitForSelector('#skin-settings[open]', { timeout: 5000 });
    await page.click(`#skin-picker [data-skin-id="${skin}"]`);
    await page.waitForTimeout(260);
    if (await page.$eval('#skin-settings', node => node.open)) await page.click('#skin-settings-close');
    await openCenter('#dream-bodygraph .bg-center[data-center="throat"]');
    const box = await page.evaluate(() => {
      const card = document.querySelector('#dream-detail .gate-detail-card');
      const body = card.querySelector('.gate-detail-body');
      return {
        cardOverflow: card.scrollWidth - card.clientWidth,
        bodyOverflow: body.scrollWidth - body.clientWidth,
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        background: getComputedStyle(card).backgroundColor
      };
    });
    assert(box.cardOverflow <= 1, `${skin}: the card overflows by ${box.cardOverflow}px`);
    assert(box.bodyOverflow <= 1, `${skin}: the sheet body overflows by ${box.bodyOverflow}px`);
    assert(box.pageOverflow <= 1, `${skin}: the page overflows by ${box.pageOverflow}px`);
    await page.screenshot({ path: path.join(SHOTS, `center-${skin}.png`) });
  }
  await closeSheet();
  if (!(await page.$eval('#more-menu', node => node.open))) await page.click('#more-toggle');
  await page.click('#skin-settings-button');
  await page.waitForSelector('#skin-settings[open]', { timeout: 5000 });
  await page.click('#skin-picker [data-skin-id="default-light"]');
  await page.waitForTimeout(260);
  if (await page.$eval('#skin-settings', node => node.open)) await page.click('#skin-settings-close');
  await closeSheet();
});

await check('an English interface names the same centre and the same inactive gate', async () => {
  await closeSheet();
  await setLocale('en');
  await openCenter('#dream-bodygraph .bg-center[data-center="throat"]');
  const center = await readCenter('#dream-detail .gate-detail-card');
  assert(center.name === 'Throat', `English centre name is "${center.name}"`);
  assert(center.gates.length === 4, `English gate list ${center.gates.length}`);
  const inactive = center.gates.find(row => row.state === 'inactive');
  if (inactive) assert(inactive.inactive === 'Inactive', `English inactive label is "${inactive.inactive}"`);
  assert(center.gates.every(row => ['natal', 'transit', 'both', 'inactive'].includes(row.state)),
    `English gate states ${JSON.stringify(center.gates.map(row => row.state))}`);
  await page.screenshot({ path: path.join(SHOTS, 'center-en.png') });
  await closeSheet();
  await setLocale('zh-CN');
});

await check('desktop 1440: the long sheet scrolls inside the dialog', async () => {
  await openCenter('#dream-bodygraph .bg-center[data-center="spleen"]');
  const box = await page.evaluate(() => {
    const body = document.querySelector('#dream-detail .gate-detail-body');
    return {
      overflowY: getComputedStyle(body).overflowY,
      scrollable: body.scrollHeight > body.clientHeight,
      horizontal: body.scrollWidth - body.clientWidth,
      page: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  assert(box.overflowY === 'auto', `sheet body overflow-y is ${box.overflowY}`);
  assert(box.horizontal <= 1, `sheet body overflows horizontally by ${box.horizontal}px`);
  assert(box.page <= 1, `page overflows horizontally by ${box.page}px`);
  await page.screenshot({ path: path.join(SHOTS, 'center-desktop-1440.png') });
  await closeSheet();
});

await check('the page logged no errors', async () => {
  assert(pageErrors.length === 0, pageErrors.slice(0, 4).join(' | '));
});

// ==========================================
// Phone: 360 / 390, coarse pointer
// ==========================================

for (const width of [360, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: 780 },
    hasTouch: true,
    isMobile: true,
    locale: 'zh-CN'
  });
  const phone = await context.newPage();
  await phone.addInitScript(() => localStorage.setItem('ohd-language', 'zh-CN'));
  phone.setDefaultTimeout(20000);
  await phone.goto(`${BASE}/${BIRTH_A}&view=dream`, { waitUntil: 'load' });
  await phone.waitForSelector('.dream-realm', { timeout: 30000 });
  await phone.waitForTimeout(600);

  await check(`phone ${width}: the centre sheet stays inside the viewport and scrolls`, async () => {
    await phone.click('#dream-bodygraph .bg-center[data-center="throat"]');
    await phone.waitForSelector('#dream-detail .gate-detail-card[data-center]', { timeout: 10000 });
    await phone.waitForTimeout(250);
    const box = await phone.evaluate(() => {
      const card = document.querySelector('#dream-detail .gate-detail-card');
      const body = card.querySelector('.gate-detail-body');
      const row = card.querySelector('.dream-detail-center-gate');
      const channel = card.querySelector('.dream-detail-channel');
      const rect = card.getBoundingClientRect();
      return {
        page: document.documentElement.scrollWidth - window.innerWidth,
        cardLeft: rect.left,
        cardRight: window.innerWidth - rect.right,
        bodyOverflow: body.scrollWidth - body.clientWidth,
        bodyScrollable: body.scrollHeight > body.clientHeight,
        overflowY: getComputedStyle(body).overflowY,
        rowHeight: row?.getBoundingClientRect().height ?? 0,
        channelHeight: channel?.getBoundingClientRect().height ?? 0,
        gates: card.querySelectorAll('[data-center-gate]').length
      };
    });
    assert(box.gates === 4, `${width}px: ${box.gates} throat gates`);
    assert(box.page <= 1, `${width}px: the page overflows by ${box.page}px`);
    assert(box.cardLeft >= 0 && box.cardRight >= 0, `${width}px: the card leaves the viewport (${box.cardLeft} / ${box.cardRight})`);
    assert(box.bodyOverflow <= 1, `${width}px: the sheet body overflows by ${box.bodyOverflow}px`);
    assert(box.overflowY === 'auto', `${width}px: sheet body overflow-y is ${box.overflowY}`);
    // A coarse pointer gets the 44px target the dream page already guarantees.
    assert(box.rowHeight >= 43.5, `${width}px: a centre gate row is ${box.rowHeight}px tall`);
    assert(box.channelHeight >= 43.5, `${width}px: a channel button is ${box.channelHeight}px tall`);
    await phone.screenshot({ path: path.join(SHOTS, `center-phone-${width}.png`) });
  });

  await check(`phone ${width}: a gate opens and comes back to the centre`, async () => {
    await phone.click('#dream-detail [data-center-gate="8"] [data-shared-gate-select]');
    await phone.waitForSelector('#dream-detail .gate-detail-card[data-gate="8"]', { timeout: 5000 });
    await phone.click('#dream-detail .gate-detail-back');
    await phone.waitForSelector('#dream-detail .gate-detail-card[data-center="throat"]', { timeout: 5000 });
    await phone.screenshot({ path: path.join(SHOTS, `center-phone-${width}-back.png`) });
  });
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall centre-sheet checks passed');
process.exit(failures ? 1 : 0);
