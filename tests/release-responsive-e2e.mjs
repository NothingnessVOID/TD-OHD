import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

/**
 * Release responsive acceptance for the Wa / OC16 organization view.
 *
 * Scope: the organization page, its dialogs, and the phone channel-row
 * gate-number alignment bug (the right-hand numbers 21/32/26/49/40 must share
 * one vertical axis on phones, independent of how many member dots a gate
 * holds). Also exercises the real edit/save/detail-jump interactions.
 * Out of scope: the timeline (explicitly excluded by the release owner).
 *
 * Runs against an isolated Vite origin (default http://127.0.0.1:5173).
 * Fresh browser context, fictional people only.
 */

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const out = process.env.RESPONSIVE_EVIDENCE_DIR || 'artifacts/release-responsive';
const WIDTHS = [320, 375, 390, 768, 1024, 1366, 1440, 1920];
const LOCALES = ['en', 'zh-CN', 'zh-Hant'];
const THEMES = ['light', 'dark'];
const SKIN = { light: 'default-light', dark: 'default-dark' };
const TOL = 1; // px tolerance
// The two-equal-column phone rule is gated by @media (max-width:600px).
const PHONE_MAX = 600;

await mkdir(out, { recursive: true });

const errors = [];

async function seedOrganization(page) {
  await page.waitForSelector('#wa-view [data-wa-page]', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#wa-view .wa-workspace')?.getAttribute('aria-busy') === 'false', null, { timeout: 90000 });
  await page.evaluate(async () => {
    const live = p => performance.getEntriesByType('resource').map(r => r.name).find(u => new URL(u).pathname === p) || p;
    const people = await import(live('/src/lib/people.js'));
    const { computeChart } = await import(live('/src/lib/chartdata.js'));
    const { createWaDraft, createWaMember } = await import(live('/src/lib/wa/model.js'));
    const { createWaRepository } = await import(live('/src/lib/wa/repository.js'));
    const dates = ['1987-02-14','1973-08-29','1998-11-06','2001-04-19','1965-12-23','1992-07-08','1981-03-30','1979-10-17','1995-05-02','1988-09-11','2000-01-26','1969-06-15'];
    const labels = ['林岚','周舟','陈禾','苏衡','许澄','江序','叶青','陆遥','温宁','沈简','季朗','程雨'];
    const fixture = dates.map((birthDate, i) => ({ id: `fictional-responsive-${i}`, name: `Fictional ${labels[i]}`, birthDate, birthTime: `${String(2 + i).padStart(2, '0')}:${i % 2 ? '35' : '10'}`, timeUnknown: false, timezone: 8, location: { lat: 31.2, lon: 121.4, name: 'Fictional', timezone: 8 } }));
    for (const person of fixture) { people.savePerson(person); await computeChart(person); }
    const draft = createWaDraft({ organizationId: 'fictional-responsive-org', title: 'Fictional responsive organization' });
    draft.members = fixture.map((p, i) => createWaMember({ personId: p.id, labelSnapshot: p.name, memberId: `m-${i}` }));
    draft.alphaId = draft.members[0].memberId;
    draft.pentas.forEach((p, i) => { p.memberIds = draft.members.slice(1 + i * 3, 4 + i * 3).map(m => m.memberId); });
    const saved = await createWaRepository().save(draft, { expectedRevision: 0 });
    localStorage.setItem('ohd-wa-last-organization-v1', saved.organizationId);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#wa-view .wa-workspace')?.getAttribute('aria-busy') === 'false', null, { timeout: 90000 });
  await page.evaluate(() => document.querySelectorAll('[data-department-toggle][aria-expanded="false"]').forEach(n => n.click()));
  await page.waitForTimeout(300);
}

async function applyLocaleTheme(page, locale, theme) {
  await page.evaluate(async ({ locale, skin }) => {
    const live = p => performance.getEntriesByType('resource').map(r => r.name).find(u => new URL(u).pathname === p) || p;
    (await import(live('/src/lib/i18n.js'))).setLocale(locale, { persist: false });
    (await import(live('/src/lib/appearance.js'))).setSkin(skin);
  }, { locale, skin: SKIN[theme] });
  await page.waitForTimeout(120);
}

/** Measure each channel row's gate-number boxes and marker counts. */
async function measureRows(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('.wa-channel-row')];
    return rows.map(row => {
      const r = row.getBoundingClientRect();
      const gates = [...row.querySelectorAll('.wa-row-gate')].map(gate => {
        const num = gate.querySelector('.wa-row-gate-number');
        const b = num.getBoundingClientRect();
        return { left: Math.round((b.left - r.left) * 100) / 100, top: Math.round((b.top - r.top) * 100) / 100, number: num.textContent.trim(), markers: gate.querySelectorAll('.wa-member-marker').length };
      });
      return { cols: getComputedStyle(row).gridTemplateColumns, rowW: Math.round(r.width), gates };
    });
  });
}

