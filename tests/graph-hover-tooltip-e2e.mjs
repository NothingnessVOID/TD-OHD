/**
 * Shared graph interaction — the overlay follows the pointer, and hover, keyboard
 * focus and pin actually look different.
 *
 *   npx vite --host 127.0.0.1 --port 9961 --strictPort     # one terminal
 *   node tests/graph-hover-tooltip-e2e.mjs
 *
 * An isolated worktree server passes its own port: `E2E_URL=http://127.0.0.1:10014`.
 *
 * Runs against a real browser at a real viewport, because every fact below is a
 * rendered fact. Three measured failures are guarded here:
 *
 * 1. The overlay is `position: fixed`, but a shell-hosted graph lives inside
 *    `.ohd-graph-canvas { transform: translateX(-50%) }`, and a transformed
 *    ancestor is the containing block of a fixed descendant. On the sleep chart the
 *    overlay landed 306px right and 301px below the pointer — off the bottom of a
 *    1000px viewport. Same offset on both composites: +66/+235 on the relationship
 *    page, where the canvas is narrower.
 * 2. The relationship composite reveals its centres with `animation-fill-mode:
 *    both`, whose final `opacity: 1` overrode the dim rule: unlit gates fell to 0.18
 *    while every unlit centre stayed at 1.
 * 3. Hover and pin changed only a 2px ring on the small disc that carries a gate's
 *    number, which reads as nothing on a composite where each gate is a pale
 *    ownership wash.
 *
 * Screenshots land in test-results/graph-interaction/ unless E2E_SHOTS says where.
 */

import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const BASE = (process.env.E2E_URL || 'http://127.0.0.1:9961').replace(/\/$/, '');
const CHROME = process.env.CHROME_PATH;
const CHANNEL = process.env.CHROME_CHANNEL || 'chromium';
const SHOTS = process.env.E2E_SHOTS
  ? path.resolve(process.env.E2E_SHOTS)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'graph-interaction');
mkdirSync(SHOTS, { recursive: true });

/** Clearly fictional people; distinct birth data so no chart cache is shared. */
const people = [
  { id: 'interaction-a', name: 'Fictional A', birthDate: '1987-04-12', birthTime: '06:30', timeUnknown: false, location: { timezone: 0 } },
  { id: 'interaction-b', name: 'Fictional B', birthDate: '1993-09-25', birthTime: '14:20', timeUnknown: false, location: { timezone: 0 } }
];
const B = 'interaction-b';

/** The overlay sits `gap` pixels from the pointer and never leaves the viewport. */
const GAP = 12;
const TOLERANCE = 2;

let failures = 0;
const ok = name => console.log(`✔ ${name}`);
const fail = (name, error) => { failures++; console.error(`✖ ${name}\n  ${error?.stack || error}`); };
async function check(name, fn) {
  try { await fn(); ok(name); } catch (error) { fail(name, error); }
}
const near = (a, b) => Math.abs(a - b) <= TOLERANCE;

