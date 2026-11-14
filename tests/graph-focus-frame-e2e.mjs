import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

/**
 * The graph's focus frame, checked on the real page.
 *
 *   npx vite --host 127.0.0.1 --port 10024
 *   E2E_URL=http://127.0.0.1:10024 node tests/graph-focus-frame-e2e.mjs
 *
 * The defect this guards: on the sleep chart, clicking the canvas while a centre's
 * detail sheet was open closed the sheet, the sheet returned focus to the centre
 * that opened it, and the browser painted its own focus rectangle around that
 * centre's bounding box — a square frame inside the body. A centre is focusable so
 * the keyboard can reach it, but the graph marks the object itself (a stroke on its
 * own shape), never a box around it. Gates already carried that rule; centres did not.
 */

const BASE = process.env.E2E_URL || 'http://127.0.0.1:10024';
const BIRTH = '?d=1989-03-14&t=06:30&tz=0&name=E2E%20Focus&view=dream';

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const errors = [];
let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`✔ ${name}`); } catch (error) { failures++; console.error(`✖ ${name}\n  ${error.message || error}`); }
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/${BIRTH}`, { waitUntil: 'load' });
  await page.waitForSelector('#dream-bodygraph .bg-center', { timeout: 60000 });
  await page.waitForTimeout(600);

  /** Whatever the page considers focused, and how the browser would paint it. */
  const focused = () => page.evaluate(() => {
    const node = document.activeElement;
    const style = node ? getComputedStyle(node) : null;
    return {
      tag: node?.tagName || null,
      classes: node?.getAttribute?.('class') || '',
      center: node?.dataset?.center ?? null,
      gate: node?.dataset?.gate ?? null,
      focusVisible: !!node?.matches?.(':focus-visible'),
      outlineStyle: style?.outlineStyle || null,
      outlineWidth: style?.outlineWidth || null,
      stroke: style?.stroke || null,
      strokeWidth: style?.strokeWidth || null
    };
  });

  await check('a centre keeps its focus without the browser\'s box around it', async () => {
    const box = await page.$eval('#dream-bodygraph .bg-center[data-center="root"]', node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x + rect.width * 0.24, y: rect.y + rect.height * 0.76, right: rect.right, top: rect.top };
    });
    // Open the centre's sheet, then dismiss it the way the report does: a click on
    // the graph's blank canvas, which hands focus back to the centre.
    await page.mouse.click(box.x, box.y);
    await page.waitForSelector('.gate-detail-close', { timeout: 15000 });
    const svg = await page.$eval('#dream-bodygraph svg', node => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x + 3, y: rect.y + rect.height / 2 };
    });
    await page.mouse.click(svg.x, svg.y);
    await page.waitForTimeout(400);

    const state = await focused();
    assert.equal(state.center, 'root', `focus landed on ${state.tag}.${state.classes} instead of the root centre`);
    assert.equal(state.focusVisible, false, 'a pointer click put the graph in keyboard mode');
    assert.equal(state.outlineStyle, 'none', `the focused centre paints a ${state.outlineStyle} outline (${state.outlineWidth})`);
  });

  await check('keyboard focus still marks the centre itself', async () => {
    // A real keypress puts the browser in keyboard-input mode, which is what makes
    // `:focus-visible` match the programmatic focus below.
    await page.keyboard.press('Tab');
    await page.$eval('#dream-bodygraph .bg-center[data-center="spleen"]', node => node.focus());
    await page.waitForTimeout(300);
    const state = await focused();
    assert.equal(state.center, 'spleen', `keyboard focus landed on ${state.tag}.${state.classes}`);
    assert.equal(state.focusVisible, true, 'keyboard focus is not :focus-visible');
    assert.match(state.classes, /\bbg-focus\b/, 'the keyboard-focused centre carries no shape mark');
    assert.equal(state.outlineStyle, 'none', `the keyboard-focused centre still paints a ${state.outlineStyle} box`);
    assert.ok(Number.parseFloat(state.strokeWidth) >= 2, `the centre's own outline is ${state.strokeWidth} wide`);
    assert.notEqual(state.stroke, 'none', 'the keyboard-focused centre has no stroke of its own');
  });

  await check('a gate is bound by the same rule', async () => {
    await page.keyboard.press('Tab');
    await page.$eval('#dream-bodygraph .bg-gate[data-gate="20"]', node => node.focus());
    await page.waitForTimeout(250);
    const state = await focused();
    assert.equal(state.gate, '20', `keyboard focus landed on ${state.tag}.${state.classes}`);
    assert.equal(state.outlineStyle, 'none', `the focused gate paints a ${state.outlineStyle} box`);
    const ring = await page.$eval('#dream-bodygraph .bg-gate[data-gate="20"] .bg-gate-circle', node => {
      const style = getComputedStyle(node);
      return { stroke: style.stroke, strokeWidth: style.strokeWidth };
    });
    assert.notEqual(ring.stroke, 'none', 'the keyboard-focused gate has no ring on its disc');
    assert.ok(Number.parseFloat(ring.strokeWidth) >= 2, `the gate's ring is ${ring.strokeWidth} wide`);
  });

  await check('the page reported no runtime errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall graph focus-frame checks passed');
