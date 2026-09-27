import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage({ locale: 'zh-CN' });
  const requested = [];
  await page.route('**/geocoding-api.open-meteo.com/v1/search?*', async route => {
    const query = new URL(route.request().url()).searchParams.get('name');
    requested.push(query);
    if (query === 'Oldtown') await new Promise(resolve => setTimeout(resolve, 400));
    if (query === 'offline') return route.fulfill({ status: 503, body: 'unavailable' });
    const results = ['Oldtown', 'Tokyo', 'To'].includes(query) ? [{
      name: query, latitude: 35.6895, longitude: 139.6917,
      timezone: 'Asia/Tokyo', country_code: 'JP', country: 'Japan'
    }] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.goto(`${base}/`);
  const input = page.locator('#birth-place');
  await input.fill('Oldtown');
  await page.waitForTimeout(275); // Let the first request begin before editing.
  await input.fill('Tokyo');
  await page.locator('#place-results .place-result').first().waitFor();
  await page.waitForTimeout(450);
  assert.match(await page.locator('#place-results').textContent(), /Tokyo/);
  assert.doesNotMatch(await page.locator('#place-results').textContent(), /Oldtown/);

  await input.fill('To');
  await page.locator('#place-results .place-result').filter({ hasText: /^To,/ }).waitFor();
  assert.ok(requested.includes('To'), 'two-character searches run');

  await input.fill('noresults');
  await page.locator('#place-group [role="status"]').filter({ hasText: /No matching|没有|無/ }).waitFor();
  await input.fill('offline');
  await page.locator('#place-group [role="status"]').filter({ hasText: /unavailable|不可用|無法/ }).waitFor();
  assert.equal(await page.locator('#place-results .place-result').count(), 0);
  console.log('Place search stale, short-query and error-state browser checks passed.');
} finally { await browser.close(); }
