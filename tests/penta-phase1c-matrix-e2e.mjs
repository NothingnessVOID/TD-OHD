import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const base = process.env.E2E_URL;
assert.ok(base);
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => localStorage.setItem('ohd-language', 'en'));
  await page.goto(base);
  await page.locator('#team-content').waitFor({ state: 'attached' });
  await page.evaluate(async () => {
    const { analyzePentaStructure } = await import('/src/lib/human-design/penta-structure.js');
    const { TEAM_PLANETS } = await import('/src/lib/human-design/team-activation.js');
    const { createPentaMatrix } = await import('/src/views/penta-matrix.js');
    const member = (id, upper, lower) => {
      const side = () => Object.fromEntries(TEAM_PLANETS.map(planet => [planet, { gate: 64, line: 1, planet }]));
      const personality = side(), design = side();
      if (upper) { personality.sun = { gate: 31, line: 3, planet: 'sun' }; design.earth = { gate: 31, line: 5, planet: 'earth' }; }
      if (lower) personality.moon = { gate: 7, line: 2, planet: 'moon' };
      return { memberId: id, chart: { gates: { personality, design } } };
    };
    const people = [{ memberId: 'id-a', displayName: 'Same' }, { memberId: 'id-b', displayName: 'Same' }, { memberId: 'id-c', displayName: 'Third' }];
    const container = document.querySelector('#team-content');
    document.querySelector('#team-view').classList.remove('hidden');
    document.querySelector('#chart-view').classList.add('hidden');
    window.__phase1cCases = [
      [member('id-a'), member('id-b'), member('id-c')],
      [member('id-a', true), member('id-b'), member('id-c')],
      [member('id-a', true, true), member('id-b'), member('id-c')],
      [member('id-a', true), member('id-b', false, true), member('id-c')],
      [member('id-a', true, true), member('id-b', true), member('id-c')]
    ].map(members => ({ result: analyzePentaStructure(members), people, groupLabel: 'Synthetic' }));
    window.__showSynthetic = index => { window.__syntheticMatrix?.dispose(); window.__syntheticMatrix = createPentaMatrix(container, window.__phase1cCases[index]); };
  });
  const statuses = ['absent', 'absent', 'selfComplete', 'crossMemberOnly', 'both'];
  for (const [i, status] of statuses.entries()) {
    await page.evaluate(index => { document.querySelector('#team-content').replaceChildren(); window.__showSynthetic(index); }, i);
    assert.equal(await page.locator('.penta-edge').count(), 6);
    assert.equal(await page.locator('.penta-edge').first().getAttribute('class'), `penta-edge penta-${status}`);
    await page.locator('.penta-channel-hit').first().click();
    const detail = await page.locator('.penta-detail').innerText();
    assert.match(detail, /Gate 31|Gate 7/);
    if (status === 'crossMemberOnly') assert.match(detail, /1 · Same \(31\) \+ 2 · Same \(7\)/);
    if (status === 'both') assert.match(detail, /Self complete members: 1 · Same/);
    await page.keyboard.press('Escape');
  }
  await page.evaluate(() => { document.querySelector('#team-content').replaceChildren(); window.__showSynthetic(4); });
  assert.equal(await page.locator('.penta-gate[data-gate="31"] .penta-native-member').count(), 2);
  await page.locator('.penta-gate-hit[data-gate="31"]').click();
  const gateDetail = await page.locator('.penta-detail').innerText();
  assert.match(gateDetail, /Personality.*Sun.*31\.3/s);
  assert.match(gateDetail, /Design.*Earth.*31\.5/s);
  assert.match(gateDetail, /1 · Same/);
  assert.match(gateDetail, /2 · Same/);
  await page.keyboard.press('Escape');
  await page.locator('.penta-member').nth(0).click();
  assert.equal(await page.locator('.penta-member').nth(0).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.penta-gate.penta-highlight').count() > 0, true);
  await page.locator('.penta-all').click();
  assert.equal(await page.locator('.penta-dimmed').count(), 0);
  console.log('Phase 1C synthetic matrix: four statuses, provenance, stable IDs and member highlight passed.');
} finally { await browser.close(); }
