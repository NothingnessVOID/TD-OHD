import assert from 'node:assert/strict';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
import { chromium } from 'playwright-core';
const base = process.env.E2E_URL || 'http://127.0.0.1:5230';
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
  await page.locator('#team-person-picker').selectOption(profile.id);
  await page.locator('#team-add-person').click();
  const row = page.locator('#team-members .team-member-row').first();
  for (const [index, date] of ['1995-02-01', '1996-03-02'].entries()) {
    await page.locator('#add-member').click();
    const quick = page.locator('#team-members .team-member-row').nth(index);
    await quick.locator('.team-name').fill(`Team Synthetic ${index + 1}`);
    await quick.locator('.team-date').fill(date);
    await quick.locator('.team-time').fill('10:00');
    await quick.locator('.ps-toggle').click();
    await quick.locator('.ps-manual').fill('8');
  }
  await page.locator('#team-calculate').click();
  await page.locator('#team-content .team-summary').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('#team-content .team-channel').count(), 6);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(window.profileKey)).some(p => p.name.startsWith('Team Synthetic'))), false,
    'analysis never saves temporary team members');
  await page.locator('#team-save').click();
  assert.match(await page.locator('#team-content').innerText(), /Unsaved members/);
  await row.locator('.team-save-person').click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(window.profileKey)).filter(p => p.name === 'Team Synthetic 1').length), 1);
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
