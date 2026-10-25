// Verification for the shared Design | glyph | Personality activation column.
//   node tests/birth-activations-symmetry-e2e.mjs
// Checks the real 9961 install with a fresh, cookie-free browser context:
// password gate absent, both hosts share one component root, Design sits right
// of the glyph and Personality left of it, and neither host overflows.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = (process.env.E2E_URL || 'http://127.0.0.1:9961').replace(/\/$/, '');
const person = process.env.OHD_PERSON_QUERY || '?d=2026-10-07&t=12:12&tz=1';

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

// Read activation columns: cell alignment, boxes, glyph proximity, colours, marks.
const readColumns = () => [...document.querySelectorAll('.ohd-birth-activations')]
  .filter(column => column.querySelector('.tl-birth-row'))
  .map(column => {
  const row = column.querySelector('.tl-birth-row');
  const glyph = row.querySelector('.tl-birth-glyph');
  const g = glyph.getBoundingClientRect();
  const cells = {};
  for (const cell of row.querySelectorAll('.tl-birth-value')) {
    const value = cell.querySelector('.bg-planet-act');
    const mark = cell.querySelector('.tl-fixing-mark');
    const c = cell.getBoundingClientRect();
    const v = value.getBoundingClientRect();
    cells[cell.dataset.side] = {
      justify: getComputedStyle(cell).justifyContent,
      cellLeft: Math.round(c.left), cellRight: Math.round(c.right), cellWidth: Math.round(c.width),
      valueLeft: Math.round(v.left), valueRight: Math.round(v.right),
      valueColor: getComputedStyle(value).color,
      markColor: mark ? getComputedStyle(mark).color : null,
      markText: mark ? mark.textContent : null,
      order: [...cell.children].map(node => node.classList.contains('tl-fixing-mark') ? 'mark' : 'act'),
      gapToGlyph: cell.dataset.side === 'design'
        ? Math.round(g.left - v.right) : Math.round(v.left - g.right),
    };
  }
  return {
    root: column.className,
    glyphCenter: Math.round((g.left + g.right) / 2),
    rowBox: [Math.round(row.getBoundingClientRect().left), Math.round(row.getBoundingClientRect().right)],
    cells,
    headAlign: [...column.querySelector('.tl-birth-head').children].map(node => getComputedStyle(node).textAlign),
    overflow: column.scrollWidth > column.clientWidth + 1,
  };
});

