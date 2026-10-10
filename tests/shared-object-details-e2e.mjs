import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const base = process.env.E2E_URL || 'http://127.0.0.1:19964';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chromium', headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Fictional chart exists before Penta is opened: detect accidental current-person reads.
  await page.goto(`${base}/?d=1990-06-15&t=14%3A30&tz=-6`);
  await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
  await page.locator('#bodygraph-container .bg-gate[data-gate="31"]').click();
  const chartText = await page.locator('#lens-content').innerText();
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    const { pentaDetailAdapter: adapter } = await import('/src/lib/shared-object-details.js');
    const dialogApi = await import('/src/lib/detail-dialog.js');
    const trigger = document.createElement('button'); trigger.id = 'synthetic-trigger'; trigger.textContent = 'Synthetic Penta'; document.body.append(trigger);
    const root = document.createElement('div'); root.id = 'synthetic-dialog'; root.className = 'gate-detail hidden'; document.body.append(root);
    const gate = { gate: 31, activations: [{ memberId: 'fiction', side: 'design', planet: 'moon', gate: 31, line: 4 }] };
    const channel = { channelId: '7-31', gates: [7, 31], status: 'crossMemberOnly', holdersByGate: { 7: ['other'], 31: ['fiction'] } };
    const ctx = { groupLabel: 'Synthetic group', people: [{ memberId: 'fiction', displayName: 'Only Penta Person', timeUnknown: true, estimatedTime: '12:00' }, { memberId: 'other', displayName: 'Other Penta Person' }] };
    let dispose;
    let previous = null;
    const show = kind => {
      dispose?.();
      dialogApi.prepareDetailDialog(root, 'synthetic');
      root.innerHTML = `<div class="gate-detail-card"><div class="gate-detail-nav">${previous ? '<button data-shared-back>Back</button>' : ''}<button class="gate-detail-close">Close</button></div><div class="gate-detail-body">${adapter[kind](kind === 'gate' ? gate : channel, ctx)}</div></div>`;
      dispose = adapter.bind(root, { ...ctx, onGateSelect: () => { previous = 'channel'; show('gate'); }, onChannelSelect: () => { previous = 'gate'; show('channel'); }, onBack: () => { const kind = previous; previous = null; show(kind); } });
      dialogApi.openDetailDialog(root, () => dispose?.(), { owner: 'synthetic' });
    };
    trigger.onclick = () => { previous = null; show('gate'); };
    window.syntheticDetails = { show, dispose: () => dispose?.() };
  });
  await page.locator('#synthetic-trigger').click();
  const root = page.locator('#synthetic-dialog');
  assert.match(await root.innerText(), /Only Penta Person/);
  assert.match(await root.innerText(), /12:00/);
  assert.equal(await root.locator('[data-penta-specific]').count(), 0);
  assert.equal(await root.locator('[data-shared-reading]').innerText(), chartText);
  assert.equal(await root.locator('[data-penta-activations] li').count(), 1);
  assert.match(await root.locator('[data-penta-activations]').innerText(), /31\.4/);
  for (const locale of ['en', 'zh-CN', 'zh-Hant']) {
    await page.evaluate(async locale => { (await import('/src/lib/i18n.js')).setLocale(locale, { persist: false }); window.syntheticDetails.show('gate'); }, locale);
    for (const lens of ['iching', 'gk', 'meridian', 'hd']) {
      await root.locator(`[data-shared-lens="${lens}"]`).click();
      assert.ok((await root.locator('[data-shared-reading]').innerText()).length > 30);
      assert.equal(await root.locator(`[data-shared-lens="${lens}"]`).getAttribute('aria-pressed'), 'true');
    }
    assert.doesNotMatch(await root.innerText(), /https?:|hd\.penta\.|missing/i);
  }
  await root.locator('[data-shared-channel-select="7-31"]').click();
  assert.equal(await root.locator('[data-penta-channel-state]').count(), 1);
  await root.locator('[data-shared-back]').click();
  assert.equal(await root.locator('[data-shared-gate="31"]').count(), 1);
  await root.locator('[data-shared-channel-select="7-31"]').click();
  await root.locator('[data-shared-gate-select="31"]').click();
  await page.keyboard.press('Escape');
  assert.equal(await root.isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'synthetic-trigger');
  await page.locator('#synthetic-trigger').click();
  await page.evaluate(() => window.syntheticDetails.dispose());
  await root.locator('[data-shared-lens="gk"]').click();
  assert.equal(await root.locator('.gk-spectrum').count(), 0);
  await page.keyboard.press('Escape');
  const cleared = await page.evaluate(async () => {
    // Vite HMR can timestamp the live module; importing the bare URL creates a separate singleton.
    const chartUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/views/chart.js')?.name;
    if (!chartUrl) throw new Error('Missing live chart module');
    const chart = await import(chartUrl);
    if (!chart.getCurrentChart()) throw new Error('Expected the fictional current chart before cleanup');
    chart.showGateDetail(31);
    if (document.getElementById('gate-detail').classList.contains('hidden')) throw new Error('Expected an open chart detail before cleanup');
    chart.clearCurrentChart();
    chart.clearCurrentChart(); // idempotent cleanup
    chart.showGateDetail(31);
    return { current: chart.getCurrentChart(), open: !document.getElementById('gate-detail').classList.contains('hidden') };
  });
  assert.deepEqual(cleared, { current: null, open: false });
  await page.goto(`${base}/#library/gate/31`);
  await page.locator('#reference-detail [data-shared-reading]').waitFor();
  await page.evaluate(async () => { (await import('/src/lib/i18n.js')).setLocale('zh-CN', { persist: false }); const url = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/views/reference.js')?.name; (await import(url)).renderReferenceView({ languageChange: true }); });
  const libraryText = await page.locator('#reference-detail [data-shared-reading]').textContent();
  // Compare DOM textContent on both sides; innerText adds layout whitespace.
  const canonical = await page.evaluate(async () => {
    const { renderSharedGateReading } = await import('/src/lib/shared-object-details.js');
    const el = document.createElement('div'); el.innerHTML = renderSharedGateReading(31); return el.querySelector('[data-shared-reading]').textContent;
  });
  assert.equal(libraryText.replace(/\s+/g, ' ').trim(), canonical.replace(/\s+/g, ' ').trim());
  await page.locator('#reference-detail [data-reference-lens="gk"]').click();
  assert.equal(await page.locator('#reference-detail .gk-spectrum').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS shared details: chart/library reuse, Penta isolation, three locales, lenses, links, Back, Escape, focus and disposal');
  await context.close();
} finally { await browser.close(); }
