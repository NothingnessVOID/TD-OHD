import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const chrome = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : { channel: process.env.CHROME_CHANNEL || 'chrome' };
const browser = await chromium.launch({ ...chrome, headless: true });
const context = await browser.newContext({ viewport: { width: 1250, height: 850 }, locale: 'en-GB', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${base}/#observations`);
  await page.locator('.ob-editor textarea[name="raw"]').fill('An immediate observation without a chart.');
  await page.locator('.ob-editor input[name="alias"]').fill('Study A');
  await page.selectOption('#language-switcher', 'zh-CN');
  assert.equal(await page.locator('.ob-editor textarea[name="raw"]').inputValue(), 'An immediate observation without a chart.');
  await page.selectOption('#language-switcher', 'zh-Hant');
  assert.equal(await page.locator('.ob-editor textarea[name="raw"]').inputValue(), 'An immediate observation without a chart.');
  await page.selectOption('#language-switcher', 'en');
  await page.locator('.ob-editor [type="submit"]').click();
  await page.getByText('Observation saved.').waitFor();
  assert.equal(await page.locator('.ob-list-item').count(), 1);
  await page.reload();
  await page.locator('.ob-list-item').first().click();
  assert.equal(await page.locator('.ob-editor textarea[name="raw"]').inputValue(), 'An immediate observation without a chart.');
  await page.locator('.ob-editor textarea[name="interpretation"]').fill('A later interpretation.');
  await page.locator('.ob-editor [type="submit"]').click();
  await page.getByText('Observation saved.').waitFor();

  const downloadPromise = page.waitForEvent('download');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-ob="export-anon"]').click();
  const download = await downloadPromise;
  const backup = JSON.parse((await import('node:fs')).readFileSync(await download.path(), 'utf8'));
  assert.equal(backup.records[0].personId, null);
  assert.equal(backup.records[0].alias, '');
  assert.equal(backup.records[0].raw, 'An immediate observation without a chart.');
  assert.equal(backup.records[0].interpretation, 'A later interpretation.');

  const changed = structuredClone(backup);
  changed.records[0].raw = 'Conflicting imported version.';
  const input = page.locator('.ob-file');
  await input.setInputFiles({ name: 'observations.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) });
  await page.getByText('Restore preview').waitFor();
  assert.match(await page.locator('.ob-import-preview').innerText(), /Conflicting IDs kept as copies: 1/);
  await page.locator('[data-ob="confirm-import"]').click();
  await page.getByText('Imported 1 notes.').waitFor();
  assert.equal(await page.locator('.ob-list-item').count(), 2);
  assert.ok(errors.length === 0, errors.join('\n'));

  await page.goto(`${base}/?d=1990-06-15&t=14:30&tz=8&n=Observation%20Demo&view=timeline`);
  await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 120000 });
  await page.locator('.nav-link[data-view="observations"]').click();
  await page.locator('[data-ob="new"]').click();
  await page.locator('.ob-editor textarea[name="raw"]').fill('Timeline observation.');
  await page.locator('[data-ob="capture"]').click();
  await page.getByText('Timeline snapshot attached. Save this note to keep it.').waitFor();
  await page.locator('.ob-editor [type="submit"]').click();
  await page.waitForFunction(() => /Observation saved|Invalid|Could not/.test(document.querySelector('.ob-status')?.textContent || ''));
  assert.equal(await page.locator('.ob-status').innerText(), 'Observation saved.');
  const stored = await page.evaluate(async () => {
    const req = indexedDB.open('td-ohd-observations');
    const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    const tx = db.transaction('records', 'readonly');
    const get = tx.objectStore('records').getAll();
    const result = await new Promise((resolve, reject) => { get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    db.close(); return result;
  });
  const captured = stored.find(item => item.raw === 'Timeline observation.');
  assert.equal(captured.snapshot.engineVersion, 'natalengine-1.6.0');
  assert.ok(captured.snapshot.activeGates.length > 0);
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-GB' });
  await mobile.goto(`${base}/#observations`);
  await mobile.locator('.ob-editor').waitFor();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.close();
  console.log('Observation browser checks passed.');
} finally { await browser.close(); }
