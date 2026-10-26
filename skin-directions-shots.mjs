import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

const profile = {
  id: 'design-review', name: '设计预览',
  birthDate: '1995-06-18', birthTime: '08:42',
  location: { name: '上海', iana: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));

await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });

await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

const skins = [
  ['direction-a-light', 'light', 'A-light'],
  ['direction-a-dark', 'dark', 'A-dark'],
  ['direction-b-light', 'light', 'B-light'],
  ['direction-b-dark', 'dark', 'B-dark'],
  ['direction-c-light', 'light', 'C-light'],
  ['direction-c-dark', 'dark', 'C-dark'],
];
for (const [skin, theme, label] of skins) {
  await page.evaluate(({ skin, theme }) => {
    const root = document.documentElement;
    root.setAttribute('data-skin', skin);
    root.setAttribute('data-theme', theme);
  }, { skin, theme });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/skin-${label}.png` });
  console.log('shot', label);
}
await browser.close();
