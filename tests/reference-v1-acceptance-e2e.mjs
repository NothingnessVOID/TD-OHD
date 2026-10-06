/** One synthetic chart through the V1 acceptance path in desktop and phone viewports. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5187';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const birth = '?d=1985-01-01&t=12%3A00&tz=0'; // Synthetic split definition; no identity fields.

try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, locale: 'zh-CN' });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin });
    const errors = [];
    const annualRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/transit-data\/[^/]+\/\d{4}\.[^/]+\.json/.test(request.url())) annualRequests.push(request.url());
    });
    const root = '#timeline-view';
    const navClick = async view => {
      if (viewport.width < 600 && await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded') !== 'true') {
        if (view === 'chart' && await page.locator(`${root} [data-action="mobile-exit"]`).isVisible()) {
          await page.locator(`${root} [data-action="mobile-exit"]`).click();
        } else await page.locator('#mobile-menu-toggle').click();
      }
      await page.locator(`.nav-link[data-view="${view}"]`).click();
    };
    const gateButton = action => page.locator(`${root} ${viewport.width < 600 ? '.tl-mobile-event-nav' : '.tl-toolbar .tl-event-nav'} [data-action="${action}"]`);
    const ready = () => page.waitForFunction(() =>
      document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false',
      null, { timeout: 120000 });

    await page.goto(`${base}/${birth}`);
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
    await page.locator('.bg-planet-row[data-gate]').first().click();
    await page.locator('#gate-detail [data-planet-gate]').click();
    await page.locator('#gate-detail:not(.hidden) [data-channel]').first().waitFor();
    const channel = await page.locator('#gate-detail [data-channel]').first().getAttribute('data-channel');
    await page.locator('#gate-detail [data-channel]').first().click();
    const gateNumber = Number(await page.locator('#gate-detail .transit-channel-gates [data-channel-gate]').first().getAttribute('data-channel-gate'));
    await page.locator('#gate-detail .transit-channel-gates [data-channel-gate]').first().click();
    const popupCore = (await page.locator('#lens-content').innerText()).trim();
    assert.equal(await page.locator('#gate-detail .gate-detail-line').count(), 6);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#chart-view').isVisible(), true);
    await navClick('library');
    await page.locator('#library-view:not(.hidden)').waitFor();
    assert.equal(new URL(page.url()).search, '');
    assert.ok(gateNumber >= 1 && gateNumber <= 64, `selected gate from channel ${channel}`);
    await page.goto(`${base}/#library/gate/${gateNumber}`);
    await page.locator('#reference-detail .gate-detail-line').first().waitFor();
    assert.equal((await page.locator('#reference-detail .reference-reading').innerText()).trim(), popupCore);
    if (viewport.width < 600) await page.locator('#reference-detail .reference-back').click();
    await navClick('chart');
    await page.locator('#chart-view:not(.hidden)').waitFor();
    await navClick('transits');
    await page.locator('#transits-view:not(.hidden)').waitFor();
    assert.equal(await page.locator('#transit-timezone').evaluate(node => node.tagName), 'OUTPUT');
    await page.locator('#transit-now').click();
    assert.equal(await page.locator('#transit-time').getAttribute('step'), '1');
    assert.match(await page.locator('#transit-time').inputValue(), /^\d{2}:\d{2}:\d{2}$/);
    assert.equal(await page.locator('#transits-view .transit-advanced').count(), 0);
    await page.locator('#transit-only-toggle').click();
    assert.equal(await page.locator('#transit-only-toggle').getAttribute('aria-pressed'), 'true');
    await page.locator('#transit-only-toggle').click();
    assert.ok((await page.locator('#transit-timezone').innerText()).trim());
    assert.ok(await page.locator('#transit-bodygraph .bodygraph-svg').count());

    await navClick('timeline');
    await page.locator(`${root}:not(.hidden) .tl-table`).waitFor();
    await ready();
    assert.equal(await page.locator(`${root} .tl-toolbar > .tl-advanced`).count(), 1);
    assert.equal(await page.locator(`${root} .tl-toolbar > .tl-mode-toggle`).count(), 1);
    const checkSourceColors = async () => {
      const colors = await page.evaluate(() => {
        const probe = document.createElement('span');
        document.querySelector('#timeline-view').append(probe);
        probe.style.color = 'var(--tl-transit)';
        const expected = getComputedStyle(probe).color;
        probe.style.color = 'var(--hd-transit)';
        const expectedRing = getComputedStyle(probe).color;
        probe.style.color = 'var(--hd-transit-text)';
        const expectedText = getComputedStyle(probe).color;
        probe.remove();
        const bar = document.querySelector('#timeline-view .tl-bar[data-source="transit"]');
        const legend = document.querySelector('#timeline-view .tl-legend [data-source="transit"] i');
        const ring = document.querySelector('#timeline-view .tl-graph .bg-transit-ring');
        const planet = document.querySelector('#timeline-view .tl-transit-column .bg-planet-act');
        return { expected, expectedRing, expectedText, bar: bar && getComputedStyle(bar).backgroundColor,
          legend: legend && getComputedStyle(legend).backgroundColor,
          ring: ring && getComputedStyle(ring).stroke,
          planetText: planet && getComputedStyle(planet).color };
      });
      assert.ok(colors.bar && colors.legend && colors.ring, JSON.stringify(colors));
      assert.equal(colors.bar, colors.expected);
      assert.equal(colors.legend, colors.expected);
      assert.equal(colors.ring, colors.expectedRing);
      assert.equal(colors.planetText, colors.expectedText);
    };
    await checkSourceColors();
    await page.locator('#theme-toggle').evaluate(node => node.click());
    await ready();
    await checkSourceColors();
    await page.locator('#theme-toggle').evaluate(node => node.click());
    await ready();
    const controls = page.locator(`${root} .tl-mobile-controls-panel`);
    const span = page.locator(`${root} [data-field="span"]`);
    await span.selectOption('30'); await ready();
    await span.selectOption('7'); await ready();
    assert.equal(await span.inputValue(), '7');
    assert.ok(annualRequests.length >= 1, 'annual file was loaded');
    assert.ok(new Set(annualRequests).size <= 2, `annual requests: ${annualRequests}`);
    assert.equal(annualRequests.length, new Set(annualRequests).size, '7/28/7 reuses year data');

    const expand = page.locator(`${root} .tl-row[data-key^="gate:"] [data-action="expand-gate"]`).first();
    await expand.click();
    assert.equal(await expand.getAttribute('aria-expanded'), 'true');
    const parent = await expand.locator('xpath=ancestor::div[@data-key]').getAttribute('data-key');
    assert.match(await page.locator(`${root} .tl-row[data-key="${parent}"] + .tl-row`).getAttribute('data-key'), /^line:/);
    const table = page.locator(`${root} .tl-table`);
    const selected = () => table.evaluate(node => Number(node.dataset.selected));
    const before = await selected();
    await table.focus(); await page.keyboard.press('ArrowRight');
    const nextGateTime = await selected();
    assert.ok(nextGateTime > before);
    await gateButton('previous-gate').click();
    assert.ok((await selected()) < nextGateTime);

    if (viewport.width < 600) await page.locator(`${root} [data-action="mobile-controls"]`).click();
    const isolatedTime = await selected();
    await page.locator(`${root} [data-field="search"]`).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await selected(), isolatedTime, 'typing focus isolates timeline arrows');
    if (viewport.width < 600) await page.locator(`${root} [data-action="mobile-controls"]`).click();
    await page.locator(`${root} .tl-row-name[data-row]`).first().click();
    await page.locator('#gate-detail:not(.hidden)').waitFor();
    await page.keyboard.press('ArrowRight');
    assert.equal(await selected(), isolatedTime, 'detail dialog isolates timeline arrows');
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let rapidTime = await selected();
    for (let index = 0; index < 3; index++) {
      await gateButton('next-gate').click();
      const next = await selected();
      assert.ok(next > rapidTime, 'rapid navigation stays ordered');
      rapidTime = next;
    }
    await page.waitForTimeout(200);
    assert.equal(await selected(), rapidTime, 'an older callback cannot replace the latest target');
    await page.locator(`${root} .tl-row-lit`).first().waitFor({ timeout: 5000 });
    assert.equal(await page.locator(`${root} .tl-row-lit .tl-row-label`).first().evaluate(node => getComputedStyle(node).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (let index = 0; index < 3; index++) {
      await gateButton('next-gate').click();
      const next = await selected();
      assert.ok(next > rapidTime, 'animated rapid navigation stays ordered');
      rapidTime = next;
    }
    await page.waitForTimeout(450);
    assert.equal(await selected(), rapidTime);
    assert.ok(await page.locator(`${root} .tl-row-lit`).count(), 'latest highlight survives old callbacks');
    const visibleTarget = await page.locator(`${root} .tl-row-lit`).evaluateAll(nodes => {
      const table = document.querySelector('#timeline-view .tl-table').getBoundingClientRect();
      return nodes.some(node => {
        const row = node.getBoundingClientRect();
        return row.bottom > table.top && row.top < table.bottom;
      });
    });
    assert.equal(visibleTarget, true, 'latest highlighted track remains visible');
    if (viewport.width < 600) await page.locator(`${root} [data-action="mobile-controls"]`).click();
    await page.locator(`${root} .tl-advanced summary`).click();
    await page.locator(`${root} [data-condition="kind"]`).first().selectOption('gate');
    const chooseTarget = async (rowIndex, id) => {
      const row = page.locator(`${root} .tl-condition-row`).nth(rowIndex);
      await row.locator('[data-action="toggle-targets"]').click();
      await row.locator('[data-condition="target-search"]').fill(id);
      await row.locator(`input[data-target-id="${id}"]`).check();
    };
    await chooseTarget(0, '14');
    await page.locator(`${root} [data-action="add-condition"]`).click();
    await page.locator(`${root} [data-condition="kind"]`).nth(1).selectOption('gate');
    await chooseTarget(1, '29');
    await page.locator(`${root} [data-field="combine"]`).selectOption('any');
    await page.locator(`${root} [data-action="run-query"]`).click();
    assert.ok(await page.locator(`${root} [data-query-interval]`).count());
    await page.locator(`${root} [data-query-interval]`).first().click();
    await page.locator(`${root} .tl-row-lit`).first().waitFor({ timeout: 5000 });

    // The fixed two-island chart shows bridge intervals ahead of center rows.
    await page.locator(`${root} [data-action="remove-condition"]`).nth(1).click();
    await page.locator(`${root} [data-field="kind"]`).selectOption('all');
    assert.equal(await page.locator(`${root} .tl-row`).first().getAttribute('data-key'), 'bridge:natal');
    assert.ok(await page.locator(`${root} .tl-row[data-key="bridge:natal"] .tl-bar`).count(), 'two natal islands bridge in the selected week');
    await page.locator(`${root} .tl-row[data-key="bridge:natal"] .tl-bar`).first().click();
    assert.equal(await page.locator(`${root} .tl-row[data-key="bridge:natal"] .tl-bar[aria-pressed="true"]`).count(), 1);
    if (process.env.ACCEPTANCE_CAPTURE === '1') {
      await page.screenshot({ path: `docs/reference-timeline/stage-6/acceptance-${viewport.width}.png` });
    }

    await navClick('chart');
    await page.locator('#chart-view:not(.hidden)').waitFor();
    assert.equal(await page.locator('.share-fields').count(), 0);
    await page.locator('#more-toggle').click();
    await page.locator('#chart-share-menu summary').click();
    await page.locator('#share-chart').click();
    const shared = await page.evaluate(() => navigator.clipboard.readText());
    const sharedUrl = new URL(shared);
    assert.equal(sharedUrl.searchParams.get('d'), '1985-01-01');
    assert.deepEqual([...sharedUrl.searchParams.keys()].sort(), ['d', 't', 'tz']);
    await page.goto(shared);
    await page.reload();
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('d'), '1985-01-01');
    assert.deepEqual(errors, []);
    console.log(`V1 integrated acceptance passed: ${viewport.width}x${viewport.height}; year requests ${annualRequests.length}`);
    await page.close();
  }
} finally { await browser.close(); }