const browser = await chromium.launch({
  ...(CHROME ? { executablePath: CHROME } : { channel: CHANNEL }),
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1380, height: 1000 }, locale: 'zh-CN', hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(60000);
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`); });
await page.addInitScript(({ key, people }) => {
  localStorage.setItem('ohd-language', 'zh-CN');
  localStorage.setItem(key, JSON.stringify(people));
  localStorage.setItem('ohd-last-person-id', people[0].id);
}, { key: PROFILE_STORAGE_KEY, people });

/**
 * The open overlay, plus the document-wide count of overlays and of graphs that hold one.
 *
 * The overlay is a top-layer `popover`, so "visible" is `:popover-open` rather than a
 * display rule, and there is no shared layer to inspect: every overlay lives inside the
 * graph it belongs to.
 */
const readTooltip = () => page.evaluate(() => {
  const all = [...document.querySelectorAll('.bg-tooltip')];
  const open = all.filter(node => node.matches(':popover-open'));
  const perGraph = [...document.querySelectorAll('.bg-root')]
    .map(root => root.querySelectorAll('.bg-tooltip').length);
  const document_ = {
    overlays: all.length,
    open: open.length,
    graphsWithOverlay: all.filter(node => node.closest('.bg-root')).length,
    maxPerGraph: Math.max(0, ...perGraph)
  };
  if (!open.length) return { visible: 0, ...document_ };
  const node = open[0];
  const rect = node.getBoundingClientRect();
  return {
    visible: open.length,
    topLayer: node.matches(':popover-open'),
    inGraph: !!node.closest('.bg-root'),
    ...document_,
    text: node.textContent.trim().slice(0, 60),
    x: rect.left, y: rect.top, right: rect.right, bottom: rect.bottom,
    width: rect.width, height: rect.height,
    viewport: { width: innerWidth, height: innerHeight }
  };
});

/** Centre of a gate's visible disc, after scrolling its shell into view. */
async function gatePoint(selector, { index = 0 } = {}) {
  await page.$eval(selector, node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(200);
  return page.evaluate(({ selector, index }) => {
    // A view may keep several graph panels in the DOM (the timeline does), so pick
    // drawn gates only instead of trusting document order.
    const drawn = [...document.querySelectorAll(selector)].filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const gate = drawn[index];
    if (!gate) return null;
    const disc = gate.querySelector('.bg-gate-circle') || gate;
    const rect = disc.getBoundingClientRect();
    return { gate: gate.dataset.gate, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, { selector, index });
}

/** Move onto the gate like a pointer does, from outside so `pointerover` fires. */
async function hoverGate(point) {
  await page.mouse.move(point.x - 60, point.y - 60);
  await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.waitForTimeout(260);
}

/**
 * Hover gates until one carries an activation, and return the facts a source-colour
 * assertion needs: the values the graph declares and the values the overlay shows.
 */
async function hoverGateWithSource(rootSelector) {
  const points = await page.evaluate((selector) => [...document.querySelectorAll(selector)].map(node => {
    const disc = node.querySelector('.bg-gate-circle') || node;
    const rect = disc.getBoundingClientRect();
    return { gate: node.dataset.gate, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }), rootSelector);
  for (const point of points) {
    await hoverGate(point);
    const found = await page.evaluate(() => {
      const tip = [...document.querySelectorAll('.bg-tooltip')].find(node => node.matches(':popover-open'));
      return !!tip && !!tip.querySelector('.bg-tt-design, .bg-tt-personality');
    });
    if (found) return point;
  }
  throw new Error(`no gate under ${rootSelector} showed an activation in its overlay`);
}

/**
 * The overlay must sit beside the pointer and stay on screen. Flipping near an edge
 * is expected, so either side of the pointer is accepted at exactly `GAP`.
 */
function assertBesidePointer(tooltip, point) {
  assert.equal(tooltip.visible, 1, 'no overlay is shown');
  assert.ok(tooltip.topLayer, 'the overlay is not in the top layer');
  assert.ok(tooltip.inGraph, 'the overlay left the graph it belongs to');
  assert.ok(tooltip.text.length > 0, 'the overlay has no text');
  const rightSide = near(tooltip.x, point.x + GAP);
  const leftSide = near(tooltip.right, point.x - GAP);
  assert.ok(rightSide || leftSide,
    `overlay is ${Math.round(tooltip.x - point.x)}px from the pointer horizontally (${Math.round(tooltip.x)} vs ${Math.round(point.x)}), expected ${GAP}px on one side`);
  const below = near(tooltip.y, point.y + GAP);
  const above = near(tooltip.bottom, point.y - GAP);
  assert.ok(below || above,
    `overlay is ${Math.round(tooltip.y - point.y)}px from the pointer vertically (${Math.round(tooltip.y)} vs ${Math.round(point.y)}), expected ${GAP}px on one side`);
  assert.ok(tooltip.x >= 0 && tooltip.y >= 0, `overlay starts outside the viewport at ${Math.round(tooltip.x)},${Math.round(tooltip.y)}`);
  assert.ok(tooltip.right <= tooltip.viewport.width + 1, `overlay right edge ${Math.round(tooltip.right)} is past the ${tooltip.viewport.width}px viewport`);
  assert.ok(tooltip.bottom <= tooltip.viewport.height + 1, `overlay bottom edge ${Math.round(tooltip.bottom)} is past the ${tooltip.viewport.height}px viewport`);
}

/** The focused object's own outline, and the dimming around it. */
const readHighlight = root => page.evaluate((root) => {
  const focused = document.querySelector(`${root} .bg-gate-path.bg-focus`);
  const focusedCentre = document.querySelector(`${root} .bg-center.bg-focus`);
  const lit = document.querySelector(`${root} .bg-gate-path.bg-lit`);
  const unlit = document.querySelector(`${root} .bg-gate-path:not(.bg-lit)`);
  const unlitCentre = document.querySelector(`${root} .bg-center:not(.bg-lit)`);
  const style = node => {
    if (!node) return null;
    const computed = getComputedStyle(node);
    return { stroke: computed.stroke, strokeWidth: computed.strokeWidth, paintOrder: computed.paintOrder, opacity: computed.opacity };
  };
  return {
    dimmed: document.querySelector(`${root} .bodygraph-svg`)?.classList.contains('bg-dimmed'),
    gate: focused?.getAttribute('data-gate') || null,
    centre: focusedCentre?.getAttribute('data-center') || null,
    unlitPathStroke: style(unlit)?.stroke,
    focused: style(focused),
    litOpacity: style(lit)?.opacity,
    unlitOpacity: style(unlit)?.opacity,
    unlitCentreOpacity: style(unlitCentre)?.opacity,
    selectedGate: document.querySelector(`${root} .bg-gate.bg-selected`)?.getAttribute('data-gate') || null,
    selectedOutline: document.querySelector(`${root} .bg-gate-path.bg-selected`) ? style(document.querySelector(`${root} .bg-gate-path.bg-selected`)) : null
  };
}, root);

/** A detail card is open, and it belongs to the view under test. */
const openDetailOwner = () => page.evaluate(() =>
  document.querySelector('.gate-detail[role="dialog"]:not(.hidden)')?.dataset.detailOwner || null);

async function waitForDetail(owner) {
  await page.waitForFunction(expected => {
    const card = document.querySelector('.gate-detail[role="dialog"]:not(.hidden)');
    return !!card && (!expected || card.dataset.detailOwner === expected);
  }, owner, { timeout: 30000 });
}

async function closeDetail() {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.gate-detail[role="dialog"]:not(.hidden)'), null, { timeout: 10000 });
  await page.waitForTimeout(200);
}

const nav = view => page.locator(`.nav-link[data-view="${view}"]`).click();

try {
  /* ------------------------------------------------------------------ *
   * Birth chart — the reference behaviour the shell-hosted views must match
   * ------------------------------------------------------------------ */
  await page.goto(BASE);
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  await page.waitForSelector('#bodygraph-container .bg-gate', { timeout: 120000 });

  await check('birth chart: the overlay sits beside the pointer', async () => {
    const point = await gatePoint('#bodygraph-container .bg-gate');
    await hoverGate(point);
    const tooltip = await readTooltip();
    assertBesidePointer(tooltip, point);
    await page.screenshot({ path: path.join(SHOTS, '01-chart-hover.png') });
  });

  await check('birth chart: hovering outlines the gate itself and dims the rest', async () => {
    const state = await readHighlight('#bodygraph-container');
    assert.equal(state.dimmed, true, 'the graph did not dim on hover');
    assert.ok(state.gate, 'the hovered gate has no outline class');
    assert.notEqual(state.focused?.stroke, 'none', 'the hovered gate wedge has no outline stroke');
    assert.ok(Number.parseFloat(state.focused?.strokeWidth) >= 2, `outline is ${state.focused?.strokeWidth} wide`);
    assert.match(state.focused?.paintOrder || '', /stroke/, 'the outline is painted over the fill instead of outside it');
    assert.equal(state.unlitPathStroke, 'none', 'un-hovered gates grew an outline too');
    assert.equal(state.litOpacity, '1', `the lit gate is ${state.litOpacity}`);
    assert.ok(Number.parseFloat(state.unlitOpacity) <= 0.2, `unlit gates are at ${state.unlitOpacity}, expected the 0.18 dim`);
  });

  await check('birth chart: the overlay keeps the graph\u2019s source colours and transit mode', async () => {
    await hoverGateWithSource('#bodygraph-container .bg-gate');
    const carried = await page.evaluate(() => {
      const open = [...document.querySelectorAll('.bg-tooltip')].filter(node => node.matches(':popover-open'));
      const tip = open[0];
      const host = document.querySelector('#bodygraph-container');
      const design = tip.querySelector('.bg-tt-design');
      const personality = tip.querySelector('.bg-tt-personality');
      // What the graph's own custom property resolves to, measured on the graph itself.
      const probe = document.createElement('span');
      probe.style.color = 'var(--bg-source-design-tooltip-text)';
      host.appendChild(probe);
      const graphDesign = getComputedStyle(probe).color;
      probe.style.color = 'var(--bg-source-personality-tooltip-text)';
      const graphPersonality = getComputedStyle(probe).color;
      probe.remove();
      return {
        designColor: design ? getComputedStyle(design).color : null,
        personalityColor: personality ? getComputedStyle(personality).color : null,
        graphDesign,
        graphPersonality,
        hostMode: host.dataset.transitSourceMode || null,
        modeAncestor: tip.closest('[data-transit-source-mode]')?.dataset.transitSourceMode || null,
        inlineCopy: tip.style.getPropertyValue('--bg-source-design-tooltip-text')
      };
    });
    assert.ok(carried.designColor || carried.personalityColor, 'the activation in the overlay has no colour');
    if (carried.designColor && carried.hostMode !== 'unified-natal') {
      assert.equal(carried.designColor, carried.graphDesign,
        `the design activation is ${carried.designColor} while the graph\u2019s token resolves to ${carried.graphDesign}`);
    }
    if (carried.personalityColor && carried.hostMode !== 'unified-natal') {
      assert.equal(carried.personalityColor, carried.graphPersonality,
        `the personality activation is ${carried.personalityColor} while the graph\u2019s token resolves to ${carried.graphPersonality}`);
    }
    assert.equal(carried.modeAncestor, carried.hostMode,
      `the overlay reads its source mode from ${carried.modeAncestor} instead of the graph\u2019s ${carried.hostMode}`);
    assert.equal(carried.inlineCopy, '', 'the overlay still copies custom properties instead of inheriting them');
  });

  await check('birth chart: click opens the card, Escape closes it and takes the overlay', async () => {
    const point = await gatePoint('#bodygraph-container .bg-gate');
    await hoverGate(point);
    await page.mouse.click(point.x, point.y);
    await waitForDetail('bodygraph');
    await closeDetail();
    // The pointer is still resting on the gate, so a preview here is legitimate.
    // Leaving the graph is what must clear both the overlay and the highlight.
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    assert.equal((await readTooltip()).visible, 0, 'the overlay is still on screen after leaving the graph');
    const state = await readHighlight('#bodygraph-container');
    assert.deepEqual({ dimmed: state.dimmed, focused: state.gate }, { dimmed: false, focused: null },
      `the closed card left the graph at ${JSON.stringify({ dimmed: state.dimmed, focused: state.gate })}`);
  });

  /* ------------------------------------------------------------------ *
   * Transits
   * ------------------------------------------------------------------ */
  await check('transits: the overlay sits beside the pointer', async () => {
    await nav('transits');
    await page.waitForSelector('#transit-bodygraph .bg-gate', { timeout: 60000 });
    await page.waitForTimeout(400);
    const point = await gatePoint('#transit-bodygraph .bg-gate');
    await hoverGate(point);
    assertBesidePointer(await readTooltip(), point);
    await page.screenshot({ path: path.join(SHOTS, '02-transits-hover.png') });
  });

  await check('transits: click opens the card and Escape closes it without an overlay left over', async () => {
    const point = await gatePoint('#transit-bodygraph .bg-gate');
    await hoverGate(point);
    await page.mouse.click(point.x, point.y);
    await waitForDetail();
    await closeDetail();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    assert.equal((await readTooltip()).visible, 0, 'the overlay survived the card');
  });

  /* ------------------------------------------------------------------ *
   * Timeline — same renderer, no shell
   * ------------------------------------------------------------------ */
  await check('timeline: the overlay sits beside the pointer', async () => {
    await nav('timeline');
    await page.waitForSelector('.tl-graph .bg-gate', { state: 'attached', timeout: 120000 });
    await page.waitForTimeout(900);
    const point = await gatePoint('.tl-graph .bg-gate');
    await hoverGate(point);
    assertBesidePointer(await readTooltip(), point);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(200);
  });

  /* ------------------------------------------------------------------ *
   * Sleep chart — the reported offset
   * ------------------------------------------------------------------ */
  await check('sleep chart: the overlay sits beside the pointer', async () => {
    await nav('dream');
    await page.waitForSelector('#dream-content .dream-type-strip', { timeout: 120000 });
    await page.waitForSelector('#dream-bodygraph .bg-gate', { timeout: 60000 });
    const point = await gatePoint('#dream-bodygraph .bg-gate');
    await hoverGate(point);
    assertBesidePointer(await readTooltip(), point);
    await page.screenshot({ path: path.join(SHOTS, '03-sleep-hover.png') });
  });

  await check('sleep chart: click opens the sleep card and Escape closes it', async () => {
    const point = await gatePoint('#dream-bodygraph .bg-gate');
    await hoverGate(point);
    await page.mouse.click(point.x, point.y);
    await waitForDetail('dream');
    await closeDetail();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    assert.equal((await readTooltip()).visible, 0, 'the overlay survived the sleep card');
  });

  await check('sleep chart: a touch press previews above the finger and clears on release', async () => {
    const point = await gatePoint('#dream-bodygraph .bg-gate');
    const selector = `#dream-bodygraph .bg-gate[data-gate="${point.gate}"]`;
    await page.dispatchEvent(selector, 'pointerdown', {
      pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true,
      clientX: point.x, clientY: point.y
    });
    await page.waitForTimeout(200);
    const tooltip = await readTooltip();
    assert.equal(tooltip.visible, 1, 'a touch press shows no preview');
    assert.ok(tooltip.topLayer, 'the touch preview is not in the top layer');
    assert.ok(tooltip.bottom <= point.y - 20 + TOLERANCE,
      `the touch preview bottom is ${Math.round(tooltip.bottom)} for a finger at ${Math.round(point.y)}; it should sit above the finger`);
    await page.screenshot({ path: path.join(SHOTS, '04-sleep-touch.png') });
    await page.dispatchEvent(selector, 'pointerup', {
      pointerType: 'touch', pointerId: 7, isPrimary: true, bubbles: true,
      clientX: point.x, clientY: point.y
    });
    await page.waitForTimeout(200);
    assert.equal((await readTooltip()).visible, 0, 'the touch preview stayed after release');
  });

  await check('sleep chart: pressing and holding does not leave the highlight behind', async () => {
    const state = await readHighlight('#dream-bodygraph');
    assert.equal(state.dimmed, false, 'the graph is still dimmed after the touch ended');
    assert.equal(state.gate, null, `gate ${state.gate} is still outlined after the touch ended`);
  });

  /* ------------------------------------------------------------------ *
   * Two-person composites
   * ------------------------------------------------------------------ */
  await check('relationship composite: the overlay sits beside the pointer', async () => {
    await nav('connection');
    await page.waitForSelector('#conn-person', { timeout: 60000 });
    await page.selectOption('#conn-person', B);
    await page.click('#conn-calculate');
    await page.waitForSelector('#conn-composite .bg-gate', { timeout: 120000 });
    await page.waitForTimeout(500);
    const point = await gatePoint('#conn-composite .bg-gate');
    await hoverGate(point);
    assertBesidePointer(await readTooltip(), point);
    await page.screenshot({ path: path.join(SHOTS, '05-connection-hover.png') });
  });

  await check('relationship composite: the centres dim with the gates', async () => {
    const state = await readHighlight('#conn-composite');
    assert.equal(state.dimmed, true, 'the composite did not dim on hover');
    assert.ok(Number.parseFloat(state.unlitOpacity) <= 0.2,
      `unlit gates are at ${state.unlitOpacity}`);
    assert.ok(state.unlitCentreOpacity != null, 'the composite draws no un-centred path to compare');
    assert.ok(Number.parseFloat(state.unlitCentreOpacity) < 0.5,
      `unlit centres stayed at ${state.unlitCentreOpacity} while the gates dimmed — the entry animation is filling forwards again`);
  });

  await check('relationship composite: the hovered gate carries the outline, the pinned one keeps it', async () => {
    const hovered = await readHighlight('#conn-composite');
    assert.ok(hovered.gate, 'the hovered gate has no outline in the composite');
    assert.ok(Number.parseFloat(hovered.focused?.strokeWidth) >= 2, `outline is ${hovered.focused?.strokeWidth} wide`);
    const point = await gatePoint('#conn-composite .bg-gate');
    await hoverGate(point);
    await page.mouse.click(point.x, point.y);
    await waitForDetail();
    const pinned = await page.evaluate(() => {
      const path = document.querySelector('#conn-composite .bg-gate-path.bg-selected');
      const disc = document.querySelector('#conn-composite .bg-gate.bg-selected .bg-gate-circle');
      const computed = path && getComputedStyle(path);
      return {
        gate: path?.getAttribute('data-gate') || null,
        strokeWidth: computed?.strokeWidth,
        stroke: computed?.stroke,
        discStrokeWidth: disc && getComputedStyle(disc).strokeWidth
      };
    });
    assert.ok(pinned.gate, 'the pinned gate is not outlined while its card is open');
    assert.ok(Number.parseFloat(pinned.strokeWidth) > 2.4, `pinned outline is ${pinned.strokeWidth}, expected heavier than the hover preview`);
    await page.screenshot({ path: path.join(SHOTS, '06-connection-pinned.png') });
    await closeDetail();
    // Closing the card restores focus and leaves the pointer on the gate, so a preview
    // is legitimate until the pointer leaves the graph.
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    const cleared = await page.evaluate(() => ({
      focused: document.querySelectorAll('#conn-composite .bg-gate-path.bg-focus').length,
      selected: document.querySelectorAll('#conn-composite .bg-gate.bg-selected').length,
      dimmed: document.querySelector('#conn-composite .bodygraph-svg')?.classList.contains('bg-dimmed')
    }));
    assert.deepEqual(cleared, { focused: 0, selected: 0, dimmed: false }, `closing the card left ${JSON.stringify(cleared)}`);
  });

  await check('sleep composite: the overlay sits beside the pointer and the graph dims', async () => {
    await nav('dream');
    await page.waitForSelector('#dream-content .dream-type-strip', { timeout: 120000 });
    await page.click('#dream-compare');
    await page.locator(`[data-add-person="${B}"]`).click();
    await page.waitForSelector('.dream-compare-head', { timeout: 60000 });
    await page.waitForSelector('#dream-composite-shell .bg-gate', { timeout: 60000 });
    await page.waitForTimeout(400);
    const point = await gatePoint('#dream-composite-shell .bg-gate');
    await hoverGate(point);
    assertBesidePointer(await readTooltip(), point);
    const state = await readHighlight('#dream-composite-shell');
    assert.equal(state.dimmed, true, 'the sleep composite did not dim on hover');
    assert.ok(state.gate, 'the hovered gate has no outline in the sleep composite');
    assert.ok(Number.parseFloat(state.unlitOpacity) <= 0.2, `unlit gates are at ${state.unlitOpacity}`);
    await page.screenshot({ path: path.join(SHOTS, '07-sleep-composite-hover.png') });
  });

  /* ------------------------------------------------------------------ *
   * Keyboard focus, reduced motion, and leaving the view
   * ------------------------------------------------------------------ */
  await check('keyboard focus previews the gate from its own box', async () => {
    const gate = await page.$eval('#dream-composite-shell .bg-gate', node => node.dataset.gate);
    // A real keypress puts the browser in keyboard-input mode, which is what makes
    // `:focus-visible` match the programmatic focus that follows.
    await page.keyboard.press('Tab');
    await page.$eval(`#dream-composite-shell .bg-gate[data-gate="${gate}"]`, node => node.focus());
    await page.waitForTimeout(250);
    const tooltip = await readTooltip();
    const state = await readHighlight('#dream-composite-shell');
    assert.equal(tooltip.visible, 1, 'keyboard focus shows no overlay');
    assert.ok(tooltip.topLayer, 'the keyboard overlay is not in the top layer');
    assert.equal(state.gate, gate, `keyboard focus outlined ${state.gate} instead of gate ${gate}`);
    // The overlay is anchored to the focused element's own box, which is the gate's
    // hit area — not the smaller disc inside it.
    const box = await page.evaluate(() => {
      const rect = document.activeElement.getBoundingClientRect();
      return { right: rect.right, centre: rect.top + rect.height / 2 };
    });
    assert.ok(near(tooltip.x, box.right + GAP) || near(tooltip.right, box.right - GAP),
      `the keyboard overlay starts ${Math.round(tooltip.x - box.right)}px from the gate's box, expected ${GAP}px`);
    assert.ok(tooltip.y >= 0 && tooltip.bottom <= tooltip.viewport.height + 1,
      `the keyboard overlay runs outside the ${tooltip.viewport.height}px viewport (${Math.round(tooltip.y)}…${Math.round(tooltip.bottom)})`);
    await page.screenshot({ path: path.join(SHOTS, '08-keyboard-focus.png') });
    await page.$eval(`#dream-composite-shell .bg-gate[data-gate="${gate}"]`, node => node.blur());
    await page.waitForTimeout(200);
    assert.equal((await readTooltip()).visible, 0, 'the overlay stayed after focus left the gate');
  });

  await check('reduced motion removes the hover transitions', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const durations = await page.evaluate(() => {
      const path = document.querySelector('#dream-composite-shell .bg-gate-path');
      const centre = document.querySelector('#dream-composite-shell .bg-center');
      return {
        path: getComputedStyle(path).transitionDuration,
        centre: getComputedStyle(centre).transitionDuration
      };
    });
    assert.equal(durations.path, '0s', `a gate still transitions for ${durations.path}`);
    assert.equal(durations.centre, '0s', `a centre still transitions for ${durations.centre}`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await check('closing a pinned centre takes its heavy outline and its dimming with it', async () => {
    // A centre's `bg-selected` used to survive the close: the reset loop cleared only
    // `bg-lit` and `bg-focus`, so the 3.4-wide focus stroke stayed on that centre for the
    // rest of the view's life.
    const centre = await page.evaluate(() => {
      const node = document.querySelector('#dream-composite-shell .bg-center');
      const rect = node.getBoundingClientRect();
      return { id: node.dataset.center, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    await page.mouse.move(centre.x - 60, centre.y - 60);
    await page.mouse.move(centre.x, centre.y, { steps: 4 });
    await page.waitForTimeout(260);
    const hovered = await readHighlight('#dream-composite-shell');
    assert.equal(hovered.centre, centre.id, `hovering centre ${centre.id} outlined ${hovered.centre}`);
    await page.mouse.click(centre.x, centre.y);
    await waitForDetail();
    const pinned = await page.evaluate(() => {
      const node = document.querySelector('#dream-composite-shell .bg-center.bg-selected');
      return { id: node?.dataset.center || null, width: node && getComputedStyle(node).strokeWidth, stroke: node && getComputedStyle(node).stroke };
    });
    assert.equal(pinned.id, centre.id, 'the pinned centre is not marked while its card is open');
    assert.ok(Number.parseFloat(pinned.width) > 2.4, `pinned centre stroke is ${pinned.width}, expected the heavier selected weight`);
    await closeDetail();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    const cleared = await page.evaluate(() => {
      const marked = [...document.querySelectorAll('#dream-composite-shell .bg-center.bg-selected')];
      const node = document.querySelector(`#dream-composite-shell .bg-center[data-center="${document.querySelector('#dream-composite-shell .bg-center').dataset.center}"]`);
      return {
        selected: marked.length,
        focused: document.querySelectorAll('#dream-composite-shell .bg-center.bg-focus').length,
        strokeWidth: node && getComputedStyle(node).strokeWidth,
        stroke: node && getComputedStyle(node).stroke
      };
    });
    assert.equal(cleared.selected, 0, `${cleared.selected} centre(s) kept the selected class after the card closed`);
    assert.equal(cleared.focused, 0, `${cleared.focused} centre(s) kept the focus class after the card closed`);
    assert.ok(Number.parseFloat(cleared.strokeWidth) < 3, `the centre still carries a ${cleared.strokeWidth} focus stroke after the card closed`);
  });

  await check('leaving a view with an overlay open closes it and leaves no overlay behind', async () => {
    const point = await gatePoint('#dream-composite-shell .bg-gate');
    await hoverGate(point);
    assert.equal((await readTooltip()).visible, 1, 'no overlay to leave behind');
    // Programmatic navigation: the pointer never moves, so nothing here can depend on
    // `pointerout` — the overlay must lose its open state because the view it belongs to
    // is no longer shown.
    await page.evaluate(() => document.querySelector('.nav-link[data-view="library"]').click());
    await page.waitForTimeout(700);
    const after = await readTooltip();
    assert.equal(after.visible, 0, 'an overlay is still open after its view was left');
    assert.ok(after.maxPerGraph <= 1, `a graph is holding ${after.maxPerGraph} overlays after leaving the view`);
    // Coming back must not resurrect a stuck overlay either. The comparison mode is
    // restored on open, so the single design's strip is not the thing to wait for.
    await nav('dream');
    await page.waitForSelector('#dream-content .dream-compare-head, #dream-content .dream-type-strip', { timeout: 120000 });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(400);
    const returned = await readTooltip();
    assert.equal(returned.visible, 0, 'an overlay is open again with the pointer away from the graph');
  });

  await check('a removed or redrawn graph takes its overlay with it and leaves nothing to accumulate', async () => {
    // The leak this replaces: the overlay used to live in a shared layer on <body> while it
    // was open, so removing the graph left it floating and nothing pruned it, because the
    // container it was registered against was still connected.
    const outcome = await page.evaluate(async () => {
      const { renderBodygraph } = await import('/src/bodygraph.js');
      const chart = {
        gates: { personality: { sun: { gate: 1, line: 2 } }, design: { earth: { gate: 8, line: 3 } } },
        channels: [{ gates: [1, 8], centers: ['g', 'throat'] }],
        centers: { definedNames: ['g'] },
        type: { name: 'generator' }, profile: { numbers: '1/3' }, authority: { name: 'sacral' },
        definition: 'single', variable: null, positions: {}
      };
      const host = document.createElement('div');
      host.id = 'lifecycle-host';
      host.style.cssText = 'position:fixed;left:20px;top:20px;width:520px;height:820px;z-index:-1;';
      document.body.appendChild(host);
      const graphHost = document.createElement('div');
      host.appendChild(graphHost);
      const open = () => [...document.querySelectorAll('.bg-tooltip')].filter(node => node.matches(':popover-open')).length;
      const openIt = () => {
        const gate = graphHost.querySelector('.bg-gate[data-gate="1"]');
        gate.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: 120, clientY: 220, pointerType: 'mouse' }));
      };
      const result = { globalBefore: document.querySelectorAll('.bg-tooltip').length };

      renderBodygraph(graphHost, chart, { planetColumns: false, animate: false, onGateClick: () => {} });
      openIt();
      result.openAfterHover = open();

      // Redraw the graph in the same container: one overlay, none open.
      renderBodygraph(graphHost, chart, { planetColumns: false, animate: false, onGateClick: () => {} });
      result.openAfterRedraw = open();
      result.overlaysAfterRedraw = graphHost.querySelectorAll('.bg-tooltip').length;

      // Open it again and remove the graph subtree, keeping the container.
      openIt();
      result.openBeforeRemoval = open();
      graphHost.replaceChildren();
      result.openAfterRemoval = open();
      result.overlaysAfterRemoval = graphHost.querySelectorAll('.bg-tooltip').length;

      // And a removed container, with the overlay open.
      renderBodygraph(graphHost, chart, { planetColumns: false, animate: false, onGateClick: () => {} });
      openIt();
      result.openBeforeHostRemoval = open();
      host.remove();
      result.openAfterHostRemoval = open();
      // A detached tree still holds its own nodes; what must be gone from the document is
      // anything belonging to the removed host.
      result.overlaysAfterHostRemoval = [...document.querySelectorAll('.bg-tooltip')]
        .filter(node => node.closest('#lifecycle-host')).length;
      result.globalAfter = document.querySelectorAll('.bg-tooltip').length;
      return result;
    });
    assert.equal(outcome.openAfterHover, 1, 'the scratch graph showed no overlay');
    assert.equal(outcome.openAfterRedraw, 0, 'a redrawn graph left the previous overlay open');
    assert.equal(outcome.overlaysAfterRedraw, 1, `a redrawn graph accumulated ${outcome.overlaysAfterRedraw} overlays`);
    assert.equal(outcome.openBeforeRemoval, 1, 'the overlay did not reopen for the removal case');
    assert.equal(outcome.openAfterRemoval, 0, 'removing the graph subtree left the overlay open');
    assert.equal(outcome.overlaysAfterRemoval, 0, `${outcome.overlaysAfterRemoval} overlay(s) stayed in the container that outlived its graph`);
    assert.equal(outcome.openBeforeHostRemoval, 1, 'the overlay did not reopen for the removed-container case');
    assert.equal(outcome.openAfterHostRemoval, 0, 'removing the container left the overlay open');
    assert.equal(outcome.overlaysAfterHostRemoval, 0, `${outcome.overlaysAfterHostRemoval} overlay(s) survived the removed container`);
    assert.equal(outcome.globalAfter, outcome.globalBefore,
      `the document went from ${outcome.globalBefore} to ${outcome.globalAfter} overlay nodes across one scratch graph's life`);
  });

  await check('a unified-natal skin keeps its tooltip emphasis after the overlay leaves the graph', async () => {
    // The delve skin switches the transit view to `unified-natal`, whose tooltip
    // emphasis used to be scoped through the graph root the overlay no longer sits
    // inside — the activated numbers would have fallen back to the birth colours.
    if (!(await page.$eval('#more-menu', node => node.open))) await page.click('#more-toggle');
    await page.click('#skin-settings-button');
    await page.waitForSelector('#skin-settings[open]', { timeout: 10000 });
    await page.click('#skin-picker [data-skin-id="delve"]');
    await page.waitForTimeout(300);
    if (await page.$eval('#skin-settings', node => node.open)) await page.click('#skin-settings-close');
    await page.waitForTimeout(400);
    await nav('transits');
    await page.waitForSelector('#transit-bodygraph .bg-gate', { timeout: 120000 });
    await page.waitForTimeout(400);
    await hoverGateWithSource('#transit-bodygraph .bg-gate');
    const skin = await page.evaluate(() => {
      const tip = [...document.querySelectorAll('.bg-tooltip')].find(node => node.matches(':popover-open'));
      const activated = tip.querySelector('.bg-tt-design, .bg-tt-personality');
      const probe = document.createElement('span');
      probe.style.color = 'var(--source-natal-tooltip-text)';
      tip.appendChild(probe);
      const natal = getComputedStyle(probe).color;
      probe.remove();
      return {
        // The overlay is a descendant of the graph again, so the mode it is styled by is
        // the graph's own attribute — nothing is copied onto the element.
        mode: tip.closest('[data-transit-source-mode]')?.dataset.transitSourceMode || null,
        activated: activated && getComputedStyle(activated).color,
        natal
      };
    });
    assert.equal(skin.mode, 'unified-natal', `the overlay reads its mode from a graph that is "${skin.mode}" instead of unified-natal`);
    assert.equal(skin.activated, skin.natal,
      `the activated number is ${skin.activated} while unified-natal asks for ${skin.natal}`);
  });

  await check('the naming hooks replace every name the graph speaks, and nothing changes without them', async () => {
    // Park the page's own overlay first: the scratch graphs below read "the visible
    // tooltip", and the previous check left one open under the pointer.
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    // `opts.naming` is the host's way to name the objects its topology shares with the
    // catalogue — the sleep design calls channel 1-8 its Inspiration channel. The graph
    // renders straight into a scratch host here, because the contract is the renderer's
    // and its dream caller belongs to another change.
    const rendered = await page.evaluate(async () => {
      const i18n = await import('/src/lib/i18n.js');
      i18n.setLocale('zh-CN');
      const { renderBodygraph } = await import('/src/bodygraph.js');
      const chart = {
        // Engine planet ids are lowercase; the glyph lookups use them as keys.
        gates: { personality: { sun: { gate: 1, line: 2 } }, design: { earth: { gate: 8, line: 3 } } },
        channels: [{ gates: [1, 8], centers: ['g', 'throat'] }],
        centers: { definedNames: ['g'] },
        type: { name: 'generator' }, profile: { numbers: '1/3' }, authority: { name: 'sacral' },
        definition: 'single', variable: null, positions: {}
      };
      const naming = {
        gate: gate => `HOST-GATE-${gate}`,
        gateTooltip: gate => `HOST-TIP-${gate}`,
        channelTooltip: channel => `HOST-CHANNEL-${channel.gates.join('-')}`,
        center: center => `HOST-CENTRE-${center}`
      };
      const render = (options) => {
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:20px;top:20px;width:520px;height:820px;z-index:-1;';
        document.body.appendChild(host);
        renderBodygraph(host, chart, { planetColumns: false, animate: false, onGateClick: () => {}, ...options });
        return host;
      };
      const hover = (node) => node.dispatchEvent(new PointerEvent('pointerover', {
        bubbles: true, clientX: 120, clientY: 220, pointerType: 'mouse'
      }));
      const overlay = () => [...document.querySelectorAll('.bg-tooltip')]
        .find(node => node.matches(':popover-open'))?.textContent.trim() || null;

      const named = render({ naming });
      const gate = named.querySelector('.bg-gate[data-gate="1"]');
      hover(gate);
      const namedGate = { aria: gate.getAttribute('aria-label'), tip: overlay() };
      const centre = named.querySelector('.bg-center[data-center="g"]');
      hover(centre);
      const namedCentre = { aria: centre.getAttribute('aria-label'), tip: overlay(), summary: named.querySelector('.bodygraph-svg').getAttribute('aria-label') };
      named.remove();
      document.querySelectorAll('.bg-tooltip').forEach(node => node.matches(':popover-open') && node.hidePopover());

      const plain = render({});
      const plainGate = plain.querySelector('.bg-gate[data-gate="1"]');
      hover(plainGate);
      const plainResult = { aria: plainGate.getAttribute('aria-label'), tip: overlay() };
      plain.remove();
      document.querySelectorAll('.bg-tooltip').forEach(node => node.matches(':popover-open') && node.hidePopover());

      return { namedGate, namedCentre, plain: plainResult };
    });

    assert.match(rendered.namedGate.aria, /HOST-GATE-1/, `the gate aria still reads "${rendered.namedGate.aria}"`);
    assert.doesNotMatch(rendered.namedGate.aria, /创造|乾为天/, `the gate aria kept the catalogue word: "${rendered.namedGate.aria}"`);
    assert.match(rendered.namedGate.tip, /HOST-TIP-1/, `the gate tooltip reads "${rendered.namedGate.tip}"`);
    assert.doesNotMatch(rendered.namedGate.tip, /乾为天/, `the tooltip appended the waking hexagram: "${rendered.namedGate.tip}"`);
    assert.match(rendered.namedGate.tip, /HOST-CHANNEL-1-8（1-8）/, `the channel note is not the host name plus its pair: "${rendered.namedGate.tip}"`);
    assert.match(rendered.namedCentre.tip, /HOST-CENTRE-g/, `the centre tooltip reads "${rendered.namedCentre.tip}"`);
    assert.match(rendered.namedCentre.aria, /HOST-CENTRE-g/, `the centre aria reads "${rendered.namedCentre.aria}"`);
    assert.match(rendered.namedCentre.summary, /HOST-CENTRE-g/, 'the graph summary kept the catalogue centre name');

    assert.doesNotMatch(rendered.plain.aria, /HOST-/, 'a graph without naming picked up an override');
    assert.match(rendered.plain.aria, /创造/, `the default gate aria reads "${rendered.plain.aria}"`);
    assert.match(rendered.plain.tip, /创造（乾为天）/, `the default gate tooltip reads "${rendered.plain.tip}"`);
  });

  await check('a sleep naming hook set reads as the sleep design does', async () => {
    // The exact call shape the sleep page will pass, with the real dream vocabulary and
    // the real dream topology, so the host side is proven without that page's change.
    const sleep = await page.evaluate(async () => {
      const i18n = await import('/src/lib/i18n.js');
      i18n.setLocale('zh-CN');
      const { renderBodygraph } = await import('/src/bodygraph.js');
      const { DREAM_TOPOLOGY } = await import('/src/lib/human-design/dream-topology.js');
      const { dreamGateName, dreamChannelName } = await import('/src/lib/dream-vocabulary.js');
      const { gateName } = await import('/src/lib/vocabulary.js');
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:20px;top:20px;width:520px;height:400px;z-index:-1;';
      document.body.appendChild(host);
      const chart = {
        gates: { personality: { sun: { gate: 20, line: 5 } }, design: { earth: { gate: 57, line: 4 } } },
        channels: [{ gates: [20, 57], centers: ['throat', 'spleen'] }],
        centers: { definedNames: ['throat', 'spleen'] },
        type: { name: 'generator' }, profile: { numbers: '1/3' }, authority: { name: 'sacral' },
        definition: 'single', variable: null, positions: {}
      };
      renderBodygraph(host, chart, {
        topology: DREAM_TOPOLOGY,
        planetColumns: false,
        animate: false,
        onGateClick: () => {},
        naming: {
          gate: gate => dreamGateName(gate),
          gateTooltip: gate => dreamGateName(gate),
          channelTooltip: channel => dreamChannelName(channel.gates)
        }
      });
      const gate = host.querySelector('.bg-gate[data-gate="20"]');
      gate.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: 120, clientY: 220, pointerType: 'mouse' }));
      const tip = [...document.querySelectorAll('.bg-tooltip')]
        .find(node => node.matches(':popover-open'))?.textContent.trim() || null;
      const result = {
        tip,
        aria: gate.getAttribute('aria-label'),
        dreamGate: dreamGateName(20),
        wakingGate: gateName(20),
        dreamChannel: dreamChannelName([20, 57])
      };
      host.remove();
      document.querySelectorAll('.bg-tooltip').forEach(node => node.matches(':popover-open') && node.hidePopover());
      return result;
    });
    assert.ok(sleep.tip, 'the sleep graph showed no overlay');
    assert.match(sleep.tip, new RegExp(`第 20 闸门 · ${sleep.dreamGate}`), `the sleep tooltip reads "${sleep.tip}"`);
    assert.ok(!sleep.tip.includes(sleep.wakingGate), `the sleep tooltip still uses the waking gate name: "${sleep.tip}"`);
    assert.match(sleep.tip, new RegExp(`${sleep.dreamChannel}（20-57）`), `the channel note reads "${sleep.tip}"`);
    assert.match(sleep.aria, new RegExp(sleep.dreamGate), `the sleep gate aria reads "${sleep.aria}"`);
  });

  await check('no page or console errors during the run', async () => {
    assert.deepEqual(pageErrors, [], pageErrors.join(' | '));
  });
} finally {
  await browser.close();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall checks passed');
