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
      assert.equal(await page.locator('#gate-detail #lens-content').count(), 0,
        'planet detail does not embed the gate reading');
      // A birth point carries both real activations in one frame; a transit point only its own.
      const expected = source === 'transit' ? ['transit'] : ['design', 'personality'];
      const sections = detail.locator('[data-planet-activation]');
      assert.deepEqual(
        await sections.evaluateAll(nodes => nodes.map(node => node.dataset.planetSource)),
        expected, 'planet detail lists each real activation source');
      for (const section of await sections.all()) {
        assert.equal(await section.locator('.planet-detail-substructure-item').count(), 3,
          'available color, tone and base remain separate readable fields');
        assert.equal(await section.locator('[data-planet-gate]').count(), 1);
        // Locale formats differ ("Gate 23 · Line 2" vs "Gate 23（山地剥）· 第2爻"); only require text.
        const lineText = (await section.locator('[data-planet-gate] strong').innerText()).trim();
        assert.ok(lineText.length > 0, 'each row names its activation');
        assert.ok(lineText.includes(await section.locator('[data-planet-gate]').getAttribute('data-planet-gate')),
          'the row text contains the gate it jumps to');
      }
      // Each row jumps to its own source-tagged gate record and comes back to this frame.
      for (const sectionSource of expected) {
        const button = detail.locator(`[data-planet-gate][data-planet-source="${sectionSource}"]`);
        const gate = await button.getAttribute('data-planet-gate');
        await button.click();
        await page.locator('#gate-detail #lens-content').waitFor();
        assert.ok((await page.locator('#gate-detail .detail-label').first().innerText()).includes(gate));
        if (sectionSource !== 'transit') {
          const selected = page.locator('#gate-detail .selected-activation');
          assert.equal(await selected.count(), 1, 'the gate detail marks the row that opened it');
          assert.equal(await selected.getAttribute('data-activation-side'), sectionSource);
          assert.equal(await selected.getAttribute('data-activation-planet'), planet);
          assert.ok((await selected.getAttribute('data-activation-value')).startsWith(`${gate}.`),
            'the selected row is the same gate and line the button carried');
        }
        await page.locator('#gate-detail .gate-detail-back').click();
        await detail.waitFor();
        assert.equal(await detail.getAttribute('data-source'), source);
        assert.deepEqual(
          await detail.locator('[data-planet-activation]').evaluateAll(nodes => nodes.map(node => node.dataset.planetSource)),
          expected, 'Back restores both entries, not one side');
      }
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
  console.log('Planet → Gate → Back works from chart, transit and timeline on desktop and mobile, with both birth sources in one frame.');
} finally {
  await browser.close();
}
