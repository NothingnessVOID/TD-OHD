/**
 * Dialog sheet right-edge regression suite.
 *
 * The fix under test: the close/back clearance in src/styles/ui-system.css belongs to
 * heading rows only. A content wrapper that happens to be a sheet's first child must
 * keep the full card width, so the article never inherits a dead strip on the right.
 *
 * What this proves:
 *  1. No dead strip: the article/content container is full width and flush with the
 *     body's inner edge, checked on the container's own padding and box, not only by
 *     the right-most text leaf.
 *  2. Heading clearance survives: every heading row is fully clear of the close and
 *     back controls (2D overlap test on the rendered text, at the control's own rows).
 *  3. Both properties hold across 11 Skins x desktop/phone, at 320px with an English
 *     long title, and for Penta, Wa and the Reference mobile sheet.
 *
 * Usage: E2E_URL=http://127.0.0.1:9961 node tests/dialog-sheet-right-edge-e2e.mjs
 * Exit code 0 = all assertions passed.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.E2E_URL || 'http://127.0.0.1:9961';
const password = process.env.E2E_PASSWORD || '99999999';
const birth = '?d=2000-05-10&t=12%3A30&tz=8';
const outDir = resolve('artifacts/dialog-right-edge');
mkdirSync(outDir, { recursive: true });

// Skin registry is the single source of truth for the 11 approved Skins.
const { SKINS } = await import('../src/lib/skin-registry.js');
const { PHONE_MAX_WIDTH } = await import('../src/lib/breakpoints.js');

const results = [];
const failures = [];
const record = entry => { results.push(entry); if (!entry.ok) failures.push(entry); };

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });

/** Every page gets a bounded default wait, so a wedged selector fails instead of hanging. */
async function newPage(ctx) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(Number(process.env.PROBE_TIMEOUT_MS || 20000));
  page.setDefaultNavigationTimeout(45000);
  return page;
}

/* ------------------------------------------------------------------ helpers */

/** Installed in every page: a self-contained probe returning plain numbers. */
const installProbe = () => {
  window.__probeSheet = root => {
    if (!root) return { open: false };
    const body = root.querySelector('.gate-detail-body');
    if (!body) return { open: true, noBody: true };
    const R = n => { const r = n.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const bs = getComputedStyle(body);
    const br = body.getBoundingClientRect();
    const innerRight = br.right - parseFloat(bs.paddingRight) - parseFloat(bs.borderRightWidth || 0);
    const innerLeft = br.left + parseFloat(bs.paddingLeft) + parseFloat(bs.borderLeftWidth || 0);

    const container = body.querySelector(':scope > .knowledge-detail')
      || body.querySelector(':scope > [data-penta-specific] > .knowledge-detail')
      || body.querySelector(':scope > section')
      || body;
    const cs = getComputedStyle(container);

    const textBox = node => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const tr = range.getBoundingClientRect();
      if (tr.width || tr.height) return { l: tr.left, r: tr.right, t: tr.top, b: tr.bottom };
      return R(node);
    };

    const headingNodes = [...body.querySelectorAll(
      '.knowledge-detail > .detail-label, .knowledge-detail > .detail-name, .knowledge-detail > .label-soft,' +
      ':scope > .detail-label, :scope > .detail-name, :scope > .panel-title,' +
      ':scope > .wa-detail-scope,' +
      ':scope > .tl-detail-header .detail-label, :scope > .tl-detail-header .detail-name'
    )];

    // Body content that is not a heading or a section header. In the empty-space bug
    // every one of these rows was pushed inward by the wrapper's inherited padding, so
    // they are the rows that must still reach the body's inner right edge.
    const contentNodes = [...body.querySelectorAll('p, li, dd, blockquote, .knowledge-summary-callout, .knowledge-surface, .knowledge-reading, .knowledge-body, .knowledge-meta, .meridian-reading, .gate-detail-channel, .transit-channel-gates, .penta-detail-endpoints, .wa-detail-content, .wa-detail-metrics')]
      .filter(n => {
        if (n.closest('.tl-detail-header')) return false;
        if (n.closest('.gate-detail-nav')) return false;
        if (!n.getClientRects().length) return false;
        return !!n.textContent.trim();
      });

    return {
      open: true,
      card: R(root.querySelector('.gate-detail-card')),
      body: R(body),
      bodyPadR: parseFloat(bs.paddingRight),
      innerLeft, innerRight,
      container: {
        cls: (container.className || container.tagName).toString().slice(0, 44),
        isBody: container === body,
        box: R(container),
        padL: parseFloat(cs.paddingLeft),
        padR: parseFloat(cs.paddingRight)
      },
      headings: headingNodes.map(n => ({ cls: (n.className || n.tagName).toString().slice(0, 40), box: textBox(n) })),
      // Widest right edge among real content rows, plus a sample for failure messages.
      content: (() => {
        if (!contentNodes.length) return { count: 0, maxRight: null, widest: null };
        const measured = contentNodes.map(n => ({ cls: (n.className || n.tagName).toString().slice(0, 40), box: R(n) }));
        const widest = measured.reduce((a, b) => (b.box.r > a.box.r ? b : a));
        return { count: measured.length, maxRight: widest.box.r, widest: { cls: widest.cls, right: widest.box.r } };
      })(),
      controls: [...root.querySelectorAll('.gate-detail-close, .gate-detail-back')]
        .filter(n => n.getClientRects().length)
        .map(n => ({ cls: n.className.toString().slice(0, 30), box: R(n) })),
      scrollbarWidth: body.offsetWidth - body.clientWidth
    };
  };
};

