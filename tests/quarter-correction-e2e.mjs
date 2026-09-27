import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage({ locale: 'zh-CN' });
  await page.goto(`${base}/?d=1990-04-17&t=12:00&tz=0&view=chart`);
  await page.waitForSelector('#chart-view:not(.hidden)');
  await page.locator('.panel-tab[data-panel="cross"]').click();
  const content = await page.locator('#panel-content').textContent();
  assert.match(content, /启蒙象限/);
  assert.doesNotMatch(content, /突变象限/);
  console.log('Gate 3 quarter browser check passed.');
} finally { await browser.close(); }
