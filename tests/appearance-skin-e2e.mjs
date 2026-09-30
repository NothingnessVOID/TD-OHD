import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const birth = '?d=2000-05-10&t=12%3A30&tz=8';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1224, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const inspect = selector => page.locator(selector).first().evaluate(node => ({
  color: getComputedStyle(node).color,
  background: getComputedStyle(node).backgroundColor,
  fill: node.getAttribute('fill'),
  stroke: node.getAttribute('stroke'),
  stopColor: node.getAttribute('stop-color')
}));
const setAppearance = (method, value) => page.evaluate(async ({ method, value }) => {
  (await import('/src/lib/appearance.js'))[method](value);
}, { method, value });

try {
  await page.goto(`${base}/${birth}`);
  await page.locator('#bodygraph-container .bodygraph-svg').waitFor();
  await setAppearance('setTheme', 'light');
  await page.addStyleTag({ content: `
    html[data-hd-skin="appearance-probe"] {
      --hd-design: #7B2CFF;
      --hd-transit: #00EE44;
      --hd-center-g: #2468AF;
      --hd-center-root: #AF6835;
    }
  ` });
  await setAppearance('setHumanDesignSkin', 'appearance-probe');
  await page.locator('#bodygraph-container .bg-gate-path[fill="#7B2CFF"]').first().waitFor();

  assert.ok(await page.locator('#bodygraph-container .bg-gate-path[fill="#7B2CFF"]').count() > 0,
    'design channels follow the sole Design token');
  assert.equal((await inspect('#bodygraph-container .bg-planets-design .bg-planet-act')).color, 'rgb(123, 44, 255)');
  const centerEdge = async key => (await inspect(`#bodygraph-container radialGradient[id$="-cg-${key}"] stop[offset="1"]`)).stopColor;
  assert.equal(await centerEdge('g'), '#2468AF');
  assert.equal(await centerEdge('root'), '#AF6835');
  assert.notEqual(await centerEdge('head'), '#2468AF');
  assert.notEqual(await centerEdge('throat'), '#AF6835');

  await page.locator('#bodygraph-container .bg-gate[data-gate="49"] .bg-gate-circle').hover();
  await page.locator('#bodygraph-container .bg-tooltip .bg-tt-design').waitFor();
  assert.equal((await inspect('#bodygraph-container .bg-tooltip .bg-tt-design')).color, 'rgb(123, 44, 255)');

  await page.locator('#bodygraph-container .bg-planets-design .bg-planet-row').first().click();
  await page.locator('#gate-detail [data-detail-kind="planet"][data-source="design"]').waitFor();
  assert.equal((await inspect('#gate-detail .planet-detail-card .detail-label')).color, 'rgb(123, 44, 255)');
  await page.locator('#gate-detail [data-planet-gate]').click();
  assert.equal((await inspect('#gate-detail .bg-tt-design')).color, 'rgb(123, 44, 255)');
  await page.keyboard.press('Escape');

  await setAppearance('setHumanDesignSkin', 'classic');
  await setAppearance('setTheme', 'dark');
  assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).getPropertyValue('--hd-design').trim()), '#e74c3c');
  assert.ok(await page.locator('#bodygraph-container .bg-gate-path[fill="#e74c3c"]').count() > 0,
    'dark theme repaints current chart without reload');
  await setAppearance('setTheme', 'light');

  for (const view of ['transits', 'timeline']) {
    await page.goto(`${base}/${birth}&view=${view}`);
    const stage = view === 'transits' ? '#transit-stage' : '#timeline-view';
    await page.locator(`${stage} .bodygraph-svg`).waitFor();
    const beforeTransitText = (await inspect(`${stage} .tl-transit-column .bg-planet-act`)).color;
    await page.addStyleTag({ content: 'html[data-hd-skin="appearance-probe"] { --hd-design: #7B2CFF; --hd-transit: #00EE44; }' });
    await setAppearance('setHumanDesignSkin', 'appearance-probe');
    assert.ok(await page.locator(`${stage} .bg-gate-path[fill="#00EE44"]`).count() > 0,
      `${view} transit paths follow the Transit token`);
    assert.equal((await inspect(`${stage} .tl-birth-value.bg-planets-design .bg-planet-act`)).color,
      'rgb(123, 44, 255)', `${view} Design planet column follows the Design token`);
    assert.notEqual((await inspect(`${stage} .tl-transit-column .bg-planet-act`)).color,
      beforeTransitText, `${view} transit planet column follows the Transit text derivative`);
    const legend = `${stage} .tl-legend [data-source="transit"] i`;
    assert.equal((await inspect(legend)).background, 'rgb(0, 238, 68)',
      `${view} legend follows the Transit token`);
  }
  assert.deepEqual(errors, []);
  console.log('Appearance skin: Design/Transit linkage, G/Root independence, details, and live light/dark refresh passed.');
} finally {
  await browser.close();
}
