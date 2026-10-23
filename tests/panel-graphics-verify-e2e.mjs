// One-shot verification for the issue #34 right column.
//
//   1. Switching Skin must not touch the right column: MutationObserver counts
//      on #foundation-panel and #panel-content must stay at 0 while the
//      bodygraph redraws (its colours are read at render time, the right
//      column is pure CSS).
//   2. Left graph → right column: hovering a centre on the bodygraph lights the
//      matching centre row (.row-lit), and hovering a gate lights the cross
//      gate cell.
//   3. Right column → left graph: pointing at a centre row lights the centre on
//      the bodygraph (bg-lit).
//
//   node tests/panel-graphics-verify-e2e.mjs [http://127.0.0.1:5216/]
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const url = process.argv[2] || 'http://127.0.0.1:5216/';
const profile = {
  id: 'style-ref-b', name: 'Style Reference B',
  birthDate: '1979-11-04', birthTime: '06:05',
  location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', error => consoleErrors.push('PAGEERROR ' + error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push('CONSOLE ' + message.text()); });

await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
await page.waitForTimeout(2000);

const results = {};

// Switch to a tab through the real control so every check runs on the panel a
// reader would actually be looking at.
const openTab = async panel => {
  const button = page.locator(`.panel-tab[data-panel="${panel}"]`).first();
  await button.click();
  await page.waitForTimeout(400);
};

// ---------- 1. Skin switch mutation count ----------
// Every tab starts from the baseline Skin and switches away from it, so a "0"
// cannot come from selecting the Skin that is already active.
const switchSkinTo = async skinId => page.evaluate(async id => {
  document.getElementById('skin-settings').showModal();
  await new Promise(done => setTimeout(done, 60));
  const button = document.querySelector(`#skin-picker [data-skin-id="${id}"]`);
  if (!button) return { error: 'no button for ' + id };
  button.click();
  await new Promise(done => setTimeout(done, 500));
  document.getElementById('skin-settings').close();
  return { skin: document.documentElement.dataset.skin };
}, skinId);

const skinSwitchOn = async (panel, targetSkin) => {
  await openTab(panel);
  const reset = await switchSkinTo('default-light');
  if (reset.skin !== 'default-light') return { error: 'could not reset to default-light', ...reset };
  return page.evaluate(async target => {
  const counts = { foundation: 0, panel: 0, bodygraph: 0, skinLabel: 0 };
  const watch = (node, key) => {
    const observer = new MutationObserver(records => { counts[key] += records.length; });
    observer.observe(node, { subtree: true, childList: true, attributes: true, characterData: true });
    return observer;
  };
  const observers = [
    watch(document.getElementById('foundation-panel'), 'foundation'),
    watch(document.getElementById('panel-content'), 'panel'),
    watch(document.getElementById('bodygraph-container'), 'bodygraph'),
    watch(document.getElementById('skin-picker'), 'skinLabel')
  ];
  document.getElementById('skin-settings').showModal();
  await new Promise(done => setTimeout(done, 50));
  const button = document.querySelector(`#skin-picker [data-skin-id="${target}"]`);
  if (!button) { for (const observer of observers) observer.disconnect(); return { error: 'no target skin button' }; }
  button.click();
  await new Promise(done => setTimeout(done, 700));
  for (const observer of observers) observer.disconnect();
  document.getElementById('skin-settings').close();
  return {
    panel: document.querySelector('.panel-tab.active')?.dataset.panel ?? null,
    requestedSkin: target,
    foundationMutations: counts.foundation,
    panelMutations: counts.panel,
    bodygraphMutations: counts.bodygraph,
    skin: document.documentElement.dataset.skin,
    theme: document.documentElement.dataset.theme,
    foundationFacts: document.querySelectorAll('#foundation-panel [data-panel-fact]').length,
    centerRows: document.querySelectorAll('#panel-content .panel-center-row').length,
    channelRows: document.querySelectorAll('#panel-content .panel-channel-row').length
  };
  }, targetSkin);
};
// Alternate the target so the switch is a real change on every tab.
results.skinSwitchCentres = await skinSwitchOn('centers', 'default-dark');
results.skinSwitchChannels = await skinSwitchOn('channels', 'high-contrast');
results.skinSwitchGates = await skinSwitchOn('gates', 'default-dark');
results.skinSwitchPlanets = await skinSwitchOn('planets', 'high-contrast');
results.skinSwitchCross = await skinSwitchOn('cross', 'default-dark');
results.skinSwitchVariable = await skinSwitchOn('variable', 'high-contrast');
await switchSkinTo('default-light');

// ---------- 2. Left graph → right column ----------
await openTab('centers');
results.graphToPanel = await page.evaluate(async () => {
  const svg = document.querySelector('.bg-svg-wrap svg');
  const centerPath = svg.querySelector('path[data-center="sacral"]');
  centerPath.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  await new Promise(done => setTimeout(done, 120));
  const litRows = [...document.querySelectorAll('#panel-content .row-lit')]
    .map(node => ({ center: node.dataset.center, cls: node.className }));
  const gatePath = svg.querySelector('path[data-gate="44"]') || svg.querySelector('[data-gate="44"]');
  gatePath?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  await new Promise(done => setTimeout(done, 120));
  const litCross = [...document.querySelectorAll('#foundation-panel .row-lit')]
    .map(node => node.dataset.gate ?? node.className);
  svg.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
  return { litRows, litCross, gateHovered: !!gatePath };
});

// ---------- 3. Right column → left graph ----------
results.panelToGraph = await page.evaluate(async () => {
  const row = document.querySelector('#panel-content .panel-center-row[data-center="g"]');
  const main = row?.querySelector('.panel-center-main');
  main?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false, pointerType: 'mouse' }));
  row?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false, pointerType: 'mouse' }));
  await new Promise(done => setTimeout(done, 150));
  const litCenter = document.querySelector('.bg-svg-wrap svg path[data-center="g"].bg-lit');
  const dimmed = document.querySelector('.bg-svg-wrap svg')?.classList.contains('bg-dimmed');
  row?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false, pointerType: 'mouse' }));
  return { centerLitOnGraph: !!litCenter, graphDimmed: !!dimmed };
});