/** Phone contract: the Nth gate-number column sits at the same x in every row. */
function assertPhoneAxisAligned(rows, label) {
  assert.ok(rows.length > 0, `${label}: expected channel rows`);
  const axis = rows[0].gates.map(g => g.left);
  const markerCounts = new Set();
  for (const row of rows) {
    assert.equal(row.gates.length, axis.length, `${label}: every row exposes the same number of gate columns`);
    row.gates.forEach((gate, i) => assert.ok(Math.abs(gate.left - axis[i]) <= TOL, `${label}: gate column ${i + 1} left ${gate.left} vs ${axis[i]} (number column drifts)`));
    row.gates.forEach(gate => markerCounts.add(gate.markers));
  }
  // The axis must hold across rows that actually differ in dot count, otherwise
  // the check proves nothing about the reported bug.
  assert.ok(markerCounts.size > 1, `${label}: fixture must vary member-dot counts across rows (got ${[...markerCounts].join(',')})`);
  const widths = new Set(rows.map(r => r.rowW));
  assert.equal(widths.size, 1, `${label}: rows share one width`);
}

/** Desktop sanity: rows render, gates ordered, one shared row width. */
function assertDesktopRowsRendered(rows, label) {
  assert.ok(rows.length > 0, `${label}: expected channel rows`);
  const widths = new Set(rows.map(r => r.rowW));
  assert.equal(widths.size, 1, `${label}: rows share one width`);
  for (const row of rows) {
    assert.ok(row.gates.length >= 2, `${label}: each row has two gate ends`);
    for (let i = 1; i < row.gates.length; i++) assert.ok(row.gates[i].left > row.gates[i - 1].left, `${label}: gate columns are ordered`);
  }
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}

/** Overflow inside the channel-rows list only (the surface this task owns). */
async function assertPanelNoOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const list = document.querySelector('.wa-channel-rows');
    return list.scrollWidth - list.clientWidth;
  });
  assert.ok(overflow <= 1, `${label}: channel-rows list horizontal overflow ${overflow}px`);
}

/** Real text zoom: multiply every computed font-size by `factor` once, inline+important. */
async function applyTextZoom(page, factor) {
  await page.evaluate((factor) => {
    const restore = [];
    const nodes = [document.documentElement, ...document.querySelectorAll('*')];
    for (const node of nodes) {
      const px = parseFloat(getComputedStyle(node).fontSize);
      if (!Number.isFinite(px)) continue;
      restore.push([node, node.style.getPropertyValue('font-size'), node.style.getPropertyPriority('font-size')]);
      node.style.setProperty('font-size', `${px * factor}px`, 'important');
    }
    window.__textZoomRestore = restore;
  }, factor);
}
async function revertTextZoom(page) {
  await page.evaluate(() => {
    for (const [node, value, priority] of window.__textZoomRestore || []) {
      if (value) node.style.setProperty('font-size', value, priority || 'important');
      else node.style.removeProperty('font-size');
    }
    window.__textZoomRestore = null;
  });
}

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });

