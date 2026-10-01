/** Shared Transit/Timeline renderer: fixing color changes must not affect Gate.Line. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.E2E_URL || 'http://127.0.0.1:5177');
  await page.waitForSelector('#more-toggle');
  const results = await page.evaluate(async () => {
    const { renderGraphColumns } = await import('/src/features/transit-timeline/graph-window.js');
    const root = document.createElement('section');
    root.className = 'tl';
    root.style.cssText = '--hd-design:rgb(140, 30, 40);--hd-personality:rgb(40, 50, 60);--hd-transit:rgb(10, 160, 190);--hd-transit-text:color-mix(in srgb, var(--hd-transit) 65%, #16130f)';
    root.innerHTML = '<div class="tl-transit-column"><div class="tl-planets"></div></div><div class="tl-birth-column"><div class="tl-birth-planets"></div></div>';
    document.body.append(root);
    const chart = { gates: { design: { sun: { gate: 26, line: 6 } }, personality: { sun: { gate: 45, line: 6 } } } };
    const base = { root, chart, activations: { sun: { gate: 18, line: 5 } }, mode: 'overlay', planets: [{ id: 'sun', name: 'Sun', glyph: '☉' }], translate: key => key };
    const render = (state, temporaryChange) => renderGraphColumns({ ...base, fixings: {
      transit: { sun: { combinedState: 'detriment' } },
      birth: Object.fromEntries(['design', 'personality'].map(side => [side, { sun: { natalState: 'exalted', transitAdjustedState: state, temporaryChange } }]))
    } });
    const read = () => [...root.querySelectorAll('.tl-birth-value')].map(node => ({
      side: node.dataset.side, temporary: node.querySelector('.tl-fixing-mark').dataset.temporary,
      mark: node.querySelector('.tl-fixing-mark').textContent,
      transitTextColor: getComputedStyle(root.querySelector('.tl-planet .bg-planet-act')).color,
      markColor: getComputedStyle(node.querySelector('.tl-fixing-mark')).color,
      valueColor: getComputedStyle(node.querySelector('.bg-planet-act')).color,
      value: node.querySelector('.bg-planet-act').textContent, title: node.title,
    }));
    render('exalted', false);
    const unchanged = read();
    const transitColor = getComputedStyle(root.querySelector('.tl-planet .tl-fixing-mark')).color;
    render('detriment', true);
    const changed = read();
    render('juxtaposed', true);
    const both = read();
    root.style.setProperty('--hd-transit', 'rgb(70, 180, 90)');
    const newToken = read();
    const transitAfter = getComputedStyle(root.querySelector('.tl-planet .tl-fixing-mark')).color;
    render('exalted', false);
    const restored = read();
    root.remove();
    return { unchanged, changed, both, newToken, restored, transitColor, transitAfter };
  });
  for (let i = 0; i < 2; i++) {
    const original = results.unchanged[i];
    assert.equal(original.temporary, 'false');
    assert.equal(original.markColor, original.valueColor, `${original.side} unchanged fixing retains its semantic color`);
    assert.notEqual(original.markColor, 'rgb(10, 160, 190)');
    for (const rows of [results.changed, results.both, results.newToken]) {
      assert.equal(rows[i].temporary, 'true');
      assert.equal(rows[i].valueColor, original.valueColor, 'Gate.Line color remains unchanged');
      assert.equal(rows[i].value, original.value, 'Gate.Line value remains unchanged');
      assert.ok(rows[i].title.includes('temporaryFixing · natalFixing: fixing_exalted'), 'tooltip retains temporary and natal information');
    }
    assert.equal(results.changed[i].mark, '▼');
    assert.equal(results.both[i].mark, '▲▼');
    assert.equal(results.changed[i].markColor, results.changed[i].transitTextColor);
    assert.equal(results.both[i].markColor, results.both[i].transitTextColor);
    assert.equal(results.newToken[i].markColor, results.newToken[i].transitTextColor, 'fixing follows the derived Transit text token');
    assert.notEqual(results.newToken[i].markColor, results.changed[i].markColor);
    assert.equal(results.restored[i].markColor, original.markColor, 're-render removes temporary coloring');
    assert.equal(results.restored[i].temporary, 'false');
  }
  assert.equal(results.transitAfter, results.transitColor, 'Transit planet marks retain existing styling');
  console.log('PASS: shared fixing colors, live semantic token, unchanged Gate.Line, tooltip, and reset');
} finally {
  await browser.close();
}
