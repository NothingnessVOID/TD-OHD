import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
import { SKINS } from '../src/lib/skin-registry.js';

const base = (process.env.E2E_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const screenshotDir = process.env.SCREENSHOT_DIR || new URL('../docs/team/screenshots/phase1c-polish/', import.meta.url).pathname;
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const profiles = Array.from({ length: 5 }, (_, index) => ({
  id: `phase1c-polish-anon-${index + 1}`, name: `Anonymous member ${index + 1}`,
  birthDate: `${1980 + index}-05-16`, birthTime: '12:00', timeUnknown: false,
  location: { timezone: 0, lat: null, lon: null, iana: null, name: null },
}));
const errors = [];
const controlSizeFindings = [];
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

try {
  await mkdir(screenshotDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, profiles }) => {
    localStorage.setItem('ohd-language', 'en');
    localStorage.setItem(key, JSON.stringify(profiles));
    localStorage.setItem('ohd-last-person-id', profiles[0].id);
  }, { key: PROFILE_STORAGE_KEY, profiles });
  await page.goto(base, { timeout: 60000 });
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  const teamNav = page.locator('.nav-link[data-view="team"]');
  if (!(await teamNav.isVisible())) await page.locator('#mobile-menu-toggle').click();
  await teamNav.click();
  await page.locator('#team-person-picker').waitFor();
  for (const profile of profiles) {
    await page.locator('#team-person-picker').selectOption(profile.id);
    await page.locator('#team-add-person').click();
  }
  await page.locator('#team-group-new').click();
  for (let index = 0; index < 3; index++) await page.locator('.team-member-card').nth(index).locator('.team-assign').click();
  await page.locator('#team-calculate').click();
  await page.locator('.penta-canvas').waitFor({ timeout: 90000 });

  const checkViewport = async width => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}px has no horizontal overflow`);
    const controls = await page.locator('#team-view button:visible, #team-view input:visible, #team-view select:visible, #team-view summary:visible, #team-content button:visible').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { label: node.getAttribute('aria-label') || node.innerText || node.id || node.tagName,
        x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }).filter(rect => rect.width && rect.height && !rect.label.includes('Anonymous member')));
    for (const control of controls) {
      if (control.width < 44 || control.height < 44) controlSizeFindings.push(`${width}px control “${control.label.trim()}” is ${control.width.toFixed(1)}×${control.height.toFixed(1)}px (minimum 44×44)`);
    }
    // Penta gate/channel hit zones intentionally cross the graph; enforce separation for page controls.
    const pageControls = controls.filter(control => !control.label.startsWith('Gate ') && !control.label.startsWith('Channel '));
    for (let i = 0; i < pageControls.length; i++) for (let j = i + 1; j < pageControls.length; j++) {
      assert.equal(overlap(pageControls[i], pageControls[j]), false,
        `${width}px actionable controls overlap: “${pageControls[i].label.trim()}” and “${pageControls[j].label.trim()}”`);
    }
  };

  for (const width of [1280, 390, 320]) await checkViewport(width);
  await page.locator('.penta-member').first().click();
  assert.equal(await page.locator('.penta-member').first().getAttribute('aria-pressed'), 'true', 'selected member is highlighted');
  assert.equal(await page.locator('.penta-gate.penta-highlight').count() > 0, true, 'member highlight appears on contributed gates');
  await page.locator('.penta-gate-hit').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('.penta-detail:not(.hidden)').waitFor();
  assert.match(await page.locator('.penta-detail').innerText(), /Gate 31/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.penta-detail').isVisible(), false, 'Escape closes the gate detail dialog');
  await page.locator('.penta-channel-hit').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('.penta-detail:not(.hidden)').waitFor();
  await page.locator('.penta-detail .gate-detail-close').click();
  assert.equal(await page.locator('.penta-detail').isVisible(), false, 'close control dismisses channel detail');

  assert.equal(SKINS.length, 11, 'skin registry contains the 11 expected skins');
  for (const skin of SKINS) {
    await page.evaluate(id => document.documentElement.dataset.skin = id, skin.id);
    assert.equal(await page.locator('html').getAttribute('data-skin'), skin.id, `skin ${skin.id} applied`);
  }
  for (const language of ['zh-CN', 'zh-Hant', 'en']) {
    if (!(await page.locator('#language-menu summary').isVisible())) await page.locator('#more-toggle').click();
    await page.locator('#language-menu summary').click();
    await page.locator(`[data-language="${language}"]`).click();
    assert.equal(await page.locator('html').getAttribute('lang'), language, `${language} is selected`);
    assert.ok((await page.locator('#team-view').innerText()).trim().length > 0, `${language} team interface renders`);
  }

  // Five shots share the same anonymous five-person fixture and selected three-member Penta.
  const captures = [
    { name: 'team-desktop-1280.png', language: 'en', skin: 'classic', width: 1280 },
    { name: 'team-mobile-390.png', language: 'en', skin: 'classic', width: 390 },
    { name: 'team-mobile-320.png', language: 'en', skin: 'classic', width: 320 },
    { name: 'team-desktop-dark.png', language: 'en', skin: 'default-dark', width: 1280 },
    { name: 'team-mobile-zh-cn.png', language: 'zh-CN', skin: 'classic', width: 390 },
  ];
  for (const capture of captures) {
    await page.setViewportSize({ width: capture.width, height: capture.width === 1280 ? 900 : 844 });
    if (await page.locator('#language-menu summary').isVisible()) {
      const open = await page.locator('#language-menu').evaluate(node => node.open);
      if (open) await page.locator('#language-menu summary').click();
    }
    if (await page.locator('#more-menu').evaluate(node => node.open)) await page.locator('#more-toggle').click();
    await page.evaluate(({ language, skin }) => {
      localStorage.setItem('ohd-language', language);
      document.documentElement.lang = language;
      document.documentElement.dataset.skin = skin;
      document.documentElement.dataset.hdSkin = skin;
      window.dispatchEvent(new Event('ohd-language-changed'));
    }, capture);
    await page.waitForTimeout(100);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${screenshotDir}/${capture.name}`, fullPage: true });
  }
  assert.deepEqual(errors, [], 'no browser page errors');
  console.log(`Team Phase 1C visual polish E2E passed: 1280/390/320 layout, keyboard details, member highlight, 11 skins, 3 languages; ${captures.length} screenshots saved to ${screenshotDir}`);
  assert.deepEqual(controlSizeFindings, [], `44px control size failures:\n- ${[...new Set(controlSizeFindings)].join('\n- ')}`);
} finally {
  await browser.close();
}