// ---------- 4. Channels tab: graph → row, row → graph ----------
await openTab('channels');
results.channelsLinkage = await page.evaluate(async () => {
  const svg = document.querySelector('.bg-svg-wrap svg');
  const gate = document.querySelector('#panel-content .panel-channel-row')?.dataset.gate;
  const gatePath = svg.querySelector(`[data-gate="${gate}"]`);
  gatePath?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  await new Promise(done => setTimeout(done, 150));
  const litRows = [...document.querySelectorAll('#panel-content .panel-channel-row.row-lit')].map(node => node.dataset.gate);
  const litHanging = [...document.querySelectorAll('#panel-content .panel-hanging-row')].length;
  const row = document.querySelector('#panel-content .panel-channel-row');
  row?.querySelector('.panel-channel-main')?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false, pointerType: 'mouse' }));
  row?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false, pointerType: 'mouse' }));
  await new Promise(done => setTimeout(done, 150));
  const litOnGraph = !!document.querySelector('.bg-svg-wrap svg .bg-lit');
  // The row expander is what reveals description + whenDefined.
  row?.querySelector('.panel-channel-main')?.click();
  await new Promise(done => setTimeout(done, 80));
  const expanded = row?.dataset.expanded === 'true' && !row.querySelector('.panel-channel-detail')?.hidden;
  row?.querySelector('.panel-channel-main')?.click();
  return { gate, litRows, litHanging, litOnGraph, expanded, collapsedAgain: row?.dataset.expanded === 'false' };
});

// ---------- 4b. Gates tab: grid geometry, grid ↔ list, graph ↔ grid ----------
await openTab('gates');
results.gateGrid = await page.evaluate(async () => {
  const grid = document.querySelector('.pg-gate-grid');
  const cells = [...document.querySelectorAll('.pg-gate-cell')];
  const rows = new Set(cells.map(cell => Math.round(cell.getBoundingClientRect().top)));
  const first = cells[0]?.getBoundingClientRect();
  const perRow = cells.filter(cell => Math.round(cell.getBoundingClientRect().top) === Math.round(first?.top ?? 0)).length;
  // Hover one cell: the graph should light and the matching pill should light.
  const target = cells.find(cell => cell.dataset.state === 'design' || cell.dataset.state === 'both' || cell.dataset.state === 'personality');
  target?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
  await new Promise(done => setTimeout(done, 150));
  const litPill = document.querySelector(`.panel-gate-pill[data-gate="${target?.dataset.gate}"].row-lit`);
  const graphLit = !!document.querySelector('.bg-svg-wrap svg .bg-lit');
  target?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
  // Graph → grid: light a gate from the bodygraph side.
  const gate = target?.dataset.gate;
  document.querySelector('.bg-svg-wrap svg')?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  const svgGate = document.querySelector(`.bg-svg-wrap svg [data-gate="${gate}"]`);
  svgGate?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  await new Promise(done => setTimeout(done, 150));
  const litCell = document.querySelector(`.pg-gate-cell[data-gate="${gate}"].row-lit`);
  const litPillFromGraph = document.querySelector(`.panel-gate-pill[data-gate="${gate}"].row-lit`);
  return {
    cells: cells.length, rows: rows.size, perRow,
    gridHeight: Math.round(grid?.getBoundingClientRect().height ?? 0),
    litPill: !!litPill, graphLit, litCell: !!litCell, litPillFromGraph: !!litPillFromGraph
  };
});

