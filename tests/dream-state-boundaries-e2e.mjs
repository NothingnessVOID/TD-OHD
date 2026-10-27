/**
 * Sleep chart — state-boundary races, end-to-end.
 *
 *   npx vite --host 127.0.0.1 --port 10001 --strictPort     # one terminal
 *   E2E_URL=http://127.0.0.1:10001 node tests/dream-state-boundaries-e2e.mjs
 *
 * Three failures this guards, all of them "the page showed a chart for the wrong
 * state" rather than a calculation error:
 *
 * 1. A comparison picked as A+B bound itself to whoever was loaded when B's
 *    waking chart finished solving, so switching A → C mid-solve produced a C+B
 *    composite nobody asked for.
 * 2. An unresolvable wall time (a DST gap) was turned into `undefined` and then
 *    into `Date.now()` by the calculator, so re-entering the page silently showed
 *    the current sky, and an older solve could land over an invalid pick.
 * 3. Person B was remembered as a chart plus a name, with no identity, so deleting
 *    or editing B left B's sleeping chart on screen next to the current person.
 *
 * Every wait is on a promise the test itself releases (a gate in the intercepted
 * module), never a sleep, so the interleaving is the one under test rather than
 * whatever the machine happened to do.
 */

import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:10001';
const CHROME = process.env.CHROME_PATH;
const CHANNEL = process.env.CHROME_CHANNEL || 'chromium';

const people = [
  // Clearly fictional people; distinct birth data so no chart cache is shared.
  { id: 'dream-state-a', name: 'Fictional A', birthDate: '1990-03-14', birthTime: '06:30', timeUnknown: false, location: { timezone: 0 } },
  { id: 'dream-state-b', name: 'Fictional B', birthDate: '1985-09-02', birthTime: '14:00', timeUnknown: false, location: { timezone: 0 } },
  { id: 'dream-state-c', name: 'Fictional C', birthDate: '2001-11-21', birthTime: '21:15', timeUnknown: false, location: { timezone: 0 } }
];
const A = 'dream-state-a';
const B = 'dream-state-b';
const C = 'dream-state-c';
const byName = name => people.find(person => person.name === name);

let failures = 0;
const ok = name => console.log(`✔ ${name}`);
const fail = (name, error) => { failures++; console.error(`✖ ${name}\n  ${error?.stack || error}`); };
async function check(name, fn) {
  try { await fn(); ok(name); } catch (error) { fail(name, error); }
}

/**
 * Intercept the two calculation modules and give them a release gate.
 *
 * `computeChart()` solves person B's waking chart and `computeDreamChart()` solves
 * a sleeping one; both are awaited by the view under test, so holding either open
 * is exactly the window the races live in. The gate is armed from the test and
 * reports when it is reached, which is what makes "the solve is really in flight
 * right now" an observed fact instead of an assumption.
 */
async function installGates(page) {
  const gate = `
    async function __dreamTestGate(name, key) {
      const test = globalThis.__dreamTest;
      if (!test || !test.armed || test.armed.name !== name) return;
      if (test.armed.key !== undefined && test.armed.key !== key) return;
      test.armed = null;
      test.reached.push(key === undefined ? name : name + ':' + key);
      await (test.releasePromise ||= new Promise(resolve => { test.releaseGate = resolve; }));
      test.releasePromise = null;
      test.releaseGate = null;
    }`;
  let intercepted = 0;

  await page.route(url => url.pathname === '/src/lib/chartdata.js', async route => {
    const response = await route.fetch();
    const original = await response.text();
    const declaration = 'async function computeChart(birth) {';
    assert.equal(original.split(declaration).length - 1, 1, 'instrument exactly one computeChart declaration');
    const source = original.replace(declaration, `${gate}
    async function computeChart(birth) {
      await __dreamTestGate('computeChart', birth?.name);
      return computeChartOriginal(birth);
    }
    async function computeChartOriginal(birth) {`);
    assert.notEqual(source, original, 'chartdata instrumentation must take effect');
    intercepted++;
    await route.fulfill({ response, body: source });
  });

  await page.route(url => url.pathname === '/src/lib/dream-chart.js', async route => {
    const response = await route.fetch();
    const original = await response.text();
    const declaration = 'export async function computeDreamChart(chart, options = {}) {';
    assert.equal(original.split(declaration).length - 1, 1, 'instrument exactly one computeDreamChart declaration');
    const source = original.replace(declaration, `${gate}
    export async function computeDreamChart(chart, options = {}) {
      await __dreamTestGate('computeDreamChart');
      return computeDreamChartOriginal(chart, options);
    }
    async function computeDreamChartOriginal(chart, options = {}) {`);
    assert.notEqual(source, original, 'dream-chart instrumentation must take effect');
    intercepted++;
    await route.fulfill({ response, body: source });
  });

  return () => intercepted;
}

