import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

const profile = {
  id: 'design-review', name: '设计预览',
  birthDate: '1995-06-18', birthTime: '08:42',
  location: { name: '上海', iana: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const newPage = async (vp) => {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
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
  await page.waitForTimeout(600);
  return { page, errors };
};

// ---- 1. desktop: variable square order + toggle home ----
{
  const { page, errors } = await newPage({ width: 1440, height: 1000 });
  const v = await page.evaluate(() => {
    const heads = [...document.querySelectorAll('.pc-var-col-head')].map(h => ({ text: h.textContent.trim(), source: h.dataset.side }));
    const slots = [...document.querySelectorAll('.pc-var-slot')].map(s => ({ text: s.textContent.trim(), source: s.dataset.source, x: Math.round(s.getBoundingClientRect().left) }));
    const toggle = document.querySelector('.graph-view-toggle');
    return {
      heads, slots,
      toggleParent: toggle.parentElement.className,
      toggleIsFirst: toggle.parentElement.firstElementChild === toggle,
      toggleVisible: toggle.offsetParent !== null
    };
  });
  check('变量方阵列头顺序 = 人格 左 / 设计 右',
    v.heads[0]?.source === 'personality' && v.heads[1]?.source === 'design',
    v.heads.map(h => h.text).join(' | '));
  const leftCol = v.slots.filter(s => s.x === Math.min(...v.slots.map(x => x.x)));
  check('左列两格都是人格（动机/视角）',
    leftCol.length === 2 && leftCol.every(s => s.source === 'personality'),
    v.slots.map(s => `${s.text}:${s.source}@${s.x}`).join(' '));
  const topRow = v.slots.filter(s => s.source === 'personality');
  check('人格列上动机下视角', v.slots[0]?.text.includes('动') && v.slots[2]?.text.includes('视'),
    v.slots.map(s => s.text).join('/'));
  check('桌面：开关在顶栏 header-actions 且是第一个', v.toggleParent.includes('header-actions') && v.toggleIsFirst && v.toggleVisible, v.toggleParent);
  check('桌面无控制台报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---- 2. the 641–900px gap that used to hide the switch entirely ----
for (const width of [700, 800, 900]) {
  const { page, errors } = await newPage({ width, height: 800 });
  const s = await page.evaluate(() => {
    const t = document.querySelector('.graph-view-toggle');
    return { parent: t.parentElement.className, visible: t.offsetParent !== null, inNav: !!t.closest('#primary-nav') };
  });
  check(`${width}px 宽：开关可见且在顶栏`, s.visible && !s.inNav && s.parent.includes('header-actions'), `parent=${s.parent}`);
  check(`${width}px 宽：无报错`, errors.length === 0, errors.join(' | '));
  await page.close();
}

// ---- 3. phone: switch lives in the nav panel and works ----
{
  const { page, errors } = await newPage({ width: 390, height: 844 });
  const before = await page.evaluate(() => {
    const t = document.querySelector('.graph-view-toggle');
    return { inNav: !!t.closest('#primary-nav'), headerHasIt: !!document.querySelector('.header-actions .graph-view-toggle') };
  });
  check('手机：开关已移入导航面板', before.inNav && !before.headerHasIt);

  await page.locator('#mobile-menu-toggle').click();
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => {
    const t = document.querySelector('.graph-view-toggle');
    return { menuOpen: document.body.classList.contains('mobile-nav-open'), visible: t.offsetParent !== null, h: Math.round(t.getBoundingClientRect().height) };
  });
  check('手机：菜单打开后开关可见', opened.menuOpen && opened.visible && opened.h > 30, JSON.stringify(opened));

  await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => {
    const svg = document.querySelector('#mandala-container svg.md-root');
    const r = svg?.getBoundingClientRect();
    return {
      menuOpen: document.body.classList.contains('mobile-nav-open'),
      mandalaMode: document.querySelector('#chart-view .chart-layout')?.classList.contains('mandala-mode'),
      w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0,
      vw: innerWidth, vh: innerHeight,
      gates: svg?.querySelectorAll('[data-md-gate]').length || 0,
      infoW: Math.round(document.querySelector('#chart-view .info-column').getBoundingClientRect().width)
    };
  });
  check('手机：点轮盘后菜单自动关闭', !after.menuOpen);
  check('手机：轮盘视图已激活', after.mandalaMode && after.gates > 60, `gates=${after.gates}`);
  check('手机：轮盘完整落在一屏内', after.h > 0 && after.h <= after.vh && Math.abs(after.w - after.h) <= 2,
    `wheel ${after.w}x${after.h} in ${after.vw}x${after.vh}, info ${after.infoW}`);
  check('手机：无报错', errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/phone-wheel.png' });

  // back to bodygraph through the menu again
  await page.locator('#mobile-menu-toggle').click();
  await page.waitForTimeout(300);
  await page.locator('.graph-view-btn[data-graph-view="bodygraph"]').click();
  await page.waitForTimeout(800);
  const back = await page.evaluate(() => ({
    mandala: !document.getElementById('mandala-container').classList.contains('hidden'),
    body: !document.getElementById('bodygraph-container').classList.contains('hidden')
  }));
  check('手机：能切回人体图', back.body && !back.mandala, JSON.stringify(back));
  await page.close();
}

// ---- 4. resize round trip keeps one control in the right home ----
{
  const { page, errors } = await newPage({ width: 1440, height: 1000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const atPhone = await page.evaluate(() => ({
    count: document.querySelectorAll('.graph-view-toggle').length,
    inNav: !!document.querySelector('#primary-nav .graph-view-toggle')
  }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(500);
  const atDesktop = await page.evaluate(() => {
    const t = document.querySelector('.graph-view-toggle');
    return {
      count: document.querySelectorAll('.graph-view-toggle').length,
      parent: t.parentElement.className,
      isFirst: t.parentElement.firstElementChild === t,
      visible: t.offsetParent !== null
    };
  });
  check('缩放往返：始终只有一个开关', atPhone.count === 1 && atDesktop.count === 1, `phone=${atPhone.count} desktop=${atDesktop.count}`);
  check('缩放往返：手机时在导航面板', atPhone.inNav);
  check('缩放往返：回到桌面时复位到顶栏首位且可见',
    atDesktop.parent.includes('header-actions') && atDesktop.isFirst && atDesktop.visible, atDesktop.parent);
  check('缩放往返：无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} CHECK(S) FAILED`);
