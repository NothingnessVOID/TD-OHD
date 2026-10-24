import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

const profile = {
  id: 'design-review', name: '设计预览',
  birthDate: '1995-06-18', birthTime: '08:42',
  location: { name: '上海', iana: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 }
};
console.log('storage key:', PROFILE_STORAGE_KEY);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 200)); });

await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });

await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(12000);
const state = await page.evaluate(() => ({
  boot: document.getElementById('boot-status')?.textContent,
  bootHidden: document.getElementById('birth-entry')?.classList.contains('hidden'),
  chartHidden: document.getElementById('chart-view')?.classList.contains('hidden'),
  bgWrap: !!document.querySelector('.bg-svg-wrap'),
  containerHtmlLen: document.getElementById('bodygraph-container')?.innerHTML.length
}));
console.log(JSON.stringify(state));
await page.screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/.tmp/sheet-v1-shots/probe.png' });
await browser.close();
