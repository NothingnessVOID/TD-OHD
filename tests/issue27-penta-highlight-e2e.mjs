import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.E2E_URL || 'http://127.0.0.1:19967';
const out = process.env.ISSUE27_EVIDENCE_DIR || 'artifacts/issue27/after';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
const results = [];
// Isolate the actual renderer and shared detail adapter, with calculated fictional
// coverage. Existing penta-card-hover/direct-details tests cover the real app boot.
const fixture = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/styles/team-direct.css">
</head><body><main id="team-view"><form id="team-form" onsubmit="return false"><div class="team-workspace">
<div class="team-graph-column"><div id="team-content" class="panel"></div></div><div id="team-analysis"></div>
</div></form></main></body></html>`;
async function mount(page) {
  await page.evaluate(async () => {
    const { analyzePentaStructure } = await import('/src/lib/human-design/penta-structure.js');
    const { TEAM_PLANETS } = await import('/src/lib/human-design/team-activation.js');
    const { createPentaMatrix } = await import('/src/views/penta-matrix.js');
    const { pentaDetailAdapter } = await import('/src/lib/shared-object-details.js');
    const values = [[7, 31, 1, 13, 33], [8, 13], [33]];
    const members = values.map((gates, i) => ({ memberId: `fixture-${i}`, chart: { gates: {
      personality: Object.fromEntries(TEAM_PLANETS.map((planet, j) => [planet, { gate: gates[j] || 64, line: 1, planet }])),
      design: Object.fromEntries(TEAM_PLANETS.map(planet => [planet, { gate: 64, line: 1, planet }]))
    } } }));
    const options = { result: analyzePentaStructure(members), people: members.map((m, i) => ({ memberId: m.memberId, displayName: `Member ${i + 1}` })), groupLabel: 'Issue 27', analysisContainer: document.querySelector('#team-analysis'), detailAdapter: pentaDetailAdapter };
    window.issue27Mount = extra => {
      window.issue27?.dispose();
      window.issue27 = createPentaMatrix(document.querySelector('#team-content'), { ...options, ...extra });
    };
    window.issue27Mount();
  });
}
async function paint(page) {
  return page.locator('.penta-render').evaluate(root => {
    const style = n => { const s = getComputedStyle(n); return [s.fill, s.stroke, s.strokeWidth, s.strokeDasharray, s.opacity]; };
    return {
      gates: [...root.querySelectorAll('.penta-gate')].map(n => [n.dataset.gate, n.classList.contains('penta-present'), style(n), style(n.querySelector('rect'))]),
      channels: [...root.querySelectorAll('.penta-edge')].map(n => [n.dataset.channel, n.querySelector('[data-penta-state]').dataset.pentaState, style(n), style(n.querySelector('line:not(.penta-hit)')), style(n.querySelector('.penta-edge-symbol'))]),
      badges: [...root.querySelectorAll('.penta-native-member')].map(n => [n.textContent, style(n), style(n.querySelector('circle'))])
    };
  });
}
async function cleared(page, baseline, reason) {
  assert.equal(await page.evaluate(() => window.issue27.selection), null, `${reason}: selection`);
  assert.equal(await page.locator('.penta-canvas [aria-pressed="true"]').count(), 0, `${reason}: aria-pressed`);
  // Removing an overlay may legitimately fire pointerover beneath the mouse.
  // Verify restoration after leaving; touch checks run without any mouse move.
  if (page.viewportSize().width === 1280) await page.mouse.move(0, 0);
  assert.equal(await page.locator('.penta-selected-target').count(), 0, `${reason}: graph highlight`);
  assert.deepEqual(await paint(page), baseline, `${reason}: activation/state/member paint restored`);
}
async function selected(page, kind, id) {
  assert.deepEqual(await page.evaluate(() => window.issue27.selection), { kind, id });
  assert.equal(await page.locator('.penta-canvas [aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator(`.penta-canvas button[data-select-kind="${kind}"][data-select-id="${id}"]`).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.penta-selected-target').count(), kind === 'gate' ? 1 : 3);
}
try {
  for (const width of [1280, 320, 390]) {
    const touch = width !== 1280;
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/issue27-fixture', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    await page.goto(`${base}/issue27-fixture`);
    await mount(page);
    try {
      for (const locale of ['en', 'zh-CN', 'zh-Hant']) for (const skin of ['default-light', 'default-dark', 'high-contrast']) {
        const name = `${width}-${locale}-${skin}`;
        await page.mouse.move(0, 0);
        await page.evaluate(async ({ locale, skin }) => {
          const { setLocale } = await import('/src/lib/i18n.js');
          const { setSkin } = await import('/src/lib/appearance.js');
          setLocale(locale); document.documentElement.lang = locale; setSkin(skin);
          window.issue27.setHighlightedMemberId(null); window.issue27.refreshLanguage();
        }, { locale, skin });
        const baseline = await paint(page);
        assert.equal(new Set(baseline.channels.map(c => c[1])).size, 4, 'all channel states');
        assert.ok(baseline.gates.some(g => g[1]) && baseline.gates.some(g => !g[1]), 'active and inactive gates');
        for (const [kind, id] of [['gate', '7'], ['gate', '14'], ['channel', '7-31'], ['channel', '1-8'], ['channel', '13-33'], ['channel', '2-14']]) {
          const hit = page.locator(`.penta-canvas button[data-select-kind="${kind}"][data-select-id="${id}"]`);
          await hit.scrollIntoViewIfNeeded();
          if (!touch) {
            await hit.hover();
            assert.equal(await page.locator('.penta-selected-target').count(), kind === 'gate' ? 1 : 3);
            assert.equal(await page.evaluate(() => window.issue27.selection), null, 'hover is temporary');
            assert.equal(await page.locator('.penta-canvas [aria-pressed="true"]').count(), 0);
            const hovered = await paint(page);
            assert.notDeepEqual(hovered, baseline, 'hover paints graph');
            if (kind === 'channel') assert.equal(hovered.channels.find(c => c[0] === id)[3][2], '4.5px', 'every coverage state gets emphasis');
            await page.mouse.move(0, 0); await cleared(page, baseline, 'pointer leaves');
          }
          if (touch) await hit.tap(); else await hit.click();
          await page.locator('.penta-detail:not(.hidden)').waitFor();
          await selected(page, kind, id);
          if (id === '7') await page.locator('.penta-detail .gate-detail-close').click();
          else if (id === '14') await page.locator('.penta-detail').click({ position: { x: 2, y: 2 } });
          else await page.keyboard.press('Escape');
          // Selection/ARIA clear immediately; touch needs no mouse movement.
          await cleared(page, baseline, `${name} ${kind} ${id} dismissed`);
          assert.equal(await hit.evaluate(n => n === document.activeElement), true, 'focus returns');
        }
        // Right-hand cards must drive the same temporary graph highlight.
        const row = page.locator('.penta-channel-reading[data-detail-id="1-8"]');
        await row.scrollIntoViewIfNeeded();
        if (!touch) {
          await row.hover(); assert.equal(await page.locator('.penta-selected-target').count(), 3);
          await page.mouse.move(0, 0); await cleared(page, baseline, 'analysis hover leaves');
        }
        if (touch) await row.tap(); else await row.click();
        await selected(page, 'channel', '1-8');
        await page.locator('.penta-detail [data-shared-gate-select="1"]').click();
        await selected(page, 'gate', '1');
        await page.locator('.penta-detail [data-shared-back]').click();
        await selected(page, 'channel', '1-8');
        await page.evaluate(async locale => {
          const { setLocale } = await import('/src/lib/i18n.js');
          window.issue27.openChannelDetail('1-8'); window.issue27.openChannelDetail('1-8');
          setLocale(locale === 'en' ? 'zh-CN' : 'en'); window.issue27.refreshLanguage();
          setLocale(locale); window.issue27.refreshLanguage();
        }, locale);
        await selected(page, 'channel', '1-8');
        assert.equal(await page.locator('.penta-detail:not(.hidden)').count(), 1);
        assert.equal(await page.locator('.penta-detail [data-shared-back]').count(), 0, 'repeat does not grow history');
        await page.keyboard.press('Escape'); await cleared(page, baseline, 'navigation/repeat/refresh close');
        assert.equal(await row.evaluate(n => n === document.activeElement && n.matches(':focus-visible')), true, 'refresh restores replacement trigger and keyboard ring');
        await page.evaluate(() => window.issue27.refreshLanguage());
        await cleared(page, baseline, 'closed language refresh');
        // Keep the pointer outside content: keyboard scrolling can otherwise
        // legitimately move another card under the stationary mouse.
        await page.mouse.move(0, 0);
        // Keyboard rings survive without forcing a persistent graph selection.
        for (const [trigger, key] of [[page.locator('.penta-gate-hit[data-gate="7"]'), 'Enter'], [page.locator('.penta-gate-reading[data-detail-id="7"]'), 'Space']]) {
          await trigger.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
          assert.equal(await trigger.evaluate(n => n.matches(':focus-visible') && getComputedStyle(n).outlineStyle !== 'none'), true);
          await trigger.press(key); await selected(page, 'gate', '7'); await page.keyboard.press('Escape');
          await cleared(page, baseline, 'keyboard dismiss');
        }
        await page.evaluate(() => window.issue27.setHighlightedMemberId('fixture-1'));
        const memberPaint = await paint(page);
        assert.notDeepEqual(memberPaint, baseline);
        await page.evaluate(() => window.issue27.openChannelDetail('7-31'));
        await selected(page, 'channel', '7-31'); await page.keyboard.press('Escape');
        await cleared(page, memberPaint, 'member focus retained');
        assert.equal(await page.evaluate(() => window.issue27.highlightedMemberId), 'fixture-1');
        await page.evaluate(() => window.issue27.setHighlightedMemberId(null));
        await cleared(page, baseline, 'member focus released');
        // Cancelled contact and detached/recreated renderers must not keep state.
        const gate = page.locator('.penta-gate-hit[data-gate="7"]');
        await gate.dispatchEvent('pointerover', { pointerType: 'touch', bubbles: true });
        await cleared(page, baseline, 'touch has no synthetic hover');
        await gate.dispatchEvent('pointerover', { pointerType: 'mouse', bubbles: true });
        await gate.dispatchEvent('pointercancel', { pointerType: 'mouse', bubbles: true });
        await cleared(page, baseline, 'cancel resets hover');
        await gate.dispatchEvent('pointerover', { pointerType: 'mouse', bubbles: true });
        await page.evaluate(() => window.issue27.refreshLanguage());
        await cleared(page, baseline, 'refresh drops old hover');
        await page.evaluate(() => {
          window.issue27.openGateDetail(7);
          const stale = window.issue27.selection;
          window.issue27Old = window.issue27;
          window.issue27Mount({ initialSelection: stale });
        });
        assert.equal(await page.evaluate(() => window.issue27Old.selection), null, 'dispose clears selection');
        assert.equal(await page.locator('.penta-detail:not(.hidden)').count(), 0);
        assert.equal(await page.locator('body').evaluate(n => n.classList.contains('modal-open')), false);
        await cleared(page, baseline, 'new renderer ignores stale selection');
        if (locale === 'en') {
          await gate.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
          await page.screenshot({ path: `${out}/${name}-closed.png` });
          if (!touch) { await gate.hover(); await page.screenshot({ path: `${out}/${name}-hover.png` }); }
          if (touch) await gate.tap(); else await gate.click();
          await page.screenshot({ path: `${out}/${name}-detail.png` });
          await page.keyboard.press('Escape'); await cleared(page, baseline, 'screenshot close');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
        results.push({ width, locale, skin, touch, passed: true });
        console.log(`PASS ${name}: hover, close/ESC/backdrop, navigation, keyboard, member, lifecycle`);
      }
      assert.deepEqual(errors, []);
    } catch (error) {
      await page.screenshot({ path: `${out}/${width}-failure.png` });
      await writeFile(`${out}/${width}-failure.json`, JSON.stringify({ error: error.stack, selection: await page.evaluate(() => window.issue27.selection), paint: await paint(page) }, null, 2));
      throw error;
    } finally { await context.close(); }
  }
  // Exercise the application's real locale subscription, not just the isolated
  // renderer API. A language change must preserve the open sheet and its history.
  const appContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const app = await appContext.newPage(), appErrors = [];
  app.on('pageerror', error => appErrors.push(error.message));
  try {
    await app.goto(`${base}/dev/test-people.html`);
    await app.locator('#import:not([disabled])').click(); await app.goto(base);
    await app.locator('#boot-status').waitFor({ state: 'hidden', timeout: 120000 });
    await app.locator('.nav-link[data-view="team"]').click();
    await app.locator('#team-add-saved-person').click();
    for (let i = 1; i <= 3; i++) await app.locator(`[data-add-person="td-ohd-fictional-0${i}"]`).click();
    await app.locator('#team-selection-confirm').click();
    await app.waitForFunction(() => document.querySelectorAll('.penta-gate-reading').length === 12 && document.querySelector('#team-content').getAttribute('aria-busy') === 'false');
    for (const width of [1280, 390]) {
      await app.setViewportSize({ width, height: 900 });
      for (const selector of ['.penta-gate-hit[data-gate="7"]', '.penta-gate-reading[data-detail-id="7"]']) {
        const trigger = app.locator(selector);
        await app.mouse.move(0, 0); await trigger.focus();
        await app.keyboard.press('Tab'); await app.keyboard.press('Shift+Tab');
        await trigger.press('Enter');
        await app.locator('.penta-detail [data-shared-channel-select="7-31"]').click();
        for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
          await app.evaluate(async locale => { const { setLocale } = await import('/src/lib/i18n.js'); setLocale(locale); }, locale);
          await app.locator('.penta-detail:not(.hidden) [data-penta-channel-state]').waitFor();
          assert.equal(await app.locator('.penta-gate.penta-selected-target').count(), 2, 'real locale path preserves endpoints');
          assert.equal(await app.locator('.penta-detail [data-shared-back]').count(), 1, 'real locale path preserves history');
        }
        await app.locator('.penta-detail [data-shared-back]').click();
        await app.locator('.penta-detail [data-shared-gate="7"]').waitFor();
        await app.keyboard.press('Escape'); await app.mouse.move(0, 0);
        assert.equal(await app.locator('.penta-selected-target').count(), 0);
        assert.equal(await app.locator('.penta-canvas [aria-pressed="true"]').count(), 0);
        assert.equal(await trigger.evaluate(n => n === document.activeElement && n.matches(':focus-visible') && getComputedStyle(n).outlineStyle !== 'none'), true, 'real locale refresh restores replacement trigger focus-visible');
        await app.screenshot({ path: `${out}/app-${width}-${selector.includes('reading') ? 'card' : 'graph'}-locale-focus.png` });
      }
    }
    assert.deepEqual(appErrors, []);
    console.log('PASS real app setLocale: desktop/mobile, graph/card trigger, retained dialog/history, Escape focus-visible');
  } finally { await appContext.close(); }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS Issue 27: ${results.length} viewport/locale/skin combinations`);
} finally { await browser.close(); }
