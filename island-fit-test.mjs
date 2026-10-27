import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

// Fixture 09: 三分人定义, 8 defined centres in 3 islands — the compact path.
const person = {
  id: 'td-ohd-fictional-09', name: '测试09·叶宁（虚构）',
  birthDate: '1997-07-19', birthTime: '07:05', timeUnknown: false,
  location: { name: '悉尼，澳大利亚', iana: 'Australia/Sydney', lat: -33.8688, lon: 151.2093, timezone: 10 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

for (const vp of [{ width: 1440, height: 1000, label: '桌面轮盘(卡片221px)' }, { width: 390, height: 844, label: '手机(卡片348px)' }]) {
  const page = await (await browser.newContext({ viewport: vp })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
  await page.addInitScript(({ stored, key }) => {
    localStorage.setItem(key, JSON.stringify([stored]));
    localStorage.setItem('ohd-last-person-id', stored.id);
    localStorage.setItem('ohd-language', 'zh-CN');
  }, { stored: person, key: PROFILE_STORAGE_KEY });
  await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
  await page.waitForTimeout(800);
  if (vp.width > 900) {
    await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
    await page.waitForTimeout(1200);
  } else {
    await page.locator('#mobile-menu-toggle').click();
    await page.waitForTimeout(400);
    await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
    await page.waitForTimeout(1200);
  }

  const m = await page.evaluate(() => {
    const card = document.querySelector('.pc-card--definition');
    const slot = card.querySelector('.pc-definition-graphic');
    const set = card.querySelector('.pg-island-set');
    const islands = [...card.querySelectorAll('.pg-island-card')];
    const glyphs = [...card.querySelectorAll('.pg-island-cells .pg-center-glyph')];
    const cardBox = card.getBoundingClientRect();
    const slotBox = slot.getBoundingClientRect();
    const setBox = set.getBoundingClientRect();
    return {
      definition: card.querySelector('.pc-card-value')?.textContent?.trim(),
      note: card.querySelector('.pc-card-note')?.textContent?.trim(),
      islands: islands.length,
      glyphSizes: [...new Set(glyphs.map(g => Math.round(g.querySelector('svg').getBoundingClientRect().width)))],
      slotH: Math.round(slotBox.height),
      setH: Math.round(setBox.height),
      setW: Math.round(setBox.width),
      cardContentW: Math.round(cardBox.width - 32),
      fitsSlot: setBox.top >= slotBox.top - 0.5 && setBox.bottom <= slotBox.bottom + 0.5,
      fitsWidth: setBox.left >= cardBox.left && setBox.right <= cardBox.right + 0.5,
      counts: islands.map(i => i.querySelector('.pg-island-index')?.textContent?.trim()),
      badgesOnGlyphs: card ? card.querySelectorAll('.pg-island-cells .pg-group-badge').length : -1,
      authorityGraphicTop: Math.round(document.querySelector('.pc-authority-icon').getBoundingClientRect().top),
      definitionGraphicTop: Math.round(slotBox.top)
    };
  });

  console.log(`${vp.label}: ${m.definition} | ${m.note} | 岛=${m.islands} 形状=${m.glyphSizes.join('/')}px 图形=${m.setW}x${m.setH} 槽=${m.slotH} 卡内容宽=${m.cardContentW}`);
  check(`${vp.label}：三岛都画出来了`, m.islands === 3, `${m.islands}`);
  check(`${vp.label}：图形完整落在 46px 槽内`, m.fitsSlot && m.slotH === 46, `set ${m.setH} in slot ${m.slotH}`);
  check(`${vp.label}：图形不超出卡片宽度`, m.fitsWidth && m.setW <= m.cardContentW, `${m.setW} vs ${m.cardContentW}`);
  // Row alignment with the authority card only applies while the two sit side
  // by side; on the phone the cards stack, so their rows cannot share a y.
  if (vp.width > 900) {
    check(`${vp.label}：与权威卡图形行对齐`, Math.abs(m.authorityGraphicTop - m.definitionGraphicTop) <= 1,
      `${m.authorityGraphicTop} vs ${m.definitionGraphicTop}`);
  }
  check(`${vp.label}：每岛下方有圆圈岛号且形状上无圈号`,
    m.counts.join('') === '①②③'.slice(0, m.counts.length) && m.badgesOnGlyphs === 0,
    `${m.counts.join(' ')} 形状上圈号=${m.badgesOnGlyphs}`);
  check(`${vp.label}：无报错`, errors.length === 0, errors.join(' | '));
  await page.locator('.pc-card--definition').screenshot({ path: `/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/v4-definition-3islands-${vp.width}.png` });
  await page.close();
}

await browser.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} CHECK(S) FAILED`);
