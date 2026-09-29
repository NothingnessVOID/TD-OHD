import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  for (const width of [1224, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 703 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8&view=transits`);
    await page.locator('#transit-stage .tl-graph .bodygraph-svg').waitFor();
    assert.equal(await page.locator('#transits-view .tl-heading').count(), 0);
    assert.equal(await page.locator('#transit-stage .tl-planet').count(), 13);
    assert.equal(await page.locator('#transit-stage .tl-birth-value').count(), 26);
    assert.ok((await page.locator('#transit-content').innerText()).includes('行运太阳'));
    assert.equal(await page.locator('#transit-stage .tl-transit-column .bg-planets-head').innerText(), '行运');
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth,
      stage: document.querySelector('#transit-stage').getBoundingClientRect().width,
      graph: document.querySelector('#transit-bodygraph .bodygraph-svg').getBoundingClientRect().width }));
    assert.ok(dimensions.scroll <= dimensions.viewport + 1, `no horizontal overflow: ${JSON.stringify(dimensions)}`);
    assert.ok(dimensions.graph <= dimensions.stage, `graph fits shared stage: ${JSON.stringify(dimensions)}`);
    if (width === 1224) {
      await page.locator('#transit-stage .tl-planet[data-gate]').first().click();
      await page.locator('#gate-detail:not(.hidden) [data-detail-kind="planet"][data-source="transit"]').waitFor();
      await page.keyboard.press('Escape');
      // Check within the sticky section; past its bottom the graph releases naturally.
      await page.evaluate(() => scrollTo(0, 300));
      const top = await page.locator('#transit-stage').evaluate(node => node.getBoundingClientRect().top);
      assert.ok(top >= 55 && top <= 80, `graph stage stays in view while summary scrolls: ${top}`);

      await page.locator('#transit-stage .tl-planet[data-planet="sun"]').click();
      await page.locator('#gate-detail [data-planet-gate]').click();
      assert.equal(await page.locator('#gate-detail .tl-activation-natal').innerText(), '出生图未激活');
      await page.keyboard.press('Escape');

      const natalPlanet = page.locator('#transit-stage .tl-birth-value[data-gate]').first();
      const gate = await natalPlanet.getAttribute('data-gate');
      await natalPlanet.click();
      await page.locator('#gate-detail [data-planet-gate]').click();
      const readSharedGate = () => page.locator('#gate-detail:not(.hidden) .gate-detail-body').evaluate(body => {
        const heading = body.querySelector('.tl-detail-heading');
        const natal = heading?.querySelector('.tl-activation-natal');
        const style = natal && getComputedStyle(natal);
        return {
          label: heading?.querySelector('.detail-label')?.textContent.trim(),
          title: heading?.querySelector('.detail-name')?.textContent.trim(),
          natalStatus: natal?.textContent.trim(),
          natalStyle: style && { color: style.color, size: style.fontSize, weight: style.fontWeight },
          natalRows: [...body.querySelectorAll('.tl-detail-activations .gate-detail-acts .tl-activation-row')]
            .map(node => [node.dataset.activationSide, node.dataset.activationPlanet, node.dataset.activationValue]),
          timing: body.querySelectorAll('.tl-detail-timing').length,
        };
      });
      const transitGate = await readSharedGate();
      assert.ok(transitGate.natalRows.length > 0, 'birth gate keeps its natal planet activations');
      assert.equal(transitGate.timing, 0, 'transit view omits the timeline range panel');
      await page.keyboard.press('Escape');

      await page.locator('.nav-link[data-view="timeline"]').click();
      await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null,
        { timeout: 120000 });
      await page.locator(`#timeline-view .tl-row[data-key="gate:${gate}"] .tl-row-name`).click();
      const timelineGate = await readSharedGate();
      assert.deepEqual(timelineGate.natalRows, transitGate.natalRows,
        'transit and timeline views show the same birth activation rows');
      for (const key of ['label', 'title', 'natalStatus', 'natalStyle']) {
        assert.deepEqual(timelineGate[key], transitGate[key], `${key} uses one shared detail presentation`);
      }
      await page.keyboard.press('Escape');
      await page.locator('.nav-link[data-view="transits"]').click();
      await page.locator('#transit-stage .tl-birth-value[data-gate="24"]').first().click();
      await page.locator('#gate-detail [data-planet-gate]').click();
      await page.locator('#gate-detail [data-channel="24-61"]').click();
      assert.equal(await page.locator('#gate-detail .tl-detail-channel-status').innerText(), '出生图激活');
      assert.equal(await page.locator('#gate-detail .tl-detail-timing').count(), 0);
      await page.keyboard.press('Escape');
      await page.locator('.nav-link[data-view="chart"]').click();
      await page.locator('#bodygraph-container .bg-planet-row[data-gate]').first().click();
      await page.locator('#gate-detail [data-planet-gate]').click();
      assert.equal(await page.locator('#gate-detail .tl-activation-natal').innerText(), '出生图激活');
      assert.equal(await page.locator('#gate-detail .tl-activation-transit').count(), 0);
      await page.keyboard.press('Escape');
      await page.locator('.nav-link[data-view="transits"]').click();
    } else {
      await page.locator('#transit-content .transit-summary-button[data-transit-detail="gate"]').first().click();
      const sheet = await page.locator('#gate-detail:not(.hidden) .gate-detail-card').boundingBox();
      assert.ok(sheet && sheet.x >= 0 && sheet.x + sheet.width <= width + 1,
        'shared detail sheet fits the mobile viewport');
      assert.equal(await page.locator('#gate-detail .tl-detail-statuses .tl-activation-label').count(), 2);
      assert.equal(await page.locator('#gate-detail .tl-detail-timing').count(), 0);
      await page.keyboard.press('Escape');
    }
    await page.locator('#transit-only-toggle').click();
    assert.equal(await page.locator('#transit-stage .tl-birth-column').isHidden(), true);
    assert.ok((await page.locator('#transit-content').innerText()).includes('行运太阳'));
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Transit page shares timeline graph window: desktop and mobile passed.');
} finally {
  await browser.close();
}
