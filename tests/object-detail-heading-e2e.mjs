import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const artifacts = path.join(tmpdir(), 'ohd-shared-heading-evidence');
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.E2E_URL || 'http://127.0.0.1:9961'}/?d=1990-06-15&t=14%3A30&tz=-6`);
  await page.locator('#bodygraph-container .bg-gate[data-gate="31"]').click();
  const birthHeading = await page.locator('#gate-detail .detail-name').textContent();
  assert.equal(await page.locator('#gate-detail .tl-detail-heading .detail-label').count(), 1);
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { createPentaMatrix } = await import('/src/views/penta-matrix.js');
    const { pentaDetailAdapter } = await import('/src/lib/shared-object-details.js');
    const { analyzePentaStructure } = await import('/src/lib/human-design/penta-structure.js');
    const { TEAM_PLANETS } = await import('/src/lib/human-design/team-activation.js');
    const members = ['fiction-a', 'fiction-b', 'fiction-c'].map((memberId, i) => {
      const side = () => Object.fromEntries(TEAM_PLANETS.map(planet => [planet, { gate: 64, line: 1, planet }]));
      const personality = side(), design = side();
      personality.sun = { gate: i ? 7 : 31, line: 4, planet: 'sun' };
      return { memberId, chart: { gates: { personality, design } } };
    });
    document.querySelector('#chart-view').classList.add('hidden');
    document.querySelector('#team-view').classList.remove('hidden');
    createPentaMatrix(document.querySelector('#team-content'), {
      result: analyzePentaStructure(members),
      people: members.map(({ memberId }) => ({ memberId, displayName: memberId })),
      groupLabel: 'Synthetic heading verification', detailAdapter: pentaDetailAdapter
    });
  });
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.penta-gate-hit[data-gate="31"]').click();
    const root = page.locator('.penta-detail');
    assert.equal(await root.locator('.detail-name').textContent(), birthHeading);
    assert.match(await root.locator('[data-penta-activations]').innerText(), /fiction-a/);
    for (const lens of ['iching', 'gk', 'meridian', 'hd']) {
      await root.locator(`[data-shared-lens="${lens}"]`).click();
      assert.equal(await root.locator(`[data-shared-lens="${lens}"]`).getAttribute('aria-pressed'), 'true');
    }
    await page.screenshot({ path: path.join(artifacts, `penta-gate-${width}.png`) });
    await root.locator('[data-shared-channel-select="7-31"]').click();
    assert.equal(await root.locator('.channel-detail-heading .circuit-badge').count(), 2);
    assert.equal(await root.locator('[data-penta-specific]').count(), 0);
    await page.screenshot({ path: path.join(artifacts, `penta-channel-${width}.png`) });
    await root.locator('[data-shared-back]').click();
    assert.equal(await root.locator('[data-shared-gate="31"]').count(), 1);
    await root.locator('[data-shared-channel-select="7-31"]').click();
    await root.locator('[data-shared-gate-select="31"]').click();
    await root.locator('.gate-detail-close').click();
    assert.equal(await root.isVisible(), false);
    await page.locator('.penta-gate-reading[data-detail-id="31"]').click();
    await page.keyboard.press('Escape');
    assert.equal(await root.isVisible(), false);
    assert.equal(await page.locator('.penta-gate-reading[data-detail-id="31"]').evaluate(el => el === document.activeElement), true);
  }
  assert.deepEqual(errors, []);
  console.log(`PASS actual chart + matrix clicks, shared headings, lenses, links, Back, Close, Escape, focus, desktop/mobile; screenshots: ${artifacts}`);
} finally { await browser.close(); }
