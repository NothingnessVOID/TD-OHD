/**
 * Graph tooltip — the two placement paths, and the life cycle in both.
 *
 *   E2E_URL=http://127.0.0.1:10015 node tests/graph-tooltip-fallback.mjs
 *
 * The overlay is a top-layer popover where the browser has one (Chrome 114+, Safari 17+,
 * Firefox 125+). Older engines get the same element inside the same graph, with its
 * position converted into the containing block's coordinates — and every shell graph sits
 * inside a translated canvas, the natal chart can also *scale* its stage, and a scale
 * ancestor would make a pure origin subtraction land in the wrong place.
 *
 * So the two paths are both exercised here:
 *
 *   1. popover available (the normal path): overlay beside the pointer inside a
 *      translated canvas and inside a scaled one.
 *   2. popover removed before the app boots (`delete HTMLElement.prototype.showPopover`):
 *      no exception, same placement, same size, same show/hide, same life cycle.
 *
 * Removing the API is how the fallback is reached — the renderer decides at render time
 * from `typeof HTMLElement.prototype.showPopover`.
 */

import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const BASE = (process.env.E2E_URL || 'http://127.0.0.1:10015').replace(/\/$/, '');
const CHROME = process.env.CHROME_PATH;
const CHANNEL = process.env.CHROME_CHANNEL || 'chromium';
const GAP = 12;
const TOLERANCE = 2;

