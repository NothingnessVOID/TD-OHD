/** Bodygraph sizing and scroll access at tablet and phone widths. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5188';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 754, height: 703 }, locale: 'zh-CN' });
try {
  await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
  await page.locator('#bodygraph-container svg').waitFor();
  for (const width of [754, 601, 528, 472, 343]) {
    await page.setViewportSize({ width, height: 703 });
    const graph = await page.locator('#bodygraph-container svg').evaluate(node => node.getBoundingClientRect().width);
    assert.ok(graph <= 331, `${width}px birth graph is capped: ${graph}`);
  }

  await page.setViewportSize({ width: 1224, height: 703 });
  const birthDesktop = await page.evaluate(() => {
    const column = document.querySelector('#chart-view .chart-column');
    return {
      graphWidth: document.querySelector('#bodygraph-container svg').getBoundingClientRect().width,
      cardHeight: document.querySelector('#bodygraph-container').getBoundingClientRect().height,
      columnHeight: column.clientHeight,
      scrollHeight: column.scrollHeight
    };
  });
  assert.ok(birthDesktop.graphWidth <= 361 && birthDesktop.graphWidth >= 359 &&
    birthDesktop.cardHeight <= 599 && birthDesktop.scrollHeight <= birthDesktop.columnHeight + 1,
  `1224px birth graph fits without inner scrolling: ${JSON.stringify(birthDesktop)}`);

  await page.setViewportSize({ width: 754, height: 703 });
  await page.locator('.nav-link[data-view="transits"]').click();
  await page.locator('.transit-birth-pair').waitFor();
  for (const width of [754, 601, 528, 472, 343]) {
    await page.setViewportSize({ width, height: 703 });
    const layout = await page.evaluate(() => {
      const pair = document.querySelector('.transit-birth-pair');
      const rows = [...pair.querySelectorAll('.transit-birth-row')];
      return {
        graphWidth: document.querySelector('#transit-bodygraph svg').getBoundingClientRect().width,
        topDelta: Math.max(...rows.map(row => Math.abs(row.children[0].getBoundingClientRect().top - row.children[2].getBoundingClientRect().top))),
        rows: rows.length,
        glyphs: pair.querySelectorAll('.bg-planet-glyph').length,
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    });
    assert.ok(layout.graphWidth <= 261 && layout.topDelta <= 1 && !layout.overflow,
      `${width}px transit graph and birth rows fit: ${JSON.stringify(layout)}`);
    assert.deepEqual([layout.rows, layout.glyphs], [13, 13]);
  }
  await page.setViewportSize({ width: 830, height: 703 });
  const desktop = await page.evaluate(() => {
    const column = document.querySelector('#transits-view .chart-column');
    const card = document.querySelector('#transit-bodygraph');
    card.scrollIntoView({ block: 'end', behavior: 'instant' });
    return { position: getComputedStyle(column).position,
      cardBottom: card.getBoundingClientRect().bottom, viewport: innerHeight };
  });
  assert.ok(desktop.position === 'sticky' && desktop.cardBottom <= desktop.viewport + 1,
    `830px desktop graph sticks and fits the viewport: ${JSON.stringify(desktop)}`);
  await page.setViewportSize({ width: 903, height: 703 });
  await page.evaluate(() => window.scrollTo(0, 700));
  const stickyTop = await page.locator('#transit-bodygraph').evaluate(node => node.getBoundingClientRect().top);
  assert.ok(stickyTop >= 79 && stickyTop <= 81, `903px transit graph stays at the sticky top: ${stickyTop}`);
  await page.setViewportSize({ width: 1224, height: 703 });
  const transitDesktop = await page.evaluate(() => {
    const column = document.querySelector('#transits-view .chart-column');
    return {
      graphWidth: document.querySelector('#transit-bodygraph svg').getBoundingClientRect().width,
      cardHeight: document.querySelector('#transit-bodygraph').getBoundingClientRect().height,
      columnHeight: column.clientHeight,
      scrollHeight: column.scrollHeight
    };
  });
  assert.ok(transitDesktop.graphWidth <= 341 && transitDesktop.graphWidth >= 339 &&
    transitDesktop.cardHeight <= 560 && transitDesktop.scrollHeight <= transitDesktop.columnHeight + 1,
  `1224px transit graph fits without inner scrolling: ${JSON.stringify(transitDesktop)}`);
  await page.locator('.nav-link[data-view="timeline"]').click();
  await page.locator('.tl-graph-panel').waitFor();
  const timelineHeight = await page.locator('.tl-graph-panel').evaluate(node => node.getBoundingClientRect().height);
  assert.ok(timelineHeight >= 540 && timelineHeight <= 545,
    `1224px timeline graph uses available height: ${timelineHeight}`);
  console.log('Bodygraph and timeline size checks passed.');
} finally {
  await browser.close();
}
