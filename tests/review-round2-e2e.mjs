/** Focused browser checks for the second timeline and chart review. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 903, height: 703 }, locale: 'zh-CN' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${base}/#library/center/head`);
  await page.locator('#reference-detail .center-reading').waitFor();
  assert.equal(await page.locator('.reference-heading p').count(), 0);
  assert.equal(await page.locator('#reference-detail .center-reading-state').count(), 3);

  await page.goto(`${base}/?d=1985-01-01&t=12%3A00&tz=0`);
  await page.locator('#bodygraph-container svg').waitFor();
  assert.equal(await page.locator('#type-banner .banner-actions').count(), 0);
  assert.equal(await page.locator('#chart-share-menu summary').isVisible(), true);
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
  assert.deepEqual(errors, []);
  console.log('Second review browser checks passed.');
} finally {
  await browser.close();
}
