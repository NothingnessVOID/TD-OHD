import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const base = process.env.E2E_URL;
assert.ok(base, 'Set E2E_URL to the running application URL.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const storageKey = 'ohd-teams-v1';
const profiles = Array.from({ length: 8 }, (_, i) => ({
  id: `group-e2e-${i}`, name: `Member ${i + 1}`, birthDate: `${1988 + i}-04-15`, birthTime: '12:00',
  timeUnknown: false, location: { timezone: i === 1 ? null : 0, lat: null, lon: null, iana: null, name: null },
}));
profiles[0].timeUnknown = true;
profiles[2].birthDate = '2001-02-29';
profiles.push({ ...profiles[3], id: 'group-e2e-no-time', name: 'Missing time', birthTime: '' });
profiles.push({ ...profiles[3], id: 'group-e2e-bad-time', name: 'Invalid time', birthTime: '25:61' });
profiles.push({ ...profiles[3], id: 'group-e2e-bad-zone', name: 'Invalid timezone', location: { timezone: 19 } });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.addInitScript(({ key, profiles }) => {
    localStorage.setItem('ohd-language', 'en');
    localStorage.setItem(key, JSON.stringify(profiles));
    localStorage.setItem('ohd-last-person-id', profiles[3].id);
    window.__teamComputeCalls = 0;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      if (String(args[0]).includes('/engine')) window.__teamComputeCalls++;
      return originalFetch(...args);
    };
  }, { key: PROFILE_STORAGE_KEY, profiles });

  await page.goto(base);
  await page.locator('#mobile-menu-toggle').click();
  await page.locator('.nav-link[data-view="team"]').click();
  await page.locator('#team-view:not(.hidden) .team-pool summary').click();
  await page.locator('#team-view:not(.hidden) #team-person-picker').waitFor();
  const addSaved = async id => {
    await page.locator('#team-person-picker').selectOption(id);
    await page.locator('#team-add-person').click();
  };
  const calls = () => page.evaluate(() => window.__teamComputeCalls);

  // All invalid saved-person cases must fail validation before any engine request.
  for (const [id, message] of [[profiles[0].id, /unknown/i], [profiles[1].id, /timezone/i], [profiles[2].id, /date/i],
    ['group-e2e-no-time', /Missing birth time/i], ['group-e2e-bad-time', /Invalid birth time/i], ['group-e2e-bad-zone', /Invalid timezone/i]]) {
    await page.locator('#team-new').click();
    await addSaved(id);
    await page.locator('#team-group-new').click();
    for (let i = 3; i < 6; i++) await addSaved(profiles[i].id);
    for (const card of await page.locator('.team-member-card').all()) await card.locator('.team-assign').click();
    const before = await calls();
    await page.locator('#team-calculate').click();
    await page.locator('#team-content [role="alert"]').waitFor();
    assert.match(await page.locator('#team-content').innerText(), message);
    assert.equal(await calls(), before, 'Invalid saved birth details made no /engine request');
  }

  // Assemble eight members, then exercise manual group-size combinations and duplicate blocking.
  await page.locator('#team-new').click();
  await page.locator('#team-name').fill('Grouping E2E');
  for (let i = 3; i < 8; i++) await addSaved(profiles[i].id);
  await page.locator('#add-member').click();
  const quick = page.locator('.team-member-row').last();
  await quick.locator('.team-name').fill('Quick member');
  await quick.locator('.team-date').fill('2000-05-16');
  await quick.locator('.team-time').fill('10:30');
  await quick.locator('.ps-toggle').click();
  await quick.locator('.ps-manual').fill('0');
  await quick.locator('.team-save-person').click();
  await page.locator('.team-member-card').filter({ hasText: 'Quick member' }).waitFor();
  assert.equal(await page.locator('.team-member-card').count(), 6);
  for (let i = 0; i < 2; i++) await addSaved(profiles[i].id);
  assert.equal(await page.locator('.team-member-card').count(), 8);

  const cards = page.locator('.team-member-card');
  const groups = page.locator('#team-group-list option');
  await page.locator('#team-group-new').click();
  await cards.first().locator('.team-assign').click();
  await page.locator('#team-calculate').click();
  assert.match(await page.locator('#team-content').innerText(), /at least three members/i);
  await page.locator('#team-group-new').click();
  const assignIndexes = async indexes => {
    for (const index of indexes) await cards.nth(index).locator('.team-assign').click();
  };
  const clearAssignments = async () => {
    for (let groupIndex = 0; groupIndex < (await groups.count()) - 1; groupIndex++) {
      await page.locator('#team-group-list').selectOption({ index: groupIndex + 1 });
      while (await page.locator('.team-unassign').count()) await page.locator('.team-unassign').first().click();
    }
  };
  const setPair = async (first, second) => {
    await clearAssignments();
    await page.locator('#team-group-list').selectOption({ index: 1 });
    await assignIndexes(Array.from({ length: first }, (_, i) => i));
    await page.locator('#team-group-list').selectOption({ index: 2 });
    await assignIndexes(Array.from({ length: second }, (_, i) => i + first));
    assert.equal(await page.locator('#team-group-count').innerText(), `Group members: ${second} / 5`);
  };
  await page.locator('#team-group-list').selectOption({ index: 1 });
  await assignIndexes([1, 2]);
  await page.locator('#team-group-list').selectOption({ index: 2 });
  assert.equal(await cards.nth(0).locator('.team-assign').count(), 0, 'a member in another Penta has no misleading add action');
  await setPair(3, 3);
  await setPair(3, 4);
  await setPair(4, 4);
  await setPair(3, 5);
  await page.locator('#team-group-list').selectOption({ index: 1 });
  await page.locator('#team-group-name').fill('Draft group name');
  await page.locator('#team-save').click();
  assert.match(await page.locator('#team-content').innerText(), /Team saved/i);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  assert.equal(saved.teams[0].members.length, 8);
  assert.deepEqual(saved.teams[0].groups.map(group => group.memberIds.length), [3, 5]);
  assert.equal(JSON.stringify(saved).includes('birthDate'), false);

  await page.reload();
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  await page.locator('#mobile-menu-toggle').click();
  await page.locator('.nav-link[data-view="team"]').click();
  await page.locator('#team-list').selectOption(saved.teams[0].teamId);
  assert.equal(await page.locator('.team-member-card').count(), 8);
  assert.equal(await page.locator('#team-group-list option').count(), 3);
  assert.equal(await page.locator('#team-group-name').inputValue(), 'Draft group name');

  // Partially entered quick birth data cannot be hidden by being left unassigned.
  await page.locator('.team-pool summary').click();
  await page.locator('#add-member').click();
  const incomplete = page.locator('.team-member-row').last();
  await incomplete.locator('.team-name').fill('Missing time');
  await incomplete.locator('.team-date').fill('2000-05-16');
  const beforeMissingTime = await calls();
  await page.locator('#team-calculate').click();
  await page.locator('#team-content [role="alert"]').waitFor();
  assert.match(await page.locator('#team-content').innerText(), /time/i);
  assert.equal(await calls(), beforeMissingTime, 'Quick row with missing time made no /engine request');
  await incomplete.locator('.team-remove-quick').click();

  for (const language of ['zh-Hant', 'zh-CN', 'en']) {
    if (!(await page.locator('#language-menu summary').isVisible())) await page.locator('#more-toggle').click();
    await page.locator('#language-menu summary').click();
    await page.locator(`[data-language="${language}"]`).click();
    assert.equal(await page.locator('.team-member-card').count(), 8);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false, '390px layout has no horizontal overflow');
  assert.deepEqual(errors, []);
  console.log('Team Phase 1B grouping E2E passed: validation guards, 8 members, manual group drafts, persistence, three languages, and 390px.');
} finally {
  await browser.close();
}