const LOGIN = async (page, origin) => {
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  if (await page.locator('#local-password').isVisible().catch(() => false)) {
    await page.fill('#local-password', password);
    await page.locator('#local-auth-form').evaluate(f => f.requestSubmit());
    await page.waitForTimeout(1800);
  }
};

/** Assertions describing the intended contract. */
function assertSheet(label, probe, { expectHeadingClearance = true } = {}) {
  const problems = [];
  if (!probe || probe.open !== true) {
    problems.push('sheet did not open');
    return problems;
  }
  if (probe.noBody) {
    problems.push('sheet has no .gate-detail-body');
    return problems;
  }

  const eps = 0.75;
  // 1. The content container must be flush with the body's inner box. A heading-only
  //    wrapper (the penta <header>) may keep its clearance, but a wrapper that holds the
  //    article body must not carry horizontal padding of its own.
  const c = probe.container;
  // Some sheets make the scrolling article itself the .gate-detail-body (the Reference
  // mobile detail does this). Then the body's padding is the article's own gutter and the
  // comparison would be the body against itself; content-edge testing below still applies.
  if (!c.isBody) {
    const rightInset = probe.innerRight - c.box.r;
    const leftInset = c.box.l - probe.innerLeft;
    if (Math.abs(rightInset) > eps) problems.push(`container right inset ${rightInset.toFixed(2)}px (expected 0)`);
    if (Math.abs(leftInset) > eps) problems.push(`container left inset ${leftInset.toFixed(2)}px (expected 0)`);
    if (Math.abs(c.box.w - (probe.innerRight - probe.innerLeft)) > eps) {
      problems.push(`container width ${c.box.w.toFixed(2)} != body inner width ${(probe.innerRight - probe.innerLeft).toFixed(2)}`);
    }
  }
  const isArticleWrapper = /knowledge-detail/i.test(c.cls);
  if (isArticleWrapper && Math.abs(c.padR) > eps) problems.push(`article wrapper carries padding-right ${c.padR}px`);

  // 1b. Real body content must reach the inner right edge. This is the direct form of the
  //     reported bug: every paragraph was indented by the wrapper's inherited padding.
  if (probe.content && probe.content.count) {
    const gap = probe.innerRight - probe.content.maxRight;
    if (gap > eps) {
      problems.push(`content stops ${gap.toFixed(1)}px short of the inner right edge (widest: ${probe.content.widest.cls})`);
    }
  } else if (!probe.noBody) {
    problems.push('no measurable content row found');
  }

  // 2. Heading rows must not overlap the close/back controls in two dimensions.
  if (expectHeadingClearance) {
    if (!probe.headings.length) problems.push('no heading row found to test clearance');
    for (const h of probe.headings) {
      for (const ctrl of probe.controls) {
        const overlapsX = h.box.r > ctrl.box.l + eps && h.box.l < ctrl.box.r - eps;
        const overlapsY = h.box.t < ctrl.box.b - eps && h.box.b > ctrl.box.t + eps;
        if (overlapsX && overlapsY) problems.push(`heading "${h.cls}" overlaps ${ctrl.cls} (text right ${h.box.r.toFixed(1)} vs control left ${ctrl.box.l.toFixed(1)})`);
      }
    }
  }

  // 3. A vertical scrollbar must not consume layout width silently.
  if (probe.scrollbarWidth > 1 && process.env.ALLOW_CLASSIC_SCROLLBAR !== '1') {
    // macOS overlay scrollbars report 0; a classic scrollbar here would mean the right
    // edge measurement is unreliable, so surface it rather than hiding it.
    problems.push(`body uses ${probe.scrollbarWidth}px of classic scrollbar width`);
  }
  return problems;
}