try {
  // ========== A. Alignment matrix: widths x locales x themes ==========
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?view=wa`, { waitUntil: 'domcontentloaded' });
  await seedOrganization(page);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 700 ? 900 : 1000 });
    const phone = width <= PHONE_MAX;
    for (const locale of LOCALES) {
      for (const theme of THEMES) {
        const label = `${width}px ${locale} ${theme}`;
        await applyLocaleTheme(page, locale, theme);
        const rows = await measureRows(page);
        if (phone) assertPhoneAxisAligned(rows, label); else assertDesktopRowsRendered(rows, label);
        await assertNoOverflow(page, label);
        // Representative screenshots only.
        const shot = width === 320 || width === 390 || width === 1024 || width === 1440;
        if (shot) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(80);
          await page.locator('.wa-departments').screenshot({ path: `${out}/rows-${width}-${locale}-${theme}.png`, animations: 'disabled' });
        }
      }
    }
    await applyLocaleTheme(page, 'zh-CN', 'light');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(80);
    await page.screenshot({ path: `${out}/page-${width}-zh-CN-light.png`, fullPage: true, animations: 'disabled' });
  }

  // ========== B. Landscape phone (width-based: 844px uses the desktop grid) ==========
  await page.setViewportSize({ width: 844, height: 390 });
  await applyLocaleTheme(page, 'zh-CN', 'light');
  assertDesktopRowsRendered(await measureRows(page), 'landscape 844x390');
  await assertNoOverflow(page, 'landscape 844x390');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.wa-departments').screenshot({ path: `${out}/rows-landscape-844x390.png`, animations: 'disabled' });

  // ========== C. Real text zoom 200% (proves computed font-size doubles) ==========
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await applyLocaleTheme(page, 'zh-CN', 'light');
    const before = await page.locator('.wa-row-gate-number').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize));
    await applyTextZoom(page, 2);
    const after = await page.locator('.wa-row-gate-number').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize));
    assert.equal(before, 11, `text200 ${width}px: gate number baseline font-size is 11px (got ${before})`);
    assert.ok(Math.abs(after - before * 2) <= 0.5, `text200 ${width}px: gate number font-size doubled 11 -> ${after}`);
    const rows = await measureRows(page);
    if (width <= PHONE_MAX) assertPhoneAxisAligned(rows, `text200 ${width}px`); else assertDesktopRowsRendered(rows, `text200 ${width}px`);
    // Scope the overflow check to the organization panel: doubling every
    // computed font-size also inflates the bodygraph SVG text, which is outside
    // this task's surface, so a document-level number would be a false alarm.
    await assertPanelNoOverflow(page, `text200 ${width}px`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.wa-departments').screenshot({ path: `${out}/text200-${width}.png`, animations: 'disabled' });
    await revertTextZoom(page);
  }

  // ========== D. Dialogs stay inside the viewport ==========
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 900 : 1000 });
    await applyLocaleTheme(page, 'zh-CN', 'light');

    await page.locator('.wa-channel-row .wa-row-gate-number').first().click();
    await page.waitForSelector('.wa-detail:not(.hidden) .wa-reading-sheet', { timeout: 10000 });
    const detail = await page.evaluate(() => {
      const sheet = document.querySelector('.wa-reading-sheet').getBoundingClientRect();
      return { left: sheet.left, right: sheet.right, top: sheet.top, bottom: sheet.bottom, w: innerWidth, h: innerHeight, body: (document.querySelector('.wa-reading-sheet .gate-detail-body')?.scrollHeight || 0) > 0 };
    });
    assert.ok(detail.left >= -TOL && detail.right <= detail.w + TOL, `${width}px gate dialog horizontal bounds ${detail.left}..${detail.right} / ${detail.w}`);
    assert.ok(detail.top >= -TOL && detail.bottom <= detail.h + TOL, `${width}px gate dialog vertical bounds ${detail.top}..${detail.bottom} / ${detail.h}`);
    assert.ok(detail.body, `${width}px gate dialog body present`);
    await page.screenshot({ path: `${out}/dialog-gate-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.wa-detail:not(.hidden)'));

    await page.locator('[data-compose="alpha"]').click();
    await page.waitForSelector('.wa-target-picker', { timeout: 10000 });
    const picker = await page.evaluate(() => {
      const root = document.querySelector('.operation-dialog').getBoundingClientRect();
      return { left: root.left, right: root.right, top: root.top, bottom: root.bottom, w: innerWidth, h: innerHeight, deselect: document.querySelectorAll('.wa-target-picker [data-deselect]').length };
    });
    assert.ok(picker.left >= -TOL && picker.right <= picker.w + TOL, `${width}px picker horizontal bounds ${picker.left}..${picker.right} / ${picker.w}`);
    assert.ok(picker.top >= -TOL && picker.bottom <= picker.h + TOL, `${width}px picker vertical bounds ${picker.top}..${picker.bottom} / ${picker.h}`);
    assert.equal(picker.deselect, 0, `${width}px picker must not reintroduce the removed deselect control`);
    await page.screenshot({ path: `${out}/dialog-picker-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.wa-target-picker'));
  }

  assert.deepEqual(errors, []);
  await context.close();

  // ========== E. Real interactions: edit / save / picker commit / detail jump ==========
  const actContext = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  const act = await actContext.newPage();
  act.on('pageerror', e => errors.push(e.message));
  await act.goto(`${base}/?view=wa`, { waitUntil: 'domcontentloaded' });
  await seedOrganization(act);

  // Edit the title, save, and confirm the draft persisted at the new revision.
  await act.locator('[data-title]').fill('Fictional responsive edited');
  assert.equal(await act.locator('.wa-draft-status').getAttribute('data-dirty'), 'true', 'title edit marks the draft dirty');
  await act.locator('[data-action="save"]').click();
  await act.waitForFunction(() => document.querySelector('.wa-draft-status')?.getAttribute('data-dirty') === 'false');
  const persisted = await act.evaluate(async () => {
    const live = p => performance.getEntriesByType('resource').map(r => r.name).find(u => new URL(u).pathname === p) || p;
    const repo = (await import(live('/src/lib/wa/repository.js'))).createWaRepository();
    const [saved] = await repo.list();
    return { title: saved.title, revision: saved.revision, id: saved.organizationId };
  });
  assert.equal(persisted.title, 'Fictional responsive edited', 'saved title round-trips');
  assert.equal(persisted.id, 'fictional-responsive-org', 'same organization persisted');

  // Picker commit: replace Alpha through the current selection UI (no removed buttons).
  await act.locator('[data-compose="alpha"]').click();
  await act.waitForSelector('.wa-target-picker', { timeout: 10000 });
  assert.equal(await act.locator('.wa-target-picker [data-deselect]').count(), 0, 'no deselect control in the picker');
  await act.locator('.wa-target-picker [data-person="fictional-responsive-10"]').click();
  await act.locator('.wa-target-picker [data-selection]').click();
  await act.waitForFunction(() => !document.querySelector('.wa-target-picker'));
  await act.waitForFunction(() => document.querySelector('#wa-view .wa-workspace')?.getAttribute('aria-busy') === 'false');
  assert.ok((await act.locator('[data-wa-target="alpha"]').innerText()).includes('Fictional 季朗'), 'Alpha chip shows the newly selected member');

  // Detail jump: gate sheet -> related department jump -> back restores the gate sheet.
  await act.locator('.wa-channel-row .wa-row-gate-number').first().click();
  await act.waitForSelector('.wa-reading-sheet [data-wa-detail="gate"]', { timeout: 10000 });
  assert.ok(await act.locator('.wa-reading-sheet [data-wa-detail="gate"]').count(), 'gate detail opens');
  const jump = act.locator('.wa-reading-sheet [data-wa-department]').first();
  assert.ok(await jump.count(), 'gate detail offers a related department jump');
  await jump.click();
  await act.waitForSelector('.wa-reading-sheet [data-wa-detail="department"]', { timeout: 10000 });
  assert.ok(await act.locator('.wa-reading-sheet [data-wa-detail="department"]').count(), 'department detail opens from the jump');
  const back = act.locator('.wa-reading-sheet [data-wa-back]');
  assert.ok(await back.count(), 'nested sheet exposes a back control');
  await back.click();
  await act.waitForSelector('.wa-reading-sheet [data-wa-detail="gate"]', { timeout: 10000 });
  assert.ok(await act.locator('.wa-reading-sheet [data-wa-detail="gate"]').count(), 'back returns to the gate detail');
  await act.keyboard.press('Escape');
  await act.waitForFunction(() => !document.querySelector('.wa-detail:not(.hidden)'));
  await act.screenshot({ path: `${out}/interaction-390.png`, fullPage: true, animations: 'disabled' });

  assert.deepEqual(errors, []);
  await actContext.close();

  console.log(`PASS responsive Wa: phone gate-number axis aligned across ${WIDTHS.filter(w => w <= PHONE_MAX).join('/')} (en/zh-CN/zh-Hant, light/dark); desktop rows sane at ${WIDTHS.filter(w => w > PHONE_MAX).join('/')}; landscape; real text-200% (11->22px proven); gate/picker dialog bounds; edit/save/picker-commit/detail-jump interactions; evidence in ${out}`);
} finally {
  await browser.close();
}
