/** Real UI/static-host smoke. No application source imports or live geocoding. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

const base = (process.env.E2E_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1380, height: 1000 }, locale: 'en-US' });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('ohd-language', 'en'));
const errors = [];
const engineRequests = [];
const engineResponses = [];
const annualResponses = [];
const assetFailures = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url || ''}`.trim()); });
page.on('response', response => {
  const path = new URL(response.url()).pathname;
  if (path.includes('/transit-data/')) annualResponses.push({ url: response.url(), status: response.status() });
  if (new URL(response.url()).origin === new URL(base).origin && response.status() >= 400) assetFailures.push(`${response.status()} ${path}`);
});
page.on('request', request => { if (new URL(request.url()).pathname.includes('/engine/')) engineRequests.push(request.url()); });
page.on('response', response => { if (new URL(response.url()).pathname.includes('/engine/')) engineResponses.push({ url: response.url(), status: response.status(), mime: response.headers()['content-type'] }); });
page.on('requestfailed', request => { if (new URL(request.url()).pathname.includes('/engine/')) errors.push(`Engine request failed: ${request.url()} ${request.failure()?.errorText}`); });

async function head(url, mime) {
  const response = await context.request.head(url);
  assert.equal(response.status(), 200, `${url} HTTP 200`);
  assert.match(response.headers()['content-type'] || '', mime, `${url} MIME`);
}

try {
  const homepage = await page.goto(`${base}/`, { timeout: 60000 });
  assert.equal(homepage.status(), 200, 'Homepage HTTP 200');
  await page.locator('#birth-form').waitFor();
  assert.equal(engineRequests.length, 0, 'Homepage keeps the birth engine lazy');
  const resourceUrls = await page.evaluate(() => ({
    scripts: [...document.querySelectorAll('script[src]')].map(node => node.src).filter(url => new URL(url).origin === location.origin && !url.includes('/@vite/client')),
    styles: [...document.querySelectorAll('link[rel="stylesheet"][href]')].map(node => node.href).filter(url => new URL(url).origin === location.origin)
  }));
  assert.ok(resourceUrls.scripts.length && resourceUrls.styles.length, 'HTML references JS and CSS');
  assert.ok(resourceUrls.scripts.every(url => !new URL(url).pathname.startsWith('/src/')), 'Static production bundle, no application source imports');
  await head(`${base}/`, /text\/html/);
  await head(resourceUrls.scripts[0], /(?:javascript|ecmascript)/);
  await head(resourceUrls.styles[0], /text\/css/);

  await page.locator('#birth-name').fill('Deployment smoke A');
  await page.locator('#birth-date').fill('1990-06-15');
  await page.locator('#birth-time').fill('14:30');
  await page.locator('#manual-tz-toggle').click();
  await page.locator('#manual-tz').fill('-6');
  await page.locator('#birth-form button[type="submit"]').click();
  await page.locator('#bodygraph-container .bodygraph-svg').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('#bodygraph-container .bg-variable-arrow').count(), 4, 'Birth chart has four arrows');
  for (const label of ['Type', 'Authority', 'Profile', 'Variable']) {
    const item = page.locator('#foundation-panel .foundation-item').filter({ has: page.locator('.label', { hasText: new RegExp(`^${label}$`) }) });
    const value = await item.locator('.value').innerText();
    assert.ok(value.trim() && value.trim() !== '—', `${label} is present`);
    if (label === 'Profile') assert.match(value, /[1-6]\/[1-6]/);
    if (label === 'Variable') assert.equal(await item.locator('[data-variable]').count(), 4, 'Foundation Variable shows four semantic letters');
  }
  await page.locator('.panel-tab[data-panel="variable"]').click();
  assert.equal(await page.locator('#panel-content .arrow-card').count(), 4, 'Variable panel has four semantic cards');
  assert.equal(await page.locator('.variable-notation').count(), 0, 'Variable panel does not show notation code');
  assert.match(await page.locator('.foundation-variable-notation').innerText(), /P[LR]{2}\s+D[LR]{2}/, 'Top summary preserves standard Variable notation');
  assert.doesNotMatch(await page.locator('#panel-content').innerText(), /P[LR]{2}\s+D[LR]{2}/, 'Detailed explanation does not acquire notation code');
  assert.deepEqual(await page.locator('.foundation-variable-arrows [data-variable]').evaluateAll(nodes => nodes.map(node => node.dataset.variable)), ['motivation', 'perspective', 'determination', 'environment']);
  for (const key of ['determination', 'environment', 'motivation', 'perspective']) {
    const source = key === 'determination' || key === 'environment' ? 'design' : 'personality';
    const graph = page.locator(`#bodygraph-container .bg-variable-arrow[data-variable="${key}"]`);
    const summary = page.locator(`.foundation-variable-arrows [data-variable="${key}"]`);
    const card = page.locator(`#panel-content .arrow-card[data-variable="${key}"] .variable-direction-symbol`);
    const symbol = await graph.locator('.bg-variable-symbol').innerText();
    const color = await graph.locator('.bg-variable-symbol').evaluate(node => getComputedStyle(node).color);
    assert.equal(await summary.getAttribute('data-source'), source);
    assert.equal(await summary.innerText(), symbol === '←' ? 'L' : 'R', `${key} foundation arrow matches graph`);
    assert.equal(await card.innerText(), symbol, `${key} panel arrow matches graph`);
    assert.equal(await summary.evaluate(node => getComputedStyle(node).color), color, `${key} foundation source color matches graph`);
    assert.equal(await card.evaluate(node => getComputedStyle(node).color), color, `${key} panel source color matches graph`);
  }
  await page.locator('.panel-tab[data-panel="cross"]').click();
  await page.locator('#panel-content .panel-title').filter({ hasText: 'Gene Keys' }).waitFor();
  const geneKeyValues = await page.locator('#panel-content .foundation-item .value').allTextContents();
  assert.equal(geneKeyValues.filter(value => /^Key \d+\.[1-6]$/.test(value.trim())).length, 4, 'Gene Keys activation spheres and lines rendered from the birth chart');
  console.log('Deployment smoke: Gene Keys activation sequence PASS');
  const runtimeRequestsBefore = engineRequests.filter(url => url.includes('/_framework/'));
  assert.ok(runtimeRequestsBefore.some(url => /dotnet\.native.*\.wasm(?:\?|$)/.test(url)), '.NET native WASM loaded');
  assert.ok(runtimeRequestsBefore.some(url => /SharpChartEngine.*\.wasm(?:\?|$)/.test(url)), 'Main assembly WASM loaded');
  console.log('Deployment smoke: homepage lazy engine, first actual birth, Type/Authority/Profile/Variable PASS');

  await page.locator('.nav-link[data-view="connection"]').click();
  await page.locator('#conn-name').fill('Deployment smoke B');
  await page.locator('#conn-date').fill('1985-03-20');
  await page.locator('#conn-time').fill('08:00');
  await page.locator('#conn-place .ps-toggle').click();
  await page.locator('#conn-place .ps-manual').fill('0');
  await page.locator('#conn-calculate').click();
  await page.locator('#conn-composite .bodygraph-svg').waitFor({ timeout: 60000 });
  await page.locator('#connection-content .foundation-item').first().waitFor();
  assert.deepEqual(engineRequests.filter(url => url.includes('/_framework/')), runtimeRequestsBefore, 'Second actual birth reuses WASM/runtime without refetch');
  assert.ok(await page.locator('.composite-legend').isVisible(), 'Connection legend visible');
  console.log('Deployment smoke: second actual birth and Connection reuse existing runtime PASS');

  await page.locator('.nav-link[data-view="team"]').click();
  for (const [index, date] of ['1992-11-02', '1985-03-20', '1990-08-10'].entries()) {
    await page.locator('#add-member').click();
    const row = page.locator('#team-members .team-member-row').nth(index);
    await row.locator('.team-name').fill(`Synthetic smoke team ${index + 1}`);
    await row.locator('.team-date').fill(date);
    await row.locator('.team-time').fill('12:00');
    await row.locator('.team-place .ps-toggle').click();
    await row.locator('.team-place .ps-manual').fill('0');
  }
  await page.locator('#team-calculate').click();
  await page.locator('#team-content .team-summary').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('#team-content .team-channel').count(), 6, 'Six Penta channel coverage rows rendered');
  console.log('Deployment smoke: Team manual inputs and Penta structure PASS');

  await page.locator('.nav-link[data-view="transits"]').click();
  await page.locator('#transit-stage .bodygraph-svg').waitFor({ timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#transit-stage .tl-planet .bg-planet-act')?.textContent.trim());
  assert.equal(await page.locator('#transit-stage .bg-variable-arrow').count(), 0, 'Transit graph does not show natal Variable arrows');
  const nowTransitSun = await page.locator('#transit-stage .tl-planet[data-planet="sun"] .bg-planet-act').innerText();
  await page.locator('#transit-date').fill('2025-12-31');
  await page.locator('#transit-date').dispatchEvent('change');
  await page.waitForFunction(() => document.querySelector('#transit-stage .tl-moment-date')?.textContent === '2025-12-31', null, { timeout: 60000 });
  assert.ok((await page.locator('#transit-stage .tl-planets').innerText()).trim());
  assert.notEqual(await page.locator('#transit-stage .tl-planet[data-planet="sun"] .bg-planet-act').innerText(), nowTransitSun, 'Custom date refreshes actual transit activations');
  console.log('Deployment smoke: Transit now and custom UTC instant PASS');

  await page.locator('.nav-link[data-view="timeline"]').click();
  const readyTimeline = async () => {
    await page.locator('#timeline-view .bodygraph-svg').waitFor({ timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#timeline-view .tl-planet .bg-planet-act')?.textContent.trim(), null, { timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false' &&
      document.querySelector('#timeline-view .tl-calculation')?.hidden && document.querySelectorAll('#timeline-view .tl-row').length > 0,
      null, { timeout: 120000 });
    assert.equal(await page.locator('#timeline-view .bg-variable-arrow').count(), 0, 'Timeline graph does not show natal Variable arrows');
    assert.ok(await page.locator('#timeline-view .tl-bar').count() > 0, 'Timeline contains activation intervals');
  };
  await readyTimeline();
  const performanceResults = [];
  for (const preset of ['30', '90', '180']) {
    const started = Date.now();
    await page.locator('#timeline-view [data-field="span"]').selectOption(preset);
    await readyTimeline();
    const range = await page.locator('#timeline-view .tl-table').evaluate(node => ({ start: Number(node.dataset.calculatedStart), end: Number(node.dataset.calculatedEnd) }));
    assert.ok(range.end - range.start >= (Number(preset) - 1) * 86400000, `${preset}-day full range calculated`);
    performanceResults.push({ preset, elapsedMs: Date.now() - started });
  }
  const annualReads = () => annualResponses.filter(response => !response.url.endsWith('/manifest.json')).length;
  const loadedBeforeRepeat = annualReads();
  await page.locator('#timeline-view [data-field="span"]').selectOption('30');
  await readyTimeline();
  assert.equal(annualReads(), loadedBeforeRepeat, 'Repeated range reuses annual cache');
  await page.locator('#timeline-view [data-field="date"]').fill('2025-12-31');
  await page.locator('#timeline-view [data-field="date"]').dispatchEvent('change');
  await readyTimeline();
  const crossYear = await page.locator('#timeline-view .tl-table').evaluate(node => ({ start: Number(node.dataset.calculatedStart), end: Number(node.dataset.calculatedEnd) }));
  assert.equal(new Date(crossYear.start).getUTCFullYear(), 2025);
  assert.equal(new Date(crossYear.end).getUTCFullYear(), 2026);
  for (const year of [2021, 2026, 2036]) {
    await page.locator('#timeline-view [data-field="date"]').fill(`${year}-06-15`);
    await page.locator('#timeline-view [data-field="date"]').dispatchEvent('change');
    await readyTimeline();
    const range = await page.locator('#timeline-view .tl-table').evaluate(node => ({ start: Number(node.dataset.calculatedStart), end: Number(node.dataset.calculatedEnd) }));
    assert.equal(new Date(range.start).getUTCFullYear(), year, `${year} cached timeline start`);
    assert.equal(new Date(range.end).getUTCFullYear(), year, `${year} cached timeline end`);
    assert.ok(annualResponses.some(response => response.url.includes(`/${year}.`) && response.status === 200), `${year} Sharp annual file loaded`);
  }
  assert.ok(annualResponses.every(response => response.status === 200), 'Annual manifest and data served successfully');
  console.log(`Deployment smoke: Timeline 30/90/180 days, cached 2021/2026/2036 ranges and 2025/2026 boundary PASS ${JSON.stringify(performanceResults)}`);

  await page.locator('.nav-link[data-view="library"]').click();
  await page.locator('#reference-count').waitFor();
  const referenceCount = Number((await page.locator('#reference-count').innerText()).match(/^\d+/)?.[0]);
  assert.ok(referenceCount >= 128, `Reference catalog has at least the original 128 entries, got ${referenceCount}`);
  assert.ok(await page.locator('#reference-results .reference-result').count() > 0);
  console.log('Deployment smoke: Reference PASS');

  assert.ok(engineResponses.length > 0);
  for (const response of engineResponses) assert.ok(response.status >= 200 && response.status < 400, `Engine HTTP ${response.status}: ${response.url}`);
  const native = engineResponses.find(response => /dotnet\.native.*\.wasm(?:\?|$)/.test(response.url));
  const assembly = engineResponses.find(response => /SharpChartEngine.*\.wasm(?:\?|$)/.test(response.url));
  for (const response of [native, assembly]) {
    assert.ok(response, 'Required engine resource loaded');
    assert.match(response.mime || '', /application\/wasm/, 'WASM served with correct MIME');
    await head(response.url, /application\/wasm/);
  }
  const ephemerisHashes = {
    'sepl_18.se1': 'ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66',
    'semo_18.se1': '1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7'
  };
  for (const [file, hash] of Object.entries(ephemerisHashes)) {
    const response = await context.request.get(`${base}/engine/ephe/${file}`);
    assert.equal(response.status(), 200, `${file} HTTP 200`);
    assert.doesNotMatch(response.headers()['content-type'] || '', /text\/html/, 'Ephemeris path serves a file, not SPA fallback');
    assert.equal(createHash('sha256').update(await response.body()).digest('hex'), hash, `${file} pinned SHA256`);
  }
  assert.deepEqual(assetFailures, [], 'No failed static assets or annual data');
  assert.deepEqual(errors, [], 'No page/runtime/console/request errors');
  console.log('Deployment smoke: HTML/JS/CSS/WASM/assembly/Swiss assets, pinned hashes and browser errors PASS');
} finally {
  await context.close();
  await browser.close();
}
