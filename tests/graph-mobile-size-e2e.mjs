/** Bodygraph sizing and scroll access at tablet and phone widths. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 754, height: 703 }, locale: 'zh-CN' });
try {
  await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
  await page.locator('#bodygraph-container svg').waitFor();
  for (const width of [754, 601, 528, 472]) {
    await page.setViewportSize({ width, height: 703 });
    const graph = await page.locator('#bodygraph-container svg').evaluate(node => node.getBoundingClientRect().width);
    assert.ok(graph <= 331, `${width}px birth graph is capped: ${graph}`);
  }

  await page.setViewportSize({ width: 754, height: 703 });
  await page.locator('.nav-link[data-view="transits"]').click();
  await page.locator('.transit-birth-pair').waitFor();
  for (const width of [754, 601, 528, 472]) {
    await page.setViewportSize({ width, height: 703 });
    const layout = await page.evaluate(() => {
      const pair = document.querySelector('.transit-birth-pair');
      const [design, personality] = pair.children;
      const tops = column => [...column.querySelectorAll('.bg-planet-row')].map(row => row.getBoundingClientRect().top);
      return {
        graphWidth: document.querySelector('#transit-bodygraph svg').getBoundingClientRect().width,
        topDelta: Math.max(...tops(design).map((top, i) => Math.abs(top - tops(personality)[i]))),
        columns: pair.children.length,
        glyphs: pair.querySelectorAll('.bg-planet-glyph').length,
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    });
    assert.ok(layout.graphWidth <= 331 && layout.topDelta <= 1 && !layout.overflow,
      `${width}px transit graph and birth rows fit: ${JSON.stringify(layout)}`);
    assert.deepEqual([layout.columns, layout.glyphs], [2, 26]);
  }
  await page.setViewportSize({ width: 830, height: 703 });
  const desktop = await page.evaluate(() => {
    const column = document.querySelector('#transits-view .chart-column');
    const card = document.querySelector('#transit-bodygraph');
    card.scrollIntoView({ block: 'end', behavior: 'instant' });
    return { overflow: getComputedStyle(column).overflowY,
      cardBottom: card.getBoundingClientRect().bottom, viewport: innerHeight };
  });
  assert.ok(desktop.overflow === 'visible' && desktop.cardBottom <= desktop.viewport + 1,
    `830px desktop graph is reachable by page scrolling: ${JSON.stringify(desktop)}`);
  console.log('Bodygraph size and desktop scroll checks passed.');
} finally {
  await browser.close();
}
