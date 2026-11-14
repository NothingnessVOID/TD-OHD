import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const base = process.env.E2E_URL || 'http://127.0.0.1:9970';
const output = process.env.SCREENSHOT_DIR || new URL('../test-results/picker/', import.meta.url).pathname;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'zh-CN' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const people = Array.from({ length: 6 }, (_, i) => ({
  id: `picker-fictional-${i}`, name: i === 1 ? 'Picker Fictional B' : `Picker Fictional ${i}`,
  birthDate: `199${i}-03-0${i + 1}`, birthTime: i === 2 ? '' : '08:30', timeUnknown: i === 2,
  location: { timezone: 0 }, createdAt: 2000 + i
}));
const shot = name => page.screenshot({ path: `${output}/${name}.png`, fullPage: false });

try {
  await page.addInitScript(({ key, people }) => {
    localStorage.setItem(key, JSON.stringify(people));
    localStorage.setItem('ohd-language', 'zh-CN');
    localStorage.setItem('ohd-last-person-id', people[0].id);
  }, { key: PROFILE_STORAGE_KEY, people });
  await page.goto(base);
  await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 120000 });
  await page.locator('[data-view="team"]').click();
  await page.locator('#team-add-saved-person').waitFor();

  // 1. open → search → select
  await page.locator('#team-add-saved-person').click();
  await page.locator('.modal.person-picker').waitFor();
  await shot('01-open');
  assert.equal(await page.locator('#team-person-search').evaluate(n => n === document.activeElement), true, 'search focused on open');
  await page.locator('#team-person-search').fill('picker fictional');
  assert.equal(await page.locator('.person-picker-row').count(), 6);
  await page.locator('#team-person-search').fill('1993');
  assert.equal(await page.locator('.person-picker-row').count(), 1, 'search matches birth date');
  await page.locator('#team-person-search').fill(people[4].id);
  assert.equal(await page.locator('.person-picker-row').count(), 1, 'search matches id');
  await page.locator('#team-person-search').fill('');
  await page.locator(`[data-add-person="${people[0].id}"]`).click();
  await page.locator(`[data-add-person="${people[1].id}"]`).click();
  assert.match(await page.locator('#team-selection-count').innerText(), /2\/5/);
  assert.equal(await page.locator('#team-selection-count').getAttribute('role'), 'status', 'count is a live region');
  assert.match(await page.locator(`[data-add-person="${people[2].id}"] small`).innerText(), /估算/, 'unknown time shows the estimate label');
  await shot('02-selected-two');

  // 2. create a person from inside the picker → back with state preserved
  await page.locator('#team-person-search').fill('Picker Fictional 1');
  await page.locator('#team-person-create').click();
  await page.locator('.person-editor').waitFor();
  await shot('03-editor');
  await page.locator('#edit-name').fill('Picker Fictional New');
  await page.locator('#edit-date').fill('2000-01-02');
  await page.locator('#edit-unknown').check();
  if (!(await page.locator('.person-editor .ps-manual').isVisible())) await page.locator('.person-editor .ps-toggle').click();
  await page.locator('.person-editor .ps-manual').fill('0');
  await page.locator('#edit-save').click();
  await page.locator('.person-editor').waitFor({ state: 'detached' });
  await page.locator('.modal.person-picker').waitFor();
  assert.equal(await page.locator('#team-person-search').inputValue(), 'Picker Fictional 1', 'search kept after create');
  assert.match(await page.locator('#team-selection-count').innerText(), /3\/5/, 'new person joins the selection');
  await page.locator('#team-person-search').fill('');
  assert.equal(await page.locator(`[data-add-person][aria-pressed="true"]`).count(), 3, 'three rows stay pressed');
  await page.locator('#team-person-search').fill('Picker Fictional 1');
  await shot('04-back-after-create');

  // 3. edit in place → back with state preserved
  await page.locator('#team-person-search').fill('Picker Fictional B');
  await page.locator(`[data-edit-person="${people[1].id}"]`).click();
  await page.locator('.person-editor').waitFor();
  await page.locator('#edit-name').fill('Picker Fictional Renamed');
  await page.locator('#edit-save').click();
  await page.locator('.person-editor').waitFor({ state: 'detached' });
  await page.locator('.modal.person-picker').waitFor();
  assert.equal(await page.locator('#team-person-search').inputValue(), 'Picker Fictional B', 'search kept after edit');
  assert.match(await page.locator('#team-selection-count').innerText(), /3\/5/);
  await page.locator('#team-person-search').fill('Renamed');
  assert.match(await page.locator('.person-picker-row').innerText(), /Picker Fictional Renamed/, 'edit refreshed the row');
  await shot('05-back-after-edit');

  // 4. confirm applies the draft, and reopening shows it as the current selection
  // 5. full confirm applies the draft, and reopening shows it as the current selection
  await shot('06-picker-before-confirm');
  await page.locator('#team-selection-confirm').click();
  await page.locator('.modal.person-picker').waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.querySelectorAll('.team-person-chip').length === 3);
  await shot('07-committed');
  await page.locator('#team-add-saved-person').click();
  await page.locator('.modal.person-picker').waitFor();
  assert.match(await page.locator('#team-selection-count').innerText(), /3\/5/, 'reopen preselects current members');
  assert.equal(await page.locator('[data-add-person][aria-pressed="true"]').count(), 3);
  await page.keyboard.press('Escape');
  await page.locator('.modal.person-picker').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.team-person-chip').count(), 3, 'escape leaves the team untouched');

  // 6. single-select mode: row click commits immediately, no confirm button
  const single = await page.evaluate(async () => {
    const { openPersonPicker } = await import('/src/lib/person-picker.js');
    const committed = [];
    window.__pickerSingle = committed;
    openPersonPicker({
      title: 'Single picker', multiple: false, exclude: ['picker-fictional-0'],
      onCommit: ids => { committed.push(ids); },
      onCancel: () => committed.push('cancel')
    });
    return true;
  });
  assert.equal(single, true);
  await page.locator('.modal.person-picker').waitFor();
  assert.equal(await page.locator('#team-selection-confirm').count(), 0, 'single mode has no confirm button');
  assert.equal(await page.locator(`[data-add-person="${people[0].id}"]`).count(), 0, 'excluded id hidden');
  const total = await page.evaluate(async () => (await import('/src/lib/people.js')).listPeople().length);
  assert.equal(await page.locator('.person-picker-row').count(), total - 1, 'exclude removes exactly one row');
  await page.locator(`[data-add-person="${people[3].id}"]`).click();
  await page.locator('.modal.person-picker').waitFor({ state: 'detached' });
  assert.deepEqual(await page.evaluate(() => window.__pickerSingle), [[people[3].id]], 'row click commits the single id');
  assert.equal(await page.locator('.team-person-chip').count(), 3, 'single picker did not touch the team');

  // 7. error strings keep the dialog open
  await page.evaluate(async () => {
    const { openPersonPicker } = await import('/src/lib/person-picker.js');
    openPersonPicker({ title: 'Error picker', multiple: true, max: 2, onCommit: () => 'Picker rejected' });
  });
  await page.locator('.modal.person-picker').waitFor();
  await page.locator(`[data-add-person="${people[4].id}"]`).click();
  await page.locator('#team-selection-confirm').click();
  assert.equal(await page.locator('.person-picker-error').innerText(), 'Picker rejected');
  assert.equal(await page.locator('.modal.person-picker').count(), 1, 'error keeps the dialog open');
  await shot('08-error-open');
  assert.deepEqual(errors, []);
  console.log('PASS search/select/create/edit/confirm chain, state preservation, single-select commit, exclude, error retention');
} finally {
  await context.close();
  await browser.close();
}
