/** Browser acceptance for the V1 pre-merge interaction corrections. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5187';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const city = { name: '上海', admin1: '上海市', country: '中国', country_code: 'CN',
  latitude: 31.2222, longitude: 121.4581, timezone: 'Asia/Shanghai', feature_code: 'PPLA', population: 24874500 };
const village = admin1 => ({ ...city, admin1, feature_code: 'PPL', population: undefined });

try {
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, locale: 'zh-CN' });
    const navClick = async view => {
      if (viewport.width < 600 && await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded') !== 'true') {
        if (await page.locator('#timeline-view [data-action="mobile-exit"]').isVisible()) await page.locator('#timeline-view [data-action="mobile-exit"]').click();
        else await page.locator('#mobile-menu-toggle').click();
      }
      await page.locator(`.nav-link[data-view="${view}"]`).click();
    };
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/geocoding-api.open-meteo.com/v1/search?*', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ results: [city, village('云南'), village('四川'), village('浙江')] })
    }));
    await page.goto(`${base}/?d=2000-05-10`);
    await page.locator('#birth-entry:not(.hidden)').waitFor();
    assert.match(await page.locator('#entry-invite').innerText(), /不完整/);
    assert.equal(await page.locator('#chart-view').isVisible(), false);
    await page.goto(`${base}/`);

    for (const view of ['transits', 'timeline', 'connection', 'team']) {
      await navClick(view);
      await page.locator('#chart-required-view:not(.hidden)').waitFor();
      assert.match(await page.locator('#chart-required-view').innerText(), /请先建立出生图/);
      assert.deepEqual(await page.locator('.nav-link.active').evaluateAll(nodes => nodes.map(node => node.dataset.view)), [view]);
      await page.locator('#chart-required-entry').click();
      assert.equal(await page.locator('#birth-entry').isVisible(), true);
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'birth-date');
    }

    await page.locator('#birth-date').fill('1990-06-15');
    await page.locator('#birth-time').fill('14:30');
    await page.locator('#birth-place').fill('上海');
    await page.locator('#place-results .place-result').first().waitFor();
    assert.equal(await page.locator('#place-results .place-result').count(), 1);
    assert.doesNotMatch(await page.locator('#place-results').innerText(), /云南|四川|浙江/);
    await page.locator('#place-results .place-result').first().click();
    await page.locator('#birth-form button[type="submit"]').click();
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();

    await navClick('library');
    await page.locator('#library-view:not(.hidden)').waitFor();
    assert.equal(new URL(page.url()).hash, '#library');
    await page.locator('#reference-search').fill('14.2');
    assert.equal(await page.locator('#reference-results .reference-result').count(), 0);
    await page.locator('[data-reference-filter="gate"]').click();
    await page.locator('#reference-search').fill('14');
    await page.locator('#reference-results .reference-result').first().click();
    await page.locator('#reference-detail .gate-detail-line[data-line="2"]').waitFor();
    assert.equal(await page.locator('#reference-detail .gate-detail-line').count(), 6);
    assert.equal(await page.locator('#reference-detail [data-reference-line]').count(), 0);
    assert.match(page.url(), /#library\/gate\/14$/);
    await page.locator('[data-reference-lens="gk"]').click();
    assert.equal(await page.locator('#reference-detail .gate-detail-line').count(), 0);
    assert.doesNotMatch(await page.locator('#reference-detail h2').innerText(), /14\.2/);
    await page.locator('[data-reference-lens="hd"]').click();
    await page.locator('#reference-detail [data-reference-kind="channel"][data-reference-id="2-14"]').click();
    assert.match(page.url(), /#library\/channel\/2-14/);
    await page.locator('#reference-detail [data-reference-kind="gate"][data-reference-id="2"]').click();
    assert.match(page.url(), /#library\/gate\/2/);
    for (const [hash, title] of [
      ['#library/channel/2-14', /2-14/], ['#library/gate/14', /14/], ['#library', /选择条目|Select an entry/]
    ]) {
      await page.goBack();
      await page.waitForFunction(expected => location.hash === expected, hash);
      assert.match(await page.locator('#reference-detail').innerText(), title);
      assert.deepEqual(await page.locator('.nav-link.active').evaluateAll(nodes => nodes.map(node => node.dataset.view)), ['library']);
    }
    await page.goBack();
    await page.locator('#chart-view:not(.hidden)').waitFor();
    assert.equal(new URL(page.url()).hash, '');
    assert.deepEqual(await page.locator('.nav-link.active').evaluateAll(nodes => nodes.map(node => node.dataset.view)), ['chart']);

    await navClick('transits');
    await page.locator('#transits-view:not(.hidden)').waitFor();
    await page.locator('#transit-bodygraph .bg-center[data-center="throat"]').click();
    await page.locator('#gate-detail .center-detail-card[data-center="throat"]').waitFor();
    const canonicalCenter = await page.evaluate(async () => {
      const { centerReading } = await import('/src/lib/reference-content.js');
      const body = document.createElement('div');
      body.innerHTML = centerReading('throat', { status: null, includeTheme: false });
      return [...body.querySelectorAll('.gate-detail-desc')].map(node => node.textContent.trim());
    });
    const transitCenter = await page.locator('#gate-detail .center-detail-card .gate-detail-desc').allTextContents();
    assert.ok(canonicalCenter.length >= 2);
    assert.equal(transitCenter.length, 1, 'transit detail shows one reading for its current state');
    assert.ok(canonicalCenter.some(paragraph => paragraph === transitCenter[0].trim()));
    await page.keyboard.press('Escape');
    await navClick('library');
    await page.locator('#reference-search').fill('14');
    await page.locator('#reference-results .reference-result').first().click();
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#library');
    await page.goBack();
    await page.locator('#transits-view:not(.hidden)').waitFor();
    assert.equal(new URL(page.url()).hash, '');
    assert.deepEqual(await page.locator('.nav-link.active').evaluateAll(nodes => nodes.map(node => node.dataset.view)), ['transits']);

    await navClick('timeline');
    const tl = '#timeline-view';
    const table = page.locator(`${tl} .tl-table`);
    const selected = () => table.evaluate(node => Number(node.dataset.selected));
    const ready = () => page.waitForFunction(() =>
      document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false',
      null, { timeout: 120000 });
    await ready();
    const before = await selected();
    await page.keyboard.press('ArrowRight');
    assert.ok((await selected()) > before, 'page-level key moves without timeline focus');
    if (viewport.width < 600) {
      const buttons = page.locator(`${tl} .tl-mobile-event-nav button`);
      assert.equal(await buttons.count(), 2);
      assert.equal(await buttons.first().isVisible(), true);
      const geometry = await page.evaluate(() => {
        const nav = document.querySelector('.tl-mobile-event-nav').getBoundingClientRect();
        const trigger = document.querySelector('.tl-mobile-controls-trigger').getBoundingClientRect();
        const tracks = document.querySelector('.tl-tracks-panel').getBoundingClientRect();
        return { nav, trigger, tracks };
      });
      assert.ok(geometry.nav.left > geometry.trigger.right && geometry.nav.bottom <= geometry.tracks.top + 1,
        'mobile navigation floats clear of the controls trigger and main tracks');
    } else {
      assert.equal(await page.locator(`${tl} .tl-toolbar .tl-event-nav`).count(), 1);
      assert.equal(await page.locator(`${tl} .tl-tracks-panel .tl-event-nav`).count(), 0);
    }

    await page.locator(`${tl} [data-field="span"]`).selectOption('30');
    await ready();
    if (viewport.width < 600) await page.locator(`${tl} [data-action="mobile-controls"]`).click();
    await page.locator(`${tl} .tl-advanced summary`).click();
    await page.locator(`${tl} [data-field="planet"]`).selectOption('moon');
    await ready();
    if (viewport.width < 600) await page.locator(`${tl} [data-action="mobile-controls"]`).click();
    const moonTimes = [];
    for (let index = 0; index < 2; index++) {
      const previous = await selected();
      await page.keyboard.press('ArrowRight');
      const instant = await selected();
      assert.ok(instant > previous, 'moon navigation advances');
      moonTimes.push(instant);
      const moonChanged = await page.evaluate(async time => {
        const { snapshot } = await import('/src/features/transit-timeline/provider.js');
        return (await snapshot(time - 1000)).moon.gate !== (await snapshot(time)).moon.gate;
      }, instant);
      assert.equal(moonChanged, true, `moon gate changed at ${instant}`);
    }
    assert.ok(moonTimes[1] > moonTimes[0]);
    const isolatedTime = await selected();
    if (viewport.width < 600) await page.locator(`${tl} [data-action="mobile-controls"]`).click();
    const search = page.locator(`${tl} [data-field="search"]`);
    await search.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await selected(), isolatedTime, 'search focus retains arrow keys');

    const first = page.locator(`${tl} .tl-condition-row`).first();
    await first.locator('[data-condition="kind"]').selectOption('line');
    await first.locator('[data-action="toggle-targets"]').click();
    await first.locator('[data-condition="target-search"]').fill('14');
    assert.equal(await first.locator('.tl-target-option').count(), 6);
    await first.locator('[data-condition="target-search"]').fill('14.2');
    assert.equal(await first.locator('.tl-target-option').count(), 1);
    await first.locator('input[data-target-id="14.2"]').check();
    assert.match(await first.locator('[data-action="toggle-targets"]').innerText(), /14\.2/);
    assert.equal(await first.locator('.tl-target-chips').count(), 0);
    await first.locator('[data-condition="kind"]').selectOption('channel');
    await first.locator('[data-action="toggle-targets"]').click();
    await first.locator('[data-condition="target-search"]').fill('60-3');
    assert.equal(await first.locator('.tl-target-option').count(), 1);
    await first.locator('input[data-target-id="3-60"]').check();
    assert.match(await first.locator('[data-action="toggle-targets"]').innerText(), /3-60/);
    assert.equal(await first.locator('input[data-condition="ids"]').count(), 0);
    assert.equal(await first.locator('[data-condition="kind"] option[value="bridge"]').count(), 0);
    assert.equal(await first.locator('.tl-target-picker').isVisible(), true);
    assert.equal(await first.locator('[data-condition="state"]').isVisible(), true);
    await page.goto(`${base}/#library/gate/14`);
    await page.locator('#reference-detail:not(.hidden) .reference-back').click();
    await page.waitForFunction(() => location.hash === '#library');
    assert.equal(await page.locator('#library-view').isVisible(), true);
    assert.match(await page.locator('#reference-detail .reference-empty').innerText(), /选择条目|Select an entry/);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Pre-merge browser path passed at ${viewport.width}px.`);
  }
} finally {
  await browser.close();
}
