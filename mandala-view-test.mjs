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
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0, 200)); });

await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });

await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

// 1. toggle now in header
const inHeader = await page.evaluate(() => !!document.querySelector('.header-actions .graph-view-toggle:not(.hidden)'));
console.log('toggle in header:', inHeader);

// 2. click wheel
await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
await page.waitForTimeout(1200);

const state = await page.evaluate(() => {
  const layout = document.querySelector('#chart-view .chart-layout');
  const svg = document.querySelector('#mandala-container svg.md-root');
  return {
    mandalaMode: layout?.classList.contains('mandala-mode'),
    gridCols: layout ? getComputedStyle(layout).gridTemplateColumns : null,
    gateAttrs: svg ? svg.querySelectorAll('[data-md-gate]').length : 0,
    planetHits: svg ? svg.querySelectorAll('.md-planet-hit').length : 0,
    hexAttrs: svg ? svg.querySelectorAll('.md-hexagrams [data-md-gate]').length : 0
  };
});
console.log(JSON.stringify(state));
await page.screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/mandala-v2.png' });

// 3. click a planet → detail dialog should open
const planet = page.locator('.md-planet-hit').first();
await planet.click();
await page.waitForTimeout(800);
const dialogOpen = await page.evaluate(() => {
  const d = document.getElementById('gate-detail') || document.querySelector('.detail-dialog, [data-detail-owner]');
  return d ? !(d.classList?.contains('hidden')) && d.offsetHeight > 0 : false;
});
console.log('detail opened on planet click:', dialogOpen);
await page.screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/mandala-v2-detail.png' });
await page.locator('.gate-detail-close').first().click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(500);

// 4. click a defined wedge → gate detail (numbers are pointer-events:none per official; wedge/hexagram carry the clicks)
await page.locator('.md-gates .radial use.defined').first().click();
await page.waitForTimeout(800);
const gateDialog = await page.evaluate(() => {
  const d = document.getElementById('gate-detail') || document.querySelector('[data-detail-owner]');
  return d ? d.offsetHeight > 0 : false;
});
console.log('detail opened on wedge click:', gateDialog);
await page.locator('.gate-detail-close').first().click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(400);

// 5. click a hexagram (undefined gate path)
await page.evaluate(() => { document.querySelector('.md-hexagrams [data-md-gate]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await page.waitForTimeout(800);
const hexDialog = await page.evaluate(() => {
  const d = document.getElementById('gate-detail') || document.querySelector('[data-detail-owner]');
  return d ? d.offsetHeight > 0 : false;
});
console.log('detail opened on hexagram click:', hexDialog);

await browser.close();
