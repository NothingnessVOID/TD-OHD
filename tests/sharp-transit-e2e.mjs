/** Development parity gate: real browser WASM against the shared native Swiss core. */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { chromium } from 'playwright-core';
import { SharpNativeClient, calculateNativeBirth } from '../scripts/lib/sharp-native-client.mjs';
import { calculateTimelineAsync } from '../src/features/transit-timeline/core.js';
import { stateAt, catalog } from '../src/features/transit-timeline/graph-provider.js';
import { adaptSharpTransit } from '../src/lib/chart-engine/sharp-transit-contract.js';

const base = (process.env.E2E_URL || 'http://127.0.0.1:5177').replace(/\/$/, '');
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const native = new SharpNativeClient();
const instants = Array.from({ length: 16 }, (_, index) => 2021 + index)
  .flatMap(year => [`${year}-01-01T00:00:01Z`, `${year}-06-15T12:30:25Z`, `${year}-12-31T23:59:59Z`]);
instants.push('2026-09-23T06:10:48Z', '2026-09-23T06:10:49Z', '2026-11-01T05:30:25Z', '2026-11-01T06:30:25Z');
const fields = ['gate', 'line', 'color', 'tone', 'base'];
function sameActivations(actual, expected, label) {
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `${label}: 13 planets`);
  assert.equal(Object.keys(actual).length, 13);
  for (const [planet, reference] of Object.entries(expected)) {
    for (const field of fields) assert.equal(actual[planet][field], reference[field], `${label}: ${planet}.${field}`);
    assert.ok(Math.abs(actual[planet].longitude - reference.longitude) <= 1e-9, `${label}: ${planet}.longitude`);
  }
}
try {
  const context = await browser.newContext({ locale: 'en-US', timezoneId: 'UTC' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(base);
  const expected = (await native.batch(instants)).map(adaptSharpTransit);
  const initStart = performance.now();
  const first = await page.evaluate(async instant => {
    const { sharpProvider } = await import('/src/lib/chart-engine/sharp-provider.js');
    return sharpProvider.calculateTransitSnapshot(instant);
  }, instants[0]);
  const initMs = performance.now() - initStart;
  sameActivations(first, expected[0].gates, instants[0]);
  const warmStart = performance.now();
  const warm = await page.evaluate(async instant => {
    const { sharpProvider } = await import('/src/lib/chart-engine/sharp-provider.js');
    return sharpProvider.calculateTransitSnapshot(instant);
  }, instants[1]);
  const warmMs = performance.now() - warmStart;
  sameActivations(warm, expected[1].gates, instants[1]);
  const batchStart = performance.now();
  const actual = await page.evaluate(async instants => {
    const { sharpProvider } = await import('/src/lib/chart-engine/sharp-provider.js');
    return sharpProvider.calculateTransitSnapshots(instants);
  }, instants);
  const batchMs = performance.now() - batchStart;
  actual.forEach((value, index) => sameActivations(value, expected[index].gates, instants[index]));
  assert.deepEqual(actual.slice(48, 50).map(value => `${value.moon.gate}.${value.moon.line}`), ['13.6', '49.1']);
  const nativeBirth = await calculateNativeBirth('1990-06-15', 14.5, -6);
  const browserBirth = await page.evaluate(async () => {
    const { sharpProvider } = await import('/src/lib/chart-engine/sharp-provider.js');
    return (await sharpProvider.calculateBirth({ birthDate: '1990-06-15', birthTime: '14:30', timezone: -6 })).chart;
  });
  for (const side of ['design', 'personality']) sameActivations(browserBirth.gates[side], nativeBirth.gates[side], `birth ${side}`);
  assert.equal(browserBirth.variable.notation, nativeBirth.variable.notation);
  assert.deepEqual(browserBirth.channels, nativeBirth.channels);
  assert.deepEqual(pageErrors, []);
  console.log(JSON.stringify({ parity: 'PASS', instants: instants.length, planets: 13, fields: [...fields, 'longitude'], initMs, warmMs, batchMs }));

  // A missing annual index must use browser WASM, not an obsolete astronomy path.
  // One hour includes the frozen Moon gate crossing and bounds this fallback regression check.
  await context.route('**/transit-data/**', route => route.fulfill({ status: 404, body: 'Annual index intentionally unavailable' }));
  const request = { start: Date.parse('2026-09-23T06:00:00Z'), end: Date.parse('2026-09-23T07:00:00Z'),
    natal: { gates: { all: [] }, centers: { definedNames: [] } }, mode: 'transit-only', planet: 'all' };
  const expectedFallback = await calculateTimelineAsync({ ...request,
    catalog: catalog(), states: activations => stateAt(request.natal, activations, request.mode),
    snapshot: async instant => adaptSharpTransit(await native.snapshot(instant)).gates,
    snapshotBatch: async instants => (await native.batch(instants)).map(value => adaptSharpTransit(value).gates) });
  const fallback = await page.evaluate(async request => {
    const { createTimelineClient } = await import('/src/features/transit-timeline/client.js');
    let frames = 0, maxFrameGap = 0, previous = performance.now(), running = true;
    const heartbeat = now => { frames++; maxFrameGap = Math.max(maxFrameGap, now - previous); previous = now; if (running) requestAnimationFrame(heartbeat); };
    requestAnimationFrame(heartbeat);
    const client = createTimelineClient();
    const started = performance.now();
    try {
      const result = await client.calculate(request);
      await new Promise(requestAnimationFrame);
      return { result, frames, maxFrameGap, elapsedMs: performance.now() - started };
    } finally { running = false; client.dispose(); }
  }, request);
  assert.equal(fallback.result.source, 'mixed');
  assert.deepEqual(fallback.result.rows, expectedFallback.rows);
  assert.deepEqual(fallback.result.events, expectedFallback.events);
  assert.deepEqual(fallback.result.gateChanges, expectedFallback.gateChanges);
  assert.ok(fallback.frames >= 2, 'Browser paints during fallback work');
  assert.ok(fallback.maxFrameGap < 1000, 'Bounded fallback does not stall the page for a second');
  console.log(JSON.stringify({ fallback: 'PASS', elapsedMs: fallback.elapsedMs, frames: fallback.frames, maxFrameGap: fallback.maxFrameGap }));

  // An independent context proves unavailable Swiss files fail, without an analytic fallback.
  const missing = await browser.newContext();
  await missing.route('**/engine/ephe/*.se1', route => route.fulfill({ status: 404, body: 'Swiss file intentionally unavailable' }));
  const missingPage = await missing.newPage();
  await missingPage.goto(base);
  const error = await missingPage.evaluate(async () => {
    const { sharpProvider } = await import('/src/lib/chart-engine/sharp-provider.js');
    try { await sharpProvider.calculateTransitSnapshot('2026-01-01T00:00:00Z'); return null; }
    catch (error) { return error.message; }
  });
  assert.match(error || '', /Swiss ephemeris file unavailable/);
  console.log('PASS missing Swiss file rejects browser transit calculation');
  await missing.close();

  const ui = await browser.newContext({ locale: 'en-US', timezoneId: 'America/New_York' });
  const uiPage = await ui.newPage();
  await uiPage.goto(`${base}/?d=1990-06-15&t=14%3A30&tz=-6`);
  await uiPage.locator('#bodygraph-container .bodygraph-svg').waitFor({ timeout: 60000 });
  await uiPage.locator('[data-view="transits"]').click();
  await uiPage.locator('#transit-stage .tl-planet[data-planet="moon"][data-gate]').waitFor();
  // Dispatch changes in one turn so both requests overlap rather than testing two sequential renders.
  await uiPage.evaluate(() => {
    const date = document.getElementById('transit-date');
    const time = document.getElementById('transit-time');
    date.value = '2026-09-23'; time.value = '00:00:01'; date.dispatchEvent(new Event('change'));
    date.value = '2026-09-24'; time.value = '20:30:25'; time.dispatchEvent(new Event('change'));
  });
  const latest = adaptSharpTransit(await native.snapshot('2026-09-25T00:30:25Z')).gates;
  await uiPage.waitForFunction(() => document.querySelector('#transit-stage .tl-moment-date')?.textContent === '2026-09-24'
    && document.querySelector('#transit-stage .tl-moment-time')?.textContent.startsWith('20:30:25'));
  for (const [planet, value] of Object.entries(latest)) assert.equal(await uiPage.locator(`#transit-stage .tl-planet[data-planet="${planet}"] strong`).innerText(), `${value.gate}.${value.line}`);
  await uiPage.evaluate(() => {
    document.getElementById('transit-date').value = '2026-11-01';
    document.getElementById('transit-time').value = '01:30:25';
    document.getElementById('transit-date').dispatchEvent(new Event('change'));
  });
  await uiPage.locator('#transit-choice-label').waitFor({ state: 'visible' });
  const choices = await uiPage.locator('#transit-choice option').evaluateAll(options => options.map(option => option.value));
  assert.deepEqual(choices.map(value => new Date(Number(value)).toISOString()), ['2026-11-01T05:30:25.000Z', '2026-11-01T06:30:25.000Z']);
  await uiPage.locator('#transit-choice').selectOption(choices[1]);
  await uiPage.waitForFunction(() => document.querySelector('#transit-stage .tl-moment-time')?.textContent.includes('UTC-5'));
  const fold = adaptSharpTransit(await native.snapshot('2026-11-01T06:30:25Z')).gates;
  for (const [planet, value] of Object.entries(fold)) assert.equal(await uiPage.locator(`#transit-stage .tl-planet[data-planet="${planet}"] strong`).innerText(), `${value.gate}.${value.line}`);
  await uiPage.locator('#transit-stage .tl-planet[data-planet="moon"]').click();
  await uiPage.locator('#gate-detail:not(.hidden) [data-detail-kind="planet"]').waitFor();
  console.log('PASS rapid transit changes use latest request, IANA DST fold keeps selected instant, planet details open');
  await ui.close();
  await context.close();
} finally {
  await native.close();
  await browser.close();
}
