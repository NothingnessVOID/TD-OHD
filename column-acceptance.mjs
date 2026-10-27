import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from './src/lib/profile-storage.js';

const REFERENCE_PROFILE = {
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

const boot = async (vp, person) => {
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
  await page.waitForTimeout(700);
  return { page, errors };
};

const measure = () => {
  const box = el => { const b = el.getBoundingClientRect(); return { t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), l: +b.left.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), cy: +(b.top + b.height / 2).toFixed(1) }; };
  const fs = el => parseFloat(getComputedStyle(el).fontSize);
  const auth = document.querySelector('.pc-card--authority');
  const def = document.querySelector('.pc-card--definition');
  const circuit = document.querySelector('.pc-card--circuit');
  const varCard = document.querySelector('.pc-card--variable');
  const cross = document.querySelector('.pc-card--cross');
  const slots = [...varCard.querySelectorAll('.pc-var-slot')];
  const crossCells = [...cross.querySelectorAll('.pg-cross-cell')];
  const arrow = slots[0].querySelector('.pc-var-arrow-b');
  const name = slots[0].querySelector('.pc-var-name');
  const colHeads = [...varCard.querySelectorAll('.pc-var-col-head')];
  const crossHeads = [...cross.querySelectorAll('.pc-side-label[data-side]')];
  const gatesSpan = cross.querySelector('.pc-cross-gates');
  const info = document.querySelector('#chart-view .info-column');
  const infoBox = box(info);
  const overflow = [];
  for (const el of info.querySelectorAll('*')) {
    if (el.closest('.panel-tabs')) continue;
    const b = el.getBoundingClientRect();
    if (b.width > 0 && (b.right > infoBox.r + 1 || b.left < infoBox.l - 1)) {
      overflow.push(`${el.className.toString().slice(0, 26)}(${Math.round(b.width)})`);
      if (overflow.length > 3) break;
    }
  }
  return {
    // authority vs definition: row anatomy alignment
    pairAD: {
      labelT: [box(auth.querySelector('.pc-card-label')).t, box(def.querySelector('.pc-card-label')).t],
      graphT: [box(auth.querySelector('.pc-authority-icon')).t, box(def.querySelector('.pc-definition-graphic')).t],
      graphH: [box(auth.querySelector('.pc-authority-icon')).h, box(def.querySelector('.pc-definition-graphic')).h],
      valueT: [box(auth.querySelector('.pc-card-value')).t, box(def.querySelector('.pc-card-value')).t],
      noteT: [box(auth.querySelector('.pc-card-note')).t, box(def.querySelector('.pc-card-note')).t]
    },
    graphicAboveValue: box(def.querySelector('.pc-definition-graphic')).b <= box(def.querySelector('.pc-card-value')).t,
    // cross vs variable: row grid alignment
    pairCV: {
      labelT: [box(cross.querySelector('.pc-card-label')).t, box(varCard.querySelector('.pc-card-label')).t],
      headT: [box(crossHeads[0]).t, box(colHeads[0]).t],
      row1T: [box(crossCells[0]).t, box(slots[0]).t],
      row2T: [box(crossCells[2]).t, box(slots[2]).t],
      headH: [box(crossHeads[0]).h, box(colHeads[0]).h]
    },
    crossCellH: crossCells.map(c => Math.round(box(c).h)),
    slotH: slots.map(s => Math.round(box(s).h)),
    cellChrome: getComputedStyle(slots[0]).background,
    arrowCentred: Math.abs((box(arrow).t - box(slots[0]).t) - (box(slots[0]).b - box(name).b)) <= 3,
    // circuit card
    pillCys: [...circuit.querySelectorAll('.pc-pill')].map(p => box(p).cy),
    valueCy: box(circuit.querySelector('.pc-card-value')).cy,
    headLabelCy: box(circuit.querySelector('.pc-card-label')).cy,
    circuitH: Math.round(box(circuit).h),
    segs: circuit.querySelectorAll('.pg-seg').length,
    segCounts: [...circuit.querySelectorAll('.pg-seg')].map(s => s.querySelector('.pg-seg-count')?.textContent),
    pillCounts: [...circuit.querySelectorAll('.pc-pill')].map(p => p.querySelector('b')?.textContent),
    // typography unity
    fonts: { varColHead: fs(colHeads[0]), crossHead: fs(crossHeads[0]), rowHead: fs(cross.querySelector('.pg-cross-earth')), varName: fs(name), cardLabel: fs(cross.querySelector('.pc-card-label')) },
    sides: { cross: crossHeads.map(h => h.dataset.side), var: colHeads.map(h => h.dataset.side) },
    gatesOnOwnLine: gatesSpan ? getComputedStyle(gatesSpan).display === 'block' && box(gatesSpan).t >= box(cross.querySelector('.pc-card-value')).t + 10 : false,
    crossNote: cross.querySelector('.pc-card-note')?.textContent?.trim() ?? null,
    pairH: [box(cross).h, box(varCard).h],
    pairCols: getComputedStyle(cross.parentElement).gridTemplateColumns,
    feedHeights: [...document.querySelector('.pc-feed').children].map(c => Math.round(box(c).h)),
    overflow,
    infoScrollsX: info.scrollWidth > info.clientWidth + 1
  };
};

const diffOk = (pair) => Math.abs(pair[0] - pair[1]) <= 1.5;

