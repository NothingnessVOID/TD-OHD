/** Focused browser checks for the second timeline and chart review. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 903, height: 703 }, locale: 'zh-CN' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  const early = await browser.newPage({ viewport: { width: 1280, height: 703 }, locale: 'en-US' });
  await early.route('**/src/main.js', route => route.abort());
  await early.goto(`${base}/`);
  assert.deepEqual(await early.evaluate(() => {
    const select = document.querySelector('#language-switcher');
    const language = document.querySelector('.language-control').getBoundingClientRect();
    const theme = document.querySelector('#theme-toggle').getBoundingClientRect();
    return [getComputedStyle(select).opacity, getComputedStyle(select).position, language.right <= theme.left];
  }), ['0', 'absolute', true], 'header controls stay separate before JavaScript loads');
  await early.close();

  await page.goto(`${base}/#library/center/head`);
  await page.locator('#reference-detail .center-reading').waitFor();
  assert.equal(await page.locator('.reference-heading p').count(), 0);
  assert.equal(await page.locator('#reference-detail .center-reading-state').count(), 3);
  await page.setViewportSize({ width: 471, height: 703 });
  const detailHeading = await page.evaluate(() => {
    const back = document.querySelector('#reference-detail .reference-back').getBoundingClientRect();
    const label = document.querySelector('#reference-detail .detail-label').getBoundingClientRect();
    const title = document.querySelector('#reference-detail h2').getBoundingClientRect();
    return { backBottom: back.bottom, labelTop: label.top, labelBottom: label.bottom, titleTop: title.top };
  });
  assert.ok(detailHeading.backBottom <= detailHeading.labelTop && detailHeading.labelBottom <= detailHeading.titleTop,
    `mobile library heading does not overlap: ${JSON.stringify(detailHeading)}`);
  await page.setViewportSize({ width: 903, height: 703 });

  await page.goto(`${base}/?d=1985-01-01&t=12%3A00&tz=0`);
  await page.locator('#bodygraph-container svg').waitFor();
  assert.equal(await page.locator('#type-banner .banner-actions').count(), 0);
  assert.equal(await page.locator('#chart-share-menu summary').isVisible(), true);
  assert.equal((await page.locator('#chart-share-menu summary').innerText()).trim(), '');
  assert.equal(await page.locator('#chart-share-menu summary').evaluate(node => node.getBoundingClientRect().width), 32);
  await page.setViewportSize({ width: 714, height: 703 });
  const chartColumns = await page.evaluate(() => {
    const graph = document.querySelector('#bodygraph-container');
    const svg = graph.querySelector('svg').getBoundingClientRect();
    const design = graph.querySelector('.bg-planets-design').getBoundingClientRect();
    const personality = graph.querySelector('.bg-planets-personality').getBoundingClientRect();
    return { aligned: Math.abs(design.top - svg.top) <= 1 && Math.abs(personality.top - svg.top) <= 1,
      width: svg.width, documentWidth: document.documentElement.scrollWidth };
  });
  assert.ok(chartColumns.aligned && chartColumns.width > 350 && chartColumns.documentWidth <= 714,
    `714px chart keeps planet columns beside the graph: ${JSON.stringify(chartColumns)}`);
  await page.setViewportSize({ width: 682, height: 703 });
  assert.deepEqual(await page.locator('#bodygraph-container .bg-planets-personality').evaluate(column => [
    getComputedStyle(column.querySelector('.bg-planets-head')).textAlign,
    getComputedStyle(column.querySelector('.bg-planets-date')).textAlign,
    getComputedStyle(column.querySelector('.bg-planet-row')).justifyContent
  ]), ['right', 'right', 'flex-end'], 'personality heading, date and values share right alignment');
  await page.locator('.panel-tab[data-panel="planets"]').click();
  for (const width of [682, 343]) {
    await page.setViewportSize({ width, height: 703 });
    const table = await page.locator('.planet-table-row:not(.planet-table-head)').first().evaluate(row => {
      const cells = [...row.children].filter(cell => getComputedStyle(cell).display !== 'none');
      const bounds = row.getBoundingClientRect();
      const first = cells[0].getBoundingClientRect();
      const last = cells.at(-1).getBoundingClientRect();
      const planet = row.querySelector('.planet-cell-identity').getBoundingClientRect();
      return { planetMidpointDelta: Math.abs((planet.left + planet.right) / 2 - (bounds.left + bounds.right) / 2),
        contentWidth: last.right - first.left, rowWidth: bounds.width };
    });
    assert.ok(table.planetMidpointDelta <= 1 && table.contentWidth <= table.rowWidth,
      `${width}px planet identity stays centered: ${JSON.stringify(table)}`);
  }
  await page.setViewportSize({ width: 903, height: 703 });
  const narrowPanel = await page.locator('.planet-table-row:not(.planet-table-head)').first().evaluate(row => {
    const bounds = row.getBoundingClientRect();
    const visible = [...row.children].filter(cell => getComputedStyle(cell).display !== 'none');
    const first = visible[0].getBoundingClientRect();
    const last = visible.at(-1).getBoundingClientRect();
    return { count: visible.length, left: first.left, right: last.right, rowLeft: bounds.left, rowRight: bounds.right };
  });
  assert.ok(narrowPanel.count === 5 && narrowPanel.left >= narrowPanel.rowLeft && narrowPanel.right <= narrowPanel.rowRight,
    `903px side panel keeps planet values within the card: ${JSON.stringify(narrowPanel)}`);
  await page.locator('#bodygraph-container .bg-gate').first().click();
  const titleSizes = await page.locator('#gate-detail .detail-name').evaluate(node => ({
    name: getComputedStyle(node).fontSize,
    hexagram: getComputedStyle(node.querySelector('.detail-hexagram')).fontSize
  }));
  assert.equal(titleSizes.name, titleSizes.hexagram);
  await page.keyboard.press('Escape');

  await page.locator('.nav-link[data-view="timeline"]').click();
  const root = '#timeline-view';
  await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 120000 });
  assert.equal(await page.locator(`${root} [data-field="zone"]`).evaluate(node => node.tagName), 'OUTPUT');
  await page.locator(`${root} .tl-advanced summary`).click();
  assert.deepEqual(await page.locator(`${root} [data-condition="kind"]`).first().locator('option').evaluateAll(nodes => nodes.map(node => node.value)),
    ['bridge', 'center', 'channel', 'gate', 'line']);
  assert.equal(await page.locator(`${root} .tl-target-chips`).count(), 0);
  assert.match(await page.locator(`${root} [data-field="combine"]`).innerText(), /同时满足所有条件/);

  // Every adjacent gate jump lands where at least one new gate begins.
  for (let index = 0; index < 4; index++) {
    await page.locator(`${root} .tl-toolbar [data-action="next-gate"]`).click();
    const started = await page.locator(`${root} .tl-table`).evaluate(async table => {
      const at = Number(table.dataset.selected);
      const { snapshot } = await import('/src/features/transit-timeline/provider.js');
      const before = new Set(Object.values(snapshot(at - 1000)).filter(Boolean).map(item => item.gate));
      return Object.values(snapshot(at)).some(item => item && !before.has(item.gate));
    });
    assert.equal(started, true, `gate jump ${index + 1} starts an activation`);
    const glow = await page.locator(`${root} .tl-row-lit`).first().evaluate(node => ({
      outline: getComputedStyle(node).outlineColor,
      shadow: getComputedStyle(node).boxShadow,
      fill: getComputedStyle(node.querySelector('.tl-row-name')).backgroundColor
    }));
    assert.match(glow.outline, /169, 99, 255/);
    assert.match(glow.shadow, /169, 99, 255/);
    assert.equal(glow.fill, 'rgba(0, 0, 0, 0)');
  }

  await page.locator(`${root} [data-condition="kind"]`).first().selectOption('bridge');
  await page.locator(`${root} [data-action="run-query"]`).click();
  await page.locator(`${root} [data-query-interval]`).first().waitFor();
  const queryButton = page.locator(`${root} [data-query-interval]`).first();
  await queryButton.scrollIntoViewIfNeeded();
  const documentY = await page.evaluate(() => scrollY);
  await queryButton.click();
  await page.waitForTimeout(300);
  assert.ok(Math.abs((await page.evaluate(() => scrollY)) - documentY) <= 2,
    'query navigation preserves the document scroll position');
  await page.setViewportSize({ width: 471, height: 703 });
  const timelineMenu = await page.locator(`${root} .tl-mobile-exit`).evaluate(node => {
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height,
      fontSize: getComputedStyle(node).fontSize, label: node.getAttribute('aria-label') };
  });
  assert.deepEqual(timelineMenu, { x: 10, y: 10, width: 36, height: 36, fontSize: '17px', label: '打开导航' });
  await page.setViewportSize({ width: 343, height: 703 });
  const rangeSize = await page.locator(`${root} .tl-mobile-range`).evaluate(node => {
    const box = node.getBoundingClientRect();
    const select = node.querySelector('select');
    return { width: box.width, height: box.height, label: select.selectedOptions[0].textContent.trim() };
  });
  assert.ok(rangeSize.width <= 64 && rangeSize.height <= 32 && rangeSize.label === '7 天',
    `compact mobile range stays readable: ${JSON.stringify(rangeSize)}`);
  await page.locator(`${root} .tl-mobile-exit`).click();
  assert.equal(await page.locator('body').evaluate(node => node.classList.contains('mobile-nav-open')), true);
  assert.deepEqual(errors, []);
  console.log('Second review browser checks passed.');
} finally {
  await browser.close();
}
