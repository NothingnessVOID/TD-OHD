/**
 * Real-browser coverage for the shared clipboard fallback.
 *
 * Everything here runs in Chrome against the real DOM, the real module graph
 * and the real system clipboard; only the browser API is stubbed, and each
 * scenario says which part. The stubs reproduce what a host browser reports
 * (`navigator.clipboard` missing, `writeText` missing, `writeText` rejecting,
 * `execCommand('copy')` returning false) — they are not proof that a specific
 * Android WebView behaves identically.
 *
 * The chart engine is not needed: the share menu is mounted with birth data and
 * a chart snapshot, which is all the copy entries consume.
 *
 * Run: E2E_URL=http://127.0.0.1:<port> node tests/clipboard-fallback-e2e.mjs
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = (process.env.E2E_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
// Explicitly synthetic birth data, assembled from parts so the fixture can never
// be mistaken for a real record. The clipboard entries only encode it; no chart
// is computed and no personal data is involved.
const SYNTHETIC_BIRTH = {
  birthDate: [2000, 1, 1].map((value, index) => String(value).padStart(index ? 2 : 4, '0')).join('-'),
  birthTime: '12:30',
  timezone: 8,
};
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });

const FAKE_CHART = {
  type: { name: 'Generator' },
  authority: { name: 'Sacral' },
  profile: { numbers: '1/3' },
  definition: 'Single',
  centers: { definedNames: ['sacral'], undefinedNames: ['throat'], openNames: ['head'] },
  channels: [],
};

// --- init scripts: the only stubs in this file -----------------------------
const setLanguage = () => { try { localStorage.setItem('ohd-language', 'en'); } catch { /* blocked storage */ } };

const noWriteText = () => {
  window.__execCalls = 0;
  const exec = document.execCommand.bind(document);
  document.execCommand = (...args) => { window.__execCalls += 1; return exec(...args); };
  try { Object.defineProperty(navigator.clipboard, 'writeText', { value: undefined, configurable: true }); } catch { /* no clipboard */ }
};

const rejectedWriteText = () => {
  window.__execCalls = 0;
  const exec = document.execCommand.bind(document);
  document.execCommand = (...args) => { window.__execCalls += 1; return exec(...args); };
  Object.defineProperty(navigator.clipboard, 'writeText', {
    value: () => Promise.reject(new Error('NotAllowedError')), configurable: true,
  });
};

const brokenClipboard = delayMs => () => {
  window.__execCalls = 0;
  const exec = document.execCommand.bind(document);
  window.__restoreExec = () => { document.execCommand = (...args) => { window.__execCalls += 1; return exec(...args); }; };
  document.execCommand = () => { window.__execCalls += 1; return false; };
  Object.defineProperty(navigator.clipboard, 'writeText', {
    // delayMs keeps the rejection asynchronous: the dialog may only open after it settles.
    value: () => new Promise((resolve, reject) => setTimeout(() => reject(new Error('NotAllowedError')), delayMs)),
    configurable: true,
  });
};

async function newContext(init, viewport = { width: 1224, height: 900 }) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], locale: 'en-US', viewport });
  await context.addInitScript(setLanguage);
  if (init) await context.addInitScript(init);
  return context;
}

async function newPage(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // The share menu is mounted from the same synthetic birth data the URL carries.
  await page.goto(`${base}/?d=${SYNTHETIC_BIRTH.birthDate}&t=12%3A30&tz=8`);
  await page.locator('#more-toggle').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('d'), SYNTHETIC_BIRTH.birthDate,
    'the synthetic birth date survives the URL contract');
  return { page, errors };
}

async function openShareMenu(context) {
  const { page, errors } = await newPage(context);
  // Mount the real share menu: birth data plus the chart snapshot it exports.
  const expected = await page.evaluate(async ({ chart, birth }) => {
    const { configureShareMenu } = await import('/src/lib/view-share.js');
    const { shareUrl, connectionUrl } = await import('/src/lib/share.js');
    configureShareMenu('chart', { birth, chart }, {});
    return { share: shareUrl(birth), invite: connectionUrl(birth) };
  }, { chart: FAKE_CHART, birth: SYNTHETIC_BIRTH });
  await page.locator('#more-toggle').click();
  await page.locator('#chart-share-menu > summary').click();
  return { page, errors, expected };
}

