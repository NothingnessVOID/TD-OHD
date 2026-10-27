import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

const profile = {
  id: 'design-review', name: '设计预览',
  birthDate: '1995-06-18', birthTime: '08:42',
  location: { name: '上海', iana: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// The wheel toggle is hidden below 900px by design, so phone is checked
// separately (no wheel entry there).
const viewports = [
  { width: 1440, height: 1000, label: 'desktop 1440x1000' },
  { width: 1600, height: 800, label: 'wide+short 1600x800' },
  { width: 1280, height: 720, label: 'laptop 1280x720' },
  { width: 1280, height: 620, label: 'very short 1280x620' },
  { width: 1920, height: 1080, label: 'big 1920x1080' },
  { width: 1000, height: 700, label: 'narrow 1000x700' }
];

let failures = 0;

for (const vp of viewports) {
  const page = await (await browser.newContext({ viewport: { width: vp.width, height: vp.height } })).newPage();
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
  await page.waitForTimeout(1000);

  // Scroll until the sticky chart column is pinned, which is where the user
  // actually looks at the wheel.
  await page.evaluate(() => {
    const svg = document.querySelector('#mandala-container svg.md-root');
    const docTop = svg.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, docTop - 80));
  });
  await page.waitForTimeout(400);

  const m = await page.evaluate(() => {
    const svg = document.querySelector('#mandala-container svg.md-root');
    const col = document.querySelector('#chart-view .chart-column');
    const info = document.querySelector('#chart-view .info-column');
    const layout = document.querySelector('#chart-view .chart-layout');
    const r = svg.getBoundingClientRect();
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 56;
    // widest overflowing descendant inside the info column, if any
    const infoBox = info.getBoundingClientRect();
    let overflow = [];
    for (const el of info.querySelectorAll('*')) {
      // The tab strip scrolls horizontally by design (hidden scrollbar), so its
      // children reaching past the column edge is expected, not clipped content.
      if (el.closest('.panel-tabs')) continue;
      const b = el.getBoundingClientRect();
      if (b.width > 0 && (b.right > infoBox.right + 1 || b.left < infoBox.left - 1)) {
        overflow.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 28)}(${Math.round(b.width)})`);
        if (overflow.length > 4) break;
      }
    }
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      vw: window.innerWidth, vh: window.innerHeight, scrollY: Math.round(window.scrollY),
      budget: Math.round(window.innerHeight - headerH - 48),
      colW: Math.round(col.getBoundingClientRect().width),
      infoW: Math.round(infoBox.width),
      infoScrollsX: info.scrollWidth > info.clientWidth + 1,
      overflow,
      mandalaMode: layout?.classList.contains('mandala-mode'),
      gridCols: layout ? getComputedStyle(layout).gridTemplateColumns : null,
      gates: svg.querySelectorAll('[data-md-gate]').length,
      planets: svg.querySelectorAll('.md-planet-hit').length,
      bodygraph: !!svg.querySelector('.md-bodygraph svg, .md-bodygraph [class*="bg-"]')
    };
  });

  const square = Math.abs(m.w - m.h) <= 2;
  const withinBudget = m.h <= m.budget + 2;
  const inView = m.top >= 0 && m.bottom <= m.vh + 1;
  const intact = m.gates > 60 && m.planets >= 13 && m.bodygraph;
  // the wheel column must hug the wheel: at most the container padding slack
  const noSideGap = m.colW - m.w <= 6;
  const infoWideEnough = m.infoW >= 320;
  const noInfoOverflow = !m.infoScrollsX && m.overflow.length === 0;
  const ok = square && withinBudget && inView && intact && noSideGap && infoWideEnough && noInfoOverflow && errors.length === 0;
  if (!ok) failures++;

  console.log(`${ok ? 'PASS' : 'FAIL'} ${vp.label.padEnd(22)} wheel ${m.w}x${m.h} budget ${m.budget} col ${m.colW} gap ${m.colW - m.w} info ${m.infoW} top ${m.top} bottom ${m.bottom}/${m.vh} square=${square} inView=${inView} intact=${intact} errs=${errors.length}`);
  console.log(`     grid=${m.gridCols} gates=${m.gates} planets=${m.planets} bodygraph=${m.bodygraph} infoScrollsX=${m.infoScrollsX}${m.overflow.length ? ' overflow=' + m.overflow.join(',') : ''}`);
  if (errors.length) console.log('     errors:', errors.join(' | '));
  await page.screenshot({ path: `/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/wheel-fit-${vp.width}x${vp.height}.png` });
  await page.close();
}

// Phone: the toggle is hidden, so there is no wheel entry. Record the state
// rather than treating it as a failure.
{
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.addInitScript(({ stored, key }) => {
    localStorage.setItem(key, JSON.stringify([stored]));
    localStorage.setItem('ohd-last-person-id', stored.id);
    localStorage.setItem('ohd-language', 'zh-CN');
  }, { stored: profile, key: PROFILE_STORAGE_KEY });
  await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
  await page.waitForTimeout(800);
  const phone = await page.evaluate(() => ({
    toggleVisible: getComputedStyle(document.querySelector('.graph-view-toggle')).display !== 'none',
    mandalaHidden: document.getElementById('mandala-container')?.classList.contains('hidden')
  }));
  console.log(`INFO phone 390x844          toggle visible=${phone.toggleVisible} mandala hidden=${phone.mandalaHidden}`);
  await page.close();
}

await browser.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} VIEWPORT(S) FAILED`);
