import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const base = process.env.E2E_URL || 'http://127.0.0.1:5241';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.locator('#birth-entry').waitFor();
  const cases = [
    { a: [59], b: [6], formula: '2–7', created: 2, bridgeA: 'not-applicable', bridgeB: 'not-applicable' },
    { a: [1,8,59,6], b: [20,34], formula: '4–5', created: 0, bridgeA: 'complete', bridgeB: 'not-applicable' },
    { a: [1,8,59,6,13], b: [33], formula: '4–5', created: 0, bridgeA: 'none', bridgeB: 'not-applicable' },
    { a: [1,8,59,6,18,58], b: [20,34], formula: '6–3', created: 0, bridgeA: 'partial', bridgeB: 'not-applicable' },
  ];
  for (const locale of ['en','zh-CN','zh-Hant']) {
    for (const fixture of cases) {
      const result = await page.evaluate(async ({ locale, fixture }) => {
        const { CHANNELS, CENTERS } = await import('/src/lib/human-design/catalog.js');
        const { compareHumanDesign } = await import('/src/lib/human-design/connection.js');
        const { renderConnectionContent } = await import('/src/views/connection.js');
        const { setLocale } = await import('/src/lib/i18n.js');
        setLocale(locale, { persist: false });
        const chart = gates => {
          const channels = CHANNELS.filter(ch => ch.gates.every(gate => gates.includes(gate)));
          return { gates: { all: gates, personality: {}, design: {} }, channels,
            centers: { definedNames: [...new Set(channels.flatMap(ch => ch.centers))] },
            type: { name: 'Generator', strategy: 'To Respond' }, strategy: 'To Respond',
            authority: { name: 'Sacral Authority' }, profile: { numbers: '1/3' }, definition: 'Single Definition' };
        };
        const a = { birth: { name: 'A' }, chart: chart(fixture.a) };
        const b = { birth: { name: 'B' }, chart: chart(fixture.b) };
        const comparison = compareHumanDesign(a.chart, b.chart);
        document.querySelector('#connection-view').classList.remove('hidden');
        renderConnectionContent(comparison, a, b);
        const svg = document.querySelector('#conn-composite svg');
        const nodes = [...svg.querySelectorAll('[data-center-defined]')];
        return { text: document.querySelector('#connection-content').textContent,
          defined: nodes.filter(n => n.dataset.centerDefined === 'true').length,
          created: nodes.filter(n => n.dataset.centerCreated === 'true').length,
          count: nodes.length, centers: Object.keys(CENTERS).length,
          detailCenters: comparison.centerDynamics.filter(c => c.created).map(c => c.center) };
      }, { locale, fixture });
      assert.ok(result.text.includes(fixture.formula), `${locale}: formula ${fixture.formula}`);
      assert.equal(result.count, 9, 'all nine SVG centers carry structural status');
      assert.equal(result.defined, Number(fixture.formula[0]));
      assert.equal(result.created, fixture.created);
      assert.equal(await page.locator('[data-testid="connection-created-count"]').getAttribute('data-count'), String(fixture.created));
      assert.equal(await page.locator('[data-testid="connection-bridging-a"]').getAttribute('data-status'), fixture.bridgeA);
      assert.equal(await page.locator('[data-testid="connection-bridging-b"]').getAttribute('data-status'), fixture.bridgeB);
      assert.equal(await page.locator('[data-testid="connection-center-state"]').count(), 9);
      assert.doesNotMatch(result.text, /natural harmony|spark of attraction|How you decide together|unusually independent pairing/i);
      if (locale !== 'en') assert.doesNotMatch(result.text, /Composite-derived type|Completely open|Not applicable|Fully bridged|Partially bridged|createdCenterCount|electromagneticCount|bridgeStatus|not-applicable/);
      for (const center of result.detailCenters) {
        await page.locator(`#conn-composite [data-center="${center}"]`).first().dispatchEvent('click');
        await page.locator('#conn-detail:not(.hidden)').waitFor();
        assert.match(await page.locator('#conn-detail').innerText(), /6[–-]59|59[–-]6/);
        await page.locator('#conn-detail .gate-detail-close').click();
      }
    }
  }
  // Exercise the real astronomical chart and manual partner flow, separately
  // from the synthetic topology fixtures (no online geocoding required).
  await page.goto(`${base}/?d=2000-05-10&t=12:30&tz=8`);
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  await page.locator('.nav-link[data-view="connection"]').click();
  await page.locator('#conn-name').fill('Partner');
  await page.locator('#conn-date').fill('1985-03-20');
  await page.locator('#conn-time').fill('08:00');
  await page.locator('#conn-place .ps-toggle').click();
  await page.locator('#conn-place .ps-manual').fill('8');
  await page.locator('#conn-calculate').click();
  await page.locator('[data-testid="connection-center-formula"]').waitFor({ timeout: 120000 });
  assert.equal(await page.locator('#conn-composite [data-center-defined]').count(), 9);
  assert.equal(await page.locator('[data-testid="connection-center-state"]').count(), 9);
  assert.equal(await page.locator('[data-testid="connection-bridging-a"]').count(), 1);
  assert.equal(await page.locator('[data-testid="connection-bridging-b"]').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Connection Phase 1: real topology fixtures, nine SVG center states, Created details and three languages passed.');
} finally { await browser.close(); }
