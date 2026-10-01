import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const birth = '?d=2000-05-10&t=12%3A30&tz=8';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });

try {
  for (const width of [1224, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 703 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const checkPlanet = async (selector, source, planet = 'sun') => {
      await page.locator(selector).click();
      const detail = page.locator('#gate-detail:not(.hidden) [data-detail-kind="planet"]');
      await detail.waitFor();
      assert.equal(await detail.getAttribute('data-source'), source);
      assert.equal(await detail.getAttribute('data-planet'), planet);
      assert.equal(await detail.locator('.planet-detail-source').count(), 0,
        'planet modal omits the redundant activation-source explanation');
      assert.equal(await detail.locator('.planet-detail-substructure-item').count(), 3,
        'available color, tone and base remain separate readable fields');
      assert.equal(await page.locator('#gate-detail #lens-content').count(), 0,
        'planet detail does not embed the gate reading');
      const gate = await page.locator('#gate-detail [data-planet-gate]').getAttribute('data-planet-gate');
      await page.locator('#gate-detail [data-planet-gate]').click();
      await page.locator('#gate-detail #lens-content').waitFor();
      assert.ok((await page.locator('#gate-detail .detail-label').first().innerText()).includes(gate));
      await page.locator('#gate-detail .gate-detail-back').click();
      await detail.waitFor();
      assert.equal(await detail.getAttribute('data-source'), source);
      await page.keyboard.press('Escape');
    };

    await page.goto(`${base}/${birth}`);
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
    await checkPlanet('#bodygraph-container .bg-planets-personality .bg-planet-row:first-of-type', 'personality');
    await checkPlanet('#bodygraph-container .bg-planets-design .bg-planet-row:first-of-type', 'design');
    await page.locator('.panel-tab[data-panel="variable"]').click();
    const variableCards = await page.locator('.variable-grid .arrow-card').evaluateAll(cards => cards.map(card => ({
      key: card.dataset.variable, x: card.getBoundingClientRect().x, y: card.getBoundingClientRect().y,
      direction: card.querySelector('.arrow-direction')?.textContent.trim().slice(0, 1),
      tone: Number(card.querySelector('.arrow-meta')?.textContent.match(/(?:Tone|基调|音调)\s*(\d)/)?.[1]),
    })));
    assert.deepEqual(variableCards.map(card => card.key),
      ['determination', 'motivation', 'environment', 'perspective']);
    for (const card of variableCards) {
      assert.ok(card.tone >= 1 && card.tone <= 6);
      assert.equal(card.direction, card.tone <= 3 ? '←' : '→');
    }
    if (width > 600) {
      assert.ok(variableCards[0].x < variableCards[1].x && variableCards[0].y === variableCards[1].y);
      assert.ok(variableCards[2].x < variableCards[3].x && variableCards[2].y === variableCards[3].y);
    }

    await page.goto(`${base}/${birth}&view=transits`);
    await page.locator('#transit-stage .tl-planet[data-planet="sun"][data-gate]').waitFor();
    await checkPlanet('#transit-stage .tl-planet[data-planet="sun"]', 'transit');
    await checkPlanet('#transit-stage .tl-birth-value.bg-planets-design[data-birth-planet="sun"]', 'design');
    await checkPlanet('#transit-stage .tl-birth-value.bg-planets-personality[data-birth-planet="sun"]', 'personality');

    await page.goto(`${base}/${birth}&view=timeline`);
    await page.locator('#timeline-view .tl-planet[data-planet="sun"][data-gate]').waitFor();
    await checkPlanet('#timeline-view .tl-planet[data-planet="sun"]', 'transit');
    await checkPlanet('#timeline-view .tl-birth-value.bg-planets-design[data-birth-planet="sun"]', 'design');
    await checkPlanet('#timeline-view .tl-birth-value.bg-planets-personality[data-birth-planet="sun"]', 'personality');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Planet → Gate → Back works from chart, transit and timeline on desktop and mobile.');
} finally {
  await browser.close();
}
