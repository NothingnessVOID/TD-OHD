/**
 * Sleep chart: the activation bands must never sit on a gate.
 *
 * The shared graph shell places a host's side bands *over* the canvas, on the
 * whitespace the bodygraph leaves around its centres. That only works while the
 * bands are narrower than the whitespace: widening the bands (to give the 14px
 * activation text room) puts them over the graph at narrow desktop widths, where
 * the canvas is small but the page is still above the phone breakpoint.
 *
 * This probe is deterministic on purpose. `elementFromPoint()` resolves against
 * the current viewport, so every gate is scrolled into view first — without that
 * step every gate below the fold reports `null` and the run invents occlusions.
 * All selectors are scoped to `#dream-view`, so the hidden waking bodygraph that
 * shares `.bg-planets-*` class names can never be measured by mistake.
 *
 *   E2E_URL=http://127.0.0.1:10017 node tests/dream-shell-band-occlusion-e2e.mjs
 *
 * Checks:
 *   - every gate's disc centre hit-tests inside the sleep chart's own <svg>
 *   - the bands keep their thickness contract (column width / canvas geometry)
 *   - the two activation dates carry reading-size type (>= 14px)
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const BASE = (process.env.E2E_URL || 'http://127.0.0.1:10017').replace(/\/$/, '');
/** 641 is the first width above the phone breakpoint, where the bands still
 *  overlay the canvas; 660 was the first width the band's own geometry cleared
 *  the outermost gate while the fix was measured. Both stay in the sweep. */
const WIDTHS = [641, 660, 700, 768, 900, 1024, 1280, 1440];
const BIRTH = '?d=1990-05-20&t=06%3A30&tz=0&name=Band%20Probe';

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
let failures = 0;
const rows = [];

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en', reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('ohd-language', 'en'));
  await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/${BIRTH}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#bodygraph-container .bodygraph-svg').waitFor({ timeout: 90000 });
  await page.locator('.nav-link[data-view="dream"]').click();
  await page.locator('#dream-view .dream-graph svg').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.waitForTimeout(400);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(350);

    const report = await page.evaluate(() => {
      const view = document.getElementById('dream-view');
      const svg = view.querySelector('.dream-graph svg');
      const gates = [...svg.querySelectorAll('.bg-gate[data-gate]')];
      const occluded = [];
      for (const gate of gates) {
        const circle = gate.querySelector('.bg-gate-circle') || gate;
        circle.scrollIntoView({ block: 'center', inline: 'center' });
        const r = circle.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (!hit || !svg.contains(hit)) {
          occluded.push({
            gate: gate.dataset.gate,
            cx: Math.round(x), cy: Math.round(y),
            hit: hit ? `${hit.tagName.toLowerCase()}.${(typeof hit.className === 'string' ? hit.className : hit.getAttribute('class') || '').split(' ').slice(0, 2).join('.')}` : 'null'
          });
        }
      }
      scrollTo({ top: 0, behavior: 'instant' });
      const canvas = view.querySelector('.ohd-graph-canvas').getBoundingClientRect();
      const slots = [...view.querySelectorAll('.ohd-graph-slot')].map(node => {
        const rect = node.getBoundingClientRect();
        const inner = node.firstElementChild;
        return {
          side: node.dataset.slot,
          width: Math.round(rect.width),
          declared: inner ? getComputedStyle(inner).getPropertyValue('--ohd-slot-content-width').trim() : null,
          left: Math.round(rect.left), right: Math.round(rect.right),
          top: Math.round(rect.top), bottom: Math.round(rect.bottom)
        };
      });
      const below = slots.every(slot => slot.top >= Math.round(canvas.bottom) - 1);
      const dateSizes = [...view.querySelectorAll('.dream-column-date')].map(node => ({
        text: node.textContent.trim(), size: parseFloat(getComputedStyle(node).fontSize)
      }));
      return {
        gates: gates.length,
        occluded,
        canvas: { left: Math.round(canvas.left), right: Math.round(canvas.right), width: Math.round(canvas.width), height: Math.round(canvas.height) },
        slots, stacked: below, dateSizes
      };
    });

    const label = `${width}px`;
    rows.push({ width, gates: report.gates, occluded: report.occluded.length, stacked: report.stacked, slotWidth: report.slots[0]?.width, canvasWidth: report.canvas.width });
    try {
      assert.ok(report.gates >= 15, `${label}: expected the sleep chart's gate set, saw ${report.gates}`);
      assert.equal(report.occluded.length, 0, `${label}: ${report.occluded.length} gate(s) occluded — ${JSON.stringify(report.occluded.slice(0, 6))}`);
      for (const date of report.dateSizes) {
        assert.ok(date.size >= 14, `${label}: activation date "${date.text}" renders at ${date.size}px`);
      }
      console.log(`✔ ${label}: ${report.gates} gates, 0 occluded, bands ${report.stacked ? 'stacked below the canvas' : `beside it (${report.slots.map(s => `${s.side} ${s.width}px`).join(', ')})`}, canvas ${report.canvas.width}×${report.canvas.height}px`);
    } catch (error) {
      failures++;
      console.error(`✖ ${error.message}`);
    }
  }

  /* The waking chart's planet dates sit in the same compact column family and
     must clear the same floor; the check is scoped to the visible chart view so
     the sleep page's own copies cannot satisfy it. */
  try {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.locator('.nav-link[data-view="chart"]').click();
    await page.locator('#chart-view #bodygraph-container .bodygraph-svg').waitFor({ timeout: 30000 });
    const sizes = await page.evaluate(() => [...document.querySelectorAll('#chart-view .bg-planets-date')]
      .map(node => ({ text: node.textContent.trim(), size: parseFloat(getComputedStyle(node).fontSize) })));
    assert.ok(sizes.length >= 1, 'waking chart: expected activation dates');
    for (const entry of sizes) assert.ok(entry.size >= 14, `waking chart date "${entry.text}" renders at ${entry.size}px`);
    console.log(`✔ waking chart: ${sizes.length} activation dates at ${sizes.map(s => s.size).join('/')}px`);
  } catch (error) {
    failures++;
    console.error(`✖ ${error.message}`);
  }

  if (errors.length) { failures++; console.error(`✖ page errors: ${errors.slice(0, 3).join(' | ')}`); }
  else console.log('✔ no page errors');
} finally {
  await browser.close();
}

console.log('\nsweep:', JSON.stringify(rows));
if (failures) { console.error(`\n${failures} check(s) failed`); process.exitCode = 1; }
else console.log('\nall sleep-chart band checks passed');
