/** Bodygraph sizing and paired birth activations at tablet and phone widths. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 754, height: 703 }, locale: 'zh-CN' });
try {
  await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
  await page.locator('#bodygraph-container svg').waitFor();
  for (const width of [754, 601, 472]) {
    await page.setViewportSize({ width, height: 703 });
    const graph = await page.locator('#bodygraph-container svg').evaluate(node => node.getBoundingClientRect().width);
    assert.ok(graph <= 395, `${width}px birth graph is capped: ${graph}`);
  }

  await page.setViewportSize({ width: 754, height: 703 });
  await page.locator('.nav-link[data-view="transits"]').click();
  await page.locator('.transit-birth-glyphs').waitFor();
  for (const width of [754, 601, 472]) {
    await page.setViewportSize({ width, height: 703 });
    const layout = await page.evaluate(() => {
      const pair = document.querySelector('.transit-birth-pair');
      const [design, glyphs, personality] = pair.children;
      const tops = column => [...column.querySelectorAll('.bg-planet-row')].map(row => row.getBoundingClientRect().top);
      return {
        graphWidth: document.querySelector('#transit-bodygraph svg').getBoundingClientRect().width,
        topDelta: Math.max(...tops(design).map((top, i) => Math.abs(top - tops(glyphs)[i])),
          ...tops(personality).map((top, i) => Math.abs(top - tops(glyphs)[i]))),
        glyphs: glyphs.querySelectorAll('.bg-planet-glyph').length,
        designGlyph: getComputedStyle(design.querySelector('.bg-planet-glyph')).display,
        personalityGlyph: getComputedStyle(personality.querySelector('.bg-planet-glyph')).display,
        headings: [getComputedStyle(design.querySelector('.bg-planets-head')).textAlign,
          getComputedStyle(personality.querySelector('.bg-planets-head')).textAlign],
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    });
    assert.ok(layout.graphWidth <= 395 && layout.topDelta <= 1 && !layout.overflow,
      `${width}px transit graph and birth rows fit: ${JSON.stringify(layout)}`);
    assert.deepEqual([layout.glyphs, layout.designGlyph, layout.personalityGlyph, ...layout.headings],
      [13, 'none', 'none', 'right', 'left']);
  }
  console.log('Mobile bodygraph sizes and shared planet column passed.');
} finally {
  await browser.close();
}
