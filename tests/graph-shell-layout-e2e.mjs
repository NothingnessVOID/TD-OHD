/**
 * Shared BodyGraph shell: the relationship composite must place its two
 * activation slots the way the home chart places its Design and Personality
 * columns — on the canvas, beside the graph, at every width.
 *
 *   node tests/graph-shell-layout-e2e.mjs
 *
 * Runs against the installed app (default http://127.0.0.1:9961), which is
 * password-free on this machine, so no throwaway bypass server is started.
 * Compares home and relationship geometry at five widths and proves the slots
 * never cover a clickable centre or gate.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = (process.env.E2E_URL || 'http://127.0.0.1:9961').replace(/\/$/, '');
const widths = [1440, 1024, 641, 390, 360];

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const box = node => {
  const r = node.getBoundingClientRect();
  return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) };
};

/** Hit-test every centre and gate; a slot must never intercept one. */
const probeHits = (canvasSelector, slotSelector) => {
  const root = document.querySelector(canvasSelector);
  const blocked = [];
  for (const node of root.querySelectorAll('.bg-center, .bg-gate')) {
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === root || root.contains(hit))) {
      blocked.push(node.getAttribute('data-gate') || node.getAttribute('data-center'));
    }
  }
  return { total: root.querySelectorAll('.bg-center, .bg-gate').length, blocked };
};

const scrollGraph = selector => document.querySelector(selector)?.scrollIntoView({ block: 'center', behavior: 'instant' });