// ---------- 4c. Planets tab: ctb micro-bar expands back to the raw text ----------
await openTab('planets');
results.planetRows = await page.evaluate(async () => {
  const rows = [...document.querySelectorAll('.panel-planet-row[data-planet]')];
  const first = rows[0];
  first?.querySelector('.panel-planet-id')?.click();
  await new Promise(done => setTimeout(done, 80));
  const expanded = first?.dataset.expanded === 'true' && !first.querySelector('.panel-planet-detail')?.hidden;
  const detailText = first?.querySelector('.panel-planet-detail')?.textContent?.trim() ?? '';
  first?.querySelector('.panel-planet-id')?.click();
  const bars = document.querySelectorAll('.pg-planet-bar').length;
  const microBars = document.querySelectorAll('.pg-micro-bar').length;
  const fixings = [...document.querySelectorAll('.pg-fixing')].map(node => node.dataset.state);
  return {
    count: rows.length, expanded, collapsedAgain: first?.dataset.expanded === 'false',
    detailHasCtb: /\d\.\d\.\d/.test(detailText), bars, microBars,
    fixingStates: [...new Set(fixings)]
  };
});

// ---------- 4d. Cross + Variable: palaces, angle text, knowledge entries ----------
await openTab('cross');
results.crossQuad = await page.evaluate(() => {
  const palaces = [...document.querySelectorAll('.pg-cross-palace[data-gate]')];
  const quad = document.querySelector('.pg-cross-quad');
  return {
    palaces: palaces.length,
    gates: palaces.map(node => node.dataset.gate),
    sides: palaces.map(node => node.dataset.side),
    angle: quad?.dataset.angle ?? null,
    angleBadge: document.querySelector('.pg-cross-angle')?.textContent?.trim() ?? null,
    angleFull: document.querySelector('.pg-cross-angle-full')?.textContent?.trim().slice(0, 40) ?? null,
    ladderBands: document.querySelectorAll('.pg-gk-band').length,
    // Equal width is the point: the three tiers must not encode a ratio.
    ladderWidths: [...(document.querySelector('.pg-gk-ladder')?.querySelectorAll('.pg-gk-band') || [])].map(node => Math.round(node.getBoundingClientRect().width))
  };
});
await openTab('variable');
results.variableQuad = await page.evaluate(() => {
  const corners = [...document.querySelectorAll('.pg-var-corner')];
  return {
    corners: corners.length,
    positions: corners.map(node => node.dataset.position),
    directions: corners.map(node => node.dataset.direction),
    knowledge: corners.map(node => node.dataset.knowledgeVariable || null),
    arrows: [...document.querySelectorAll('.pg-var-arrow')].length
  };
});

