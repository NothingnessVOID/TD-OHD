/**
 * Relationship page layout: the composite graph and the analysis share the home
 * chart's two-column frame.
 *
 *   node tests/connection-two-column-e2e.mjs
 *
 * Runs against the installed app (default http://127.0.0.1:9961), which is
 * password-free on this machine, so no throwaway bypass server is started.
 *
 * What it proves:
 *   - the page sits on the home page's frame: same outer edges at the same width
 *   - wide screens put the graph left and the analysis right, in one sticky column
 *   - narrower screens stack graph first, analysis after, as the phone does
 *   - stacking the outer layout never restacks the graph's internals: both
 *     people stay left and right of the composite at every width
 *   - the analysis keeps its existing sections
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = (process.env.E2E_URL || 'http://127.0.0.1:9961').replace(/\/$/, '');
// 1200 is the documented split; each side of it is checked so a regression at
// the boundary shows up as a wrong number, not as a wrong-looking screenshot.
const wide = [1440, 1280, 1200];
const narrow = [1199, 1024, 768, 641, 390, 360];

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

const readLayout = () => {
  const layout = document.querySelector('#connection-content .chart-layout');
  if (!layout) return null;
  const rect = node => {
    const r = node.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) };
  };
  // Content edges, not border edges: the two pages pad their frame differently
  // but must put the graph and the text on the same lines.
  const contentBox = node => {
    const r = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      left: Math.round(r.left + (parseFloat(style.paddingLeft) || 0)),
      right: Math.round(r.right - (parseFloat(style.paddingRight) || 0)),
    };
  };
  const chart = layout.querySelector('.chart-column');
  const info = layout.querySelector('.info-column');
  const slots = [...layout.querySelectorAll('#conn-shell .ohd-graph-slot')];
  const canvas = layout.querySelector('#conn-shell .ohd-graph-canvas');
  const cells = [...layout.querySelectorAll('#conn-shell .tl-birth-value')];
  const tracks = getComputedStyle(layout).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
  const graph = canvas?.querySelector('svg');
  // How far each slot's own box reaches into the canvas box. The composite's
  // activation module lives above the graph's waist, where the drawing is only
  // the head, so a slot may overlap the canvas box without covering any gate.
  const canvasBox = canvas ? rect(canvas) : null;
  // The card's content width is what the shell gets to work with.
  const card = layout.querySelector('.composite-wrap');
  const cardStyle = card ? getComputedStyle(card) : null;
  const cardContent = card
    ? Math.round(card.getBoundingClientRect().width - (parseFloat(cardStyle.paddingLeft) || 0) - (parseFloat(cardStyle.paddingRight) || 0))
    : null;
  const slotReach = slots.map(slot => {
    const r = rect(slot);
    if (!canvasBox) return 0;
    return slot.dataset.slot === 'left'
      ? Math.max(0, r.right - canvasBox.left)
      : Math.max(0, canvasBox.right - r.left);
  });
  return {
    tracks: tracks.length,
    columns: getComputedStyle(layout).gridTemplateColumns,
    layout: contentBox(layout),
    chart: rect(chart),
    info: rect(info),
    chartPosition: getComputedStyle(chart).position,
    chartOverflow: getComputedStyle(chart).overflowY,
    hasComposite: !!graph,
    slotCount: slots.length,
    slotPositions: slots.map(slot => getComputedStyle(slot).position),
    canvas: canvasBox,
    cardContent,
    slotReach,
    cells: cells.length,
    visibleCells: cells.filter(cell => cell.getBoundingClientRect().width > 0).length,
    pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
  };
};

try {
  // ---- Home chart frame, the reference for width and gutters ----
  await page.goto(base + '/?d=1991-07-09&t=11:15&tz=8', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#bodygraph-container .bg-stage'), null, { timeout: 90000 });
  const homeFrame = {};
  for (const width of [...wide, ...narrow]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(400);
    homeFrame[width] = await page.evaluate(() => {
      const layout = document.querySelector('#chart-view .chart-layout');
      const r = layout.getBoundingClientRect();
      const style = getComputedStyle(layout);
      return {
        left: Math.round(r.left + (parseFloat(style.paddingLeft) || 0)),
        right: Math.round(r.right - (parseFloat(style.paddingRight) || 0)),
      };
    });
  }

  // ---- Relationship page ----
  await page.waitForFunction(() => document.querySelectorAll('#people-switcher option').length > 2, null, { timeout: 90000 });
  await page.evaluate(() => [...document.querySelectorAll('nav [data-view]')].find(node => node.dataset.view === 'connection').click());
  await page.waitForFunction(() => [...document.querySelectorAll('#conn-person option')].some(option => option.value && option.value !== '__guest'), null, { timeout: 60000 });
  const partner = await page.evaluate(() => [...document.querySelectorAll('#conn-person option')]
    .map(option => option.value).find(value => value && value !== '__guest'));
  await page.evaluate(id => {
    document.getElementById('conn-person').value = id;
    document.getElementById('conn-calculate').click();
  }, partner);
  await page.waitForFunction(() => document.querySelectorAll('#conn-shell .ohd-graph-canvas svg').length > 0, null, { timeout: 90000 });

  const seen = {};
  for (const width of [...wide, ...narrow]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(600);
    // Read the columns from an unscrolled page: the graph column is sticky, so
    // after any scroll its top would no longer describe the column's start.
    await page.evaluate(scrollTop);
    await page.waitForTimeout(200);
    seen[width] = await page.evaluate(readLayout);
  }

  for (const width of [...wide, ...narrow]) {
    const layout = seen[width];
    assert.ok(layout, `${width}px: the relationship page renders its layout`);
    assert.ok(layout.hasComposite, `${width}px: the composite graph is mounted`);

    // One frame for both work pages: the outer edges line up with the home
    // chart's, so the two pages read as the same house.
    assert.equal(layout.layout.left, homeFrame[width].left, `${width}px: left edge matches the home chart frame`);
    assert.equal(layout.layout.right, homeFrame[width].right, `${width}px: right edge matches the home chart frame`);

    // The graph is always flanked, never stacked under it.
    assert.deepEqual(layout.slotPositions, ['absolute', 'absolute'], `${width}px: both activation modules stay on the canvas`);
    assert.equal(layout.slotCount, 2, `${width}px: one module per person`);
    assert.equal(layout.cells, 52, `${width}px: 26 activations per person`);
    assert.equal(layout.visibleCells, 52, `${width}px: all 52 activations render`);
    assert.equal(layout.pageOverflow, false, `${width}px: no page overflow`);
  }

  for (const width of wide) {
    const layout = seen[width];
    assert.equal(layout.tracks, 2, `${width}px: the graph and the analysis sit in two columns`);
    assert.ok(layout.chart.right <= layout.info.left + 1,
      `${width}px: the graph column is left of the analysis (${layout.chart.right} vs ${layout.info.left})`);
    assert.equal(layout.chart.top, layout.info.top, `${width}px: both columns start on the same line`);
    assert.equal(layout.chartPosition, 'sticky', `${width}px: the graph column follows the page`);
    assert.equal(layout.chartOverflow, 'visible', `${width}px: the graph column has no scrollbar of its own`);
    // The split must not shrink the graph below the home reference size; the
    // height of the viewport may. The sticky section below checks that a tall
    // viewport still reaches the full 510.
    assert.ok(layout.canvas.width <= 511, `${width}px: the composite never exceeds its reference width`);
    assert.ok(layout.canvas.width >= 220, `${width}px: the composite keeps a usable width`);
  }

  for (const width of narrow) {
    const layout = seen[width];
    assert.equal(layout.tracks, 1, `${width}px: one outer column`);
    assert.ok(layout.chart.top < layout.info.top,
      `${width}px: the graph comes first, the analysis after it`);
    assert.ok(layout.info.top >= layout.chart.bottom - 1,
      `${width}px: the analysis clears the graph column entirely (${layout.info.top} vs ${layout.chart.bottom})`);
    // No column beside the graph to stick against, so the graph must scroll
    // away instead of floating over the analysis.
    assert.equal(layout.chartPosition, 'static', `${width}px: a stacked layout drops the sticky column`);
    assert.ok(layout.chart.bottom <= layout.info.top,
      `${width}px: the graph never floats over the analysis (${layout.chart.bottom} vs ${layout.info.top})`);
    // Stacking the outside must not shrink the graph either.
    // Sub-pixel card widths round a couple of pixels off the canvas; the point
    // is that the graph keeps the home reference size instead of shrinking.
    assert.ok(Math.abs(layout.canvas.width - Math.min(layout.cardContent, 510)) <= 4,
      `${width}px: the composite keeps its width when the layout stacks (${layout.canvas.width} of ${layout.cardContent})`);
  }

  // The analysis kept everything it had: the four connection families, the
  // centre states, the per-person bridging, and the summary.
  const analysis = await page.evaluate(() => {
    const info = document.querySelector('#connection-content .info-column');
    return {
      sections: info ? info.querySelectorAll('.conn-section').length : 0,
      centerStates: info ? info.querySelectorAll('[data-testid="connection-center-state"]').length : 0,
      bridging: info ? info.querySelectorAll('[data-testid^="connection-bridging-"]').length : 0,
      formula: !!info?.querySelector('[data-testid="connection-center-formula"]'),
      createdCount: !!info?.querySelector('[data-testid="connection-created-count"]'),
      individuals: !!info?.querySelector('.composite-individuals'),
      shells: document.querySelectorAll('#conn-shell').length,
    };
  });
  assert.equal(analysis.sections, 4, 'the four ways channels connect are still listed');
  assert.equal(analysis.centerStates, 9, 'all nine centre states are still listed');
  assert.equal(analysis.bridging, 2, 'bridging per person is still listed');
  assert.ok(analysis.formula && analysis.createdCount, 'the composite summary cards are still there');
  assert.ok(analysis.individuals, 'the per-person charts are still there');
  assert.equal(analysis.shells, 1, 'exactly one shared graph shell');

  // ---- Sticky graph column: pinned, and small enough to stay whole ----
  // The home chart fits its graph to the viewport height, which is why its
  // column needs no scrollbar. The composite must do the same, or a pinned
  // graph taller than the screen loses its bottom edge while the analysis
  // scrolls past.
  const stickyRows = [];
  for (const [width, height] of [[1440, 800], [1440, 900], [1440, 1080], [1280, 900], [1200, 800]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(700);
    const layoutTop = await page.evaluate(() => {
      const layout = document.querySelector('#connection-content .chart-layout');
      return Math.round(layout.getBoundingClientRect().top + scrollY);
    });
    // Scroll well into the analysis, where the graph must still be pinned.
    await page.evaluate(top => window.scrollTo({ top: top + 700, behavior: 'instant' }), layoutTop);
    await page.waitForTimeout(350);
    stickyRows.push(await page.evaluate(([w, h]) => {
      const column = document.querySelector('#connection-content .chart-column');
      const card = document.querySelector('#connection-content .composite-wrap');
      const canvas = document.querySelector('#conn-shell .ohd-graph-canvas');
      const style = getComputedStyle(column);
      const c = column.getBoundingClientRect();
      const k = card.getBoundingClientRect();
      return {
        width: w, height: h,
        position: style.position,
        stickyTop: Math.round(parseFloat(style.top) || 0),
        columnTop: Math.round(c.top),
        cardTop: Math.round(k.top),
        cardBottom: Math.round(k.bottom),
        cardHeight: Math.round(k.height),
        canvasWidth: Math.round(canvas.getBoundingClientRect().width),
        cells: document.querySelectorAll('#conn-shell .tl-birth-value').length,
        cellsA: document.querySelectorAll('#conn-activations-a .tl-birth-value').length,
        cellsB: document.querySelectorAll('#conn-activations-b .tl-birth-value').length,
      };
    }, [width, height]));
  }

  for (const row of stickyRows) {
    const tag = `${row.width}x${row.height}`;
    assert.equal(row.position, 'sticky', `${tag}: the graph column is sticky`);
    assert.equal(row.columnTop, row.stickyTop,
      `${tag}: the graph column is pinned at its sticky top (${row.columnTop} vs ${row.stickyTop})`);
    assert.ok(row.cardBottom <= row.height + 1,
      `${tag}: the pinned graph stays inside the viewport (bottom ${row.cardBottom} of ${row.height})`);
    assert.ok(row.cardTop >= row.stickyTop - 1, `${tag}: the pinned graph starts at the top offset`);
    // Fitting the height must not come at the cost of the activations.
    assert.equal(row.cells, 52, `${tag}: 52 activations while pinned`);
    assert.equal(row.cellsA, 26, `${tag}: person A keeps 26 activations`);
    assert.equal(row.cellsB, 26, `${tag}: person B keeps 26 activations`);
  }
  // A shorter viewport gets a smaller graph, not a cropped one.
  const tall = stickyRows.find(row => row.width === 1440 && row.height === 1080);
  const short = stickyRows.find(row => row.width === 1440 && row.height === 800);
  assert.ok(short.canvasWidth < tall.canvasWidth,
    `the graph shrinks with the viewport height (${short.canvasWidth} at 800 vs ${tall.canvasWidth} at 1080)`);
  assert.equal(tall.canvasWidth, 510, 'a tall viewport still shows the graph at its reference width');
  assert.ok(short.cardHeight <= short.height - short.stickyTop + 1,
    'the short-viewport card fits above the fold');

  // Below the split the column must not stick at all: there is no column beside
  // it to hold the graph against, and a sticky grid item would ride over the
  // analysis.
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(600);
  const stackedTop = await page.evaluate(() => Math.round(
    document.querySelector('#connection-content .chart-layout').getBoundingClientRect().top + scrollY));
  await page.evaluate(top => window.scrollTo({ top: top + 700, behavior: 'instant' }), stackedTop);
  await page.waitForTimeout(300);
  const stacked = await page.evaluate(() => {
    const column = document.querySelector('#connection-content .chart-column');
    const info = document.querySelector('#connection-content .info-column');
    const canvas = document.querySelector('#conn-shell .ohd-graph-canvas');
    return {
      position: getComputedStyle(column).position,
      chartBottom: Math.round(column.getBoundingClientRect().bottom),
      infoTop: Math.round(info.getBoundingClientRect().top),
      canvasWidth: Math.round(canvas.getBoundingClientRect().width),
    };
  });
  assert.equal(stacked.position, 'static', '1024: a stacked layout does not stick');
  assert.ok(stacked.chartBottom <= stacked.infoTop,
    `1024: the graph never rides over the analysis (${stacked.chartBottom} vs ${stacked.infoTop})`);
  // No height fitting when nothing is pinned: the width rule alone decides.
  assert.equal(stacked.canvasWidth, 510, '1024: the stacked graph keeps its reference width');

  assert.deepEqual(errors, [], 'no page errors');

  const summary = [...wide, ...narrow].map(width => ({
    width,
    tracks: seen[width].tracks,
    chart: seen[width].chart.width,
    info: seen[width].info.width,
    canvas: seen[width].canvas.width,
    slotReach: seen[width].slotReach,
    visibleCells: seen[width].visibleCells,
  }));
  console.log(JSON.stringify({ result: 'passed', homeFrame: homeFrame[1440], summary }, null, 1));
} finally {
  await browser.close();
}
