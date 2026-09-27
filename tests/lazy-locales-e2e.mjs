import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from 'playwright-core';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const entry = readdirSync(new URL('../dist/assets/', import.meta.url)).find(name => /^index-.*\.js$/.test(name));
const entrySource = readFileSync(new URL(`../dist/assets/${entry}`, import.meta.url), 'utf8');
assert.ok(!entrySource.includes('乾卦带来最高的成功'));
assert.ok(!entrySource.includes('乾卦帶來最高的成功'));
const chrome = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : { channel: process.env.CHROME_CHANNEL || 'chrome' };
let browser;
try {
  browser = await chromium.launch({ ...chrome, headless: true });
  for (const [language, expected, chunkCount] of [['en-GB', 'en', 0], ['zh-CN', 'zh-CN', 1], ['zh-TW', 'zh-Hant', 1], ['fr-FR', 'en', 0]]) {
    const context = await browser.newContext({ locale: language });
    const page = await context.newPage();
    const chunks = [];
    page.on('request', request => {
      if (/\/assets\/full-[^/]+\.js$/.test(request.url())) chunks.push(request.url());
    });
    await page.goto(`${base}/#library/gate/60`);
    await page.locator('#knowledge-detail .knowledge-detail-header').waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), expected);
    assert.equal(chunks.length, chunkCount, `${language} should fetch only its language payload`);
    await context.close();
  }

  const context = await browser.newContext({ locale: 'en-GB', viewport: { width: 1000, height: 700 } });
  const page = await context.newPage();
  const chunks = [];
  page.on('request', request => {
    if (/\/assets\/full-[^/]+\.js$/.test(request.url())) chunks.push(request.url());
  });
  await page.goto(`${base}/#library/gate/60`);
  await page.locator('#knowledge-detail .knowledge-detail-header').waitFor();
  await page.evaluate(() => window.scrollTo(0, 350));
  const before = await page.evaluate(() => window.scrollY);
  await page.selectOption('#language-switcher', 'zh-CN');
  await page.waitForFunction(() => document.documentElement.lang === 'zh-CN');
  assert.equal(new URL(page.url()).hash, '#library/gate/60');
  assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - before) < 80);
  await page.selectOption('#language-switcher', 'zh-Hant');
  await page.waitForFunction(() => document.documentElement.lang === 'zh-Hant');
  assert.equal(chunks.length, 2, 'each Chinese payload is loaded once, on first selection');
  assert.equal(new URL(page.url()).hash, '#library/gate/60');
  await context.close();
  console.log('Locale payloads load on demand; language switching preserves the library route and reading position.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
