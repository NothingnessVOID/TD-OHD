import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  await page.goto(`${base}/?d=1990-06-15&t=14:30&tz=8&view=timeline`);
  await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 60000 });
  const root = '#timeline-view';
  await page.locator(`${root} .tl-advanced summary`).click();
  await page.locator(`${root} [data-condition="kind"]`).first().selectOption('line');
  await page.locator(`${root} [data-condition="ids"]`).first().fill('18.1');
  await page.locator(`${root} [data-action="run-query"]`).click();
  assert.equal(await page.locator(`${root} [data-query-interval]`).count(), 1);
  const active = await page.locator(`${root} [data-query-interval]`).first().textContent();
  await page.locator(`${root} [data-query-interval]`).first().click();
  await page.waitForFunction(() => document.querySelector('#timeline-view .tl-row[data-key="gate:18"]')?.classList.contains('tl-row-lit'));
  await page.locator(`${root} [data-condition="state"]`).first().selectOption('inactive');
  await page.locator(`${root} [data-action="run-query"]`).click();
  assert.ok(await page.locator(`${root} [data-query-interval]`).count() >= 1);
  assert.notEqual(await page.locator(`${root} [data-query-interval]`).first().textContent(), active);
  await page.locator(`${root} [data-condition="ids"]`).first().fill('999.1');
  await page.locator(`${root} [data-action="run-query"]`).click();
  assert.match(await page.locator(`${root} .tl-query-status`).textContent(), /Unknown condition target/);
  assert.equal(await page.locator(`${root} [data-query-interval]`).count(), 0);
  console.log('Timeline condition browser checks passed.');
} finally {
  await browser.close();
}