let failures = 0;
const ok = name => console.log(`✔ ${name}`);
const record = (label, value) => console.log(`· ${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
const fail = (name, error) => { failures++; console.error(`✖ ${name}\n  ${error?.stack || error}`); };
async function check(name, fn) {
  try { await fn(); ok(name); } catch (error) { fail(name, error); }
}

/**
 * The chart a scratch graph renders. Only the fields the renderer reads, so the two paths
 * can be compared without waiting for an engine solve.
 */
const CHART = {
  gates: { personality: { sun: { gate: 1, line: 2 } }, design: { earth: { gate: 8, line: 3 } } },
  channels: [{ gates: [1, 8], centers: ['g', 'throat'] }],
  centers: { definedNames: ['g'] },
  type: { name: 'generator' }, profile: { numbers: '1/3' }, authority: { name: 'sacral' },
  definition: 'single', variable: null, positions: {}
};

const browser = await chromium.launch({
  ...(CHROME ? { executablePath: CHROME } : { channel: CHANNEL }),
  headless: true
});

/**
 * One page, with popover support either present or removed before any app module loads.
 * `stageTransform` wraps the scratch host in an ancestor that establishes a containing
 * block, so the fallback has something real to compensate for.
 */
async function openPage({ disablePopover, stageTransform = null }) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: 'zh-CN' });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  if (disablePopover) {
    await page.addInitScript(() => {
      // What an engine without top-layer popovers looks like to the renderer.
      delete HTMLElement.prototype.showPopover;
      delete HTMLElement.prototype.hidePopover;
    });
  }
  await page.addInitScript(({ key }) => localStorage.setItem(key, '[]'), { key: PROFILE_STORAGE_KEY });
  await page.goto(BASE, { waitUntil: 'load' });

  await page.evaluate(async ({ chart, stageTransform }) => {
    const { renderBodygraph } = await import('/src/bodygraph.js');
    window.__fallbackChart = chart;
    const stage = document.createElement('div');
    stage.id = 'fallback-stage';
    // The stage stays on screen after its own transform: a case whose gate ends up off
    // screen would test the pointer, not the placement.
    stage.style.cssText = `position:fixed;left:${stageTransform ? 320 : 40}px;top:40px;width:900px;height:760px;${stageTransform || ''}`;
    const host = document.createElement('div');
    host.id = 'fallback-host';
    host.style.cssText = 'position:absolute;left:0;top:0;width:520px;height:760px;';
    stage.appendChild(host);
    document.body.appendChild(stage);
    renderBodygraph(host, chart, { planetColumns: false, animate: false, onGateClick: () => {}, onCenterClick: () => {} });
  }, { chart: CHART, stageTransform });
  await page.waitForTimeout(300);
  return { context, page, errors };
}

const gatePoint = page => page.evaluate(() => {
  const disc = document.querySelector('#fallback-host .bg-gate').querySelector('.bg-gate-circle');
  const rect = disc.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
});

const hover = async (page, point) => {
  await page.mouse.move(point.x - 40, point.y - 40);
  await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.waitForTimeout(300);
};

/** The open overlay's box, its mode, and whether anything about it failed. */
const readOverlay = page => page.evaluate(() => {
  const node = document.querySelector('#fallback-host .bg-tooltip');
  if (!node) return { exists: false };
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return {
    exists: true,
    openClass: node.classList.contains('bg-tooltip-open'),
    popoverAttr: node.getAttribute('popover'),
    popoverOpen: node.matches(':popover-open'),
    supportsPopover: typeof HTMLElement.prototype.showPopover === 'function',
    display: style.display,
    position: style.position,
    inset: `${style.top} ${style.right} ${style.bottom} ${style.left}`,
    margin: style.margin,
    left: style.left,
    top: style.top,
    x: rect.left, y: rect.top, right: rect.right, bottom: rect.bottom,
    width: rect.width, height: rect.height,
    viewport: { width: innerWidth, height: innerHeight },
    inGraph: !!node.closest('.bg-root')
  };
});

function assertBesidePointer(overlay, point) {
  const dx = overlay.x - point.x;
  const dy = overlay.y - point.y;
  const rightSide = Math.abs(dx - GAP) <= TOLERANCE;
  const leftSide = Math.abs(overlay.right - (point.x - GAP)) <= TOLERANCE;
  assert.ok(rightSide || leftSide,
    `overlay is ${Math.round(dx)}px from the pointer horizontally (left ${Math.round(overlay.x)}, pointer ${Math.round(point.x)})`);
  const below = Math.abs(dy - GAP) <= TOLERANCE;
  const above = Math.abs(overlay.bottom - (point.y - GAP)) <= TOLERANCE;
  assert.ok(below || above, `overlay is ${Math.round(dy)}px from the pointer vertically`);
  assert.ok(overlay.x >= 0 && overlay.y >= 0, `overlay starts outside the viewport at ${Math.round(overlay.x)},${Math.round(overlay.y)}`);
  assert.ok(overlay.right <= overlay.viewport.width + 1, 'overlay runs past the right edge');
  assert.ok(overlay.bottom <= overlay.viewport.height + 1, 'overlay runs past the bottom edge');
}

for (const mode of [
  { name: 'popover', disablePopover: false, stageTransform: null },
  { name: 'popover inside a translated canvas', disablePopover: false, stageTransform: 'transform:translate(-30%,0);' },
  { name: 'popover inside a scaled canvas', disablePopover: false, stageTransform: 'transform:translate(-30%,0) scale(0.85);transform-origin:0 0;' },
  { name: 'fallback (no popover API)', disablePopover: true, stageTransform: null },
  { name: 'fallback inside a translated canvas', disablePopover: true, stageTransform: 'transform:translate(-30%,0);' },
  { name: 'fallback inside a scaled canvas', disablePopover: true, stageTransform: 'transform:translate(-30%,0) scale(0.85);transform-origin:0 0;' }
]) {
  const { context, page, errors } = await openPage(mode);
  try {
    const probe = await page.evaluate(() => typeof HTMLElement.prototype.showPopover === 'function');
    await check(`${mode.name}: the overlay sits beside the pointer`, async () => {
      assert.equal(probe, !mode.disablePopover,
        `the page reports showPopover ${probe ? 'present' : 'absent'} but this case asked for the opposite`);
      const point = await gatePoint(page);
      await hover(page, point);
      const overlay = await readOverlay(page);
      record(`${mode.name} overlay`, { left: overlay.left, top: overlay.top, display: overlay.display, popover: overlay.popoverAttr, open: overlay.openClass || overlay.popoverOpen });
      assert.ok(overlay.exists, 'no overlay element');
      assert.ok(overlay.openClass, 'the overlay is not marked open');
      assert.equal(overlay.display, 'block', `the overlay is ${overlay.display} while open`);
      assert.ok(overlay.inGraph, 'the overlay left its graph');
      assert.equal(overlay.position, 'fixed', `the overlay is positioned ${overlay.position}`);
      assert.equal(overlay.margin, '0px', `the user-agent popover box is still applying a ${overlay.margin} margin`);
      assert.equal(overlay.popoverAttr, mode.disablePopover ? null : 'manual',
        `the popover attribute is ${overlay.popoverAttr} for this engine`);
      assertBesidePointer(overlay, point);
      assert.equal(errors.length, 0, errors.join(' | '));
    });

    await check(`${mode.name}: the overlay hides and carries nothing with it`, async () => {
      await page.mouse.move(5, 5);
      await page.waitForTimeout(300);
      const overlay = await readOverlay(page);
      assert.equal(overlay.openClass, false, 'the overlay is still marked open');
      assert.equal(overlay.display, 'none', `the overlay is ${overlay.display} after the pointer left`);
      // Re-render, then remove the graph: the overlay node belongs to it, in both modes.
      const lifecycle = await page.evaluate(async () => {
        const { renderBodygraph } = await import('/src/bodygraph.js');
        const chart = { ...window.__fallbackChart };
        const host = document.getElementById('fallback-host');
        renderBodygraph(host, chart, { planetColumns: false, animate: false, onGateClick: () => {} });
        const afterRedraw = host.querySelectorAll('.bg-tooltip').length;
        const openAfterRedraw = [...host.querySelectorAll('.bg-tooltip')].filter(node => node.classList.contains('bg-tooltip-open') || node.matches(':popover-open')).length;
        host.replaceChildren();
        const afterRemoval = document.querySelectorAll('#fallback-host .bg-tooltip').length;
        return { afterRedraw, openAfterRedraw, afterRemoval };
      });
      assert.equal(lifecycle.afterRedraw, 1, `a redrawn graph holds ${lifecycle.afterRedraw} overlays`);
      assert.equal(lifecycle.openAfterRedraw, 0, 'a redrawn graph came back with an open overlay');
      assert.equal(lifecycle.afterRemoval, 0, 'the removed graph left its overlay behind');
    });
  } finally {
    await context.close();
  }
}

await browser.close();

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nboth placement paths behave the same');
