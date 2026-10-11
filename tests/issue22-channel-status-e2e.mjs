/** Issue 22: real entry points plus deterministic production-model status fixtures. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = (process.env.E2E_URL || 'http://127.0.0.1:19970').replace(/\/$/, '');
const evidence = resolve(process.env.ISSUE22_STATUS_EVIDENCE_DIR || 'artifacts/issue22-status');
mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: process.env.CHROME_CHANNEL || 'msedge', headless: true });
const results = [];
const skinsFor = locale => process.env.ISSUE22_QUICK === '1' && locale !== 'zh-CN' ? ['default-light'] : ['default-light', 'default-dark'];
let activePage;
const detail = page => page.locator('#gate-detail:not(.hidden)');
async function invoke(page, operation, argument) {
  return page.evaluate(async ({ operation, argument }) => {
    const load = path => import(performance.getEntriesByType('resource')
      .find(entry => new URL(entry.name).pathname === path)?.name || path);
    const chart = await load('/src/views/chart.js');
    const { t } = await load('/src/lib/i18n.js');
    if (operation === 'labels') return {
      defined: t('Birth activations'), natal: t('Birth activations'),
      completed: t('Completed by transit'), transit: t('Transit only'),
      inactive: t(argument === 'birth' ? 'Not defined in this view' : 'No complete channel in this view'),
      centerDefined: t('Defined'), centerNatal: t('Birth chart'),
    };
    if (operation === 'center') chart.showCenterDetail('spleen');
    if (operation === 'fixture') {
      const { buildTransitGraph } = await load('/src/lib/transit-graph.js');
      const natal = { gates: { all: argument === 'natal' ? [10, 57] : argument === 'completed' ? [57] : [] }, centers: { definedNames: [] } };
      const transitGates = argument === 'completed' ? { sun: { gate: 20, line: 1 } }
        : argument === 'transit' ? { sun: { gate: 34, line: 1 }, earth: { gate: 57, line: 2 } } : {};
      chart.showTransitDetail('gate', 57, { model: buildTransitGraph(natal, transitGates), transitGates });
    }
  }, { operation, argument });
}
async function close(page) {
  await page.keyboard.press('Escape');
  await page.locator('#gate-detail').waitFor({ state: 'hidden' });
}
async function selectSkin(page, id) {
  const exit = page.locator('#timeline-view [data-action="mobile-exit"]');
  if (!(await page.locator('#more-toggle').isVisible()) && await exit.isVisible()) await exit.click();
  if (!(await page.locator('#more-menu').evaluate(node => node.open))) await page.locator('#more-toggle').click();
  await page.locator('#skin-settings-button').click();
  await page.locator(`#skin-picker [data-skin-id="${id}"]`).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('html').getAttribute('data-skin'), id);
}
async function status(node) {
  return node.evaluate(node => {
    const css = getComputedStyle(node);
    const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'backgroundImage',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderRadius', 'letterSpacing', 'textTransform'];
    return { text: node.textContent.trim(), classes: [...node.classList].sort(),
      style: Object.fromEntries(properties.map(key => [key, css[key]])) };
  });
}
async function compare(page, metadata, expected = null) {
  const labels = await invoke(page, 'labels', metadata.entry);
  const keys = await detail(page).locator('[data-channel]').evaluateAll(nodes => nodes.map(n => n.dataset.channel));
  const header = await detail(page).locator('.tl-detail-header').innerText();
  const seen = [];
  for (const key of keys) {
    const row = detail(page).locator('.gate-detail-channel').filter({ has: page.locator(`[data-channel="${key}"]`) });
    const list = await status(row.locator('.transit-source-badge'));
    const source = ['defined', 'natal', 'completed', 'transit', 'inactive'].find(s => list.classes.includes(s));
    seen.push(source);
    assert.ok(source, 'original source class retained');
    assert.equal(list.text, labels[source], `${metadata.entry}/${key} localized status`);
    for (const name of ['tl-detail-channel-status', 'tl-activation-label']) assert.ok(list.classes.includes(name));
    assert.equal(list.classes.includes('tl-activation-natal'), ['defined', 'natal'].includes(source));
    const paired = row.locator('[data-paired-gate]');
    const pairedMarkup = await paired.evaluate(n => n.outerHTML);
    const geometry = await paired.evaluate(node => {
      const b = node.getBoundingClientRect(), s = node.parentElement.querySelector('.transit-source-badge').getBoundingClientRect();
      return { height: b.height, width: b.width, left: b.left, right: b.right, top: b.top, statusBottom: s.bottom,
        scroll: node.scrollWidth, client: node.clientWidth, padding: getComputedStyle(node).padding, background: getComputedStyle(node).backgroundColor };
    });
    assert.ok(geometry.height >= (metadata.width<=600 ? 44 : 30) && geometry.width >= 44);
    assert.ok(geometry.left >= 0 && geometry.right <= metadata.width && geometry.scroll <= geometry.client + 1);
    assert.ok(geometry.top >= geometry.statusBottom, 'paired entry remains below status');
    assert.equal(geometry.padding, '0px');
    assert.equal(geometry.background, 'rgba(0, 0, 0, 0)');
    const headerLayout = await row.evaluate(n => {
      const header = n.querySelector('.gate-detail-channel-header'), title = header?.querySelector('[data-channel]'), badges = header?.querySelector('.channel-circuit-badges'), status = n.querySelector('.transit-source-badge');
      if (!header || !title || !badges) return null;
      const h=header.getBoundingClientRect(), t=title.getBoundingClientRect(), b=badges.getBoundingClientRect(), s=status.getBoundingClientRect();
      return { independent:status.parentElement===n, gap:s.top-h.bottom, fits:t.width+b.width+8<=h.width+0.02,
        sameRow:Math.min(t.bottom,b.bottom)>Math.max(t.top,b.top), wrapGap:b.top-t.bottom };
    });
    assert.ok(headerLayout?.independent && headerLayout.gap>=4 && headerLayout.gap<=6, 'status remains its own row across birth/transits/timeline');
    assert.equal(headerLayout.sameRow,headerLayout.fits,'header title and badges share a row whenever they fit');
    if (!headerLayout.fits) assert.ok(headerLayout.wrapGap>=4,'narrow header wraps naturally');
    await row.locator('[data-channel]').click();
    const full = await status(detail(page).locator('.tl-detail-channel-status'));
    assert.deepEqual(list, full, `${metadata.entry}/${key}: exact text/classes/computed typography, color, background and spacing`);
    assert.equal(await detail(page).locator('[data-channel-gate]').count(), 2, 'full channel cards retained');
    if (metadata.entry === 'timeline') {
      const timing = detail(page).locator('.tl-detail-timing');
      assert.ok(await timing.count() <= 1, 'inactive channels may have no interval timing');
      if (await timing.count()) {
        assert.equal(await timing.getAttribute('data-kind'), 'channel');
        assert.equal(await timing.getAttribute('data-id'), key);
      }
    }
    await detail(page).locator('.gate-detail-back').click();
    assert.equal(await detail(page).locator('.tl-detail-header').innerText(), header, 'gate header/timing survives navigation');
    assert.equal(await paired.evaluate(n => n.outerHTML), pairedMarkup, 'paired entry markup unchanged after return');
    results.push({ ...metadata, key, source, list, full });
  }
  if (expected) assert.ok(seen.includes(expected), `fixture covers ${expected}`);
  const paired = detail(page).locator('[data-paired-gate]').first();
  const target = await paired.getAttribute('data-paired-gate');
  if (metadata.width <= 600) await paired.tap();
  else { await paired.focus(); await paired.press('Enter'); }
  assert.ok((await detail(page).locator('.tl-detail-heading > .detail-label').textContent()).includes(target));
  await detail(page).locator('.gate-detail-back').click();
  assert.equal(await detail(page).locator('.tl-detail-header').innerText(), header);
}
try {
  for (const width of [1280, 390, 320]) for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    console.log(`Status comparison ${width}/${locale}`);
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width <= 600, reducedMotion: 'reduce' });
    await context.addInitScript(locale => localStorage.setItem('ohd-language', locale), locale);
    await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
    const page = activePage = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-01T06:31:21Z'));
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
    await page.locator('#foundation-panel .reliability').waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    // Real birth entry includes a known full natal channel (24-61), plus multi-channel gates 20/57.
    for (const skin of skinsFor(locale)) {
      await selectSkin(page, skin);
      for (const gate of [24, 20, 37, 57]) {
        await page.locator(`#bodygraph-container .bg-gate[data-gate="${gate}"]`).click();
        await compare(page, { width, locale, skin, entry: 'birth', gate }, gate === 24 ? 'defined' : null);
        await close(page);
      }
    }
    // Center call sites still use the legacy badge, never the gate-only status treatment.
    await invoke(page, 'center');
    assert.equal(await detail(page).locator('.center-detail-head').count(), 1);
    assert.equal(await detail(page).locator('[data-paired-gate], .tl-detail-channel-status').count(), 0);
    const centerLabels = await invoke(page, 'labels', 'birth');
    for (const badge of await detail(page).locator('.gate-detail-channel > .transit-source-badge').all()) {
      const snapshot = await status(badge);
      assert.deepEqual(snapshot.classes, ['circuit-badge', snapshot.classes.includes('defined') ? 'defined' : 'inactive', 'transit-source-badge'].sort());
      assert.equal(snapshot.text, snapshot.classes.includes('defined') ? centerLabels.centerDefined : centerLabels.inactive);
    }
    await close(page);
    // Deterministic status coverage uses the production graph model, not a mocked status function.
    const skins = skinsFor(locale);
    for (const skin of skins) {
      await selectSkin(page, skin);
      for (const source of ['natal', 'completed', 'transit', 'inactive']) {
        await invoke(page, 'fixture', source);
        await compare(page, { width, locale, skin, entry: 'fixture', gate: 57 }, source);
        if (process.env.ISSUE22_SCREENSHOTS !== '0' && width === 320 && locale === 'zh-CN' && ['default-light', 'default-dark'].includes(skin) && source === 'completed') {
          await detail(page).locator('[data-lens="gk"]').click();
          await detail(page).locator('[data-paired-gate]').last().scrollIntoViewIfNeeded();
          await page.screenshot({ path: resolve(evidence, `320-zh-CN-${skin}.png`) });
        }
        await close(page);
      }
    }
    // Real production callbacks in both transit entry points, with their own context and timing.
    for (const entry of ['transits', 'timeline']) {
      const nav = page.locator(`.nav-link[data-view="${entry}"]`);
      if (!(await nav.isVisible())) await page.locator('#mobile-menu-toggle').click();
      await nav.click();
      if (entry === 'timeline') await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 120000 });
      else await page.locator('#transit-stage .tl-planet[data-gate]').first().waitFor({ timeout: 60000 });
      for (const skin of skinsFor(locale)) {
        await selectSkin(page, skin);
        for (const gate of [20, 37, 57]) {
          const selector = entry === 'transits' ? `#transit-bodygraph .bg-gate[data-gate="${gate}"]`
            : `#timeline-view .tl-graph .bg-gate[data-gate="${gate}"]`;
          await page.locator(selector).first().click();
          await compare(page, { width, locale, skin, entry, gate });
          await close(page);
        }
      }
    }
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    await context.close(); activePage = null;
  }
  writeFileSync(resolve(evidence, 'results.json'), JSON.stringify({ base, passed: true, comparisons: results.length, results }, null, 2) + '\n');
  console.log(`PASS ${results.length} list/full comparisons; real birth/transits/timeline, deterministic natal/completed/transit/inactive, three locales, 1280/390/320, light/dark skins.`);
} catch (error) {
  if (activePage) await activePage.screenshot({ path: resolve(evidence, `failure-${Date.now()}.png`) }).catch(() => {});
  writeFileSync(resolve(evidence, `failure-${Date.now()}.json`), JSON.stringify({ error: error.stack, completed: results }, null, 2));
  throw error;
} finally { await browser.close(); }
