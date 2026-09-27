import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const chrome = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : { channel: process.env.CHROME_CHANNEL || 'chrome' };
const browser = await chromium.launch({ ...chrome, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'en-GB' });
const page = await context.newPage();
const url = `${base}/?d=1990-06-15&t=14:30&tz=8&n=Analysis%20Demo&view=timeline`;
const field = id => `#timeline-view [data-field="${id}"]`;
const action = id => `#timeline-view [data-action="${id}"]`;
const ready = () => page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 120000 });
const selected = () => page.locator('#timeline-view .tl-table').evaluate(node => Number(node.dataset.selected));
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto(url);
  await ready();
  await page.selectOption(field('span'), '1');
  await ready();
  const moon = await page.locator('#timeline-view .tl-planet[data-planet="moon"] strong').innerText();
  await page.selectOption(field('planet'), 'moon');
  await ready();
  assert.ok(await page.locator('#timeline-view .tl-planet-filtered-out').count() > 0);
  const activeTransitGates = await page.locator('#timeline-view .tl-row[data-key^="gate:"][data-active-source="transit"], #timeline-view .tl-row[data-key^="gate:"][data-active-source="both"]')
    .evaluateAll(nodes => nodes.map(node => Number(node.dataset.key.split(':')[1])));
  assert.ok(activeTransitGates.every(gate => gate === Number(moon.split('.')[0])),
    'single-planet bars and the chart use the same transit selection');

  await page.selectOption(field('planet'), 'all');
  await ready();
  const gateButton = page.locator('#timeline-view .tl-row[data-key^="gate:"] .tl-row-name').first();
  const watched = await gateButton.locator('..').getAttribute('data-key');
  await gateButton.click();
  await page.locator('#gate-detail .tl-detail-watch').click();
  await page.keyboard.press('Escape');
  await page.locator(action('watch-only')).click();
  assert.deepEqual(await page.locator('#timeline-view .tl-row').evaluateAll(nodes => nodes.map(node => node.dataset.key)), [watched]);
  await page.goto(url);
  await ready();
  await page.locator(action('watch-only')).click();
  assert.deepEqual(await page.locator('#timeline-view .tl-row').evaluateAll(nodes => nodes.map(node => node.dataset.key)), [watched]);
  await page.locator(action('watch-only')).click();

  await page.locator('.tl-analysis summary').click();
  await page.locator(action('set-a')).click();
  const before = await selected();
  await page.locator(action('next-event')).click();
  const after = await selected();
  assert.ok(after > before, 'next-event moves to a real event in the calculated window');
  await page.locator(action('set-b')).click();
  assert.match(await page.locator('.tl-compare-output').innerText(), /Active only at B/);
  assert.match(await page.locator('.tl-compare-output').innerText(), /Active only at A/);

  const currentLine = await page.locator('#timeline-view .tl-planet[data-planet="moon"] strong').innerText();
  await page.selectOption(field('condition'), 'line');
  await page.fill(field('query-id'), currentLine);
  await page.locator(action('run-query')).click();
  await page.waitForFunction(() => /matching windows/.test(document.querySelector('.tl-query-status')?.textContent || ''), null, { timeout: 120000 });
  assert.equal(await page.locator(field('event-level')).inputValue(), 'line');
  assert.ok(await page.locator('.tl-query-results [data-query-match]').count() > 0);
  await page.locator('.tl-query-results [data-query-match]').first().click();
  assert.equal(await page.locator('#gate-detail .tl-detail-timing[data-kind="line"]').count(), 1);
  await page.keyboard.press('Escape');

  await page.selectOption(field('condition'), 'bridge');
  await page.locator(action('run-query')).click();
  await page.waitForFunction(() => !/Searching/.test(document.querySelector('.tl-query-status')?.textContent || ''), null, { timeout: 120000 });
  assert.ok((await page.locator('.tl-query-status').innerText()).length > 0);
  await page.selectOption(field('span'), 'year');
  await page.locator(action('cancel-calculation')).click();
  assert.equal(await page.locator('#timeline-view .tl-table').getAttribute('aria-busy'), 'false');
  assert.equal(await page.locator('#timeline-view .tl-calculation').isVisible(), false);
  await page.selectOption(field('span'), '1');
  await ready();
  assert.deepEqual(pageErrors, []);
  console.log('Timeline analysis, watchlist, planet filter and query browser checks passed.');
} finally {
  await browser.close();
}