try {
  // ---- Home chart: record the reference placement rule ----
  await page.goto(base + '/?d=1991-07-09&t=11:15&tz=8', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#bodygraph-container .bg-stage .bg-planets'), null, { timeout: 90000 });
  const home = {};
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(500);
    await page.evaluate(scrollGraph, '#bodygraph-container .bg-stage');
    await page.waitForTimeout(300);
    home[width] = await page.evaluate(() => {
      const read = selector => {
        const node = document.querySelector(selector);
        return node ? { position: getComputedStyle(node).position } : null;
      };
      const rect = selector => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const r = node.getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
      };
      const design = document.querySelector('#bodygraph-container .bg-planets-design');
      const personality = document.querySelector('#bodygraph-container .bg-planets-personality');
      const style = getComputedStyle(document.querySelector('#bodygraph-container'));
      return {
        slotWidth: design ? Math.round(design.getBoundingClientRect().width) : null,
        design: rect('#bodygraph-container .bg-planets-design'),
        personality: rect('#bodygraph-container .bg-planets-personality'),
        canvas: rect('#bodygraph-container .bg-svg-wrap'),
        designPosition: read('#bodygraph-container .bg-planets-design')?.position,
        personalityPosition: read('#bodygraph-container .bg-planets-personality')?.position,
        gridDisplay: getComputedStyle(document.querySelector('#bodygraph-container .bg-grid')).display,
        stageScale: style.getPropertyValue('--bg-stage-scale').trim(),
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    const hits = await page.evaluate(probeHits, ['#bodygraph-container .bg-svg-wrap', '#bodygraph-container .bg-planets']);
    home[width].blocked = hits.blocked.length;
  }

  // ---- Relationship composite: same rule, two activation slots ----
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/?d=2026-10-07&t=12:12&tz=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('app')?.hidden === false, null, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#people-switcher option').length > 2, null, { timeout: 60000 });
  await page.evaluate(() => [...document.querySelectorAll('nav [data-view]')].find(node => node.dataset.view === 'connection').click());
  await page.waitForFunction(() => [...document.querySelectorAll('#conn-person option')].some(option => option.value && option.value !== '__guest'), null, { timeout: 60000 });
  const partner = await page.evaluate(() => [...document.querySelectorAll('#conn-person option')]
    .map(option => option.value).find(value => value && value !== '__guest'));
  await page.evaluate(id => {
    document.getElementById('conn-person').value = id;
    document.getElementById('conn-calculate').click();
  }, partner);
  await page.waitForFunction(() => document.querySelectorAll('#conn-shell .ohd-graph-canvas svg').length > 0, null, { timeout: 90000 });

  const conn = {};
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(700);
    await page.evaluate(scrollGraph, '#conn-shell .ohd-graph-canvas');
    await page.waitForTimeout(300);
    conn[width] = await page.evaluate(() => {
      const rect = selector => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const r = node.getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
      };
      const slots = [...document.querySelectorAll('#conn-shell .ohd-graph-slot')];
      const cells = [...document.querySelectorAll('#conn-shell .tl-birth-value')];
      return {
        slots: slots.map(node => {
          const r = node.getBoundingClientRect();
          return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
        }),
        canvas: rect('#conn-shell .ohd-graph-canvas'),
        shell: rect('#conn-shell .ohd-graph-shell'),
        slotPosition: slots.map(node => getComputedStyle(node).position),
        gridDisplay: getComputedStyle(document.querySelector('#conn-shell .ohd-graph-shell-grid')).display,
        shellDisplay: getComputedStyle(document.querySelector('#conn-shell .ohd-graph-shell')).display,
        cells: cells.length,
        visibleCells: cells.filter(cell => { const r = cell.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length,
        pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    const hits = await page.evaluate(probeHits, ['#conn-shell .ohd-graph-canvas', '#conn-shell .ohd-graph-slot']);
    conn[width].blocked = hits.blocked;
  }

  // ---- Assertions ----
  for (const width of widths) {
    const h = home[width], c = conn[width];

    // The home chart overlays its columns; the shell does the same.
    assert.equal(h.designPosition, 'absolute', width + 'px home: Design column overlays the canvas');
    assert.equal(h.personalityPosition, 'absolute', width + 'px home: Personality column overlays the canvas');
    assert.equal(h.gridDisplay, 'block');
    assert.deepEqual(c.slotPosition, ['absolute', 'absolute'], width + 'px: both relationship slots overlay the canvas');
    assert.equal(c.gridDisplay, 'block', width + 'px: the shell grid never becomes a stack');
    // The phone layout must not collapse the shell into a column.
    assert.notEqual(c.shellDisplay, 'flex', width + 'px: the shell is not a flex stack');

    // Slots sit on opposite sides of the same canvas, beside the graph.
    const [left, right] = c.slots;
    assert.ok(left.right <= c.canvas.left + 2 || left.left <= c.canvas.left + 2,
      width + 'px: the left slot is anchored to the canvas left edge');
    assert.ok(right.left >= c.canvas.right - 2 || right.right >= c.canvas.right - 2,
      width + 'px: the right slot is anchored to the canvas right edge');
    assert.ok(right.left - left.right > 0, width + 'px: the two slots do not overlap each other');
    assert.ok(Math.abs(left.width - right.width) <= 1, width + 'px: both slots are the same width');
    // The slot is sized by its own declared module width, capped at half the
    // container so the two bands can never meet in the middle. The home chart
    // uses the same overlay rule with its own narrower column.
    const half = Math.floor(c.shell.width / 2) + 1;
    assert.ok(left.width <= half, `${width}px: slot ${left.width} stays within half the shell (${half})`);
    assert.ok(left.width >= 76, `${width}px: slot keeps a readable minimum`);
    assert.equal(h.designPosition, 'absolute', `${width}px home: columns overlay the canvas too`);

    // The canvas fills the container up to the reference size, exactly as the
    // home chart does: the bands overlay it and never eat into it.
    assert.ok(c.canvas.width <= Math.min(c.shell.width, 510) + 1,
      `${width}px: composite canvas fits its shell (${c.canvas.width} of ${c.shell.width})`);
    assert.equal(c.canvas.width, Math.min(c.shell.width, 510),
      `${width}px: composite canvas uses the full available width (${c.canvas.width})`);
    // The shell must leave room above for the slots, never clip them.
    assert.ok(c.shell.height >= c.canvas.height - 1, width + 'px: the shell reserves the canvas height');

    // All 52 activation cells for the two people stay visible.
    assert.equal(c.cells, 52, width + 'px: 26 cells per person');
    assert.equal(c.visibleCells, 52, width + 'px: all 52 cells render');

    // No blocking and no page overflow on either page.
    assert.equal(h.blocked, 0, width + 'px home: no centre or gate is covered');
    assert.deepEqual(c.blocked, [], width + 'px: no centre or gate is covered by a slot');
    assert.equal(h.pageOverflow, false, width + 'px home: no page overflow');
    assert.equal(c.pageOverflow, false, width + 'px: no page overflow');
  }

  assert.deepEqual(errors, [], 'no page errors');

  const summary = widths.map(width => ({
    width,
    home: { slot: home[width].slotWidth, canvas: home[width].canvas.width },
    relationship: {
      slots: conn[width].slots.map(slot => slot.width),
      canvas: conn[width].canvas.width,
      visibleCells: conn[width].visibleCells,
      blocked: conn[width].blocked.length,
    },
  }));
  console.log(JSON.stringify({ result: 'passed', summary }, null, 1));
} finally {
  await browser.close();
}