/* ------------------------------------------------------- 1. chart sheet matrix */

// Tabs are addressed by data-panel so the suite works in every locale.
const sheetTargets = [
  ['knowledge-authority', 'centers', '.foundation-item[data-knowledge-object="authority"]'],
  ['knowledge-type', 'centers', '.foundation-item[data-knowledge-object="type"]'],
  ['knowledge-definition', 'centers', '.foundation-item[data-knowledge-object="definition"]'],
  ['knowledge-cross', 'centers', '.foundation-item[data-knowledge-object="cross"]'],
  ['knowledge-profile', 'centers', '.foundation-item[data-knowledge-object="profile"]'],
  ['knowledge-variable', 'variable', '.panel-content [data-knowledge-variable]'],
  ['gate', 'gates', '.panel-content .gate-item'],
  ['center', 'centers', '.panel-content .center-card']
];

async function openTarget(page, tab, selector) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(150);
  await page.locator(`.panel-tab[data-panel="${tab}"]`).first().click({ force: true });
  await page.waitForTimeout(350);
  await page.locator(selector).first().click({ force: true });
  await page.waitForTimeout(750);
}

async function runMatrix(viewport) {
  for (const skin of SKINS) {
    const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await ctx.addInitScript(code => localStorage.setItem('ohd-language', code), 'zh-CN');
    await ctx.addInitScript(s => localStorage.setItem('td-ohd-appearance-v3', JSON.stringify({ version: 3, skinMode: 'manual', skinId: s })), skin.id);
    const page = await newPage(ctx);
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.addInitScript(installProbe);
    try {
      await LOGIN(page, base);
      await page.goto(`${base}/${birth}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1600);
      for (const [name, tab, selector] of sheetTargets) {
        console.log(`  ${viewport.name}/${skin.id}/${name}`.trim());
        let problems;
        try {
          await openTarget(page, tab, selector);
          const probe = await page.evaluate(() => window.__probeSheet(document.querySelector('#gate-detail:not(.hidden)')));
          problems = assertSheet(`${skin.id}/${name}`, probe);
        } catch (error) {
          problems = [`threw: ${error.message.slice(0, 120)}`];
        }
        record({ layer: 'chart', viewport: viewport.name, skin: skin.id, sheet: name, problems, ok: problems.length === 0 });
      }
      if (pageErrors.length) record({ layer: 'chart', viewport: viewport.name, skin: skin.id, sheet: 'page-errors', problems: pageErrors.slice(0, 3), ok: false });
    } finally {
      await ctx.close();
    }
  }
}

/* ------------------------------ 2. knowledge sheet with Back + long English title */

async function runBackAndNarrow() {
  const cases = [
    { name: 'back-desktop', viewport: { name: 'desktop', width: 1440, height: 950 }, locale: 'zh-CN' },
    { name: 'back-phone', viewport: { name: 'phone', width: 390, height: 844 }, locale: 'zh-CN' },
    { name: 'back-narrow-320-en', viewport: { name: 'narrow-320', width: 320, height: 640 }, locale: 'en' }
  ];
  for (const item of cases) {
    const ctx = await browser.newContext({ viewport: { width: item.viewport.width, height: item.viewport.height }, reducedMotion: 'reduce' });
    await ctx.addInitScript(code => localStorage.setItem('ohd-language', code), item.locale);
    const page = await newPage(ctx);
    await page.addInitScript(installProbe);
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    try {
      await LOGIN(page, base);
      await page.goto(`${base}/${birth}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1600);
      await page.locator('.panel-tab[data-panel="centers"]').first().click({ force: true });
      await page.waitForTimeout(350);
      await page.locator('.foundation-item[data-knowledge-object="authority"]').first().click({ force: true });
      await page.waitForTimeout(750);
      const jump = page.locator('#gate-detail [data-knowledge-jump]').first();
      const hasJump = await jump.count();
      if (hasJump) {
        await jump.click();
        await page.waitForTimeout(750);
      }
      const probe = await page.evaluate(() => window.__probeSheet(document.querySelector('#gate-detail:not(.hidden)')));
      let problems = assertSheet(item.name, probe);
      if (hasJump) {
        const backVisible = await page.evaluate(() => !!document.querySelector('#gate-detail:not(.hidden) .gate-detail-back')?.getClientRects().length);
        if (!backVisible) problems = [...problems, 'Back button missing after knowledge jump'];
      }
      // Long English title must wrap inside the sheet, never push past the inner edge.
      const overflow = await page.evaluate(() => {
        const body = document.querySelector('#gate-detail:not(.hidden) .gate-detail-body');
        if (!body) return null;
        const bs = getComputedStyle(body);
        const inner = body.getBoundingClientRect().right - parseFloat(bs.paddingRight);
        const name = body.querySelector('.knowledge-detail > .detail-name, :scope > .detail-name');
        if (!name) return null;
        return { inner, nameRight: name.getBoundingClientRect().right, text: name.textContent.trim().slice(0, 48) };
      });
      if (overflow && overflow.nameRight > overflow.inner + 1) {
        problems = [...problems, `long title overflows: ${overflow.nameRight.toFixed(1)} > ${overflow.inner.toFixed(1)} ("${overflow.text}")`];
      }
      await page.locator('#gate-detail:not(.hidden) .gate-detail-card')
        .screenshot({ path: resolve(outDir, `${item.name}.png`) }).catch(() => {});
      if (pageErrors.length) problems = [...problems, ...pageErrors.slice(0, 2)];
      record({ layer: 'knowledge-back', viewport: item.viewport.name, locale: item.locale, sheet: item.name, probe: probe?.container, problems, ok: problems.length === 0 });
    } finally {
      await ctx.close();
    }
  }
}