// ---------- 5. Touch target floor (24 × 24), measured not inferred ----------
// Sizes are NOT rounded: rounding 23.6 up to 24 would let a real failure pass.
// Links and the tab strip are included, and every tab is measured, not just the
// two that happened to be open.
const measureTargets = () => page.evaluate(() => {
  const nodes = [...document.querySelectorAll(
    '#foundation-panel button, #foundation-panel [role="button"], #foundation-panel a,' +
    ' #panel-content button, #panel-content [role="button"], #panel-content a,' +
    ' .panel-tabs button, .panel-tabs [role="tab"], .panel-tabs a')]
    // display:none controls are not rendered at this tier, so they are not targets.
    .filter(node => node.getClientRects().length);
  const small = nodes
    .map(node => {
      const box = node.getBoundingClientRect();
      return {
        label: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 24),
        w: Number(box.width.toFixed(2)),
        h: Number(box.height.toFixed(2))
      };
    })
    .filter(item => item.w < 24 || item.h < 24);
  return { total: nodes.length, undersized: small };
});
const PANEL_TABS = ['centers', 'channels', 'gates', 'planets', 'variable', 'cross'];
const measureAllTabs = async () => {
  const out = {};
  for (const tab of PANEL_TABS) {
    await openTab(tab);
    out[tab] = await measureTargets();
  }
  return out;
};
results.touchTargets = await measureAllTabs();
// Grid geometry at every tier: the row count is measured, not inferred.
const gridAt = async (width, height) => {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(350);
  await openTab('gates');
  return page.evaluate(() => {
    const cells = [...document.querySelectorAll('.pg-gate-cell')];
    const tops = [...new Set(cells.map(cell => Math.round(cell.getBoundingClientRect().top)))].sort((a, b) => a - b);
    const perRow = tops.map(top => cells.filter(cell => Math.round(cell.getBoundingClientRect().top) === top).length);
    const grid = document.querySelector('.pg-gate-grid');
    return {
      cells: cells.length,
      rows: tops.length,
      perRow,
      height: Math.round(grid.getBoundingClientRect().height),
      column: Math.round(document.querySelector('.info-column').getBoundingClientRect().width)
    };
  });
};
results.grid1440 = await gridAt(1440, 900);
results.grid641 = await gridAt(641, 800);
results.grid390 = await gridAt(390, 844);
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await openTab('channels');
results.touchTargetsNarrow = await measureAllTabs();
await openTab('centers');
results.touchTargetsNarrowCentres = await measureAllTabs();

// ---------- 5b. B tier ----------
// 1440 / 641 / 390 land on A / C / C, so the middle tier had zero coverage.
// 1024 gives a column around 561px, which is genuinely B (380-599).
await gridAt(1024, 800);
await page.setViewportSize({ width: 1024, height: 800 });
await page.waitForTimeout(350);
results.columnWidthB = await page.evaluate(() => Math.round(document.querySelector('.info-column').getBoundingClientRect().width));
results.gridB = await page.evaluate(() => {
  const cells = [...document.querySelectorAll('.pg-gate-cell')];
  const tops = [...new Set(cells.map(cell => Math.round(cell.getBoundingClientRect().top)))].sort((a, b) => a - b);
  return {
    cells: cells.length,
    rows: tops.length,
    perRow: tops.map(top => cells.filter(cell => Math.round(cell.getBoundingClientRect().top) === top).length),
    height: Math.round(cells[0]?.closest('.pg-gate-grid')?.getBoundingClientRect().height ?? 0)
  };
});
results.touchTargetsB = await measureAllTabs();

await page.setViewportSize({ width: 1440, height: 900 });

await browser.close();

