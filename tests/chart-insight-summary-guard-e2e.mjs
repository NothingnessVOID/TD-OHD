/**
 * First-screen summary-only guard for the chart-insight overview.
 *
 * The old guard watched #foundation-panel, which this branch removed. The
 * replacement asserts the same contract against the new dashboard: the first
 * screen may show identity summaries, never knowledge Detail prose.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const base = process.env.E2E_URL || 'http://127.0.0.1:5198';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const errors = [];
const results = [];

const profile = {
  id: 'synthetic-insight-guard', name: 'Fictional Guard',
  birthDate: '1960-01-01', birthTime: '12:00',
  location: { timezone: 0, lat: 51.5, lon: 0, iana: 'Europe/London', name: 'London' }
};

for (const locale of ['en', 'zh-CN']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`${locale}: ${error.message}`));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`${locale} console: ${msg.text()}`); });
  await page.addInitScript(({ profile, key, locale }) => {
    localStorage.setItem(key, JSON.stringify([profile]));
    localStorage.setItem('ohd-last-person-id', profile.id);
    localStorage.setItem('ohd-language', locale);
  }, { profile, key: PROFILE_STORAGE_KEY, locale });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#chart-insight .ci-overview').waitFor({ timeout: 120000 });
  await page.waitForTimeout(1000);

  const snapshot = await page.evaluate(() => {
    const host = document.getElementById('chart-insight');
    return {
      text: host.innerText,
      chips: [...host.querySelectorAll('.ci-chip')].map(node => node.textContent.trim()),
      strategy: host.querySelector('.ci-strategy')?.innerText ?? '',
      metricRows: host.querySelectorAll('.ci-metric').length,
      legacy: Boolean(document.querySelector('#foundation-panel, #panel-content, .panel-tabs'))
    };
  });

  // The removed panel stack must not come back as a parallel surface.
  assert.equal(snapshot.legacy, false, `${locale}: legacy foundation/tab DOM is gone`);
  assert.equal(snapshot.metricRows, 6, `${locale}: overview keeps six metric rows`);

  // Detail isolation: reading an identity object must open the shared sheet and
  // leave the first screen's own text untouched. The static build has no module
  // graph to import, so this checks the rendered contract instead.
  const beforeText = snapshot.text;
  await page.locator('#chart-insight .ci-chip').first().click();
  await page.waitForTimeout(600);
  const opened = await page.evaluate(() => {
    const sheet = document.getElementById('gate-detail');
    return {
      open: Boolean(sheet && !sheet.classList.contains('hidden')),
      owner: sheet?.dataset.detailOwner ?? null,
      overviewText: document.getElementById('chart-insight').innerText
    };
  });
  assert.equal(opened.open, true, `${locale}: identity chip opens the shared Detail sheet`);
  assert.equal(opened.owner, 'knowledge', `${locale}: identity chip routes through knowledge Detail`);
  assert.equal(opened.overviewText, beforeText, `${locale}: Detail cannot change the overview text`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // No knowledge Detail body may appear on the first screen: the overview has no
  // reading body container and no long-form paragraph.
  const detailNodes = await page.evaluate(() => {
    const host = document.getElementById('chart-insight');
    return {
      bodies: host.querySelectorAll('.knowledge-detail, .gate-detail-body, .ci-detail').length,
      longest: Math.max(0, ...[...host.querySelectorAll('p, .ci-note-short, .ci-metric-note')]
        .map(node => node.textContent.trim().length))
    };
  });
  assert.equal(detailNodes.bodies, 0, `${locale}: overview renders no Detail body`);
  assert.ok(detailNodes.longest < 400, `${locale}: overview stays summary-length (${detailNodes.longest})`);

  // Switching language must not pull Detail prose onto the first screen either.
  if (locale !== 'en') {
    await page.locator('#more-toggle').click();
    await page.locator('#language-menu > summary').click();
    await page.locator('[data-language="zh-Hant"]').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => document.getElementById('chart-insight').innerText);
    assert.ok(after.length > 0, 'locale switch keeps the overview rendered');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#chart-insight .ci-detail').length), 0);
  }

  results.push({ locale, chips: snapshot.chips, longestText: detailNodes.longest });
  await context.close();
}

await browser.close();
assert.deepEqual(errors, []);
console.log(`PASS chart-insight summary-only guard (${results.length} locales) ${JSON.stringify(results)}`);
