import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
import { SKINS } from '../src/lib/skin-registry.js';

const base = (process.env.E2E_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const screenshotDir = process.env.SCREENSHOT_DIR || new URL('../docs/team/screenshots/phase1c-final/', import.meta.url).pathname;
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const profiles = Array.from({ length: 5 }, (_, index) => ({
  id: `phase1c-final-anon-${index + 1}`, name: `Anonymous member ${index + 1}`,
  birthDate: `${1980 + index}-05-16`, birthTime: '12:00', timeUnknown: false,
  location: { timezone: 0, lat: null, lon: null, iana: null, name: null },
}));
const labels = {
  en: ['Team name', 'Penta groups', 'Penta structure', 'Team members', 'New Penta', 'Delete Penta'],
  'zh-CN': ['团队名称', 'Penta 小组', 'Penta 结构', '团队成员', '新建 Penta', '删除 Penta'],
  'zh-Hant': ['團隊名稱', 'Penta 小組', 'Penta 結構', '團隊成員', '建立 Penta', '刪除 Penta'],
};
const errors = [];
const overlap = (a, b) => a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1;

async function enterTeam(page) {
  await page.goto(base, { timeout: 60000 });
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  const nav = page.locator('.nav-link[data-view="team"]');
  if (!(await nav.isVisible())) await page.locator('#mobile-menu-toggle').click();
  await nav.click();
  await page.locator('.team-advanced > summary').click();
  await page.locator('#team-view:not(.hidden) #team-group-list').waitFor();
}
async function chooseLanguage(page, code) {
  const more = page.locator('#more-menu');
  if (!(await more.evaluate(node => node.open))) await page.locator('#more-toggle').click();
  const language = page.locator('#language-menu');
  if (!(await language.evaluate(node => node.open))) await language.locator('summary').click();
  await language.locator(`[data-language="${code}"]`).click();
  for (const [selector, expected] of [
    ['.team-toolbar label:first-child', labels[code][0]],
    ['.team-groups h3', labels[code][1]],
    ['.team-results-heading h3', labels[code][2]],
    ['.team-pool summary strong', labels[code][3]],
    ['#team-group-new', labels[code][4]],
    ['#team-group-delete', labels[code][5]],
  ]) assert.equal((await page.locator(`#team-view ${selector}`).innerText()).trim(), expected, `${code} visible ${selector}`);
  assert.equal(await page.locator('html').getAttribute('lang'), code);
  assert.equal(await page.locator('#language-switcher').inputValue(), code, 'internal language selector tracks locale');
  if (await page.locator('.penta-state-legend').count()) {
    const state = (await page.locator('.penta-state-legend').innerText()).trim();
    const expected = { 'zh-CN': /未覆盖.*单人成通道.*跨成员补全/s, 'zh-Hant': /未涵蓋.*單人成通道.*跨成員補全/s, en: /Not covered.*One member covers both gates.*Covered across members/s };
    assert.match(state, expected[code], `${code} diagram and channel states are genuinely translated`);
  }
}
async function chooseSkin(page, skin) {
  const more = page.locator('#more-menu');
  if (!(await more.evaluate(node => node.open))) await page.locator('#more-toggle').click();
  await page.locator('#skin-settings-button').click();
  const button = page.locator(`#skin-picker .skin-card[data-skin-id="${skin.id}"]`);
  await button.click();
  assert.equal(await button.getAttribute('aria-pressed'), 'true', `${skin.id} selected in settings`);
  assert.equal(await page.locator('html').getAttribute('data-skin'), skin.id, `${skin.id} active`);
  const colors = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return { bg: css.getPropertyValue('--bg').trim(), accent: css.getPropertyValue('--accent').trim() };
  });
  assert.ok(colors.bg && colors.accent, `${skin.id} has real CSS colors`);
  await page.locator('#skin-settings-close').click();
  return colors;
}
async function checkLayout(page, width) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px horizontal overflow`);
  const controls = await page.locator('#team-view button:visible, #team-view input:visible, #team-view select:visible, #team-view summary:visible').evaluateAll(nodes => nodes.map(node => {
    // Checkbox activation includes its associated label, per the direct-selection contract.
    const rect = (node.matches('input[type="checkbox"]') ? node.closest('label') : node).getBoundingClientRect();
    return { label: node.getAttribute('aria-label') || node.innerText || node.id || node.tagName,
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      matrixHit: node.matches('.penta-gate-hit, .penta-channel-hit') };
  }).filter(rect => rect.width && rect.height));
  for (const control of controls) assert.ok(control.width >= 44 && control.height >= 44,
    `${width}px ${control.label.trim()} has ${control.width.toFixed(1)}×${control.height.toFixed(1)}px hit area`);
  const pageControls = controls.filter(control => !control.matrixHit);
  for (let i = 0; i < pageControls.length; i++) for (let j = i + 1; j < pageControls.length; j++) {
    assert.equal(overlap(pageControls[i], pageControls[j]), false,
      `${width}px controls overlap: ${pageControls[i].label.trim()} / ${pageControls[j].label.trim()}`);
  }
}
async function mobilePage(context, width) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 844 });
  page.on('pageerror' , error => errors.push(error.message));
  await enterTeam(page);
  const pool = page.locator('.team-pool');
  assert.equal(await pool.evaluate(node => node.open), false, `${width}px initial member pool is collapsed`);
  await checkLayout(page, width);
  await pool.locator('summary').click();
  assert.equal(await pool.evaluate(node => node.open), true, `${width}px member pool expands`);
  await page.locator('#team-person-picker').selectOption(profiles[4].id);
  await page.locator('#team-add-person').click();
  assert.equal(await page.locator('.team-member-card').count(), 1, `${width}px member can be added`);
  await page.locator('.team-member-card .team-remove').click();
  assert.equal(await page.locator('.team-member-card').count(), 0, `${width}px member can be removed`);
  await checkLayout(page, width);
  await page.reload();
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  const nav = page.locator('.nav-link[data-view="team"]');
  if (!(await nav.isVisible())) await page.locator('#mobile-menu-toggle').click();
  await nav.click();
  assert.equal(await pool.evaluate(node => node.open), false, `${width}px reload restores collapsed pool`);
  await checkLayout(page, width);
  await page.close();
}

try {
  await mkdir(screenshotDir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  await context.addInitScript(({ key, people }) => {
    localStorage.setItem('ohd-language', 'en');
    localStorage.setItem(key, JSON.stringify(people));
    localStorage.setItem('ohd-last-person-id', people[0].id);
  }, { key: PROFILE_STORAGE_KEY, people: profiles });
  const desktop = await context.newPage();
  desktop.on('pageerror', error => errors.push(error.message));
  await enterTeam(desktop);
  assert.equal(SKINS.length, 11);
  const colors = new Map();
  for (const skin of SKINS) colors.set(skin.id, await chooseSkin(desktop, skin));
  assert.ok(new Set([...colors.values()].map(({ bg, accent }) => `${bg}|${accent}`)).size >= 10, 'Skin selection changes real CSS colors');
  await chooseSkin(desktop, SKINS.find(skin => skin.id === 'default-light'));
  assert.equal(await desktop.locator('.team-pool').evaluate(node => node.open), true, 'desktop pool opens by default');
  for (const person of profiles) {
    await desktop.locator('#team-person-picker').selectOption(person.id);
    await desktop.locator('#team-add-person').click();
  }
  await desktop.locator('#team-group-new').click();
  for (let index = 0; index < 3; index++) await desktop.locator('.team-member-card').nth(index).locator('.team-assign').click();
  await desktop.locator('#team-calculate').click();
  await desktop.locator('.penta-canvas').waitFor({ timeout: 90000 });
  await checkLayout(desktop, 1280);
  await desktop.locator('.penta-member').first().click();
  assert.equal(await desktop.locator('.penta-member').first().getAttribute('aria-pressed'), 'true');
  assert.ok(await desktop.locator('.penta-gate.penta-highlight').count() > 0);
  await desktop.locator('.penta-gate-hit').first().focus();
  await desktop.keyboard.press('Enter');
  assert.equal(await desktop.locator('.penta-active-detail').evaluate(node => node === document.activeElement), true);
  await desktop.locator('.penta-channel-hit').first().focus();
  await desktop.keyboard.press('Enter');
  assert.equal(await desktop.locator('.penta-active-detail').evaluate(node => node === document.activeElement), true);
  for (const code of ['zh-CN', 'zh-Hant', 'en']) await chooseLanguage(desktop, code);
  await mobilePage(context, 320);
  await mobilePage(context, 390);
  await desktop.close();

  const captures = [
    { name: 'team-zh-cn-mobile-390.png', language: 'zh-CN', width: 390, expanded: false },
    { name: 'team-en-mobile-320.png', language: 'en', width: 320, expanded: false },
    { name: 'team-zh-hant-mobile-390-expanded.png', language: 'zh-Hant', width: 390, expanded: true },
  ];
  for (const capture of captures) {
    // A new page at phone width models the first Team visit, with no desktop resize.
    const page = await context.newPage();
    await page.setViewportSize({ width: capture.width, height: 844 });
    page.on('pageerror' , error => errors.push(error.message));
    await enterTeam(page);
    assert.equal(await page.locator('.team-pool').evaluate(node => node.open), false);
    await chooseLanguage(page, capture.language);
    await chooseSkin(page, SKINS.find(skin => skin.id === 'default-light'));
    await page.locator('#team-group-new').click();
    if (capture.expanded) await page.locator('.team-pool summary').click();
    for (let index = 0; index < 3; index++) {
      if (!capture.expanded) await page.locator('.team-pool summary').click();
      await page.locator('#team-person-picker').selectOption(profiles[index].id);
      await page.locator('#team-add-person').click();
      if (!capture.expanded) await page.locator('.team-pool summary').click();
    }
    if (!capture.expanded) await page.locator('.team-pool summary').click();
    for (let index = 0; index < 3; index++) await page.locator('.team-member-card').nth(index).locator('.team-assign').click();
    if (!capture.expanded) await page.locator('.team-pool summary').click();
    await page.locator('#team-calculate').click();
    await page.locator('.penta-canvas').waitFor({ timeout: 90000 });
    await checkLayout(page, capture.width);
    for (const [selector, expected] of [
      ['.team-toolbar label:first-child', labels[capture.language][0]],
      ['.team-groups h3', labels[capture.language][1]],
      ['.team-results-heading h3', labels[capture.language][2]],
    ]) assert.equal((await page.locator(`#team-view ${selector}`).innerText()).trim(), expected);
    await chooseLanguage(page, capture.language);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${screenshotDir}/${capture.name}`, fullPage: true });
    await page.close();
  }
  assert.deepEqual(errors, [], 'no browser page errors');
  console.log(`Phase 1C final browser passed: 11 real Skins, three visible locales, 320/390px fresh pages, 44px controls, keyboard, ${captures.length} screenshots.`);
} finally { await browser.close(); }
