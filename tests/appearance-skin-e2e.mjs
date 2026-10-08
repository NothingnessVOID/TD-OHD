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
const assertReadable = async selector => {
  const result = await page.locator(selector).first().evaluate(async node => {
    const {contrastRatio,resolveRGB}=await import('/src/lib/source-contrast.js');
    let surface=node;while(surface && getComputedStyle(surface).backgroundColor==='rgba(0, 0, 0, 0)')surface=surface.parentElement;
    return contrastRatio(resolveRGB(getComputedStyle(node).color),resolveRGB(surface?getComputedStyle(surface).backgroundColor:getComputedStyle(document.documentElement).getPropertyValue('--bg')));
  });
  assert.ok(result>=4.5,`${selector} actual contrast ${result}`);
};
const setAppearance = (method, ...args) => page.evaluate(async ({ method, args }) => {
  // Vite may timestamp module URLs after HMR; use the instance loaded by main.
  const moduleUrl = performance.getEntriesByType('resource').map(entry => entry.name)
    .filter(url => new URL(url).pathname === '/src/lib/appearance.js').at(-1) || '/src/lib/appearance.js';
  (await import(moduleUrl))[method](...args);
}, { method, args });

try {
  await page.goto(`${base}/${birth}`);
  await page.locator('#bodygraph-container .bodygraph-svg').waitFor();
  await setAppearance('setTheme', 'light');
  await page.addStyleTag({ content: `
    html[data-center-palette="chakra"] {
      --hd-design: #7B2CFF;
      --hd-transit: #00EE44;
      --hd-center-g: #2468AF;
      --hd-center-root: #AF6835;
    }
  ` });
  await setAppearance('setCustomOverride', 'design', '#7B2CFF');
  await setAppearance('setCustomOverride', 'transit', '#00EE44');
  await setAppearance('setCenterPalette', 'chakra');
  await page.locator('#bodygraph-container .bg-gate-path[fill="#7B2CFF"]').first().waitFor();

  assert.ok(await page.locator('#bodygraph-container .bg-gate-path[fill="#7B2CFF"]').count() > 0,
    'design channels follow the sole Design token');
  await assertReadable('#bodygraph-container .bg-planets-design .bg-planet-act');
  const centerEdge = async key => (await inspect(`#bodygraph-container radialGradient[id$="-cg-${key}"] stop[offset="1"]`)).stopColor;
  assert.equal(await centerEdge('g'), '#6F9E86');
  assert.equal(await centerEdge('root'), '#B8645A');
  assert.notEqual(await centerEdge('head'), '#6F9E86');
  assert.notEqual(await centerEdge('throat'), '#B8645A');

  await page.locator('#bodygraph-container .bg-gate[data-gate="49"] .bg-gate-circle').hover();
  await page.locator('#bodygraph-container .bg-tooltip .bg-tt-design').waitFor();
  await assertReadable('#bodygraph-container .bg-tooltip .bg-tt-design');

  await page.locator('#bodygraph-container .bg-planets-design .bg-planet-row').first().click();
  await page.locator('#gate-detail [data-detail-kind="planet"][data-source="design"]').waitFor();
  assert.equal((await inspect('#gate-detail .planet-detail-card .detail-label')).color, await page.locator('html').evaluate(n=>{const s=document.createElement('span');s.style.color='var(--accent)';n.append(s);const c=getComputedStyle(s).color;s.remove();return c;}));
  await page.locator('#gate-detail [data-planet-gate]').click();
  await assertReadable('#gate-detail .bg-tt-design');
  await page.keyboard.press('Escape');

  await setAppearance('restoreCurrentSkin');
  await setAppearance('setCenterPalette', 'classic');
  await setAppearance('setTheme', 'dark');
  assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).getPropertyValue('--hd-design').trim()), '#E16F60');
  assert.ok(await page.locator('#bodygraph-container .bg-gate-path[fill="#E16F60"]').count() > 0,
    'default-dark Design uses the approved final color and repaints without reload');
  await setAppearance('setTheme', 'light');

  for (const view of ['transits', 'timeline']) {
    await page.goto(`${base}/${birth}&view=${view}`);
    const stage = view === 'transits' ? '#transit-stage' : '#timeline-view';
    await page.locator(`${stage} .bodygraph-svg`).waitFor();
    await setAppearance('restoreCurrentSkin');
    await setAppearance('setCenterPalette', 'classic');
    const beforeTransitText = (await inspect(`${stage} .tl-transit-column .bg-planet-act`)).color;
    await page.addStyleTag({ content: 'html[data-center-palette="chakra"] { --hd-design: #7B2CFF; --hd-transit: #00EE44; }' });
    await setAppearance('setCustomOverride', 'design', '#7B2CFF');
    await setAppearance('setCustomOverride', 'transit', '#00EE44');
    await setAppearance('setCenterPalette', 'chakra');
    assert.ok(await page.locator(`${stage} .bg-gate-path[fill="#00EE44"]`).count() > 0,
      `${view} transit paths follow the Transit token`);
    await assertReadable(`${stage} .tl-birth-value.bg-planets-design .bg-planet-act`);
    const expectedTransitText = await page.evaluate(() => {
      const probe=document.createElement('span');probe.style.color='var(--source-transit-text)';document.body.append(probe);
      const value=getComputedStyle(probe).color;probe.remove();return value;
    });
    assert.equal((await inspect(`${stage} .tl-transit-column .bg-planet-act`)).color,
      expectedTransitText, `${view} transit planet column retains the separately approved Transit text token`);
    const legend = `${stage} .tl-legend [data-source="transit"] i`;
    const expectedLegend = await page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.backgroundColor = 'var(--hd-timeline-transit)';
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    assert.equal((await inspect(legend)).background, expectedLegend,
      `${view} legend uses the unmuted Transit Signal token`);
  }
  assert.deepEqual(errors, []);
  console.log('Appearance skin: Design/Transit linkage, G/Root independence, details, and live light/dark refresh passed.');
} finally {
  await browser.close();
}
