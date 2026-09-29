import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  for (const width of [1224, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 703 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8&view=transits`);
    await page.locator('#transit-stage .tl-graph .bodygraph-svg').waitFor();
    assert.equal(await page.locator('#transit-stage .tl-planet').count(), 13);
    assert.equal(await page.locator('#transit-stage .tl-birth-value').count(), 26);
    assert.ok((await page.locator('#transit-content').innerText()).includes('行运太阳'));
    assert.equal(await page.locator('#transit-stage .tl-transit-column .bg-planets-head').innerText(), '行运');
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth,
      stage: document.querySelector('#transit-stage').getBoundingClientRect().width,
      graph: document.querySelector('#transit-bodygraph .bodygraph-svg').getBoundingClientRect().width }));
    assert.ok(dimensions.scroll <= dimensions.viewport + 1, `no horizontal overflow: ${JSON.stringify(dimensions)}`);
    assert.ok(dimensions.graph <= dimensions.stage, `graph fits shared stage: ${JSON.stringify(dimensions)}`);
    if (width === 1224) {
      await page.locator('#transit-stage .tl-planet[data-gate]').first().click();
      await page.locator('#gate-detail:not(.hidden) [data-detail-kind="planet"][data-source="transit"]').waitFor();
      await page.keyboard.press('Escape');
      await page.evaluate(() => scrollTo(0, 500));
      const top = await page.locator('#transit-stage').evaluate(node => node.getBoundingClientRect().top);
      assert.ok(top >= 55 && top <= 80, `graph stage stays in view while summary scrolls: ${top}`);
    }
    await page.locator('#transit-only-toggle').click();
    assert.equal(await page.locator('#transit-stage .tl-birth-column').isHidden(), true);
    assert.ok((await page.locator('#transit-content').innerText()).includes('行运太阳'));
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Transit page shares timeline graph window: desktop and mobile passed.');
} finally {
  await browser.close();
}
