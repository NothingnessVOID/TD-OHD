import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
const base = process.env.E2E_URL || 'http://127.0.0.1:19979';
const out = 'artifacts/visual-review/penta-reading-v1';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const normalize = value => value.replace(/\s+/g, ' ').trim();
let checks = 0;
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/dev/test-people.html`);
    await page.locator('#import:not([disabled])').click();
    await page.goto(base);
    if (width <= 640) await page.locator('#mobile-menu-toggle').click();
    await page.locator('[data-view="team"]').click();
    await page.locator('#team-add-saved-person').click();
    for (let i = 1; i <= 3; i++) await page.locator(`[data-add-person="td-ohd-fictional-0${i}"]`).click();
    await page.locator('#team-selection-confirm').click();
    await page.waitForFunction(() => document.querySelectorAll('.penta-channel-reading').length === 6 && document.querySelector('#team-content').getAttribute('aria-busy') === 'false');
    for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
      await page.evaluate(async locale => (await import('/src/lib/i18n.js')).setLocale(locale, { persist: false }), locale);
      const entries = await page.evaluate(async () => (await import('/src/lib/knowledge/registry.js')).listKnowledgeEntries({ includePenta: true }).filter(e => e.objectType === 'penta'));
      assert.equal(entries.length, 29);
      assert.equal(await page.locator('.penta-background-note').count(), 3);
      const focus = page.locator('[data-focus-member]').first();
      if (await focus.getAttribute('aria-pressed') !== 'true') await focus.click();
      assert.equal(await focus.getAttribute('aria-pressed'), 'true');
      for (const entry of entries.filter(e => /^(gate|channel):/.test(e.objectId))) {
        const [kind, id] = entry.objectId.split(':');
        const trigger = page.locator(`.penta-${kind}-hit[data-${kind}="${id}"]`);
        await trigger.click();
        const dialog = page.locator('.penta-detail:not(.hidden)');
        await dialog.waitFor();
        assert.equal(normalize(await dialog.locator('.knowledge-summary-text').innerText()), normalize(entry.summary.content));
        assert.equal(normalize(await dialog.locator('.knowledge-body').innerText()), normalize(entry.detail.content));
        assert.notEqual(normalize(entry.summary.content), normalize(entry.detail.content));
        assert.ok(await dialog.locator('.knowledge-body p').count() >= 2);
        assert.ok(await dialog.locator('.penta-member-identity').count() > 0 || (await dialog.innerText()).length > 200);
        assert.doesNotMatch(await dialog.innerText(), /humanApproval|editorialReview|sourceRefs|undefined/);
        if (kind === 'gate') {
          const hexagram = await page.evaluate(async id => (await import('/src/lib/vocabulary.js')).hexagramName(Number(id)), id);
          assert.ok((await dialog.locator('.detail-hexagram').innerText()).includes(hexagram));
          for (const lens of ['iching', 'gk', 'meridian', 'hd']) {
            await dialog.locator(`[data-shared-lens="${lens}"]`).click();
            assert.ok((await dialog.locator('[data-shared-reading]').innerText()).length > 20);
          }
        }
        if (id === '31') {
          await dialog.locator('[data-shared-channel-select="7-31"]').click();
          await dialog.locator('[data-shared-gate-select="7"]').click();
          await dialog.locator('[data-shared-back]').click();
          assert.equal(await dialog.locator('[data-penta-channel-state]').count(), 1);
          await dialog.locator('[data-shared-back]').click();
          assert.equal(await dialog.locator('[data-shared-gate="31"]').count(), 1);
          await page.screenshot({ path: `${out}/${width}-${locale}-gate.png`, animations: 'disabled' });
        }
        await page.keyboard.press('Escape');
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
        assert.equal(await focus.getAttribute('aria-pressed'), 'true');
        checks++;
      }
      await page.locator('#team-penta-library').click();
      await page.locator('#library-view:not(.hidden)').waitFor();
      assert.equal(await page.locator('.reference-result').count(), 29);
      await page.locator('.reference-filter-toggle').click();
      await page.locator('[data-reference-filter="penta-mechanism"]').click();
      assert.equal(await page.locator('.reference-result').count(), 11);
      for (const entry of entries.filter(e => !/^(gate|channel):/.test(e.objectId))) {
        await page.locator(`.reference-result[data-reference-id="${entry.id}"]`).click();
        assert.equal(normalize(await page.locator('#reference-detail .knowledge-body').innerText()), normalize(entry.detail.content));
        assert.equal(normalize(await page.locator('#reference-detail .knowledge-summary-text').innerText()), normalize(entry.summary.content));
        assert.ok(await page.locator('#reference-detail .knowledge-body p').count() >= 2);
        assert.ok(page.url().includes('filter=penta-mechanism'));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (entry.objectId === 'three-paths-six-links') await page.screenshot({ path: `${out}/${width}-${locale}-mechanism.png`, animations: 'disabled' });
        await page.locator(width <= 640 ? '#reference-mobile-detail .gate-detail-back' : '#reference-detail .reference-back').click();
        await page.locator('#reference-detail .reference-empty').waitFor({ state: 'attached' });
        assert.equal(await page.locator('.reference-result').count(), 11);
        checks++;
      }
      await page.screenshot({ path: `${out}/${width}-${locale}-library.png`, animations: 'disabled' });
      if (width <= 640) await page.locator('#mobile-menu-toggle').click();
      await page.locator('[data-view="team"]').click();
      await page.waitForFunction(() => document.querySelector('#team-content').getAttribute('aria-busy') === 'false');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`PASS ${checks} entry/viewport/locale reads; 1440/390/320; gate lenses and gate-channel-back; focus/close/member context; 11 mechanism library; 27 screenshots`);
} finally { await browser.close(); }