const readClipboard = page => page.evaluate(() => navigator.clipboard.readText());
const buttonLabel = (page, id) => page.locator(`#${id}`).textContent();
const waitForLabel = (page, id, text) => page.waitForFunction(
  ({ id, text }) => document.getElementById(id)?.textContent === text, { id, text }, { timeout: 8000 });

try {
  // 1. The async API works: nothing falls back.
  {
    const context = await newContext(null);
    const { page, errors, expected } = await openShareMenu(context);
    await page.locator('#share-chart').click();
    await waitForLabel(page, 'share-chart', 'Link copied ✓');
    assert.equal(await readClipboard(page), expected.share, 'navigator.clipboard received the share link');
    assert.deepEqual(errors, []);
    console.log('async clipboard: copied', expected.share.length, 'chars');
    await context.close();
  }

  // 2. The host exposes no writeText: the legacy textarea path fills the real clipboard.
  {
    const context = await newContext(noWriteText);
    const { page, expected } = await openShareMenu(context);
    await page.locator('#share-chart').click();
    await waitForLabel(page, 'share-chart', 'Link copied ✓');
    assert.equal(await readClipboard(page), expected.share, 'legacy copy put the link on the clipboard');
    assert.ok(await page.evaluate(() => window.__execCalls) >= 1, 'execCommand("copy") was used');
    assert.equal(await page.evaluate(() => document.querySelectorAll('body > textarea').length), 0, 'no leftover textarea');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'share-chart', 'focus stays on the copy button');
    // The third entry exports computed chart data through the same path.
    await page.locator('#copy-data').click();
    await waitForLabel(page, 'copy-data', 'Data copied ✓');
    const data = await readClipboard(page);
    assert.ok(data.includes('Human Design data') && data.includes('Generator'),
      'the chart data export reached the clipboard');
    console.log('legacy fallback: copied without the async API');
    await context.close();
  }

  // 3. writeText rejects asynchronously: the legacy path still copies for real.
  {
    const context = await newContext(rejectedWriteText);
    const { page, errors, expected } = await openShareMenu(context);
    await page.locator('#invite-compare').click();
    await waitForLabel(page, 'invite-compare', 'Invite copied ✓');
    assert.equal(await readClipboard(page), expected.invite, 'legacy copy ran after the rejection');
    assert.ok(await page.evaluate(() => window.__execCalls) >= 1, 'execCommand("copy") was used');
    assert.deepEqual(errors, []);
    console.log('async rejection: legacy copy succeeded');
    await context.close();
  }

  // 4. Both paths fail: an honest manual dialog, then a working "Copy again".
  {
    const context = await newContext(brokenClipboard(0));
    const { page, errors, expected } = await openShareMenu(context);
    await page.locator('#share-chart').click();
    await waitForLabel(page, 'share-chart', 'Copy blocked — please try again');
    const dialog = page.locator('.modal.manual-copy');
    await dialog.waitFor();
    assert.equal(await dialog.locator('.modal-title').textContent(), 'Copy manually');
    assert.equal(await dialog.locator('.operation-message').textContent(),
      'Nothing has been copied yet. Select the text below and copy it, or press Copy again.');
    const area = dialog.locator('textarea.manual-copy-text');
    assert.equal(await area.inputValue(), expected.share, 'the dialog holds the exact plain text');
    assert.equal(await area.getAttribute('readonly'), '', 'the text stays read-only for selection');
    assert.equal(await page.locator('.manual-copy [data-manual-retry]').textContent(), 'Copy again');

    // Escape closes without claiming a copy, and focus returns to the trigger.
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'share-chart',
      'focus returns to the copy button, not the body');

    // Hosts that close the menu while the dialog is up leave no visible trigger:
    // focus falls back to the share summary instead of the body.
    await page.locator('#share-chart').click();
    await dialog.waitFor();
    await page.evaluate(() => { document.getElementById('chart-share-menu').open = false; });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SUMMARY',
      'focus falls back to the share menu when the button is hidden');

    // A new click reopens the menu and dialog; retrying while still blocked keeps the manual path.
    await page.locator('#chart-share-menu > summary').click();
    await page.locator('#share-chart').click();
    await dialog.waitFor();
    await page.locator('.manual-copy [data-manual-retry]').click();
    assert.equal(await dialog.locator('.operation-message').textContent(),
      'Copy is still blocked. Select the text below and copy it manually.');
    assert.ok(await dialog.isVisible(), 'the dialog stays open when the retry fails');
    assert.deepEqual(await area.evaluate(node => [node.selectionStart, node.selectionEnd]),
      [0, expected.share.length], 'the text stays selected for a manual copy');

    // Restore the legacy command: the next click is a fresh user gesture.
    await page.evaluate(() => window.__restoreExec());
    await page.locator('.manual-copy [data-manual-retry]').click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await readClipboard(page), expected.share, 'the retry copied the real text');
    assert.equal(await buttonLabel(page, 'share-chart'), 'Link copied ✓');
    // The retry click also dismissed both menus, so focus lands on the "more" toggle.
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'more-toggle',
      'focus stays in the header after the manual dialog closes');
    assert.deepEqual(errors, []);
    console.log('manual dialog: honest state, retry copies, focus preserved');
    await context.close();
  }

  // 5. The legacy path restores focus, field selection, document selection and scroll,
  //    and preserves CJK/Unicode text exactly.
  {
    const context = await newContext(noWriteText);
    const { page } = await newPage(context);
    const result = await page.evaluate(async () => {
      const { copyPlainText } = await import('/src/lib/clipboard.js');
      document.documentElement.style.scrollBehavior = 'auto';
      // Room to scroll: the copy must not move the page.
      document.body.insertAdjacentHTML('beforeend', '<div style="height:3000px"></div>');
      const wrap = document.createElement('div');
      const field = document.createElement('textarea');
      field.value = 'field text 0123456789';
      wrap.appendChild(field);
      document.body.appendChild(wrap);
      field.focus();
      field.setSelectionRange(3, 8, 'backward');
      const text = '【行運】2026-01-02 03:04:05 GMT\nSun: 12.3 ｜ 測試 🧭 \\ backslash';
      window.scrollTo(0, 600);
      const before = window.scrollY;
      const copied = await copyPlainText(text);
      const state = {
        copied,
        before,
        scrollY: window.scrollY,
        focusRestored: document.activeElement === field,
        selection: [field.selectionStart, field.selectionEnd, field.selectionDirection],
        leftovers: document.querySelectorAll('body > textarea').length,
      };
      const read = await navigator.clipboard.readText();

      // No field focused: the document Range (not an input) has to come back intact.
      field.blur();
      const paragraph = document.createElement('p');
      paragraph.textContent = '選取保留 range test 12345';
      document.body.appendChild(paragraph);
      const documentSelection = document.getSelection();
      documentSelection.removeAllRanges();
      const range = document.createRange();
      range.setStart(paragraph.firstChild, 3);
      range.setEnd(paragraph.firstChild, 9);
      documentSelection.addRange(range);
      const selectedBefore = documentSelection.toString();
      // Spy on the same Selection instance the module restores through: if the
      // restore never runs, the final state below would look fine either way.
      let removed = 0, added = 0;
      const originalRemove = documentSelection.removeAllRanges.bind(documentSelection);
      documentSelection.removeAllRanges = () => { removed += 1; return originalRemove(); };
      const originalAdd = documentSelection.addRange.bind(documentSelection);
      documentSelection.addRange = node => { added += 1; return originalAdd(node); };
      const secondCopied = await copyPlainText('第二次 legacy 測試');
      const restored = document.getSelection();
      const range2 = {
        copied: secondCopied,
        selectedBefore,
        textAfter: restored.toString(),
        sameNode: restored.anchorNode === paragraph.firstChild,
        offsets: [restored.anchorOffset, restored.focusOffset],
        restoredCalls: [removed, added],
        noTextFieldFocus: document.activeElement === document.body,
        leftovers: document.querySelectorAll('body > textarea').length,
      };
      return { ...state, read, text, range: range2 };
    });
    assert.equal(result.copied, true);
    assert.equal(result.before, 600, 'the fixture page really scrolled before the copy');
    assert.equal(result.read, result.text, 'CJK/Unicode text survives the legacy path');
    assert.equal(result.scrollY, 600, 'the page is not left scrolled by the off-screen field');
    assert.equal(result.focusRestored, true, 'focus returns to the previous field');
    assert.deepEqual(result.selection, [3, 8, 'backward'], 'the field selection is restored');
    assert.equal(result.leftovers, 0, 'the temporary textarea is removed');
    assert.equal(result.range.copied, true);
    assert.ok(result.range.restoredCalls[0] >= 1 && result.range.restoredCalls[1] >= 1,
      `the document selection was restored through removeAllRanges + addRange (${result.range.restoredCalls.join('/')})`);
    assert.equal(result.range.sameNode, true, 'the document selection still anchors in the same text node');
    assert.deepEqual(result.range.offsets, [3, 9], 'the document selection offsets are restored');
    assert.equal(result.range.textAfter, result.range.selectedBefore, 'the same text stays selected');
    assert.equal(result.range.noTextFieldFocus, true, 'no field was left focused');
    assert.equal(result.range.leftovers, 0);
    console.log('restore: scroll/focus/selection intact, text exact');
    await context.close();
  }

  // 6. A newer message is not reset by the previous attempt's timer.
  {
    const context = await newContext(noWriteText);
    const { page } = await openShareMenu(context);
    await page.locator('#share-chart').click();
    await waitForLabel(page, 'share-chart', 'Link copied ✓');
    await page.waitForTimeout(1200);
    await page.locator('#share-chart').click();
    await waitForLabel(page, 'share-chart', 'Link copied ✓');
    await page.waitForTimeout(1500); // ~2.7s after the first message: its timer already fired
    assert.equal(await buttonLabel(page, 'share-chart'), 'Link copied ✓',
      'the older reset timer does not overwrite the newer message');
    await waitForLabel(page, 'share-chart', 'Copy chart link');
    console.log('feedback: stale timer ignored, label still returns to its own text');
    await context.close();
  }

  // 7. A delayed rejection still ends in the manual dialog, and a fresh click copies.
  //    The delay keeps the async failure inside a controlled window; whether the
  //    original activation had already expired cannot be observed from the page.
  {
    const context = await newContext(brokenClipboard(80));
    const { page, errors, expected } = await openShareMenu(context);
    await page.locator('#share-chart').click();
    await waitForLabel(page, 'share-chart', 'Copy blocked — please try again');
    const dialog = page.locator('.modal.manual-copy');
    await dialog.waitFor();
    assert.equal(await dialog.locator('textarea.manual-copy-text').inputValue(), expected.share,
      'the delayed rejection still lands on the manual path');
    assert.ok(await page.evaluate(() => window.__execCalls) >= 1, 'legacy copy was attempted after the rejection');

    await page.evaluate(() => window.__restoreExec());
    await page.locator('.manual-copy [data-manual-retry]').click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await readClipboard(page), expected.share, 'the retry copied inside its own click');
    assert.equal(await buttonLabel(page, 'share-chart'), 'Link copied ✓');
    assert.deepEqual(errors, []);
    console.log('delayed rejection: manual dialog, then a fresh click copies');
    await context.close();
  }

  // 8. Phone layout of the manual dialog.
  {
    const context = await newContext(brokenClipboard(0), { width: 390, height: 844 });
    const { page } = await openShareMenu(context);
    await page.locator('#share-chart').click();
    const dialog = page.locator('.modal.manual-copy');
    await dialog.waitFor();
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390, `dialog fits the phone width: ${JSON.stringify(box)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true,
      'no horizontal overflow with the dialog open');
    console.log('phone 390×844: dialog inside the viewport');
    await context.close();
  }
} finally {
  await browser.close();
}
