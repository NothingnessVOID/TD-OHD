import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';
import { hexagramLines } from './src/lib/panel-graphics/hexagram-lines.js';

const person = {
  id: 'ref-candidate-12', name: '参考12·虚构档案',
  birthDate: '1990-01-15', birthTime: '00:44',
  location: { name: '上海，中国', iana: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737, timezone: 8 }
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
await page.addInitScript(({ stored, key }) => {
  localStorage.setItem(key, JSON.stringify([stored]));
  localStorage.setItem('ohd-last-person-id', stored.id);
  localStorage.setItem('ohd-language', 'zh-CN');
}, { stored: person, key: PROFILE_STORAGE_KEY });
await page.goto('http://127.0.0.1:5216/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('.bg-svg-wrap svg', { timeout: 90000 });
await page.waitForTimeout(900);

const out = await page.evaluate(() => {
  const ladders = [...document.querySelectorAll('.pc-profile-ladders .pg-ladder')];
  const profile = document.querySelector('.pc-profile-number')?.textContent?.trim();
  const sunGates = {
    personality: window.__dbg?.p ?? null,
    design: window.__dbg?.d ?? null
  };
  return {
    profile,
    ladders: ladders.map(l => ({
      state: l.dataset.ladder,
      yao: l.dataset.yao === 'true',
      orientation: l.dataset.orientation,
      ticks: [...l.querySelectorAll('.pg-tick')].map(t => ({
        kinds: t.dataset.yao, active: t.dataset.active === 'true',
        top: Math.round(t.getBoundingClientRect().top)
      }))
    })),
    islands: (() => {
      const set = document.querySelector('.pc-definition-graphic .pg-island-set');
      if (!set) return null;
      return [...set.querySelectorAll('.pg-island-card')].map(card => ({
        island: card.dataset.island,
        glyphs: [...card.querySelectorAll('.pg-center-glyph')].map(g => g.dataset.centerGlyph),
        states: [...card.querySelectorAll('.pg-center-glyph')].map(g => g.dataset.state),
        index: card.querySelector('.pg-island-index')?.textContent?.trim(),
        badgesOnGlyphs: card.querySelectorAll('.pg-island-cells .pg-group-badge').length,
        hasRule: !!card.querySelector('.pg-island-rule'),
        w: Math.round(card.getBoundingClientRect().width),
        h: Math.round(card.getBoundingClientRect().height)
      }));
    })(),
    graphicSlotH: Math.round(document.querySelector('.pc-definition-graphic').getBoundingClientRect().height),
    note: document.querySelector('.pc-card--definition .pc-card-note')?.textContent?.trim(),
    definition: document.querySelector('.pc-card--definition .pc-card-value')?.textContent?.trim()
  };
});

console.log('profile:', out.profile, '| definition:', out.definition, '|', out.note);
check('定义卡使用群岛图形（方案 B）', Array.isArray(out.islands) && out.islands.length >= 1,
  out.islands ? `${out.islands.length} 个岛` : 'missing');
if (out.islands) {
  const total = out.islands.reduce((a, i) => a + i.glyphs.length, 0);
  check('每个岛画出真实中心形状且都为已定义态',
    out.islands.every(i => i.glyphs.length > 0 && i.states.every(s => s === 'defined')),
    out.islands.map(i => i.glyphs.join('+')).join(' / '));
  check('每岛下方居中有圆圈岛号、形状上不再挂小圈号',
    out.islands.every((i, n) => i.index === ['①', '②', '③', '④'][n] && i.badgesOnGlyphs === 0 && i.hasRule),
    out.islands.map(i => `${i.index}(形状上圈号=${i.badgesOnGlyphs})`).join(' / '));
  check('岛图形落在 46px 图形槽内', out.graphicSlotH === 46 && out.islands.every(i => i.h <= 46),
    `slot=${out.graphicSlotH} islands=${out.islands.map(i => i.h).join('/')}`);
  check('中心总数与小字里的已定义中心数一致',
    String(total) === (out.note.match(/(\d+) 个已定义中心/) || [])[1],
    `glyphs=${total} note=${out.note}`);
}

check('人生角色两条爻线梯都是卦象爻线', out.ladders.length === 2 && out.ladders.every(l => l.yao && l.ticks.length === 6),
  out.ladders.map(l => `${l.state}:${l.yao}:${l.ticks.length}`).join(' '));
check('每爻都带阴阳属性', out.ladders.every(l => l.ticks.every(t => t.kinds === 'yang' || t.kinds === 'yin')));
check('初爻在最下、上爻在最上（自下而上）',
  out.ladders.every(l => l.ticks[0].top > l.ticks[5].top && l.ticks.every((t, i) => i === 0 || t.top < l.ticks[i - 1].top)),
  out.ladders.map(l => l.ticks.map(t => t.top).join('>')).join(' | '));
check('两条梯各有一个激活爻', out.ladders.every(l => l.ticks.filter(t => t.active).length === 1),
  out.ladders.map(l => l.ticks.map((t, i) => (t.active ? i + 1 : '')).filter(Boolean).join(',')).join(' / '));

// The two ladders must be the hexagrams of the Personality / Design Sun gates,
// and the active tick must sit on the profile's own line numbers.
const [pNum, dNum] = (out.profile || '').split('/').map(Number);
const pActive = out.ladders.find(l => l.state === 'personality')?.ticks.findIndex(t => t.active) + 1;
const dActive = out.ladders.find(l => l.state === 'design')?.ticks.findIndex(t => t.active) + 1;
check('激活爻位置 = 人生角色的两个数字', pActive === pNum && dActive === dNum,
  `profile=${out.profile} active=${pActive}/${dActive}`);

// The gate list's horizontal ladders use the same yao rendering.
await page.locator('.panel-tab', { hasText: '闸门' }).first().click();
await page.waitForTimeout(700);
const gateLadders = await page.evaluate(() => {
  const ls = [...document.querySelectorAll('.pg-ladder[data-orientation="horizontal"]')];
  return {
    total: ls.length,
    yao: ls.filter(l => l.dataset.yao === 'true').length,
    sample: ls.slice(0, 3).map(l => [...l.querySelectorAll('.pg-tick')].map(t => (t.dataset.yao === 'yang' ? '1' : t.dataset.yao === 'yin' ? '0' : '?') + (t.dataset.active === 'true' ? '*' : '')).join(''))
  };
});
check('闸门列表的横向爻梯也是卦象爻线', gateLadders.total > 0 && gateLadders.yao === gateLadders.total,
  `${gateLadders.yao}/${gateLadders.total} sample=${gateLadders.sample.join(' ')}`);

check('无控制台报错', errors.length === 0, errors.join(' | '));
await page.locator('.panel-tab').first().click();
await page.waitForTimeout(500);
await page.locator('.pc-card--profile').screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/v4-profile-card.png' });
await page.locator('.pc-card--definition').screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/v4-definition-card.png' });
await page.locator('.pc-feed').screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/v4-feed.png' });
await browser.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} CHECK(S) FAILED`);
