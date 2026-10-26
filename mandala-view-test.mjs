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
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text().slice(0, 300)); });

await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: profile, key: PROFILE_STORAGE_KEY });

await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

// click the wheel toggle
const wheelBtn = page.locator('.graph-view-btn[data-graph-view="mandala"]');
console.log('toggle visible:', await wheelBtn.isVisible().catch(() => false));
await wheelBtn.click();
await page.waitForTimeout(1500);

const state = await page.evaluate(() => {
  const mc = document.getElementById('mandala-container');
  const svg = mc && mc.querySelector('svg.md-root');
  return {
    mandalaHidden: mc ? mc.classList.contains('hidden') : null,
    bodyHidden: document.getElementById('bodygraph-container').classList.contains('hidden'),
    hasSvg: !!svg,
    wedges: svg ? svg.querySelectorAll('.md-gates .radial use').length : 0,
    planets: svg ? svg.querySelectorAll('.md-gates .planets use').length : 0,
    hexes: svg ? svg.querySelectorAll('.md-hexagrams > g').length : 0,
    zodiacs: svg ? svg.querySelectorAll('.md-zodiacs > g:not(.ticks)').length : 0,
    bodyClone: !!svg?.querySelector('.md-bodygraph')
  };
});
console.log(JSON.stringify(state));
await page.screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/mandala-view.png' });

// switch back
await page.locator('.graph-view-btn[data-graph-view="bodygraph"]').click();
await page.waitForTimeout(600);
const back = await page.evaluate(() => ({
  bodyHidden: document.getElementById('bodygraph-container').classList.contains('hidden'),
  mandalaHidden: document.getElementById('mandala-container').classList.contains('hidden')
}));
console.log('back:', JSON.stringify(back));
await browser.close();
