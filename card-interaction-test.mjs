import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

const profile = {
  id: 'design-review', name: '设计预览',
  birthDate: '1995-06-18', birthTime: '08:42',
  location: { name: '上海', iana: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });
await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
await page.waitForTimeout(1200);

const dialogOpen = () => page.evaluate(() => {
  const d = document.getElementById('gate-detail') || document.querySelector('.detail-dialog, [data-detail-owner]');
  return d ? d.offsetHeight > 0 && !d.classList.contains('hidden') : false;
});
const closeDialog = async () => {
  await page.locator('.gate-detail-close, .detail-dialog-close').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
};

// 1. variable slot click (design side)
await page.locator('.pc-var-slot[data-source="design"]').first().click();
await page.waitForTimeout(700);
console.log('variable slot opens detail:', await dialogOpen());
await closeDialog();

// 2. cross name click
await page.locator('.pc-card--cross .pc-card-value').click();
await page.waitForTimeout(700);
console.log('cross value opens detail:', await dialogOpen());
await closeDialog();

// 3. authority / definition / profile cards still clickable
for (const sel of ['.pc-card--authority', '.pc-card--definition', '.pc-card--profile']) {
  await page.locator(sel).first().click();
  await page.waitForTimeout(700);
  console.log(`${sel} opens detail:`, await dialogOpen());
  await closeDialog();
}

// 4. tab switching still works after the layout change
for (const tab of ['中心', '通道']) {
  await page.locator('.panel-tab', { hasText: tab }).first().click();
  await page.waitForTimeout(500);
  const nodes = await page.evaluate(() => document.querySelectorAll('#panel-content *').length);
  console.log(`tab ${tab}: content nodes ${nodes}`);
}
await page.locator('.panel-tab').first().click();
await page.waitForTimeout(500);

console.log('errors:', errors.length, errors.join(' | '));
await browser.close();
