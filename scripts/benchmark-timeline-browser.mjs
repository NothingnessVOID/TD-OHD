/** Browser-visible calculation timings with synthetic birth data. */
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const output = [];
try {
  for (const profile of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 }, cpuThrottle: 1 },
    { name: 'phone-viewport-4x-cpu', viewport: { width: 390, height: 844 }, cpuThrottle: 4 }
  ]) {
    const page = await browser.newPage({ viewport: profile.viewport, locale: 'zh-CN' });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuThrottle });
    const annualRequests = [];
    page.on('request', request => {
      if (/\/transit-data\/.*\.json/.test(request.url())) annualRequests.push(request.url());
    });
    const ready = () => page.waitForFunction(() =>
      document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 120000 });
    const started = performance.now();
    await page.goto(`${base}/?d=1990-06-15&t=14:30&tz=8&view=timeline`);
    await ready();
    const cold7Ms = performance.now() - started;
    async function switchRange(value) {
      const before = performance.now();
      await page.evaluate(next => {
        const select = document.querySelector('#timeline-view [data-field="span"]');
        select.value = next;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      await ready();
      return +(performance.now() - before).toFixed(1);
    }
    const warm28Ms = await switchRange('28');
    const warm7Ms = await switchRange('7');
    const yearMs = await switchRange('year');
    const yearRows = await page.locator('#timeline-view .tl-row').count();
    await switchRange('7');
    const state = await page.evaluate(() => ({
      rows: document.querySelectorAll('#timeline-view .tl-row').length,
      calculatedDays: (Number(document.querySelector('#timeline-view .tl-table').dataset.calculatedEnd)
        - Number(document.querySelector('#timeline-view .tl-table').dataset.calculatedStart)) / 86_400_000,
      jsHeapBytes: performance.memory?.usedJSHeapSize ?? null
    }));
    output.push({ profile: profile.name, cold7Ms: +cold7Ms.toFixed(1), warm28Ms, warm7Ms,
      yearMs, yearRows, annualRequests: annualRequests.length, ...state });
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(output, null, 2));