// ---------- desktop, wheel mode, reference profile (all three circuits) ----------
{
  const { page, errors } = await boot({ width: 1440, height: 1000 }, REFERENCE_PROFILE);
  await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
  await page.waitForTimeout(1300);
  const m = await page.evaluate(measure);
  const A = m.pairAD;

  check('定义卡：图形在主文字上方（与权威卡同构）', m.graphicAboveValue);
  check('权威/定义：标签行对齐', diffOk(A.labelT), A.labelT.join(' vs '));
  check('权威/定义：图形行对齐且同为 46px', diffOk(A.graphT) && A.graphH[0] === 46 && A.graphH[1] === 46,
    `${A.graphT.join(' vs ')} h=${A.graphH.join('/')}`);
  check('权威/定义：主文字行对齐', diffOk(A.valueT), A.valueT.join(' vs '));
  check('权威/定义：小字行对齐', diffOk(A.noteT), A.noteT.join(' vs '));

  const C = m.pairCV;
  check('十字/四箭头：标签行对齐', diffOk(C.labelT), C.labelT.join(' vs '));
  check('十字/四箭头：人格设计行对齐', diffOk(C.headT), C.headT.join(' vs '));
  check('十字/四箭头：第一行格子对齐', diffOk(C.row1T), C.row1T.join(' vs '));
  check('十字/四箭头：第二行格子对齐', diffOk(C.row2T), C.row2T.join(' vs '));
  check('格子等高 54px', m.crossCellH.every(h => h === 54) && m.slotH.every(h => h === 54),
    `cross=${m.crossCellH.join('/')} var=${m.slotH.join('/')}`);
  check('四箭头格子无底卡', m.cellChrome.includes('rgba(0, 0, 0, 0)') || m.cellChrome === 'transparent', m.cellChrome);
  check('箭头在格子内垂直居中', m.arrowCentred);

  check('回路卡：三枚圆点同一水平线', new Set(m.pillCys).size === 1, m.pillCys.join('/'));
  check('回路卡：标签与主导文字同基线', Math.abs(m.valueCy - m.headLabelCy) <= 2, `${m.headLabelCy} vs ${m.valueCy}`);
  check('回路卡：占比条分段与计数一致（参考档案三回路齐全）',
    m.segs === 3 && m.segCounts.join(',') === m.pillCounts.join(','),
    `segs=${m.segCounts.join(',')} pills=${m.pillCounts.join(',')}`);

  check('方位字号统一', m.fonts.varColHead === 11 && m.fonts.crossHead === 11 && m.fonts.rowHead === 11,
    JSON.stringify(m.fonts));
  check('左右方位一致（人格左 / 设计右）',
    m.sides.cross[0] === 'personality' && m.sides.cross[1] === 'design' &&
    m.sides.var[0] === 'personality' && m.sides.var[1] === 'design',
    `cross=${m.sides.cross.join(',')} var=${m.sides.var.join(',')}`);
  check('闸门数单独一行', m.gatesOnOwnLine);
  check('JX 冗余行已移除', m.crossNote === null, String(m.crossNote));
  check('两卡等高', Math.abs(m.pairH[0] - m.pairH[1]) <= 1, m.pairH.join(' vs '));
  check('信息栏无横向溢出', m.overflow.length === 0 && !m.infoScrollsX, m.overflow.join(','));
  check('无控制台报错', errors.length === 0, errors.join(' | '));
  console.log('     feed 高度:', m.feedHeights.join(' / '), 'grid:', m.pairCols);
  await page.locator('.pc-feed').screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/v3-feed-desktop.png' });
  await page.screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/v3-page-desktop.png' });
  await page.close();
}

// ---------- phone ----------
{
  const { page, errors } = await boot({ width: 390, height: 844 }, REFERENCE_PROFILE);
  await page.locator('#mobile-menu-toggle').click();
  await page.waitForTimeout(400);
  await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
  await page.waitForTimeout(1300);
  const m = await page.evaluate(measure);
  // On the phone the two cards stack, so row alignment across cards does not
  // apply; each card must keep the same internal row metrics instead.
  check('手机：卡片竖排单列', m.pairCols.split(' ').length === 1, m.pairCols);
  check('手机：两张四格卡行规格一致（头 16 / 格 54）',
    m.pairCV.headH.every(h => Math.abs(h - 16) <= 1) &&
    m.crossCellH.every(h => h === 54) && m.slotH.every(h => h === 54),
    `head=${m.pairCV.headH.join('/')} cross=${m.crossCellH.join('/')} var=${m.slotH.join('/')}`);
  check('手机：定义卡图形仍在主文字上方', m.graphicAboveValue);
  check('手机：四箭头无底卡', m.cellChrome.includes('rgba(0, 0, 0, 0)'), m.cellChrome);
  check('手机：无横向溢出', m.overflow.length === 0 && !m.infoScrollsX, m.overflow.join(','));
  check('手机：无报错', errors.length === 0, errors.join(' | '));
  await page.locator('#chart-view .info-column').screenshot({ path: '/Users/abyssldx/Desktop/OH-WorkSpace/td-ohd-local-update/branches/chart-dashboard-issue34.tmp/sheet-v1-shots/v3-column-phone.png' });
  await page.close();
}

// ---------- narrow desktop ----------
{
  const { page, errors } = await boot({ width: 1000, height: 700 }, REFERENCE_PROFILE);
  await page.locator('.graph-view-btn[data-graph-view="mandala"]').click();
  await page.waitForTimeout(1300);
  const m = await page.evaluate(measure);
  check('窄栏(348px)：无横向溢出', m.overflow.length === 0 && !m.infoScrollsX, m.overflow.join(','));
  check('窄栏(348px)：无报错', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();
console.log(failures === 0 ? 'ALL PASS' : `${failures} CHECK(S) FAILED`);
