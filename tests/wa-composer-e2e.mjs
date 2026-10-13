import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.E2E_URL || 'http://127.0.0.1:19983';
if (new URL(base).hostname !== '127.0.0.1' || new URL(base).port !== '19983') throw Error('Use assigned loopback port 19983.');
const output = 'artifacts/visual-review/wa-composer';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const top = () => page.locator('.wa-composer').last();
try {
  await page.route('**/__wa-composer-test', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles.css"></head><body><button id="trigger">Fictional composer test</button></body></html>' }));
  await page.goto(`${base}/__wa-composer-test`);
  await page.evaluate(async () => {
    const { openWaComposer } = await import('/src/views/wa-composer.js');
    const { createWaDraft, updateWaAnnotations } = await import('/src/lib/wa/model.js');
    const { replaceWaSelection } = await import('/src/lib/wa/configuration.js');
    const { savePerson, listPeople, getPerson } = await import('/src/lib/people.js');
    window.i18n = await import('/src/lib/i18n.js');
    window.i18n.setLocale('en', { persist: false });
    (await import('/src/lib/appearance.js')).initAppearance();
    for (let index = 0; index < 7; index++) savePerson({ id: `fictional-composer-${index}`, name: `Fictional Person ${index}`, birthDate: '1990-01-01', birthTime: '12:00', timezone: 0, location: { lat: 0, lon: 0, timezone: 0, name: 'Fictional test location' } });
    window.birthBefore = JSON.stringify(listPeople());
    window.snapshot = createWaDraft({ title: 'Fictional organization' });
    window.snapshot.pentas.forEach((group, index) => { group.pentaId = `fictional-g${index}`; });
    window.snapshot = replaceWaSelection(window.snapshot, { groups: [{ pentaId: 'fictional-g0', personIds: ['fictional-composer-0', 'fictional-composer-1'] }], alphaPersonId: 'fictional-composer-2' }, new Map(listPeople().map(person => [person.id, person])));
    window.snapshot = updateWaAnnotations(window.snapshot, { consultation: { assignment: 'manual', origin: 'manual', specificProblem: 'Fictional hidden note', keyAllyIds: [window.snapshot.members.find(member => member.personId === 'fictional-composer-0').memberId] } });
    window.teams = [{ name: 'Fictional saved team', members: [0, 1, 3, 4].map(index => ({ memberId: `team-${index}`, personId: `fictional-composer-${index}`, labelSnapshot: `Fictional Person ${index}` })), groups: [
      { pentaId: 'one', label: 'Fictional one person', memberIds: ['team-3'] },
      { pentaId: 'two', label: 'Fictional two people', memberIds: ['team-3', 'team-4'] },
      { pentaId: 'conflict', label: 'Fictional conflict', memberIds: ['team-0'] },
      { pentaId: 'duplicate', label: 'Fictional duplicate', memberIds: ['team-3', 'team-3'] }
    ] }];
    window.commits = [];
    window.valid = true;
    window.launch = (target = null, mode = 'people', quickCommit = false) => {
      document.querySelector('#trigger').focus();
      window.composer = openWaComposer({ snapshot: window.snapshot, peopleStore: { list: listPeople, get: getPerson }, listTeams: () => window.teams, target, mode, quickCommit, validate: () => window.valid,
        onCommit: (next, context) => { if (!context.isCurrent() || window.rejectCommit) return false; window.commits.push({ next, originalSnapshot: context.originalSnapshot, annotationChanges: context.annotationChanges }); }
      });
    };
    window.readPeople = listPeople;
    window.launch('fictional-g1');
  });
  assert.equal(await page.locator('.wa-composer').count(), 2, 'direct target opens nested picker');
  assert.equal(await top().locator('[data-person=fictional-composer-0]').isDisabled(), true, 'cross-group selection rejected visibly');
  assert.equal(await top().locator('[data-person=fictional-composer-2]').isDisabled(), true, 'Alpha conflict');
  await top().locator('[data-search]').fill('Person 3');
  await top().locator('[data-person=fictional-composer-3]').click();
  await top().locator('[data-edit=fictional-composer-3]').click();
  await page.locator('#edit-cancel').click();
  assert.equal(await top().locator('[data-search]').inputValue(), 'Person 3', 'person editor cancel returns to the same search');
  assert.equal(await top().locator('[data-person=fictional-composer-3]').getAttribute('aria-pressed'), 'true');
  await top().locator('[data-selection]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.commits.length), 0, 'outer cancel discards selected draft');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger');
  assert.equal(await page.evaluate(() => JSON.stringify(window.readPeople()) === window.birthBefore), true);

  await page.evaluate(() => window.launch('fictional-g1', 'import'));
  assert.equal(await page.locator('[data-search]').count(), 0, 'direct import skips person picker');
  assert.ok((await top().innerText()).includes('127.0.0.1:19983'));
  assert.ok((await top().innerText()).includes('Fictional saved team / Fictional two people'));
  assert.ok((await top().innerText()).includes('Fictional Person 3 · Fictional Person 4'));
  await top().locator('[data-import-index="2"]').click();
  assert.ok((await top().locator('[data-error]').innerText()).includes('Penta A'));
  await top().locator('[data-import-index="3"]').click();
  assert.ok((await top().locator('[data-error]').innerText()).includes('duplicate'));
  await top().locator('[data-import-index="1"]').click();
  const firstIds = await page.evaluate(() => window.composer.getDraft().pentas[1].memberIds);
  await page.locator('[data-import=fictional-g1]').click();
  await top().locator('[data-import-index="1"]').click();
  assert.deepEqual(await page.evaluate(() => window.composer.getDraft().pentas[1].memberIds), firstIds);
  assert.ok(firstIds.every(id => !id.startsWith('team-')));
  await page.locator('[data-apply]').click();
  assert.equal(await page.evaluate(() => window.commits[0].next.consultation.specificProblem), 'Fictional hidden note');
  assert.equal(await page.evaluate(() => JSON.stringify(window.readPeople()) === window.birthBefore), true, 'selection/import never persists birth or chart');

  await page.evaluate(() => window.launch('fictional-g0'));
  await top().locator('[data-deselect=fictional-composer-0]').click();
  await top().locator('[data-selection]').click();
  assert.ok((await top().innerText()).includes('Fictional Person 0'));
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.composer.getDraft().pentas[0].memberIds.length), 2);
  await top().locator('[data-selection]').click();
  await top().locator('[data-cleanup]').click();
  await page.locator('[data-apply]').click();
  const cleanup = await page.evaluate(() => window.commits.at(-1));
  assert.equal(cleanup.annotationChanges.length, 1);
  assert.equal(cleanup.annotationChanges[0].beforeSnapshot.consultation.keyAllyIds.length, 1);
  assert.equal(cleanup.originalSnapshot.consultation.keyAllyIds.length, 1);
  assert.equal(cleanup.next.consultation.keyAllyIds.length, 0);
  assert.equal(cleanup.next.members.length, cleanup.originalSnapshot.members.length);

  await page.evaluate(() => window.launch('fictional-g0'));
  await top().locator('[data-deselect=fictional-composer-0]').click();
  await top().locator('[data-selection]').click();
  await page.evaluate(() => { window.valid = false; });
  await top().locator('[data-cleanup]').click();
  assert.ok((await top().locator('[data-error]').innerText()).includes('original configuration changed'));
  assert.equal(await page.evaluate(() => window.composer.getDraft().pentas[0].memberIds.length), 2);
  await page.evaluate(() => { window.composer.close(); window.valid = true; window.teams = []; window.launch(); });
  await page.locator('[data-import=fictional-g2]').click();
  assert.ok((await top().innerText()).includes('return to Team / Penta'));
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  // A public person save returns to the still-selected draft and does not commit Wa.
  await page.evaluate(() => window.launch('fictional-g1'));
  await top().locator('[data-person=fictional-composer-3]').click();
  await top().locator('[data-edit=fictional-composer-3]').click();
  await page.locator('#edit-name').fill('Fictional Person 3 edited');
  await page.locator('#edit-save').click();
  assert.equal(await page.locator('.person-editor').count(), 0);
  assert.equal(await top().locator('[data-person=fictional-composer-3]').getAttribute('aria-pressed'), 'true');
  assert.ok((await top().innerText()).includes('Fictional Person 3 edited'));
  assert.equal(await page.evaluate(() => window.commits.length), 2);
  await page.evaluate(() => window.composer.close());

  // Quick target editing: one confirmation, complete cancellation, guarded cleanup.
  const quickStart = await page.evaluate(() => window.commits.length);
  await page.evaluate(() => window.launch('alpha', 'people', true));
  assert.equal(await top().locator('[data-person=fictional-composer-3]').isDisabled(), false, 'occupied Alpha permits direct replacement');
  assert.equal(await top().locator('[data-person=fictional-composer-0]').isDisabled(), true, 'cross-group conflict stays disabled');
  await top().locator('[data-person=fictional-composer-3]').click();
  assert.equal(await top().locator('[data-person=fictional-composer-2]').getAttribute('aria-pressed'), 'false');
  assert.equal(await top().locator('[data-chips] button').count(), 1);
  await top().locator('[data-selection]').click();
  assert.equal(await page.locator('.wa-composer').count(), 0, 'quick confirm closes every layer');
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 1);
  assert.equal(await page.evaluate(() => { const next = window.commits.at(-1).next; return next.members.find(member => member.memberId === next.alphaId).personId; }), 'fictional-composer-3');

  await page.evaluate(() => window.launch('alpha', 'people', true));
  await top().locator('[data-person=fictional-composer-4]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.wa-composer').count(), 0, 'quick picker cancel exits outer draft');
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 1);

  await page.evaluate(() => {
    window.teams = [{ name: 'Fictional quick import', members: [{ memberId: 'team-quick', personId: 'fictional-composer-4' }], groups: [{ pentaId: 'quick', label: 'Fictional quick group', memberIds: ['team-quick'] }] }];
    window.launch('fictional-g1', 'import', true);
  });
  await top().locator('[data-import-index="0"]').click();
  assert.equal(await page.locator('.wa-composer').count(), 0, 'quick import commits without outer apply');
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 2);
  await page.evaluate(() => window.launch('fictional-g1', 'import', true));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.wa-composer').count(), 0);
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 2);

  await page.evaluate(() => window.launch('fictional-g0', 'people', true));
  await top().locator('[data-deselect=fictional-composer-0]').click();
  await top().locator('[data-selection]').click();
  assert.equal(await page.locator('[data-cleanup]').count(), 1, 'quick path still asks for annotation cleanup');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.wa-composer').count(), 2, 'cleanup cancel returns to picker');
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 2);
  await top().locator('[data-selection]').click();
  await page.evaluate(() => { window.valid = false; });
  await top().locator('[data-cleanup]').click();
  assert.ok((await top().locator('[data-error]').innerText()).includes('original configuration changed'));
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 2);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.valid = true; window.launch('fictional-g0', 'people', true); });
  await top().locator('[data-deselect=fictional-composer-0]').click();
  await top().locator('[data-selection]').click();
  await top().locator('[data-cleanup]').click();
  assert.equal(await page.locator('.wa-composer').count(), 0);
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 3);
  assert.equal(await page.evaluate(() => window.commits.at(-1).annotationChanges.length), 1);

  await page.evaluate(() => { window.rejectCommit = true; window.launch('alpha', 'people', true); });
  await top().locator('[data-person=fictional-composer-5]').click();
  await top().locator('[data-selection]').click();
  assert.ok((await top().locator('[data-error]').innerText()).includes('original configuration changed'));
  assert.equal(await page.locator('.wa-composer').count(), 2, 'host rejection stays in target picker');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.rejectCommit = false; window.launch('alpha', 'people', true); });
  await top().locator('[data-person=fictional-composer-4]').click();
  await top().locator('[data-create]').click();
  await page.locator('#edit-cancel').click();
  assert.equal(await page.locator('.wa-composer').count(), 2, 'new person cancel does not cancel quick draft');
  assert.equal(await top().locator('[data-person=fictional-composer-4]').getAttribute('aria-pressed'), 'true');
  await top().locator('[data-edit=fictional-composer-4]').click();
  await page.locator('#edit-name').fill('Fictional Person 4 quick edited');
  await page.locator('#edit-save').click();
  assert.equal(await page.locator('.wa-composer').count(), 2, 'person save returns without committing Wa');
  assert.equal(await top().locator('[data-person=fictional-composer-4]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 3);
  await top().locator('[data-selection]').click();
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 4);
  assert.equal(await page.locator('.wa-composer').count(), 0);

  await page.evaluate(() => window.launch(null, 'people', true));
  await page.locator('[data-pick=alpha]').click();
  await top().locator('[data-person=fictional-composer-6]').click();
  await top().locator('[data-selection]').click();
  assert.equal(await page.locator('.wa-composer').count(), 1, 'without target, full editor still requires Apply');
  assert.equal(await page.evaluate(() => window.commits.length), quickStart + 4);
  await page.keyboard.press('Escape');

  // Focused visual samples, not an all-skin/locale matrix.
  for (const [locale, skin, width] of [['en', 'default-light', 1280], ['zh-CN', 'default-dark', 390], ['zh-Hant', 'high-contrast', 390]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(({ locale, skin }) => { window.i18n.setLocale(locale, { persist: false }); document.documentElement.dataset.skin = skin; window.launch(); }, { locale, skin });
    assert.equal(await page.locator('.wa-composer-card').count(), 4);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.wa-composer')].every(node => node.scrollWidth <= node.clientWidth + 1)), true, 'no horizontal dialog overflow');
    await page.screenshot({ path: `${output}/${locale}-${skin}.png`, fullPage: true });
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
  console.log('Wa composer browser smoke passed: cancellation, imports/conflicts, stable IDs, annotations/history, stale validation, person editor, 3 responsive samples.');
} finally { await browser.close(); }