async function arm(page, name, key) {
  await page.evaluate(({ name, key }) => {
    globalThis.__dreamTest ||= { reached: [] };
    globalThis.__dreamTest.armed = { name, key };
  }, { name, key });
}

const reached = page => page.evaluate(() => globalThis.__dreamTest?.reached || []);
const release = page => page.evaluate(() => globalThis.__dreamTest?.releaseGate?.());

/** Wait until the armed gate has actually been entered — the solve is in flight. */
async function waitForGate(page, label) {
  await page.waitForFunction(expected => (globalThis.__dreamTest?.reached || []).includes(expected), label,
    { timeout: 60000 });
}

/**
 * Import a module from the page's own module graph.
 *
 * Vite appends `?t=<timestamp>` to a module URL once an HMR round has touched it,
 * and a bare `import('/src/lib/people.js')` then loads a *second* instance with its
 * own listener set — the app's subscribers would never hear the save. Resolving the
 * URL the page actually loaded keeps one instance, which is the whole point of
 * driving the real people store instead of a stub.
 */
async function moduleUrl(page, pathname) {
  return page.evaluate(pathname => {
    const entry = performance.getEntriesByType('resource')
      .find(item => new URL(item.name).pathname === pathname);
    return entry ? entry.name : pathname;
  }, pathname);
}

/** Save a person through the page's live store, so its subscribers hear it. */
async function savePersonInPage(page, id, patch) {
  const url = await moduleUrl(page, '/src/lib/people.js');
  await page.evaluate(async ({ url, id, patch }) => {
    const people = await import(url);
    people.savePerson({ ...people.birthFromPerson(people.getPerson(id)), ...patch });
  }, { url, id, patch });
}

/** Delete a person through the page's live store. */
async function deletePersonInPage(page, id) {
  const url = await moduleUrl(page, '/src/lib/people.js');
  await page.evaluate(async ({ url, id }) => {
    const people = await import(url);
    people.deletePerson(id);
  }, { url, id });
}

/** Switch the interface language the way the switcher does. */
async function setLocaleInPage(page, locale) {
  const url = await moduleUrl(page, '/src/lib/i18n.js');
  await page.evaluate(async ({ url, locale }) => {
    const i18n = await import(url);
    i18n.setLocale(locale);
  }, { url, locale });
}

const frames = page => page.evaluate(() => new Promise(resolve =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))));

const statusText = page => page.$eval('#dream-status', node => node.textContent.trim());
const compareLabel = page => page.$eval('#dream-compare', node => node.textContent.trim());
const compositeHead = page => page.$$eval('.dream-compare-head', nodes => nodes.map(node => node.textContent.trim()));

/**
 * Wait for the toolbar status to say something, not for a fixed delay.
 *
 * The status is written *after* the redraw that replaced the composite (that redraw
 * clears the line), so it appears one microtask later than the DOM observation the
 * caller made before it. Polling the text is the honest wait for that ordering.
 */
async function waitStatus(page, pattern) {
  await page.waitForFunction(source => new RegExp(source, 'i').test(document.getElementById('dream-status')?.textContent || ''),
    pattern.source, { timeout: 30000 });
  return statusText(page);
}

const browser = await chromium.launch({
  ...(CHROME ? { executablePath: CHROME } : { channel: CHANNEL }),
  headless: true
});

/** A page whose library holds the three fictional people and starts on A. */
async function openDream({ timezoneId = 'UTC', locale = 'en-US' } = {}) {
  const context = await browser.newContext({ viewport: { width: 1380, height: 1000 }, timezoneId, locale });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  // The gates must be installed before the first navigation: after that the modules
  // are already loaded and no request would reach the route.
  const intercepted = await installGates(page);
  await page.addInitScript(({ key, people, startId }) => {
    localStorage.setItem('ohd-language', 'en');
    localStorage.setItem(key, JSON.stringify(people));
    localStorage.setItem('ohd-last-person-id', startId);
  }, { key: PROFILE_STORAGE_KEY, people, startId: people[0].id });
  await page.goto(BASE);
  // `view=dream` in the URL only opens the page on the shared-link boot path; the
  // returning-visitor path loads the last person and stays on the chart. Opening the
  // page through the nav mirrors what a reader does and works on both paths.
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  await page.locator('.nav-link[data-view="dream"]').click();
  await page.waitForSelector('#dream-content .dream-type-strip', { timeout: 120000 });
  return { context, page, errors, intercepted };
}