try {
  await page.goto(base + '/' + person, { waitUntil: 'domcontentloaded' });
  // The birth form is hidden for a loaded chart, so wait for the app itself.
  await page.waitForFunction(() => document.getElementById('app') && document.getElementById('app').hidden === false, null, { timeout: 60000 });

  // 1. Password-free mode: the gate never appears and status says so.
  const gate = await page.evaluate(async () => ({
    gateHidden: document.getElementById('local-auth')?.hidden,
    appHidden: document.getElementById('app')?.hidden,
    cookie: document.cookie,
    status: await (await fetch('/api/local/status', { credentials: 'omit' })).json(),
  }));
  assert.equal(gate.gateHidden, true, 'the unlock gate stays hidden without a password');
  assert.equal(gate.appHidden, false, 'the app is visible immediately');
  assert.equal(gate.cookie, '', 'no session cookie is needed');
  assert.equal(gate.status.passwordRequired, false);
  assert.equal(gate.status.authenticated, true);

  const results = { overflow: {}, cards: null };

  // 2. Relationship view with a saved comparison partner, desktop and phone.
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + '/' + person, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('app') && document.getElementById('app').hidden === false, null, { timeout: 60000 });
    // The local library hydrates asynchronously; only then can a partner be chosen.
    await page.waitForFunction(() => document.querySelectorAll('#people-switcher option').length > 2, null, { timeout: 60000 });
    await page.evaluate(() => [...document.querySelectorAll('nav [data-view]')].find(node => node.dataset.view === 'connection').click());
    await page.waitForFunction(() => [...document.querySelectorAll('#conn-person option')]
      .some(option => option.value && option.value !== '__guest'), null, { timeout: 60000 });
    const partner = await page.evaluate(() => [...document.querySelectorAll('#conn-person option')]
      .map(option => option.value).find(value => value && value !== '__guest'));
    assert.ok(partner, 'a saved comparison partner exists');
    await page.evaluate(id => {
      document.getElementById('conn-person').value = id;
      document.getElementById('conn-calculate').click();
    }, partner);
    await page.waitForFunction(() => document.querySelectorAll('#connection-content .ohd-birth-activations .tl-birth-row').length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(400);
    results['connection-' + width] = await page.evaluate(readColumns);
    results.overflow['connection-' + width] = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    results.cards = results.cards || await page.evaluate(() =>
      [...document.querySelectorAll('.conn-person-side')].map(node => {
        const style = getComputedStyle(node);
        return { background: style.backgroundColor, border: style.borderTopWidth, shadow: style.boxShadow };
      }));
  }

  // 3. Timeline view, same person, same component root.
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + '/' + person + '&view=timeline', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#timeline-view .ohd-birth-activations .tl-birth-row').length > 0, null, { timeout: 120000 });
    await page.waitForTimeout(800);
    results['timeline-' + width] = await page.evaluate(readColumns);
    results.overflow['timeline-' + width] = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
  }

  assert.deepEqual(errors, [], 'no page errors');

  // Both hosts must render the same centre-symmetric column.
  const hosts = ['connection-1440', 'connection-390', 'timeline-1440', 'timeline-390'];
  for (const host of hosts) {
    const columns = results[host];
    assert.ok(columns && columns.length, host + ': the activation column rendered');
    for (const column of columns) {
      assert.equal(column.cells.design.justify, 'flex-end', host + ': Design hugs the glyph from the right');
      assert.equal(column.cells.personality.justify, 'flex-start', host + ': Personality hugs the glyph from the left');
      assert.deepEqual(column.cells.design.order, ['mark', 'act'], host + ': Design keeps the timeline mark order');
      assert.deepEqual(column.cells.personality.order, ['act', 'mark'], host + ': Personality mirrors it');
      // Mirror symmetry: equal distance to the glyph on both sides.
      assert.ok(Math.abs(column.cells.design.gapToGlyph - column.cells.personality.gapToGlyph) <= 1,
        host + ': both sides sit the same distance from the glyph');
      assert.equal(column.cells.design.markColor, column.cells.design.valueColor,
        host + ': Design mark shares the Design colour');
      assert.equal(column.cells.personality.markColor, column.cells.personality.valueColor,
        host + ': Personality mark shares the Personality colour');
      assert.equal(column.overflow, false, host + ': the column does not overflow');
    }
  }
  for (const key of Object.keys(results.overflow)) {
    assert.equal(results.overflow[key], false, key + ': no horizontal page overflow');
  }
  // One canvas, no per-person cards.
  for (const side of results.cards) {
    assert.equal(side.background, 'rgba(0, 0, 0, 0)', 'the relationship flank stays on the shared canvas');
    assert.equal(side.border, '0px');
    assert.equal(side.shadow, 'none');
  }

  const summary = {};
  for (const [key, columns] of Object.entries(results)) {
    if (!Array.isArray(columns) || !/^(connection|timeline)-\d+$/.test(key)) continue;
    summary[key] = columns.map(column => ({
      design: { justify: column.cells.design.justify, gap: column.cells.design.gapToGlyph,
        colour: column.cells.design.valueColor, order: column.cells.design.order },
      personality: { justify: column.cells.personality.justify, gap: column.cells.personality.gapToGlyph,
        colour: column.cells.personality.valueColor, order: column.cells.personality.order },
      headAlign: column.headAlign, glyphCenter: column.glyphCenter,
      columnOverflow: column.overflow,
    }));
  }
  console.log(JSON.stringify({ result: 'passed', summary, pageOverflow: results.overflow, cards: results.cards }, null, 1));
} finally {
  await browser.close();
}
