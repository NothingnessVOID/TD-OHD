/** Issues 22 + 23: UI navigation only; isolated, fictional birth and transit fixtures. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SKINS } from '../src/lib/skin-registry.js';

const base = (process.env.E2E_URL || 'http://127.0.0.1:19968').replace(/\/$/, '');
const evidence = resolve(process.env.ISSUE22_23_EVIDENCE_DIR || 'artifacts/issue22-23');
mkdirSync(evidence, { recursive: true });
const birth = '/?d=2000-05-10&t=12%3A30&tz=8';
const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const results = [];
let activePage;

// Use the loaded module identity so Vite's dependency version remains consistent.
async function invoke(page, operation, argument) {
  return page.evaluate(async ({ operation, argument }) => {
    const load = path => import(performance.getEntriesByType('resource')
      .find(entry => new URL(entry.name).pathname === path)?.name || path);
    const chart = await load('/src/views/chart.js');
    const { t, setLocale } = await load('/src/lib/i18n.js');
    const { gateName } = await load('/src/lib/vocabulary.js');
    if (operation === 'gate') chart.showGateDetail(argument);
    if (operation === 'center') chart.showCenterDetail(argument);
    if (operation === 'locale') setLocale(argument, { persist: false });
    if (operation === 'labels') return { gate: t('Gate {gate}', { gate: argument }), name: gateName(argument), paired: t('Harmonic gate:'), action: t('View gate details'), transit: t('Transit'), inactive: t('Inactive') };
    if (operation === 'fixture') {
      const { buildTransitGraph } = await load('/src/lib/transit-graph.js');
      const activations = argument.active ? { sun: { gate: 37, line: 1 } } : {};
      window.issue22Pins = [];
      window.issue22Closed = 0;
      const context = {
        model: buildTransitGraph({ gates: { all: [] }, centers: { definedNames: [] } }, activations, 'transit-only'),
        transitGates: activations,
        api: { setPinned: value => window.issue22Pins.push(value) },
        onDetailClose: () => window.issue22Closed++,
      };
      chart.showTransitDetail('gate', argument.gate, context);
    }
  }, { operation, argument });
}
const detail = page => page.locator('#gate-detail:not(.hidden)');
const paired = (page, gate) => detail(page).locator(`[data-paired-gate="${gate}"]`);
async function activate(locator, mode = 'click') {
  if (mode === 'touch') { await locator.scrollIntoViewIfNeeded(); await locator.tap(); }
  else if (mode === 'Enter' || mode === 'Space') { await locator.focus(); await locator.press(mode); }
  else await locator.click();
}
async function heading(page, gate, context) {
  const labels = await invoke(page, 'labels', gate);
  assert.equal(await detail(page).locator('.tl-detail-heading > .detail-label').textContent(), labels.gate);
  assert.equal(await detail(page).locator('.tl-detail-header').getAttribute('data-source-context'), context);
}
async function back(page) { await detail(page).locator('.gate-detail-back').click(); }
async function close(page, mode = 'escape') {
  if (mode === 'escape') await page.keyboard.press('Escape');
  else await detail(page).locator('.gate-detail-close').click();
  await page.locator('#gate-detail').waitFor({ state: 'hidden' });
}
async function noOverflow(page, width) {
  const measurements = await detail(page).locator('.gate-detail-body, .gate-detail-channel, .gate-detail-paired-gate, .transit-channel-gates, [data-channel-gate]').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { class: node.className, client: node.clientWidth, scroll: node.scrollWidth, left: box.left, right: box.right };
  }));
  for (const box of measurements) {
    assert.ok(box.scroll <= box.client + 1, `${width}px overflow ${JSON.stringify(box)}`);
    assert.ok(box.left >= -1 && box.right <= width + 1, `${width}px bounds ${JSON.stringify(box)}`);
  }
}
async function checkPairs(page, source, expected, context, mode) {
  await heading(page, source, context);
  const buttons = detail(page).locator('[data-paired-gate]');
  assert.deepEqual((await buttons.evaluateAll(nodes => nodes.map(node => Number(node.dataset.pairedGate)))).sort((a, b) => a - b), [...expected].sort((a, b) => a - b));
  assert.equal(await detail(page).locator('[data-channel]').count(), expected.length);
  const before = await detail(page).locator('.tl-detail-header').innerText();
  for (const target of expected) {
    const labels = await invoke(page, 'labels', target);
    assert.equal((await paired(page, target).textContent()).replace(/\s+/g, ' ').trim(), `${labels.paired} ${labels.gate} · ${labels.name}`);
    assert.equal(await paired(page, target).locator('.gate-detail-paired-gate-label').textContent(), labels.paired);
    assert.equal(await paired(page, target).locator('.gate-detail-paired-gate-number').textContent(), labels.gate);
    assert.equal(await paired(page, target).locator('.gate-detail-paired-gate-name').textContent(), labels.name);
    assert.equal(await paired(page, target).locator('button').count(), 0, 'no nested buttons');
    await activate(paired(page, target), mode);
    await heading(page, target, context);
    await back(page);
    await heading(page, source, context);
    assert.equal(await detail(page).locator('.tl-detail-header').innerText(), before, 'return preserves source activations/context');
  }
}
async function selectSkin(page, id) {
  if (!(await page.locator('#more-menu').evaluate(node => node.open))) await page.locator('#more-toggle').click();
  await page.locator('#skin-settings-button').click();
  await page.locator(`#skin-picker [data-skin-id="${id}"]`).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('html').getAttribute('data-skin'), id);
}
async function checkChannel(page, width) {
  const cards = detail(page).locator('[data-channel-gate]');
  assert.equal(await cards.count(), 2);
  for (const card of await cards.all()) {
    const gate = Number(await card.getAttribute('data-channel-gate'));
    const labels = await invoke(page, 'labels', gate);
    assert.equal(await card.locator('.detail-label').textContent(), labels.gate);
    assert.equal(await card.locator('.detail-name').innerText(), labels.name);
    assert.equal(await card.locator('.transit-detail-action').innerText(), labels.action);
    assert.equal(await card.evaluate(node => node.tagName), 'BUTTON');
    const colors = await card.locator('.detail-label').evaluate(node => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--accent)'; node.append(probe);
      const pair = [getComputedStyle(node).color, getComputedStyle(probe).color];
      probe.remove(); return pair;
    });
    assert.equal(colors[0], colors[1], 'gate label uses theme accent');
  }
  await noOverflow(page, width);
  const boxes = await cards.evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { top: b.top, left: b.left, height: b.height };
  }));
  if (width <= 390) {
    assert.equal(boxes[0].left, boxes[1].left);
    assert.ok(boxes[1].top >= boxes[0].top + boxes[0].height, 'mobile cards use one column');
  } else assert.equal(boxes[0].top, boxes[1].top, 'desktop cards use two columns');
}

try {
  for (const width of [1380, 390, 320]) for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 600, reducedMotion: 'reduce' });
    await context.addInitScript(locale => localStorage.setItem('ohd-language', locale), locale);
    await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
    const page = activePage = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-01T06:31:21Z'));
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const mode = width < 600 ? 'touch' : 'Enter';
    console.log(`Checking ${width}/${locale}`);
    await page.goto(base + birth);
    await page.locator('#foundation-panel .reliability').waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#bodygraph-container .bg-gate[data-gate="37"]').click();
    await checkPairs(page, 37, [40], 'birth', mode);
    await close(page);
    await invoke(page, 'gate', 57);
    await checkPairs(page, 57, [10, 20, 34], 'birth', mode);
    await detail(page).locator('.tl-detail-header').scrollIntoViewIfNeeded();
    if (process.env.ISSUE22_SCREENSHOTS !== '0') await page.screenshot({ path: `${evidence}/${width}-${locale}-birth-gate57-top.png` });
    await noOverflow(page, width);
    await detail(page).locator('[data-lens="gk"]').click();
    await paired(page, 34).scrollIntoViewIfNeeded();
    if (process.env.ISSUE22_SCREENSHOTS !== '0') await page.screenshot({ path: `${evidence}/${width}-${locale}-birth-pairs.png` });
    await detail(page).locator('[data-lens="hd"]').click();
    await close(page, 'button');

    // Center call sites omit sourceGate: the existing channel-only layout stays intact.
    await invoke(page, 'center', 'spleen');
    assert.equal(await detail(page).locator('[data-paired-gate]').count(), 0);
    await detail(page).locator('[data-channel]').first().click();
    await checkChannel(page, width);
    await back(page);
    assert.equal(await detail(page).locator('.center-detail-head').count(), 1);
    await close(page);

    // Deterministic inactive and active transit states, using the production graph model.
    await invoke(page, 'fixture', { gate: 57, active: false });
    assert.equal(await detail(page).locator('.gate-detail-channel .transit-source-badge.inactive').count(), 3);
    await checkPairs(page, 57, [10, 20, 34], 'transit', mode);
    assert.equal(await page.evaluate(() => window.issue22Closed), 0);
    await close(page);
    assert.equal(await page.evaluate(() => window.issue22Closed), 1);
    assert.equal(await page.evaluate(() => window.issue22Pins.at(-1)), null);

    const skins = process.env.ISSUE22_QUICK === '1'
      ? ['default-light', ...(locale === 'zh-CN' ? ['default-dark'] : []), ...(width===1380 && locale==='en' ? ['high-contrast','midnight-contrast'] : [])]
      : width === 1380 && locale === 'en' ? SKINS.map(skin => skin.id)
        : ['default-light', 'default-dark', 'high-contrast', 'midnight-contrast'];
    for (const skin of skins) {
      await selectSkin(page, skin);
      await invoke(page, 'fixture', { gate: 37, active: true });
      await checkPairs(page, 37, [40], 'transit', mode);
      await detail(page).locator('[data-channel="37-40"]').click();
      await checkChannel(page, width);
      const labels = await invoke(page, 'labels', 37);
      assert.equal(await detail(page).locator('[data-channel-gate="37"] .transit-source-badge').textContent(), labels.transit);
      assert.equal(await detail(page).locator('[data-channel-gate="40"] .transit-source-badge').textContent(), labels.inactive);
      if (process.env.ISSUE22_SCREENSHOTS !== '0' && ['default-light', 'default-dark'].includes(skin)) {
        await detail(page).locator('.chart-channel-gates').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${evidence}/${width}-${locale}-${skin}-channel.png` });
        await detail(page).locator('.chart-channel-gates').screenshot({ path: `${evidence}/${width}-${locale}-${skin}-cards.png` });
      }
      await activate(detail(page).locator('[data-channel-gate="40"]'), width < 600 ? 'touch' : 'Space');
      await heading(page, 40, 'transit');
      await back(page);
      await checkChannel(page, width);
      await back(page);
      await heading(page, 37, 'transit');
      // Shared dialog owns the focus trap and dismiss behavior throughout navigation.
      await detail(page).locator('[data-paired-gate="40"]').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('gate-detail-close')), true);
      await close(page, skin === 'default-dark' ? 'button' : 'escape');
      assert.equal(await page.evaluate(() => window.issue22Closed), 1);
      results.push({ width, locale, skin, pairedGates: true, channelCards: true, contextAndHistory: true });
    }

    // Real transit callbacks (not the deterministic fixture) retain transit activations.
    await page.goto(base + birth + '&view=transits');
    await page.locator('#transit-stage .tl-planet[data-planet="sun"][data-gate]').waitFor({ timeout: 60000 });
    await page.locator('#transit-bodygraph .bg-gate[data-gate="57"]').first().click();
    await checkPairs(page, 57, [10, 20, 34], 'transit', mode);
    await close(page);
    await page.locator('#transit-bodygraph .bg-gate[data-gate="37"]').first().click();
    await paired(page, 40).click();
    const nextLocale = locale === 'en' ? 'zh-CN' : 'en';
    await invoke(page, 'locale', nextLocale);
    await heading(page, 40, 'transit');
    await back(page);
    await heading(page, 37, 'transit');
    await close(page);
    await invoke(page, 'locale', locale);

    // A birth planet selected inside Transit keeps its exact selected source row,
    // including while the source gate itself is redrawn by a locale change.
    const planet = page.locator('#transit-stage .tl-birth-value[data-side="personality"][data-gate]').first();
    const sourceGate = Number(await planet.getAttribute('data-gate'));
    const sourcePlanet = await planet.getAttribute('data-birth-planet');
    await planet.click();
    await detail(page).locator('[data-planet-gate]').click();
    const selectedSource = async () => {
      await heading(page, sourceGate, 'transit');
      const selected = detail(page).locator('.selected-activation');
      assert.equal(await selected.count(), 1);
      assert.equal(await selected.getAttribute('data-activation-side'), 'personality');
      assert.equal(await selected.getAttribute('data-activation-planet'), sourcePlanet);
      assert.ok((await selected.getAttribute('data-activation-value')).startsWith(`${sourceGate}.`));
    };
    await selectedSource();
    await detail(page).locator('[data-paired-gate]').first().click();
    await back(page);
    await selectedSource();
    await invoke(page, 'locale', nextLocale);
    await selectedSource();
    await detail(page).locator('[data-paired-gate]').first().click();
    await invoke(page, 'locale', locale);
    await back(page);
    await selectedSource();
    await close(page);

    // Related library gate reading stays in its own renderer and keeps all four lenses.
    await page.goto(base + '/#library/gate/37');
    await page.locator('#reference-detail h2').waitFor();
    assert.equal(await page.locator('#reference-detail').isVisible(), true, 'visible library owner including mobile sheet');
    assert.equal(await page.locator('#reference-detail [data-paired-gate]').count(), 0);
    assert.equal(await page.locator('#reference-detail [data-reference-lens]').count(), 4);
    for (const lens of ['iching', 'gk', 'meridian', 'hd']) {
      await page.locator(`#reference-detail [data-reference-lens="${lens}"]`).click();
      assert.ok((await page.locator('#reference-detail .reference-reading').innerText()).trim().length > 0);
    }
    assert.deepEqual(errors, [], `${width}/${locale} uncaught browser errors`);
    await context.close(); activePage = null;
  }
  writeFileSync(`${evidence}/results.json`, JSON.stringify({ base, cases: results, passed: true }, null, 2) + '\n');
  console.log(`PASS ${results.length} width/locale/skin cases; birth/transit/inactive navigation, cards, keyboard/touch/back/Escape/close, library lenses.`);
} catch (error) {
  if (activePage) {
    await activePage.screenshot({ path: `${evidence}/failure-${Date.now()}.png` }).catch(() => {});
  }
  writeFileSync(`${evidence}/failure-${Date.now()}.json`, JSON.stringify({ error: error.stack, completed: results }, null, 2));
  throw error;
} finally { await browser.close(); }
