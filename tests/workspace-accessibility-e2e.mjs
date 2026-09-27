import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const chrome = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : { channel: process.env.CHROME_CHANNEL || 'chrome' };
const browser = await chromium.launch({ ...chrome, headless: true });
try {
  const context = await browser.newContext({ locale: 'en-GB', viewport: { width: 1000, height: 760 } });
  const page = await context.newPage();
  await page.goto(`${base}/#library`);
  await page.locator('#knowledge-search').fill('24-61');
  await page.locator('#knowledge-results .knowledge-result').first().focus();
  await page.keyboard.press('Enter');
  assert.match(new URL(page.url()).hash, /^#library\/channel\/24-61/);
  await page.goBack();
  assert.equal(await page.locator('#knowledge-search').inputValue(), '24-61');

  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.selectOption('#language-switcher', 'zh-CN');
  await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
  assert.equal(await page.locator('#knowledge-search').inputValue(), '24-61');
  await page.selectOption('#language-switcher', 'zh-Hant');
  await page.waitForFunction(() => document.documentElement.lang === 'zh-Hant');
  assert.equal(await page.locator('#knowledge-search').inputValue(), '24-61');

  await page.locator('.nav-link[data-view="observations"]').click();
  await page.locator('[data-ob="new"]').click();
  assert.equal(await page.evaluate(() => document.activeElement?.name), 'raw');
  await page.locator('.ob-editor textarea[name="raw"]').fill('A keyboard-accessible synthetic note.');
  await page.locator('.ob-editor button[type="submit"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('.ob-list-item').first().waitFor();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-GB' });
  for (const hash of ['#library', '#observations']) {
    await mobile.goto(`${base}/${hash}`);
    await mobile.locator(hash === '#library' ? '#knowledge-search' : '.ob-editor').waitFor();
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${hash} must not scroll horizontally`);
  }
  await mobile.close();
  await context.close();
  console.log('Workspace keyboard, language, theme and small-screen checks passed.');
} finally { await browser.close(); }