const failures = [];
for (const key of ['skinSwitchCentres', 'skinSwitchChannels', 'skinSwitchGates', 'skinSwitchPlanets', 'skinSwitchCross', 'skinSwitchVariable']) {
  const run = results[key];
  if (run.error) { failures.push(`${key}: ${run.error}`); continue; }
  if (run.foundationMutations !== 0) failures.push(`${key}: foundation mutated on skin switch`);
  if (run.panelMutations !== 0) failures.push(`${key}: panel-content mutated on skin switch`);
  // A zero on the right column only means something if the Skin really changed
  // and the bodygraph really re-rendered.
  if (run.skin !== run.requestedSkin) failures.push(`${key}: skin is ${run.skin}, wanted ${run.requestedSkin}`);
  if (!(run.bodygraphMutations > 0)) failures.push(`${key}: bodygraph did not re-render (mutation ${run.bodygraphMutations})`);
}
if (!results.channelsLinkage.litRows.length) failures.push('graph gate hover did not light a channel row');
if (!results.channelsLinkage.litOnGraph) failures.push('channel row hover did not light the graph');
if (!results.channelsLinkage.expanded) failures.push('channel row did not expand');
if (!results.channelsLinkage.collapsedAgain) failures.push('channel row did not collapse again');
if (!results.channelsLinkage.litHanging) failures.push('no hanging gate rows rendered');
for (const key of ['skinSwitchGates', 'skinSwitchPlanets']) {
  if (results[key].foundationMutations !== 0) failures.push(`${key}: foundation mutated on skin switch`);
  if (results[key].panelMutations !== 0) failures.push(`${key}: panel-content mutated on skin switch`);
}
if (results.gateGrid.cells !== 64) failures.push(`gate grid has ${results.gateGrid.cells} cells`);
if (!results.gateGrid.litPill) failures.push('grid hover did not light its pill');
if (!results.gateGrid.graphLit) failures.push('grid hover did not light the graph');
if (!results.gateGrid.litCell) failures.push('graph gate hover did not light the grid cell');
if (!results.gateGrid.litPillFromGraph) failures.push('graph gate hover did not light the pill');
if (!results.planetRows.expanded || !results.planetRows.detailHasCtb) failures.push('planet row does not expand back to c.t.b');
if (results.planetRows.count !== 13) failures.push(`planet table has ${results.planetRows.count} rows`);
if (!results.planetRows.bars || !results.planetRows.microBars) failures.push('planet bars or micro-bars missing');
if (results.crossQuad.palaces !== 4) failures.push(`cross quad has ${results.crossQuad.palaces} palaces`);
if (!results.crossQuad.angleBadge) failures.push('cross angle badge missing');
if (!results.crossQuad.angleFull) failures.push('cross angle wording missing');
if (results.crossQuad.ladderBands !== 12) failures.push(`gene keys has ${results.crossQuad.ladderBands} bands, expected 12`);
if (new Set(results.crossQuad.ladderWidths).size !== 1) failures.push('gene keys bands are not equal width');
if (results.variableQuad.corners !== 4) failures.push(`variable quad has ${results.variableQuad.corners} corners`);
if (!results.variableQuad.knowledge.every(Boolean)) failures.push('a variable corner has no knowledge entry');
// 1440: 32 + 32 cells, 18px tall. 641: 25 + 25 + 14, 28px tall. 390: 32 + 32.
const gridExpectations = [
  ['grid1440', { rows: 2, perRow: [32, 32], height: 18 }],
  ['grid641', { rows: 3, perRow: [25, 25, 14], height: 28 }],
  ['grid390', { rows: 2, perRow: [32, 32], height: 18 }]
];
for (const [key, expected] of gridExpectations) {
  const actual = results[key];
  if (actual.cells !== 64) failures.push(`${key}: ${actual.cells} cells`);
  if (actual.rows !== expected.rows) failures.push(`${key}: ${actual.rows} rows, expected ${expected.rows}`);
  if (JSON.stringify(actual.perRow) !== JSON.stringify(expected.perRow)) failures.push(`${key}: per-row ${actual.perRow.join('+')}, expected ${expected.perRow.join('+')}`);
  if (Math.abs(actual.height - expected.height) > 1) failures.push(`${key}: grid height ${actual.height}, expected ${expected.height}`);
}
if (!results.graphToPanel.litRows.some(row => row.center === 'sacral')) failures.push('centre hover did not light the row');
if (!results.graphToPanel.litCross.includes('44')) failures.push('gate hover did not light the cross cell');
if (!results.panelToGraph.centerLitOnGraph) failures.push('row hover did not light the graph');

// B tier assertions (measurements taken in section 5b, before the browser closed)
if (!(results.columnWidthB >= 380 && results.columnWidthB < 600))
  failures.push(`B tier not actually covered: column ${results.columnWidthB}px is not in 380-599`);
if (results.gridB.cells !== 64) failures.push(`gridB: ${results.gridB.cells} cells`);
if (results.gridB.rows !== 2) failures.push(`gridB: ${results.gridB.rows} rows, expected 2`);

const touchKeys = ['touchTargets', 'touchTargetsNarrow', 'touchTargetsNarrowCentres', 'touchTargetsB'];
for (const key of touchKeys) {
  const perTab = results[key] || {};
  for (const [tab, measurement] of Object.entries(perTab)) {
    if (measurement.undersized.length)
      failures.push(`undersized touch targets (${key} / ${tab}): ` +
        measurement.undersized.map(item => `${item.label || '(no name)'} ${item.w}×${item.h}`).join('; '));
  }
  const covered = Object.keys(perTab);
  if (covered.length !== 6) failures.push(`${key}: only ${covered.length} tabs measured, expected 6`);
}
if (consoleErrors.length) failures.push('console errors');

console.log(JSON.stringify({ results, consoleErrors, failures }, null, 1));
process.exit(failures.length ? 1 : 0);