/* ------------------------------------------- 3. Penta gate, channel and knowledge */

/** Phone layouts collapse the primary nav behind the menu toggle. */
async function goToView(page, view) {
  const link = page.locator(`.nav-link[data-view="${view}"]`);
  if (!(await link.isVisible().catch(() => false))) {
    await page.locator('#mobile-menu-toggle').click({ force: true });
    await page.waitForTimeout(350);
  }
  await link.click({ force: true });
}

async function populateTeam(page) {
  await goToView(page, 'team');
  await page.waitForTimeout(1800);
  await page.locator('#team-add-saved-person').click();
  await page.waitForTimeout(700);
  const rows = page.locator('[data-add-person]');
  const n = Math.min(5, await rows.count());
  for (let i = 0; i < n; i++) { await rows.nth(i).click(); await page.waitForTimeout(150); }
  await page.locator('#team-selection-confirm').click();
  await page.waitForFunction(() => document.querySelectorAll('.penta-analysis-card').length >= 18, { timeout: 30000 });
  await page.waitForTimeout(1200);
}

async function runPenta(viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => localStorage.setItem('ohd-language', 'zh-CN'));
  const page = await newPage(ctx);
  await page.addInitScript(installProbe);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    await LOGIN(page, base);
    await page.goto(`${base}/${birth}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await populateTeam(page);

    const targets = [
      ['penta-gate', '.penta-gate-reading'],
      ['penta-channel', '.penta-channel-reading']
    ];
    for (const [name, selector] of targets) {
      let problems;
      try {
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(250);
        await page.locator(selector).first().click({ force: true });
        await page.waitForSelector('.penta-detail:not(.hidden)', { timeout: 15000 });
        await page.waitForTimeout(700);
        const probe = await page.evaluate(() => window.__probeSheet(document.querySelector('.penta-detail:not(.hidden)')));
        // Penta body starts with a <header> wrapper; its own heading rows need clearance.
        problems = assertSheet(`penta/${name}`, probe, { expectHeadingClearance: true });
        // The penta sheet opens with a <header> that wraps only the title row. That wrapper
        // may keep the close clearance, but its width must span the body content box and its
        // title text must sit clear of the close button.
        const wrap = await page.evaluate(() => {
          const body = document.querySelector('.penta-detail:not(.hidden) .gate-detail-body');
          const first = body?.firstElementChild;
          const close = document.querySelector('.penta-detail:not(.hidden) .gate-detail-close');
          if (!first) return null;
          const heading = first.querySelector('.detail-name') || first.querySelector('.detail-label');
          const range = document.createRange();
          if (heading) range.selectNodeContents(heading);
          const tr = heading ? range.getBoundingClientRect() : null;
          const cr = close?.getBoundingClientRect();
          const bs = getComputedStyle(body);
          return {
            tag: first.tagName,
            padR: parseFloat(getComputedStyle(first).paddingRight) || 0,
            w: first.getBoundingClientRect().width,
            bodyContentW: body.getBoundingClientRect().width - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight),
            headingRight: tr && (tr.width || tr.height) ? tr.right : null,
            closeLeft: cr ? cr.left : null,
            headingTop: tr && (tr.width || tr.height) ? tr.top : null,
            headingBottom: tr && (tr.width || tr.height) ? tr.bottom : null,
            closeTop: cr ? cr.top : null,
            closeBottom: cr ? cr.bottom : null
          };
        });
        if (wrap && Math.abs(wrap.w - wrap.bodyContentW) > 0.75) {
          problems = [...problems, `${name} first wrapper <${wrap.tag}> width ${wrap.w.toFixed(1)} != body content width ${wrap.bodyContentW.toFixed(1)}`];
        }
        if (wrap && wrap.headingRight != null && wrap.closeLeft != null) {
          const overlapX = wrap.headingRight > wrap.closeLeft + 0.75;
          const overlapY = wrap.headingTop < wrap.closeBottom - 0.75 && wrap.headingBottom > wrap.closeTop + 0.75;
          if (overlapX && overlapY) problems = [...problems, `${name} title overlaps close (${wrap.headingRight.toFixed(1)} > ${wrap.closeLeft.toFixed(1)})`];
        }
        await page.locator('.penta-detail:not(.hidden) .gate-detail-card')
          .screenshot({ path: resolve(outDir, `${viewport.name}-${name}.png`) }).catch(() => {});
      } catch (error) {
        problems = [`threw: ${error.message.slice(0, 120)}`];
      }
      record({ layer: 'penta', viewport: viewport.name, sheet: name, problems, ok: problems.length === 0 });
    }
    if (pageErrors.length) record({ layer: 'penta', viewport: viewport.name, sheet: 'page-errors', problems: pageErrors.slice(0, 3), ok: false });
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------ 4. Wa detail + reference */

async function runWa(viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => localStorage.setItem('ohd-language', 'zh-CN'));
  const page = await newPage(ctx);
  await page.addInitScript(installProbe);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    await LOGIN(page, base);
    await page.goto(`${base}/${birth}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await goToView(page, 'wa');
    await page.waitForTimeout(2000);
    const fill = async (target, count) => {
      await page.locator(`[data-compose="${target}"]`).click();
      await page.waitForTimeout(700);
      for (let i = 0; i < count; i++) {
        const e = page.locator('[data-person]:not([disabled])');
        if (!(await e.count())) break;
        await e.first().click();
        await page.waitForTimeout(180);
      }
      const c = page.locator('[data-selection]');
      if (await c.count()) { await c.click(); await page.waitForTimeout(1200); }
    };
    const targets = await page.locator('[data-compose]').evaluateAll(ns => ns.map(n => n.dataset.compose));
    await fill('alpha', 1);
    if (targets[1]) await fill(targets[1], 3);
    if (targets[2]) await fill(targets[2], 3);
    await page.waitForTimeout(2000);

    const openers = [
      ['wa-pair', '#wa-view [data-wa-pair-open]'],
      ['wa-department', '#wa-view [data-wa-department]']
    ];
    for (const [name, selector] of openers) {
      let problems;
      try {
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(250);
        const opener = page.locator(selector).first();
        if (!(await opener.count())) { problems = ['opener not present (organization draft empty)']; }
        else {
          await opener.click({ force: true });
          await page.waitForSelector('.wa-detail:not(.hidden)', { timeout: 15000 });
          await page.waitForTimeout(700);
          const probe = await page.evaluate(() => window.__probeSheet(document.querySelector('.wa-detail:not(.hidden)')));
          problems = assertSheet(`wa/${name}`, probe);
          // The scope line is the first row and must clear the navigation controls.
          const scope = await page.evaluate(() => {
            const body = document.querySelector('.wa-detail:not(.hidden) .gate-detail-body');
            const line = body?.querySelector(':scope > .wa-detail-scope');
            const close = document.querySelector('.wa-detail:not(.hidden) .gate-detail-close');
            if (!body || !line) return { missing: true };
            const range = document.createRange(); range.selectNodeContents(line);
            const tr = range.getBoundingClientRect();
            const cr = close.getBoundingClientRect();
            const right = tr.width || tr.height ? tr.right : line.getBoundingClientRect().right;
            return { right: right, closeLeft: cr.left, overlap: right > cr.left + 0.75 && tr.top < cr.bottom && tr.bottom > cr.top };
          });
          if (scope.missing) problems = [...problems, 'wa scope line missing'];
          else if (scope.overlap) problems = [...problems, `wa scope line overlaps close (${scope.right.toFixed(1)} > ${scope.closeLeft.toFixed(1)})`];
          await page.locator('.wa-detail:not(.hidden) .gate-detail-card')
            .screenshot({ path: resolve(outDir, `${viewport.name}-${name}.png`) }).catch(() => {});
        }
      } catch (error) {
        problems = [`threw: ${error.message.slice(0, 120)}`];
      }
      record({ layer: 'wa', viewport: viewport.name, sheet: name, problems, ok: problems.length === 0 });
    }
    if (pageErrors.length) record({ layer: 'wa', viewport: viewport.name, sheet: 'page-errors', problems: pageErrors.slice(0, 3), ok: false });
  } finally {
    await ctx.close();
  }
}

