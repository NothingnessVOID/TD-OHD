import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const base = process.env.E2E_URL || 'http://127.0.0.1:5186';
const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1380, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/#library`);
    await page.locator('#library-view:not(.hidden) #reference-count').waitFor();
    assert.deepEqual(await page.locator('.nav-link.active').evaluateAll(nodes => nodes.map(node => node.dataset.view)), ['library']);
    assert.match(await page.locator('#reference-count').innerText(), /125/);
    assert.equal(await page.locator('#birth-entry').isVisible(), false);
    await page.locator('[data-reference-filter="planet"]').click();
    assert.match(await page.locator('#reference-count').innerText(), /13/);
    assert.equal(await page.locator('#reference-results .reference-result').count(), 13);
    for (const [query, id] of [['太阳', 'sun'], ['Sun', 'sun'], ['北交点', 'northNode']]) {
      await page.locator('#reference-search').fill(query);
      assert.equal(await page.locator('#reference-results .reference-result').count(), 1);
      assert.equal(await page.locator('#reference-results .reference-result').getAttribute('data-reference-id'), id);
    }
    await page.goto(`${base}/#library/planet/sun`);
    await page.locator('#reference-detail h2').waitFor();
    assert.match(await page.locator('#reference-detail').innerText(), /设计|Design/);
    assert.equal(new URL(page.url()).search, '');
    await page.goto(`${base}/#library/planet/northNode`);
    await page.locator('#reference-detail h2').waitFor();
    assert.match(await page.locator('#reference-detail h2').innerText(), /北交点|North Node/);
    for (const language of ['zh-CN', 'en', 'zh-Hant']) {
      await page.locator('#language-switcher').selectOption(language);
      assert.match(page.url(), /#library\/planet\/northNode$/);
      assert.ok((await page.locator('#reference-detail .reference-reading').innerText()).length > 50);
    }
    await page.locator('#language-switcher').selectOption('zh-CN');
    await page.goto(`${base}/#library`);
    await page.locator('#reference-search').fill('');
    await page.locator('[data-reference-filter="all"]').click();
    if (viewport.width > 600) {
      await page.locator('#reference-results').evaluate(node => { node.scrollTop = 150; });
      assert.ok(await page.locator('#reference-results').evaluate(node => node.scrollTop) > 0);
    }
    await page.locator('#reference-results .reference-result').nth(7).click();
    await page.locator('#reference-detail .reference-back').waitFor();
    if (viewport.width > 600) assert.ok(await page.locator('#reference-results').evaluate(node => node.scrollTop) > 0);
    await page.locator('#reference-detail .reference-back').click();
    assert.match(await page.locator('#reference-detail .reference-empty').innerText(), /选择条目|Select an entry/);
    if (viewport.width > 600) assert.equal(await page.evaluate(() => window.scrollY), 0);
    await page.locator('[data-reference-filter="channel"]').click();
    assert.match(await page.locator('#reference-count').innerText(), /36/);
    await page.locator('#reference-search').fill('60–3');
    assert.equal(await page.locator('.reference-result').count(), 1);
    await page.locator('.reference-result').click();
    assert.match(page.url(), /#library\/channel\/3-60/);
    assert.match(await page.locator('#reference-detail').innerText(), /3-60/);
    await page.goto(`${base}/#library/gate/14?line=2`);
    await page.locator('#reference-detail .gate-detail-line[data-line="2"]').waitFor();
    assert.equal(await page.locator('#reference-detail .gate-detail-line').count(), 6);
    assert.equal(await page.locator('#reference-detail [data-reference-line]').count(), 0);
    await page.locator('#reference-detail .gate-detail-line[data-line="2"].reference-line-target').waitFor();
    await page.locator('#reference-detail [data-reference-lens="gk"]').click();
    assert.equal(await page.locator('#reference-detail .gate-detail-line').count(), 0);
    assert.doesNotMatch(await page.locator('#reference-detail h2').innerText(), /14\.2/);
    await page.locator('#reference-detail [data-reference-lens="hd"]').click();
    await page.locator('#language-switcher').selectOption('en');
    assert.match(await page.locator('.reference-heading h1').innerText(), /Reference Library/);
    assert.match(page.url(), /#library\/gate\/14\?line=2/);
    await page.locator('#language-switcher').selectOption('zh-Hant');
    assert.match(await page.locator('.reference-heading h1').innerText(), /資料庫/);
    await page.locator('#language-switcher').selectOption('zh-CN');
    await page.goto(`${base}/#library/gate/14.7`);
    await page.locator('#reference-detail').waitFor();
    assert.match(await page.locator('#reference-detail').innerText(), /无效|Invalid/);

    await page.goto(`${base}/?d=1990-06-15&t=14%3A30&tz=-6`);
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
    await page.locator('.bg-planet-row[data-gate="34"]').first().click();
    await page.locator('#gate-detail:not(.hidden) [data-detail-kind="planet"]').waitFor();
    await page.locator('#gate-detail [data-planet-gate]').click();
    const popupCore = await page.locator('#lens-content').innerText();
    assert.equal(await page.locator('#gate-detail .gate-detail-line').count(), 6);
    await page.locator('#gate-detail [data-lens="iching"]').click();
    assert.ok((await page.locator('#lens-content').innerText()).length > 20);
    await page.locator('#gate-detail [data-lens="gk"]').click();
    assert.ok((await page.locator('#lens-content').innerText()).length > 20);
    assert.ok(await page.locator('#gate-detail .selected-activation').count());
    assert.ok(await page.locator('#gate-detail [data-channel]').count() > 1);
    await page.locator('#gate-detail [data-channel]').first().click();
    assert.match(await page.locator('#gate-detail').innerText(), /通道|Channel/);
    await page.locator('#gate-detail .gate-detail-back').click();
    assert.equal(await page.locator('#gate-detail [data-lens="gk"]').getAttribute('class'), 'active');
    await page.locator('#gate-detail [data-lens="hd"]').click();
    assert.equal((await page.locator('#lens-content').innerText()).trim(), popupCore.trim());
    assert.ok(await page.locator('#gate-detail .selected-activation').count());
    await page.keyboard.press('Escape');
    if (viewport.width < 600) await page.locator('#mobile-menu-toggle').click();
    await page.locator('.nav-link[data-view="library"]').click();
    await page.locator('#library-view:not(.hidden)').waitFor();
    assert.equal(new URL(page.url()).search, '');
    await page.goto(`${base}/#library/gate/34`);
    await page.locator('#reference-detail .gate-detail-line').first().waitFor();
    const libraryCore = await page.locator('#reference-detail .reference-reading').innerText();
    assert.equal(libraryCore.trim(), popupCore.trim());
    await page.locator('#reference-detail [data-reference-lens="iching"]').click();
    assert.ok((await page.locator('#reference-detail .reference-reading').innerText()).length > 20);
    await page.locator('#reference-detail [data-reference-lens="gk"]').click();
    await page.locator('#reference-detail [data-reference-kind="channel"]').first().click();
    await page.goBack();
    await page.locator('#reference-detail [data-reference-lens="gk"].active').waitFor();
    await page.reload();
    await page.locator('#reference-detail [data-reference-lens="hd"].active').waitFor();

    // A zero-channel synthetic chart still exposes its activated hanging gates.
    await page.goto(`${base}/?d=1981-03-22&t=12%3A00&tz=0`);
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
    assert.ok(await page.locator('.bg-planet-row[data-gate]').count() > 0);
    await page.locator('.bg-planet-row[data-gate]').first().click();
    await page.locator('#gate-detail [data-planet-gate]').click();
    await page.locator('#gate-detail:not(.hidden) [data-channel]').first().waitFor();
    await page.locator('#gate-detail [data-channel]').first().click();
    assert.match(await page.locator('#gate-detail').innerText(), /Not defined|未定义|未定義/);

    // Existing local profile cannot leak birth parameters into a pure library deep link.
    await page.goto(`${base}/`);
    await page.locator('#birth-entry:not(.hidden) #birth-form').waitFor();
    await page.locator('#birth-name').fill('Synthetic Reader');
    await page.locator('#birth-date').fill('1985-01-01');
    await page.locator('#birth-time').fill('12:00');
    await page.locator('#manual-tz-toggle').click();
    await page.locator('#manual-tz').fill('0');
    await page.locator('#birth-form button[type="submit"]').click();
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
    await page.goto(`${base}/#library/gate/14`);
    await page.locator('#reference-detail .gate-detail-line').first().waitFor();
    assert.equal(new URL(page.url()).search, '');
    assert.equal(await page.locator('#birth-entry').isVisible(), false);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Reference browser flow passed at desktop and mobile viewports.');
} finally {
  await browser.close();
}