try {
  /* ------------------------------------------------------------------ *
   * 1. A → C while A+B is still being solved.
   * ------------------------------------------------------------------ */
  {
    const { context, page, errors, intercepted } = await openDream();
    try {
      await check('a comparison picked for A still belongs to A when B solves slowly', async () => {
        await arm(page, 'computeChart', 'Fictional B');
        await page.click('#dream-compare');
        await page.locator(`[data-add-person="${B}"]`).click();
        await waitForGate(page, 'computeChart:Fictional B');

        // A moves to C while B's waking chart is still solving. This is the
        // interleaving the original code bound B to: it read the loaded chart
        // *after* the await instead of remembering which one the pick started from.
        await page.locator('#people-switcher').selectOption(C);
        await page.waitForFunction(() => document.querySelector('#type-banner')?.textContent.includes('Fictional C'));
        await release(page);
        // Two frames after release is enough for the stale solve to resolve and be
        // dropped or drawn; it is not a timeout budget.
        await frames(page);
        await frames(page);

        assert.deepEqual(await compositeHead(page), [],
          `a composite was drawn for the wrong pair: ${JSON.stringify(await compositeHead(page))}`);
        assert.equal(await compareLabel(page), 'Compare with another person',
          'the toolbar still offers "change the other person" for a pair that does not exist');

        // Returning to the page shows C alone, not a pair.
        await page.locator('.nav-link[data-view="dream"]').click();
        await page.waitForSelector('#dream-content .dream-type-strip');
        await frames(page);
        assert.deepEqual(await compositeHead(page), [], 'the dream page reopened into a composite');
        const striplabels = await page.$eval('#dream-content .dream-type-strip', node => node.textContent);
        assert.ok(striplabels.includes('Fictional C') || !/Fictional [AB]/.test(striplabels),
          `the reopened page did not show C's own sleep chart: ${striplabels.slice(0, 120)}`);
        assert.deepEqual(errors, []);
      });

      await check('the interception actually ran the instrumented modules', async () => {
        assert.ok(intercepted() >= 2, 'the running chart modules were not intercepted');
        assert.deepEqual(await reached(page), ['computeChart:Fictional B']);
      });    } finally { await context.close(); }
  }

  /* ------------------------------------------------------------------ *
   * 2. B edited, renamed, deleted while the composite is on screen.
   * ------------------------------------------------------------------ */
  {
    const { context, page, errors } = await openDream();
    const pick = async (name, id = B) => {
      await page.click('#dream-compare');
      await page.locator(`[data-add-person="${id}"]`).click();
      await page.waitForFunction(expected => document.querySelector('.dream-compare-head')?.textContent.includes(expected),
        name);
    };
    const savePerson = (id, patch) => savePersonInPage(page, id, patch);
    try {
      await check('renaming B keeps the pair and shows the new name', async () => {
        await pick('Fictional B');
        assert.match((await compositeHead(page))[0], /Fictional B/);
        await savePerson(B, { name: 'Fictional B Renamed' });
        await page.waitForFunction(() => document.querySelector('.dream-compare-head')?.textContent.includes('Fictional B Renamed'));
        const head = (await compositeHead(page))[0];
        assert.match(head, /Fictional A/);
        assert.match(head, /Fictional B Renamed/);
      });

      await check('editing B drops the composite instead of leaving B behind under a current name', async () => {
        // Birth data is what B's sleeping chart was solved from, so a change to it
        // means the pair on screen describes nobody.
        await savePerson(B, { birthTime: '03:15' });
        await page.waitForFunction(() => !document.querySelector('.dream-compare-head'));
        const status = await waitStatus(page, /birth data changed/i);
        assert.deepEqual(await compositeHead(page), []);
        assert.equal(await compareLabel(page), 'Compare with another person');
        assert.match(status, /birth data changed/i, `status after the edit: ${status}`);
        // The reader's own sleep chart is back, and it is A's.
        await page.waitForSelector('#dream-content .dream-type-strip');
      });

      await check('picking B again works after an edit', async () => {
        await pick('Fictional B Renamed');
        assert.match((await compositeHead(page))[0], /Fictional B Renamed/);
      });

      await check('deleting B drops the composite and says why', async () => {
        await deletePersonInPage(page, B);
        await page.waitForFunction(() => !document.querySelector('.dream-compare-head'));
        const status = await waitStatus(page, /no longer in your saved charts/i);
        assert.deepEqual(await compositeHead(page), []);
        assert.match(status, /no longer in your saved charts/i, `status after the delete: ${status}`);
        await page.waitForSelector('#dream-content .dream-type-strip');
        assert.deepEqual(errors, []);
      });
    } finally { await context.close(); }
  }

  /* ------------------------------------------------------------------ *
   * 3. An impossible wall time, then re-entry, then a valid moment.
   * ------------------------------------------------------------------ */
  {
    // Europe/Berlin springs forward at 02:00 on 2026-03-29, so 02:30 that morning
    // does not exist on the wall clock — the control's own gap case.
    const { context, page, errors } = await openDream({ timezoneId: 'Europe/Berlin' });
    const setMoment = (date, time) => page.evaluate(({ date, time }) => {
      const dateInput = document.getElementById('dream-transit-date');
      const timeInput = document.getElementById('dream-transit-time');
      dateInput.value = date;
      timeInput.value = time;
      timeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, { date, time });
    try {
      await check('an invalid moment evicts an older solve instead of letting it land', async () => {
        // A valid request is in flight when the reader picks an impossible time.
        await arm(page, 'computeDreamChart');
        await setMoment('2026-02-03', '12:00');
        await waitForGate(page, 'computeDreamChart');

        await setMoment('2026-03-29', '02:30');
        await page.waitForSelector('#dream-content .dream-moment-invalid');
        await release(page);
        await frames(page);
        await frames(page);
        // The stale solve finished after the invalid pick; it must not paint over it.
        assert.equal(await page.$$eval('#dream-content .dream-type-strip', nodes => nodes.length), 0,
          'a superseded solve drew an overlay over an invalid moment');
        assert.equal(await page.$$eval('#dream-content .dream-moment-invalid', nodes => nodes.length), 1);
      });

      await check('re-entering the page does not default an invalid moment to "now"', async () => {
        await page.locator('.nav-link[data-view="chart"]').click();
        await page.locator('.nav-link[data-view="dream"]').click();
        await page.waitForSelector('#dream-content .dream-moment-invalid');
        await frames(page);
        assert.equal(await page.$$eval('#dream-content .dream-type-strip', nodes => nodes.length), 0,
          'the page fell back to the current sky after re-entry');
        assert.equal(await page.$$eval('#dream-content .dream-provenance', nodes => nodes.length), 0);
        // A language change redraws from the same state and must not resurrect "now".
        await setLocaleInPage(page, 'zh-CN');
        await frames(page);
        assert.equal(await page.$$eval('#dream-content .dream-type-strip', nodes => nodes.length), 0,
          'a language redraw turned the invalid moment into the current sky');
        await setLocaleInPage(page, 'en');
      });

      await check('a valid moment after an invalid one restores the overlay at that moment', async () => {
        await setMoment('2026-03-29', '04:30');
        await page.waitForSelector('#dream-content .dream-type-strip', { timeout: 120000 });
        assert.equal(await page.$$eval('#dream-content .dream-moment-invalid', nodes => nodes.length), 0);
        // The overlay must be the chosen instant, not the current sky: read the
        // resolved instant from the control and compare it with the strip's text.
        const iso = await page.evaluate(() => {
          const status = document.getElementById('dream-transit-status').textContent;
          return (status.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/) || [])[0] || null;
        });
        assert.ok(iso, 'the control did not report the resolved instant');
        const expected = await page.evaluate(instant => new Intl.DateTimeFormat(undefined,
          { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant)), iso);
        const strip = await page.$eval('#dream-content .dream-type-strip', node => node.textContent);
        assert.ok(strip.includes(expected), `the overlay is not at ${expected}: ${strip.slice(0, 200)}`);
        assert.deepEqual(errors, []);
      });
    } finally { await context.close(); }
  }
  /* ------------------------------------------------------------------ *
   * 4. A single-design solve still in flight when the composite opens.
   *
   * Single-design and comparison solves are numbered by different counters, so a
   * single solve whose moment has not changed is not displaced by merely opening a
   * composite. If its landing guard only checks its own counter it paints over the
   * composite that arrived first.
   * ------------------------------------------------------------------ */
  {
    const { context, page, errors } = await openDream();
    try {
      await check('a slow single-design solve cannot paint over a composite that opened first', async () => {
        // A valid moment change starts a single-design solve and holds it open.
        await arm(page, 'computeDreamChart');
        await page.evaluate(() => {
          const time = document.getElementById('dream-transit-time');
          time.value = '12:00:00';
          time.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await waitForGate(page, 'computeDreamChart');

        // While it is held, pick B. The composite solves and draws on its own gate.
        await page.evaluate(() => { globalThis.__dreamTest.armed = null; });
        await page.click('#dream-compare');
        await page.locator(`[data-add-person="${B}"]`).click();
        await page.waitForFunction(() => !!document.querySelector('.dream-compare-head'));

        // Now let the superseded single solve finish. It must not draw over the pair.
        await release(page);
        await frames(page);
        await frames(page);
        assert.equal(await page.$$eval('#dream-content .dream-compare-head', nodes => nodes.length), 1,
          'the composite was replaced by a stale single-design solve');
        assert.equal(await page.$$eval('#dream-content .dream-type-strip', nodes => nodes.length), 0,
          'a stale single-design chart is drawn on top of the composite');
        assert.deepEqual(errors, []);
      });
    } finally { await context.close(); }
  }

  /* ------------------------------------------------------------------ *
   * 5. Main person switched while the composite is on screen.
   *
   * `samePairIsCurrent()` is handed the `current` its caller captured, so it can
   * only catch a main-person change if something else invalidates the pair first.
   * The assertion is about the *outcome* (the old pair is gone, the new person's
   * own sleep chart is what is on screen), not about which guard caught it.
   * ------------------------------------------------------------------ */
  {
    const { context, page, errors } = await openDream();
    try {
      await check('switching the main person while a composite is shown drops the old pair', async () => {
        await page.click('#dream-compare');
        await page.locator(`[data-add-person="${B}"]`).click();
        await page.waitForFunction(() => !!document.querySelector('.dream-compare-head'));

        await page.locator('#people-switcher').selectOption(C);
        await page.waitForFunction(() => document.querySelector('#type-banner')?.textContent.includes('Fictional C'));
        // Re-entering the page is the read that would surface a surviving pair.
        await page.locator('.nav-link[data-view="dream"]').click();
        await page.waitForSelector('#dream-content .dream-type-strip');
        await frames(page);
        assert.deepEqual(await compositeHead(page), [],
          `the old pair survived the main-person switch: ${JSON.stringify(await compositeHead(page))}`);
        assert.equal(await compareLabel(page), 'Compare with another person');
        assert.deepEqual(errors, []);
      });
    } finally { await context.close(); }
  }

  /* ------------------------------------------------------------------ *
   * 6. Person B deleted while their waking chart is still solving.
   *
   * Nothing owns the pair yet at that point, so the change listener cannot answer:
   * the request itself has to notice that the person it was solved for is gone,
   * instead of freezing the page on "Computing both sleep charts…".
   * ------------------------------------------------------------------ */
  {
    const { context, page, errors } = await openDream();
    try {
      await check('deleting B mid-solve says so instead of freezing on Computing', async () => {
        await arm(page, 'computeChart', 'Fictional B');
        await page.click('#dream-compare');
        await page.locator(`[data-add-person="${B}"]`).click();
        await waitForGate(page, 'computeChart:Fictional B');

        await deletePersonInPage(page, B);
        await release(page);
        await frames(page);
        await frames(page);

        const status = await waitStatus(page, /no longer in your saved charts/i);
        assert.match(status, /no longer in your saved charts/i,
          `the status still reports a solve that can never finish: ${JSON.stringify(status)}`);
        assert.doesNotMatch(status, /computing/i, 'the page is stuck on a solve for a deleted person');
        assert.deepEqual(await compositeHead(page), []);
        assert.equal(await compareLabel(page), 'Compare with another person');
        // A later pick must still be accepted: the busy flag has to be released.
        await page.click('#dream-compare');
        await page.locator(`[data-add-person="${C}"]`).click();
        await page.waitForFunction(() => !!document.querySelector('.dream-compare-head'));
        assert.match((await compositeHead(page))[0], /Fictional C/);
        assert.deepEqual(errors, []);
      });
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'ALL STATE-BOUNDARY CHECKS PASSED' : `${failures} STATE-BOUNDARY CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
