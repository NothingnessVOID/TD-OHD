import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';
import { SKINS } from '../src/lib/skin-registry.js';

const base = process.env.E2E_URL;
assert.ok(base, 'Set E2E_URL to the running app.');
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const profiles = Array.from({ length: 8 }, (_, i) => ({ id: `penta-svg-${i}`, name: i < 2 ? 'Same name' : `Member ${i + 1}`,
  birthDate: `${1980 + i}-05-16`, birthTime: '12:00', timeUnknown: false,
  location: { timezone: 0, lat: null, lon: null, iana: null, name: null } }));
const screenshots = process.env.SCREENSHOT_DIR;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, profiles }) => {
    localStorage.setItem('ohd-language', 'en');
    localStorage.setItem(key, JSON.stringify(profiles));
    localStorage.setItem('ohd-last-person-id', profiles[2].id);
  }, { key: PROFILE_STORAGE_KEY, profiles });
  await page.goto(base);
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  await page.locator('.nav-link[data-view="team"]').click();
  await page.locator('.team-advanced > summary').click();
  await page.locator('#team-person-picker').waitFor();
  for (const profile of profiles) {
    await page.locator('#team-person-picker').selectOption(profile.id);
    await page.locator('#team-add-person').click();
  }
  await page.locator('#team-group-new').click();
  for (let i = 0; i < 3; i++) await page.locator('.team-member-card').nth(i).locator('.team-assign').click();
  await page.locator('#team-calculate').click();
  await page.locator('.penta-canvas').waitFor({ timeout: 90000 });
  const check = async count => {
    assert.equal(await page.locator('.penta-gate').count(), 12);
    assert.equal(await page.locator('.penta-edge').count(), 6);
    assert.equal(await page.locator('.penta-gate-hit').count(), 12);
    assert.equal(await page.locator('.penta-channel-hit').count(), 6);
    assert.equal(await page.locator('.penta-member').count(), count);
    assert.deepEqual(await page.locator('.penta-gate').evaluateAll(nodes => nodes.map(n => Number(n.dataset.gate))), [31,8,33,7,1,13,15,2,46,5,14,29]);
    assert.deepEqual(await page.locator('.penta-edge').evaluateAll(nodes => nodes.map(n => n.querySelector('title').textContent.split(' · ')[0])), ['31–7','8–1','33–13','15–5','2–14','46–29']);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
  };
  await check(3);
  await page.locator('.penta-member').nth(0).click();
  assert.equal(await page.locator('.penta-member').nth(0).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.penta-member').nth(1).getAttribute('aria-pressed'), 'false');
  await page.locator('.penta-all').click();
  assert.equal(await page.locator('.penta-all').getAttribute('aria-pressed'), 'true');
  await page.locator('.penta-gate-hit').first().focus();
  await page.keyboard.press('Enter');
  // Persistent analysis replaces modal reading; keyboard activation moves focus.
  assert.match(await page.locator('.penta-active-detail').innerText(), /Gate 31/);
  assert.equal(await page.locator('.penta-active-detail').evaluate(node => node === document.activeElement), true);
  await page.locator('.penta-channel-hit').first().focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('.penta-active-detail').innerText(), /31|7/);
  assert.equal(await page.locator('.penta-active-detail').evaluate(node => node === document.activeElement), true);
  if (screenshots) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${screenshots}/penta-desktop.png`, fullPage: true }); }
  await page.locator('#team-group-new').click();
  for (let i = 3; i < 8; i++) await page.locator('.team-member-card').nth(i).locator('.team-assign').click();
  assert.equal(await page.locator('.penta-canvas').count(), 0);
  await page.locator('#team-calculate').click();
  await page.locator('.penta-canvas').waitFor({ timeout: 90000 });
  await check(5);
  await page.locator('#team-group-list').selectOption({ index: 1 });
  assert.equal(await page.locator('.penta-canvas').count(), 0);
  await page.locator('#team-calculate').click();
  await page.locator('.penta-canvas').waitFor({ timeout: 90000 });
  await check(3);
  for (const skin of SKINS) {
    await page.evaluate(id => document.documentElement.dataset.skin = id, skin.id);
    await check(3);
    const ink = await page.locator('.penta-number').first().evaluate(node => getComputedStyle(node).fill);
    assert.ok(ink && ink !== 'rgba(0, 0, 0, 0)', `gate ink visible for ${skin.id}`);
  }
  // An in-flight A calculation cannot draw over a later group selection.
  await page.locator('#team-group-list').selectOption({ index: 2 });
  await page.locator('#team-calculate').click();
  await page.locator('#team-group-list').selectOption({ index: 1 });
  await page.waitForTimeout(600);
  assert.equal(await page.locator('.penta-canvas').count(), 0);
  await page.locator('#team-calculate').click();
  await page.locator('.penta-canvas').waitFor({ timeout: 90000 });
  // Saving updated birth details invalidates the old result immediately.
  await page.evaluate(async id => {
    const { getPerson, savePerson } = await import('/src/lib/people.js');
    const person = getPerson(id);
    savePerson({ ...person, birthDate: '1999-06-17', timezone: person.location?.timezone });
    window.dispatchEvent(new Event('ohd-people-changed'));
  }, profiles[0].id);
  assert.equal(await page.locator('.penta-canvas').count(), 0);
  await page.locator('#team-calculate').click();
  await page.locator('.penta-canvas').waitFor({ timeout: 90000 });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await check(3);
    if (screenshots && width === 320) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${screenshots}/penta-mobile-320.png`, fullPage: true }); }
    if (screenshots && width === 390) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${screenshots}/penta-mobile-390.png`, fullPage: true }); }
  }
  assert.deepEqual(errors, []);
  console.log('Phase 1C browser: topology, 3/5 members, A/B, keyboard details, highlight, mobile and no errors passed.');
} finally { await browser.close(); }
