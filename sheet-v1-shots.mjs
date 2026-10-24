import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';
import { mkdirSync } from 'node:fs';

const OUT = '/Users/abyssldx/Desktop/OH-WorkSpace/.tmp/sheet-v1-shots';
mkdirSync(OUT, { recursive: true });

const profile = {
  id: 'design-review', name: '设计预览',
  birthDate: '1995-06-18', birthTime: '08:42',
  location: { name: '上海', iana: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });

await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
await page.waitForTimeout(2500);

await page.screenshot({ path: `${OUT}/desktop-light.png` });
await page.evaluate(() => document.getElementById('theme-toggle')?.click());
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/desktop-dark.png` });
await page.evaluate(() => document.getElementById('theme-toggle')?.click());
await page.waitForTimeout(500);

// right column close-up
const col = page.locator('.info-column');
await col.screenshot({ path: `${OUT}/column-light.png` });

// centers tab rows close-up after clicking a row's knowledge detail? just tabs shot
await page.locator('.panel-tab[data-panel="channels"]').click();
await page.waitForTimeout(600);
await col.screenshot({ path: `${OUT}/column-channels.png` });
await page.locator('.panel-tab[data-panel="centers"]').click();
await page.waitForTimeout(400);

// mobile
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mpage = await mctx.newPage();
await mpage.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });
await mpage.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await mpage.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
await mpage.waitForTimeout(2500);
await mpage.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: true });

console.log('errors:', errors.length ? errors.slice(0, 5).join('\n') : 'none');
await browser.close();
