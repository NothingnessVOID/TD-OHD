/** Issue 22 visual pass. Capture baseline before editing source with ISSUE22_VISUAL_PHASE=before. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SKINS } from '../src/lib/skin-registry.js';

const base = (process.env.E2E_URL || 'http://127.0.0.1:19969').replace(/\/$/, '');
const phase = process.env.ISSUE22_VISUAL_PHASE || 'after';
assert.ok(['before', 'after'].includes(phase));
const root = resolve(process.env.ISSUE22_VISUAL_EVIDENCE_DIR || 'artifacts/issue22-visual');
const evidence = resolve(root, phase);
mkdirSync(evidence, { recursive: true });
const baselineFile = resolve(root, 'before/results.json');
const baseline = phase === 'after' && existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, 'utf8')).cases : [];
const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: process.env.CHROME_CHANNEL || 'msedge', headless: true });
const results = [];
let activePage;
async function invoke(page, gate) {
  return page.evaluate(async gate => {
    const load = path => import(performance.getEntriesByType('resource')
      .find(entry => new URL(entry.name).pathname === path)?.name || path);
    const chart = await load('/src/views/chart.js');
    const { t } = await load('/src/lib/i18n.js');
    const { gateName } = await load('/src/lib/vocabulary.js');
    chart.showGateDetail(gate);
    return [10, 20, 34].map(id => ({ id, label: t('Harmonic gate:'), gate: t('Gate {gate}', { gate: id }), name: gateName(id) }));
  }, gate);
}
async function selectSkin(page, id) {
  if (!(await page.locator('#more-menu').evaluate(node => node.open))) await page.locator('#more-toggle').click();
  await page.locator('#skin-settings-button').click();
  await page.locator(`#skin-picker [data-skin-id="${id}"]`).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('html').getAttribute('data-skin'), id);
}
async function snapshot(page, name) {
  const rows = page.locator('#gate-detail .gate-detail-channel');
  await rows.last().scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: resolve(evidence, `${name}-sheet.png`) });
  const clip = await rows.evaluateAll(nodes => {
    const boxes = nodes.map(node => node.getBoundingClientRect());
    const x = Math.min(...boxes.map(b => b.x));
    const y = Math.min(...boxes.map(b => b.y));
    return { x, y, width: Math.max(...boxes.map(b => b.right)) - x, height: Math.max(...boxes.map(b => b.bottom)) - y };
  });
  assert.ok(clip.y >= 0 && clip.y + clip.height <= 900, 'all three channels visible in crop');
  await page.screenshot({ path: resolve(evidence, `${name}-rows.png`), clip });
}
try {
  for (const width of [1280, 390, 320]) for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 600, reducedMotion: 'reduce' });
    await context.addInitScript(locale => localStorage.setItem('ohd-language', locale), locale);
    await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
    const page = activePage = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-01T06:31:21Z'));
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
    await page.locator('#foundation-panel .reliability').waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const skins = width === 1280 && locale === 'en' ? SKINS.map(skin => skin.id)
      : ['default-light', 'default-dark', 'high-contrast', 'midnight-contrast'];
    for (const skin of skins) {
      console.log(`${phase}: ${width}/${locale}/${skin}`);
      await selectSkin(page, skin);
      const labels = await invoke(page, 57);
      const detail = page.locator('#gate-detail:not(.hidden)');
      await detail.locator('[data-lens="gk"]').click();
      const buttons = detail.locator('[data-paired-gate]');
      assert.equal(await buttons.count(), 3);
      for (const label of labels) {
        const button = detail.locator(`[data-paired-gate="${label.id}"]`);
        const text = `${label.label} ${label.gate} · ${label.name}`;
        assert.equal((await button.textContent()).replace(/\s+/g, ' ').trim(), text);
        assert.equal(await detail.getByRole('button', { name: text, exact: true }).count(), 1, 'visible text provides full accessible name');
        if (phase === 'after') {
          assert.equal(await button.locator('.gate-detail-paired-gate-label').textContent(), label.label);
          assert.equal(await button.locator('.gate-detail-paired-gate-number').textContent(), label.gate);
          assert.equal(await button.locator('.gate-detail-paired-gate-name').textContent(), label.name);
          assert.equal(await button.locator('.gate-detail-paired-gate-link').textContent(), `${label.gate} · ${label.name}`);
          assert.equal(await button.locator('button, a, svg, [aria-hidden]').count(), 0);
        }
      }
      await buttons.last().scrollIntoViewIfNeeded();
      const metrics = await buttons.evaluateAll(nodes => nodes.map(node => {
        const css = getComputedStyle(node), box = node.getBoundingClientRect();
        const styles = selector => { const n = node.querySelector(selector); if (!n) return null; const s = getComputedStyle(n); return { color: s.color, size: parseFloat(s.fontSize), weight: Number(s.fontWeight) }; };
        const token = name => { const probe = document.createElement('span'); probe.style.color = `var(${name})`; node.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; };
        const badge = node.parentElement.querySelector(':scope > .transit-source-badge').getBoundingClientRect();
        return { height: box.height, width: box.width, left: box.left, right: box.right, top: box.top, scroll: node.scrollWidth, client: node.clientWidth,
          border: css.borderTopWidth, background: css.backgroundColor, padding: css.padding, shadow: css.boxShadow,
          label: styles('.gate-detail-paired-gate-label'), number: styles('.gate-detail-paired-gate-number'), name: styles('.gate-detail-paired-gate-name'), link: styles('.gate-detail-paired-gate-link'),
          colors: { secondary: token('--text-secondary'), accent: token('--accent'), text: token('--text') },
          badge: { width: badge.width, height: badge.height, bottom: badge.bottom } };
      }));
      for (const m of metrics) {
        assert.ok(m.height >= 44 && m.width >= 44, 'real 44px hit target');
        assert.ok(m.scroll <= m.client + 1 && m.left >= 0 && m.right <= width, 'button wraps within viewport');
        assert.ok(m.top >= m.badge.bottom, 'paired row does not squeeze or overlap status badge');
        if (phase === 'after') {
          assert.equal(m.border, '0px'); assert.equal(m.background, 'rgba(0, 0, 0, 0)');
          assert.equal(m.padding, '0px'); assert.equal(m.shadow, 'none');
          assert.equal(m.label.color, m.colors.secondary); assert.equal(m.number.color, m.colors.accent); assert.equal(m.name.color, m.colors.accent);
          assert.equal(m.link.color, m.colors.accent); assert.equal(m.name.weight, m.number.weight); assert.equal(m.name.weight, m.link.weight);
          assert.ok([500, 600].includes(m.link.weight));
          assert.ok(m.label.size < m.name.size && m.name.weight > m.label.weight);
        }
      }
      const previous = baseline.find(row => row.width === width && row.locale === locale && row.skin === skin);
      if (previous) metrics.forEach((m, i) => {
        assert.equal(m.badge.width, previous.metrics[i].badge.width, 'original status badge width preserved');
        assert.equal(m.badge.height, previous.metrics[i].badge.height, 'original status badge height preserved');
      });
      const boxes = await detail.locator('.gate-detail-channel, .channel-circuit-badges, .circuit-badge').evaluateAll(nodes => nodes.map(node => {
        const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, client: node.clientWidth, scroll: node.scrollWidth };
      }));
      for (const b of boxes) assert.ok(b.left >= 0 && b.right <= width && b.scroll <= b.client + 1, 'channel/badges fit viewport');
      const name = `${width}-${locale}-${skin}`;
      if (['default-light', 'default-dark'].includes(skin)) await snapshot(page, name);
      if (phase === 'after') {
        const first = buttons.first();
        await first.scrollIntoViewIfNeeded();
        await detail.locator('.gate-detail-close').focus();
        await page.keyboard.press('Tab');
        await first.focus();
        assert.equal(await first.evaluate(n => n.matches(':focus-visible')), true);
        const outline = await first.evaluate(n => ({ width: getComputedStyle(n).outlineWidth, style: getComputedStyle(n).outlineStyle }));
        assert.equal(outline.width, '2px'); assert.equal(outline.style, 'solid');
        assert.ok(await first.locator('.gate-detail-paired-gate-link').evaluate(n => getComputedStyle(n).textDecorationLine.includes('underline')));
        if (width === 1280 && locale === 'en' && ['default-light', 'default-dark'].includes(skin)) {
          await first.screenshot({ path: resolve(evidence, `${name}-focus.png`) });
        }
        await detail.locator('.gate-detail-close').focus();
        if (width === 1280) {
          await first.hover();
          assert.ok(await first.locator('.gate-detail-paired-gate-link').evaluate(n => getComputedStyle(n).textDecorationLine.includes('underline')));
          await page.mouse.move(0, 0);
        }
        assert.equal(await first.evaluate(n => n.matches(':focus-visible')), false);
        assert.equal(await first.locator('.gate-detail-paired-gate-link').evaluate(n => getComputedStyle(n).textDecorationLine), 'none', 'emphasis clears after interaction');
        // Click near the bottom of the real box, outside the compact text line.
        const hit = await first.boundingBox();
        if (width < 600) await page.touchscreen.tap(hit.x + 4, hit.y + hit.height - 2);
        else await page.mouse.click(hit.x + 4, hit.y + hit.height - 2);
        assert.equal(await detail.locator('.tl-detail-heading > .detail-label').textContent(), labels[0].gate);
        await detail.locator('.gate-detail-back').click();
        assert.equal(await detail.locator('[data-paired-gate]').count(), 3);
      }
      await page.keyboard.press('Escape');
      await page.locator('#gate-detail').waitFor({ state: 'hidden' });
      results.push({ width, locale, skin, metrics, baselineCompared: Boolean(previous) });
    }
    assert.deepEqual(errors, []);
    await context.close(); activePage = null;
  }
  writeFileSync(resolve(evidence, 'results.json'), JSON.stringify({ base, phase, passed: true, cases: results }, null, 2) + '\n');
  console.log(`PASS ${results.length} visual cases (${phase}); 1280/390/320, three languages, all registered desktop English skins.`);
} catch (error) {
  if (activePage) await activePage.screenshot({ path: resolve(evidence, 'failure.png') }).catch(() => {});
  writeFileSync(resolve(evidence, 'failure.json'), JSON.stringify({ error: error.stack, completed: results }, null, 2));
  throw error;
} finally { await browser.close(); }