async function runReferenceMobile() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => localStorage.setItem('ohd-language', 'zh-CN'));
  const page = await newPage(ctx);
  await page.addInitScript(installProbe);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    await LOGIN(page, base);
    await page.goto(`${base}/#library/knowledge/hd.authority.sacral`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
    const probe = await page.evaluate(() => window.__probeSheet(document.querySelector('#reference-mobile-detail:not(.hidden), .reference-mobile-detail:not(.hidden)')));
    let problems = assertSheet('reference-mobile', probe);
    const detail = await page.evaluate(() => {
      const sheet = document.querySelector('.reference-mobile-detail:not(.hidden)');
      if (!sheet) return { missing: true };
      const body = sheet.querySelector('.gate-detail-body') || sheet.querySelector('.reference-detail');
      const back = sheet.querySelector('.gate-detail-back');
      return {
        article: !!sheet.querySelector('.knowledge-detail') || !!sheet.querySelector('.reference-detail'),
        bodyPadR: body ? getComputedStyle(body).paddingRight : null,
        back: !!back
      };
    });
    if (detail.missing || !detail.article) problems = [...problems, 'reference mobile detail did not mount'];
    if (detail.bodyPadR != null && probe?.bodyPadR != null) {
      // The mobile article supplies its own horizontal gutter; it must be symmetric and
      // non-zero so the back button and headings are not flush to the screen edge.
      const left = await page.evaluate(() => {
        const sheet = document.querySelector('.reference-mobile-detail:not(.hidden)');
        const body = sheet?.querySelector('.gate-detail-body') || sheet?.querySelector('.reference-detail');
        return body ? parseFloat(getComputedStyle(body).paddingLeft) : null;
      });
      if (Math.abs(left - probe.bodyPadR) > 0.75) problems = [...problems, `article gutter asymmetric: left ${left} vs right ${probe.bodyPadR}`];
      if (probe.bodyPadR <= 0) problems = [...problems, 'article has no horizontal gutter on phone'];
    }
    await page.screenshot({ path: resolve(outDir, 'reference-mobile.png') }).catch(() => {});
    if (pageErrors.length) problems = [...problems, ...pageErrors.slice(0, 2)];
    record({ layer: 'reference', viewport: 'phone', sheet: 'reference-mobile', detail, problems, ok: problems.length === 0 });
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------- run all */

try {
  const only = (process.env.LAYERS || '').split(',').map(x => x.trim()).filter(Boolean);
  const run = name => !only.length || only.includes(name);
  if (run('matrix-desktop')) { console.log('layer matrix-desktop'); await runMatrix({ name: 'desktop', width: 1440, height: 950 }); }
  if (run('matrix-phone')) { console.log('layer matrix-phone'); await runMatrix({ name: 'phone', width: 390, height: 844 }); }
  if (run('back')) { console.log('layer back'); await runBackAndNarrow(); }
  if (run('penta-desktop')) { console.log('layer penta-desktop'); await runPenta({ name: 'desktop', width: 1440, height: 950 }); }
  if (run('penta-phone')) { console.log('layer penta-phone'); await runPenta({ name: 'phone', width: 390, height: 844 }); }
  if (run('wa-desktop')) { console.log('layer wa-desktop'); await runWa({ name: 'desktop', width: 1440, height: 950 }); }
  if (run('wa-phone')) { console.log('layer wa-phone'); await runWa({ name: 'phone', width: 390, height: 844 }); }
  if (run('reference')) { console.log('layer reference'); await runReferenceMobile(); }
} finally {
  await browser.close();
}

const summary = {
  base,
  total: results.length,
  failed: failures.length,
  skins: SKINS.length,
  byLayer: Object.fromEntries([...new Set(results.map(r => r.layer))].map(layer => {
    const rows = results.filter(r => r.layer === layer);
    return [layer, { total: rows.length, failed: rows.filter(r => !r.ok).length }];
  })),
  failures
};
writeFileSync(resolve(outDir, 'results.json'), JSON.stringify({ summary, results }, null, 2));

console.log(`sheets checked: ${summary.total}`);
console.log(`layers: ${JSON.stringify(summary.byLayer)}`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.error(` - [${f.layer}/${f.viewport}/${f.skin || '-'}/${f.sheet}] ${f.problems.join('; ')}`);
  console.error(`\nreport: ${resolve(outDir, 'results.json')}`);
  process.exitCode = 1;
} else {
  console.log(`\nPASS: no dead strip on the right edge, headings clear of navigation controls, ${SKINS.length} Skins x desktop/phone, 320px English long title, Penta, Wa and Reference mobile.`);
  console.log(`report: ${resolve(outDir, 'results.json')}`);
}
