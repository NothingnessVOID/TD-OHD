import assert from 'node:assert/strict';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
import { chromium } from 'playwright-core';
const base = process.env.E2E_URL || 'http://127.0.0.1:19964';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const profile = { id: 'synthetic-restored', name: 'Restored Synthetic', birthDate: '1990-01-01', birthTime: '12:00',
  location: { timezone: 8, lat: 31.2, lon: 121.5, iana: 'Asia/Shanghai', name: 'Shanghai' } };
try {
  const page = await browser.newPage({ locale: 'en-US' });
  const api = [];
  page.on('request', req => { if (/\/api\/(auth|sync)/.test(req.url())) api.push(req.url()); });
  await page.addInitScript(({profile, key}) => { window.profileKey = key;
    localStorage.setItem(key, JSON.stringify([profile]));
    localStorage.setItem('ohd-last-person-id', profile.id);
    window.formFrames = [];
    const watch = () => {
      const entry = document.getElementById('birth-entry');
      if (entry) window.formFrames.push(!entry.classList.contains('hidden') && getComputedStyle(entry).visibility !== 'hidden');
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  }, {profile, key: PROFILE_STORAGE_KEY});
  await page.goto(base);
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await page.evaluate(() => window.formFrames.some(Boolean)), false, 'empty birth entry never painted during restore');
  assert.equal(await page.locator('#sync-button').isVisible(), false);
  assert.deepEqual(api, []);
  await page.locator('#more-toggle').click();
  await page.locator('#language-menu summary').click();
  await page.locator('[data-language="en"]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('ohd-language')), 'en');
  await page.reload();
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');

  await page.locator('.nav-link[data-view="connection"]').click();
  await page.locator('#conn-name').fill('Connection Synthetic');
  await page.locator('#conn-date').fill('2000-05-10');
  await page.locator('#conn-time').fill('12:30');
  await page.locator('#conn-place .ps-toggle').click();
  await page.locator('#conn-place .ps-manual').fill('8');
  await page.locator('#conn-calculate').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem(window.profileKey)).some(p => p.name === 'Connection Synthetic'));
  assert.ok((await page.locator('#people-switcher').innerText()).includes('Connection Synthetic'));
  assert.ok((await page.locator('#conn-person').innerText()).includes('Connection Synthetic'));
  await page.evaluate(() => { window.saves = 0; new MutationObserver(() => window.saves++).observe(document.getElementById('connection-content'), { childList: true }); });
  await page.locator('#conn-calculate').click();
  await page.waitForFunction(() => window.saves > 0);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(window.profileKey)).filter(p => p.name === 'Connection Synthetic').length), 1);

  await page.locator('.nav-link[data-view="team"]').click();
  await page.locator('#team-add-saved-person').click();
  await page.locator(`[data-add-person="${profile.id}"]`).click();
  const countPeople = () => page.evaluate(() => JSON.parse(localStorage.getItem(window.profileKey)).length);
  const before = await countPeople();
  // Unsaved editor drafts cannot enter analysis or mutate the saved library.
  await page.locator('#team-person-create').click();
  await page.locator('#edit-name').fill('Team Synthetic unsaved');
  await page.locator('#edit-save').click();
  assert.equal(await page.locator('.person-editor').count(), 1);
  assert.equal(await countPeople(), before);
  await page.keyboard.press('Escape');
  for (const [index, date] of ['1995-02-01', '1996-03-02'].entries()) {
    await page.locator('#team-person-create').click();
    await page.locator('#edit-name').fill(`Team Synthetic ${index + 1}`);
    await page.locator('#edit-date').fill(date);
    await page.locator('#edit-time').fill('10:00');
    if (!await page.locator('.person-editor .ps-manual').isVisible()) await page.locator('.person-editor .ps-toggle').click();
    await page.locator('.person-editor .ps-manual').fill('8');
    assert.equal(await countPeople(), before + index, 'draft editing does not save');
    await page.locator('#edit-save').click();
    await page.locator('.person-editor').waitFor({state:'detached'});
    assert.equal(await countPeople(), before + index + 1, 'explicit editor save persists exactly one person');
  }
  assert.equal(await page.locator('.team-person-chip').count(), 0, 'picker draft is not applied before confirmation');
  await page.locator('#team-selection-confirm').click();
  await page.waitForFunction(() => document.querySelector('#team-content').getAttribute('aria-busy') === 'false' && document.querySelectorAll('.penta-channel-reading').length === 6, {}, {timeout:90000});
  assert.equal(await page.locator('.penta-channel-reading').count(), 6);
  assert.equal(await countPeople(), before + 2, 'automatic analysis creates no extra profiles');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(window.profileKey)).filter(p => p.name === 'Team Synthetic 1').length), 1);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ohd-teams-v1') || '{"teams":[]}').teams.length), 0);
  await page.locator('#team-save').click();
  await page.locator('#team-save-name').fill('Fictional runtime team');
  await page.locator('#team-save-form button[type=submit]').click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ohd-teams-v1')).teams[0].members.length), 3);
  assert.equal(await countPeople(), before + 2, 'team save does not duplicate profiles');
  assert.deepEqual(api, []);
  await page.close();

  for (const saved of [null, 'invalid-person']) {
    const p = await browser.newPage();
    if (saved) await p.addInitScript(id => localStorage.setItem('ohd-last-person-id', id), saved);
    await p.goto(base);
    await p.locator('#birth-entry:not(.hidden)').waitFor();
    assert.equal(await p.locator('html').getAttribute('lang'), 'zh-CN');
    await p.close();
  }
  for (const route of ['/?d=2000-05-10&t=12:30&tz=8', '/?d=2000-05-10&t=12:30', '/?d=2000-05-10&t=12:30&tz=8&connect=1', '/#library/group/individual']) {
    const p = await browser.newPage();
    await p.goto(`${base}${route}`);
    if (route.includes('#library')) await p.locator('#library-view:not(.hidden)').waitFor();
    else if (route.includes('connect=1') || !route.includes('tz=8')) await p.locator('#birth-entry:not(.hidden)').waitFor();
    else await p.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
    await p.close();
  }
  console.log('Runtime restore, Chinese default, language persistence, no sync requests, Connection save and Team explicit save passed.');
} finally { await browser.close(); }
