/**
 * Issue #38/#39 verification against the dev server.
 *
 *   node tests/issues-38-39-e2e.mjs
 *
 * Uses fictional charts only. Covers split-row semantics for a one-island
 * chart, the retained bridge row for multi-island charts, and the relationship
 * composite's two activation columns across four viewport widths.
 */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = (process.env.E2E_URL || 'http://127.0.0.1:19971').replace(/\/$/, '');
const evidence = process.env.EVIDENCE_DIR || '../issue38-39-evidence';
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('ohd-language', 'zh-CN'));
  await page.goto(base);
  await page.locator('#birth-form').waitFor({ timeout: 30000 });

  const splitResult = await page.evaluate(async () => {
    const { stateAt } = await import('/src/features/transit-timeline/graph-provider.js');
    const { splitState } = await import('/src/features/transit-timeline/bridge.js');
    const one = { gates: { all: [10, 34] }, centers: { definedNames: ['g', 'sacral'] } };
    const two = { gates: { all: [10, 34, 18, 58] }, centers: { definedNames: ['g', 'sacral', 'root', 'spleen'] } };
    const detached = { sun: { gate: 17, line: 1 }, earth: { gate: 62, line: 1 } };
    const attached = { sun: { gate: 57, line: 1 }, earth: { gate: 20, line: 1 } };
    return {
      oneSplit: stateAt(one, detached, 'overlay').get('bridge:natal'),
      oneAttached: stateAt(one, attached, 'overlay').get('bridge:natal'),
      twoDetached: stateAt(two, detached, 'overlay').get('bridge:natal'),
      oneApplicable: splitState(one, new Set([10, 34, 17, 62])).applicable,
      twoApplicable: splitState(two, new Set([10, 34, 18, 58, 17, 62])).applicable,
    };
  });
  assert.equal(splitResult.oneSplit, JSON.stringify([['ajna', 'throat']]), 'one-island chart reports the new island');
  assert.equal(splitResult.oneAttached, undefined, 'an attached channel is not a split');
  assert.equal(splitResult.twoDetached, undefined, 'a two-island chart never reports split islands');
  assert.equal(splitResult.oneApplicable, true);
  assert.equal(splitResult.twoApplicable, false);

  const relationship = await page.evaluate(async () => {
    const { CHANNELS } = await import('/src/lib/human-design/catalog.js');
    const { compareHumanDesign } = await import('/src/lib/human-design/connection.js');
    const { renderConnectionContent } = await import('/src/views/connection.js');
    const chart = gates => {
      const channels = CHANNELS.filter(ch => ch.gates.every(gate => gates.includes(gate)));
      const design = { sun: { gate: gates[0], line: 1 }, earth: { gate: gates[1], line: 2 } };
      const personality = { sun: { gate: gates[2], line: 3 }, earth: { gate: gates[3], line: 4 } };
      return { gates: { all: gates, personality, design }, channels,
        centers: { definedNames: [...new Set(channels.flatMap(ch => ch.centers))] },
        type: { name: 'Generator', strategy: 'To Respond' }, strategy: 'To Respond',
        authority: { name: 'Sacral Authority' }, profile: { numbers: '1/3' }, definition: 'Single Definition' };
    };
    const a = { birth: { name: 'Fictional A' }, chart: chart([10, 34, 18, 58]) };
    const b = { birth: { name: 'Fictional B' }, chart: chart([17, 62, 19, 49]) };
    const comparison = compareHumanDesign(a.chart, b.chart);
    document.querySelector('#connection-view').classList.remove('hidden');
    renderConnectionContent(comparison, a, b);
    const read = side => [...document.querySelectorAll('#conn-activations-' + side + ' .tl-birth-value')].map(node => ({
      side: node.dataset.side, planet: node.dataset.birthPlanet, gate: node.dataset.gate,
      text: node.querySelector('.bg-planet-act').textContent, title: node.title }));
    return {
      a: read('a'), b: read('b'),
      heads: [...document.querySelectorAll('.conn-person-side .bg-planets-head')].map(node => node.textContent),
      names: [...document.querySelectorAll('.conn-person-name')].map(node => node.textContent),
      composite: !!document.querySelector('#conn-composite .bodygraph-svg'),
      columns: document.querySelectorAll('.conn-person-side').length,
    };
  });
  assert.equal(relationship.columns, 2, 'one activation column per person');
  assert.equal(relationship.composite, true, 'composite bodygraph still renders');
  assert.deepEqual(relationship.heads, ['设计', '人格', '设计', '人格'], 'both sides carry Design and Personality');
  assert.deepEqual(relationship.names, ['Fictional A', 'Fictional B']);
  assert.equal(relationship.a.length, 26, '13 planets x design/personality for A');
  assert.equal(relationship.b.length, 26, '13 planets x design/personality for B');
  assert.equal(relationship.a.filter(cell => cell.side === 'design' && cell.gate).length, 2);
  assert.equal(relationship.a[0].text, '10.1');
  assert.equal(relationship.b[0].text, '17.1');
  assert.ok(relationship.a[0].title.includes('设计'), 'activation cells keep their localized titles');

  const widths = [1440, 1024, 768, 390];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const layout = await page.evaluate(() => {
      const sides = [...document.querySelectorAll('.conn-person-side')];
      const composite = document.querySelector('#conn-composite');
      const box = node => { const r = node.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }; };
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        sides: sides.map(box),
        composite: composite ? box(composite) : null,
        visibleCells: sides.map(node => [...node.querySelectorAll('.tl-birth-value')].filter(cell => cell.getBoundingClientRect().width > 0).length),
        wide: sides.map(node => node.scrollWidth > node.clientWidth + 1),
      };
    });
    assert.equal(layout.overflow, false, width + 'px: no horizontal page overflow');
    assert.deepEqual(layout.visibleCells, [26, 26], width + 'px: both people keep all activation cells');
    assert.deepEqual(layout.wide, [false, false], width + 'px: activation columns do not overflow their cards');
    if (width > 640) {
      assert.ok(layout.sides[0].right <= layout.composite.left + 1, width + 'px: A sits left of the composite');
      assert.ok(layout.sides[1].left >= layout.composite.right - 1, width + 'px: B sits right of the composite');
    } else {
      assert.equal(layout.sides[0].left, layout.sides[1].left, width + 'px: stacked on phones');
    }
    await page.locator('.composite-wrap').screenshot({ path: evidence + '/connection-' + width + '.png' });
  }
  assert.deepEqual(errors, [], 'no page errors');
  console.log(JSON.stringify({ result: 'passed', evidence, viewports: widths }));
} finally {
  await browser.close();
}
