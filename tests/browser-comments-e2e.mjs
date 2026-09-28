/** Regression for the 2026-09-28 browser review. Run against a local Vite server. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 903, height: 703 }, locale: 'zh-CN' });
  const errors = [];
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.goto(`${base}/#library/group/individual`);
  await desktop.locator('#reference-detail h2').waitFor();
  const library = await desktop.evaluate(() => ({
    bodyHeight: document.body.scrollHeight, viewport: innerHeight,
    group: [...document.querySelectorAll('[data-reference-filter]')].some(node => node.textContent === '回路组'),
    circuit: [...document.querySelectorAll('[data-reference-filter]')].some(node => node.textContent === '回路'),
    detailBottom: document.querySelector('#reference-detail').getBoundingClientRect().bottom
  }));
  assert.ok(library.group && !library.circuit, 'only circuit groups remain in the filter');
  assert.ok(library.bodyHeight <= library.viewport + 2 && library.detailBottom <= library.viewport,
    `library stays inside the desktop viewport: ${JSON.stringify(library)}`);
  const groupSections = () => desktop.locator('#reference-detail .reference-detail-body h3').allInnerTexts();
  assert.deepEqual(await groupSections(), ['知晓回路', '中心化回路', '整合通道']);
  assert.deepEqual(await desktop.locator('#reference-detail .reference-detail-body h3').last().evaluate(node =>
    [...node.nextElementSibling.querySelectorAll('[data-reference-id]')].map(link => link.dataset.referenceId)),
  ['10-20', '10-57', '20-34', '34-57']);
  await desktop.goto(`${base}/#library/group/collective`);
  assert.deepEqual(await groupSections(), ['逻辑回路', '感知回路']);
  await desktop.goto(`${base}/#library/group/tribal`);
  assert.deepEqual(await groupSections(), ['自我回路', '防御回路']);
  for (const [id, group] of [['10-34', '个体回路'], ['20-57', '个体回路'],
    ['30-41', '集体回路'], ['32-54', '家族回路']]) {
    await desktop.goto(`${base}/#library/channel/${id}`);
    assert.equal(await desktop.locator('#reference-detail .channel-detail-heading .circuit-badge').innerText(), group);
  }
  await desktop.locator('#reference-search').fill('14.2');
  assert.equal(await desktop.locator('#reference-results .reference-result').count(), 0, 'line search is removed');

  await desktop.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
  await desktop.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
  assert.equal(await desktop.locator('.share-fields').count(), 0, 'share parameters are not always shown');
  await desktop.locator('.panel-tab[data-panel="cross"]').click();
  const foundation = desktop.locator('#panel-content .foundation-clickable');
  assert.ok(await foundation.count() >= 2);
  await foundation.first().hover();
  assert.equal(await foundation.first().evaluate(node =>
    node.parentElement.querySelectorAll('.foundation-clickable.row-lit').length), 1,
  'hover emphasizes one foundation card');
  await desktop.locator('#bodygraph-container .bg-gate[data-gate="23"]').first().click();
  assert.match(await desktop.locator('#gate-detail .detail-hexagram').innerText(), /^（.+）$/);
  await desktop.locator('#gate-detail .gate-detail-close').click();
  await desktop.locator('#bodygraph-container .bg-gate[data-gate="30"]').first().click();
  await desktop.locator('#gate-detail [data-channel="30-41"]').click();
  assert.match(await desktop.locator('#gate-detail .channel-detail-heading .circuit-badge').innerText(), /集体回路/);

  await desktop.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8&view=timeline`);
  await desktop.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 120000 });
  await desktop.locator('#timeline-view .tl-advanced summary').click();
  const row = desktop.locator('#timeline-view .tl-condition-row').first();
  await row.locator('[data-condition="kind"]').selectOption('channel');
  await row.locator('[data-action="toggle-targets"]').click();
  await row.locator('[data-condition="target-search"]').fill('7-31');
  await row.locator('input[data-target-id="7-31"]').check();
  assert.equal(await row.locator('input[data-target-id]:checked').count(), 1, 'each condition selects one target');
  await desktop.locator('#timeline-view [data-action="run-query"]').click();
  assert.ok(await desktop.locator('#timeline-view [data-query-interval]').count() > 0, 'channel has a matching interval');
  await desktop.evaluate(() => {
    const graph = document.querySelector('#timeline-view .tl-graph');
    window.__reviewGraphWentBlank = false;
    window.__reviewGraphObserver = new MutationObserver(() => {
      if (!graph.querySelector('.bodygraph-svg')) window.__reviewGraphWentBlank = true;
    });
    window.__reviewGraphObserver.observe(graph, { childList: true });
  });
  await desktop.locator('#timeline-view [data-query-interval]').first().click();
  await desktop.waitForFunction(() => document.querySelector('#timeline-view .tl-row[data-key="channel:7-31"]')
    ?.classList.contains('tl-row-lit'));
  assert.equal(await desktop.locator('#timeline-view [data-field="kind"]').inputValue(), 'channel');
  assert.equal(await desktop.locator('#timeline-view .tl-row[data-key="gate:7"].tl-row-lit').count(), 0,
    'channel match emphasizes the channel row');
  assert.equal(await desktop.evaluate(() => {
    window.__reviewGraphObserver.disconnect();
    return window.__reviewGraphWentBlank;
  }), false, 'query navigation never clears the bodygraph container');
  await desktop.locator('#timeline-view [data-field="span"]').selectOption('year');
  await desktop.waitForFunction(() => {
    const table = document.querySelector('#timeline-view .tl-table');
    return table?.getAttribute('aria-busy') === 'false' &&
      Number(table.dataset.calculatedEnd) - Number(table.dataset.calculatedStart) > 300 * 86400000;
  }, null, { timeout: 120000 });
  await desktop.locator('#timeline-view [data-field="kind"]').selectOption('gate');
  const repeatingGate = await desktop.locator('#timeline-view .tl-row[data-key^="gate:"]').evaluateAll(nodes =>
    nodes.find(node => !node.matches('[data-active-source="natal"]') && node.querySelectorAll('.tl-bar').length > 1)
      ?.dataset.key.split(':')[1]);
  assert.ok(repeatingGate, 'annual timeline has a repeating transit gate');
  await row.locator('[data-condition="kind"]').selectOption('gate');
  await row.locator('[data-action="toggle-targets"]').click();
  await row.locator('[data-condition="target-search"]').fill(repeatingGate);
  await row.locator(`input[data-target-id="${repeatingGate}"]`).check();
  await desktop.locator('#timeline-view [data-action="run-query"]').click();
  const matchCount = Number((await desktop.locator('#timeline-view .tl-query-navigation span').innerText()).split('/')[1]);
  assert.ok(matchCount > 1, `annual gate query has multiple matches: ${matchCount}`);
  await desktop.locator('#timeline-view [data-action="next-match"]').click();
  assert.match(await desktop.locator('#timeline-view .tl-query-navigation span').innerText(), /^2 \/ /);
  assert.deepEqual(errors, []);
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 703 }, isMobile: true,
    hasTouch: true, locale: 'zh-CN' });
  await mobile.goto(`${base}/#library/channel/32-54`);
  await mobile.locator('#reference-detail h2').waitFor();
  const sheet = await mobile.evaluate(() => ({
    fixed: getComputedStyle(document.querySelector('#reference-detail')).position,
    bottom: document.querySelector('#reference-detail').getBoundingClientRect().bottom,
    viewport: innerHeight
  }));
  assert.equal(sheet.fixed, 'fixed');
  assert.ok(Math.abs(sheet.bottom - sheet.viewport) < 2, `mobile detail is a bottom sheet: ${JSON.stringify(sheet)}`);
  await mobile.close();
  console.log('Browser comment layout and channel navigation checks passed.');
} finally {
  await browser.close();
}
