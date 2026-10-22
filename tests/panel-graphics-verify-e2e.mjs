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
const skinSwitchOn = async panel => {
  await openTab(panel);
  return page.evaluate(async () => {
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
  const target = document.querySelector('#skin-picker [data-skin-id="default-dark"]');
  target?.click();
  await new Promise(done => setTimeout(done, 600));
  for (const observer of observers) observer.disconnect();
  document.getElementById('skin-settings').close();
  return {
    panel: document.querySelector('.panel-tab.active')?.dataset.panel ?? null,
    foundationMutations: counts.foundation,
    panelMutations: counts.panel,
    bodygraphMutations: counts.bodygraph,
    skin: document.documentElement.dataset.skin,
    theme: document.documentElement.dataset.theme,
    foundationFacts: document.querySelectorAll('#foundation-panel [data-panel-fact]').length,
    centerRows: document.querySelectorAll('#panel-content .panel-center-row').length,
    channelRows: document.querySelectorAll('#panel-content .panel-channel-row').length
  };
  });
};
results.skinSwitchCentres = await skinSwitchOn('centers');
results.skinSwitchChannels = await skinSwitchOn('channels');

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

// ---------- 5. Touch target floor (24 × 24), measured not inferred ----------
const measureTargets = () => page.evaluate(() => {
  const nodes = [...document.querySelectorAll(
    '#foundation-panel button, #foundation-panel [role="button"], #panel-content button, #panel-content [role="button"]')]
    // display:none controls are not rendered at this tier, so they are not targets.
    .filter(node => node.getClientRects().length);
  const small = nodes
    .map(node => {
      const box = node.getBoundingClientRect();
      return { label: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 24), w: Math.round(box.width), h: Math.round(box.height) };
    })
    .filter(item => item.w < 24 || item.h < 24);
  return { total: nodes.length, undersized: small };
});
results.touchTargets = await measureTargets();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await openTab('channels');
results.touchTargetsNarrow = await measureTargets();
await openTab('centers');
results.touchTargetsNarrowCentres = await measureTargets();
await page.setViewportSize({ width: 1440, height: 900 });

await browser.close();

const failures = [];
for (const key of ['skinSwitchCentres', 'skinSwitchChannels']) {
  if (results[key].foundationMutations !== 0) failures.push(`${key}: foundation mutated on skin switch`);
  if (results[key].panelMutations !== 0) failures.push(`${key}: panel-content mutated on skin switch`);
}
if (results.skinSwitchChannels.skin !== 'default-dark') failures.push('skin did not switch');
if (!results.channelsLinkage.litRows.length) failures.push('graph gate hover did not light a channel row');
if (!results.channelsLinkage.litOnGraph) failures.push('channel row hover did not light the graph');
if (!results.channelsLinkage.expanded) failures.push('channel row did not expand');
if (!results.channelsLinkage.collapsedAgain) failures.push('channel row did not collapse again');
if (!results.channelsLinkage.litHanging) failures.push('no hanging gate rows rendered');
if (!results.graphToPanel.litRows.some(row => row.center === 'sacral')) failures.push('centre hover did not light the row');
if (!results.graphToPanel.litCross.includes('44')) failures.push('gate hover did not light the cross cell');
if (!results.panelToGraph.centerLitOnGraph) failures.push('row hover did not light the graph');
for (const key of ['touchTargets', 'touchTargetsNarrow', 'touchTargetsNarrowCentres'])
  if (results[key].undersized.length) failures.push(`undersized touch targets (${key})`);
if (consoleErrors.length) failures.push('console errors');

console.log(JSON.stringify({ results, consoleErrors, failures }, null, 1));
process.exit(failures.length ? 1 : 0);
