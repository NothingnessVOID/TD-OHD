/** Each view exports its own visible content through the shared header menu. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1224, height: 800 }, locale: 'zh-CN', acceptDownloads: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
  await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();

  for (const view of ['chart', 'transits', 'timeline', 'connection', 'team', 'library']) {
    if (view !== 'chart') {
      await page.locator(`.nav-link[data-view="${view}"]`).click();
      await page.locator(`#${view}-view:not(.hidden)`).waitFor();
    }
    if (view === 'timeline') await page.waitForFunction(() =>
      document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 120000 });
    await page.locator('#more-toggle').click();
    assert.equal(await page.locator('#chart-share-menu summary').isVisible(), true, `${view} share button`);
    await page.locator('#chart-share-menu summary').click();
    assert.equal(await page.locator('#save-image').isVisible(), true, `${view} image action`);
    assert.equal(await page.locator('#share-chart').count(), view === 'chart' ? 1 : 0);
    const downloaded = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('#save-image').click();
    const download = await downloaded;
    assert.equal(await download.failure(), null, `${view} download succeeds`);
    assert.equal(download.suggestedFilename(), view === 'chart' ? 'human-design-chart.png' : `td-ohd-${view}.png`);
    const png = await readFile(await download.path());
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${view} PNG signature`);
    assert.ok(png.readUInt32BE(16) >= 300 && png.readUInt32BE(20) >= 100, `${view} nontrivial dimensions`);
    if (process.env.SHARE_CAPTURE_DIR) {
      await mkdir(process.env.SHARE_CAPTURE_DIR, { recursive: true });
      await download.saveAs(`${process.env.SHARE_CAPTURE_DIR}/${download.suggestedFilename()}`);
    }
    console.log(`${view}: ${png.readUInt32BE(16)}×${png.readUInt32BE(20)}, ${png.length} bytes`);
  }
  assert.deepEqual(errors, []);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', acceptDownloads: true });
  const mobileErrors = [];
  mobile.on('pageerror', error => mobileErrors.push(error.message));
  await mobile.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8&view=timeline`);
  await mobile.locator('#timeline-view:not(.hidden) .tl-mobile-event-nav').waitFor();
  await mobile.waitForFunction(() =>
    document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 120000 });
  assert.equal(await mobile.locator('.tl-mobile-share').count(), 0, 'mobile timeline has no duplicate image action');
  await mobile.locator('.tl-mobile-exit').click();
  await mobile.locator('#more-toggle').click();
  assert.equal(await mobile.locator('#chart-share-menu summary').isVisible(), true, 'mobile header exposes the shared image action');
  await mobile.locator('#chart-share-menu summary').click();
  const mobileDownloaded = mobile.waitForEvent('download', { timeout: 30000 });
  await mobile.locator('#save-image').click();
  const mobileDownload = await mobileDownloaded;
  assert.equal(await mobileDownload.failure(), null, 'mobile timeline download succeeds');
  assert.equal(mobileDownload.suggestedFilename(), 'td-ohd-timeline.png');
  const mobilePng = await readFile(await mobileDownload.path());
  assert.equal(mobilePng.toString('hex', 0, 8), '89504e470d0a1a0a', 'mobile timeline PNG signature');
  assert.ok(mobilePng.readUInt32BE(16) >= 390 && mobilePng.readUInt32BE(20) >= 800,
    'mobile timeline PNG includes the visible page');
  assert.deepEqual(mobileErrors, []);
  await mobile.close();
} finally {
  await browser.close();
}
