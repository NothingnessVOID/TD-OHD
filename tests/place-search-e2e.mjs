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
      timezone: 'Asia/Tokyo', country_code: 'JP', country: 'Japan', feature_code: 'PPLC', population: 9733276
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

  const beforeComposition = requested.length;
  await input.evaluate(node => {
    node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    node.value = 'Tokyo';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  assert.equal(requested.length, beforeComposition, 'IME input waits for composition to finish');
  await input.evaluate(node => node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await page.waitForFunction(() => document.querySelector('#place-results .place-result')?.textContent?.includes('Tokyo'));
  assert.equal(requested.at(-1), 'Tokyo');

  await input.fill('noresults');
  await page.locator('#place-group [role="status"]').filter({ hasText: /No matching|没有|未找到|無/ }).waitFor();
  await input.fill('offline');
  await page.locator('#place-group [role="status"]').filter({ hasText: /unavailable|不可用|無法/ }).waitFor();
  assert.equal(await page.locator('#place-results .place-result').count(), 0);

  await page.goto(`${base}/?d=1985-01-01&t=12%3A00&tz=0`);
  await page.locator('#chart-view:not(.hidden)').waitFor();
  for (const [view, scope] of [['connection', '#conn-place'], ['team', '#team-members .team-member-row:first-child .team-place']]) {
    await page.locator(`.nav-link[data-view="${view}"]`).click();
    await page.locator(view === 'connection' ? '#conn-date' : '.team-date').first().fill('1985-01-01');
    await page.locator(view === 'connection' ? '#conn-time' : '.team-time').first().fill('12:00');
    const place = page.locator(`${scope} .ps-input`);
    await place.fill('Tokyo');
    await page.locator(`${scope} .ps-result`).first().click();
    assert.match(await page.locator(`${scope} .ps-chip`).innerText(), /Tokyo, Japan.*UTC\+9/);
    await page.locator(`${scope} .ps-toggle`).click();
    await page.locator(`${scope} .ps-manual`).fill('9');
    assert.match(await page.locator(`${scope} .ps-chip`).innerText(), /\+09|\+9/);
  }
  console.log('Place search main, connection and team entry checks passed, including stale, IME and manual fallback.');
} finally { await browser.close(); }
