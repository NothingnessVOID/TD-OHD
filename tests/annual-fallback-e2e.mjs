import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN' });
  let annualRequests = 0;
  await page.route('**/transit-data/*/*.json', route => {
    annualRequests++;
    return route.fulfill({ status: 503, body: 'Annual data temporarily unavailable' });
  });
  await page.goto(`${base}/?d=1990-06-15&t=14:30&tz=8&view=timeline`);
  await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 120000 });
  const details = await page.locator('#timeline-view .tl-table').evaluate(node => ({
    start: Number(node.dataset.calculatedStart), end: Number(node.dataset.calculatedEnd),
    rows: document.querySelectorAll('#timeline-view .tl-row').length,
    status: document.querySelector('#timeline-view .tl-event-status')?.textContent || ''
  }));
  assert.equal(annualRequests, 1);
  assert.ok(details.rows > 0, 'fallback retains calculated graph rows');
  assert.ok(details.end - details.start <= 8 * 86_400_000, 'fallback only scans the requested 7-day range');
  assert.ok(details.status, 'fallback is disclosed instead of presenting a false empty sky');
  console.log(`Annual fallback browser check passed: ${details.rows} rows, ${(details.end - details.start) / 86_400_000} days.`);
} finally {
  await browser.close();
}
