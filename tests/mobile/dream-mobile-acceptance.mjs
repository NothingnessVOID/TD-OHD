/**
 * Sleep chart — phone acceptance (touch), integrated build.
 *
 *   ./node_modules/.bin/vite --host 127.0.0.1 --port 10015 --strictPort   # one terminal
 *   E2E_URL=http://127.0.0.1:10015 node tests/mobile/dream-mobile-acceptance.mjs
 *
 * What this is for
 * ---------------
 * The desktop suite proves the graph, the sheet and the overlay. This one asks the
 * phone questions a desktop browser cannot: are the objects actually reachable with a
 * finger at 360 and 390 CSS px, does a swipe over the graph open a sheet it should not,
 * does the sheet stay inside the viewport, does a long press preview a gate, and does
 * the page still fit on screen in three languages and across skins.
 *
 * Input fidelity
 * --------------
 * Taps go through `page.touchscreen.tap()` and swipes through
 * `Input.dispatchTouchEvent` on a CDP session — the browser's own touch pipeline.
 * Nothing here dispatches DOM events to simulate a finger. `scrollIntoView()` is used
 * only to bring a target into view before tapping it; the gesture under test is always
 * the real one.
 *
 * Outputs
 * -------
 *   stdout            one line per check, plus a JSON summary at the end
 *   $MOBILE_LOG       the same log, when set (the runner redirects stdout)
 *   $MOBILE_SHOTS     screenshots (default /tmp/mobile-acceptance-shots)
 *   exit code         0 only when every check passed
 *
 * Screenshots are evidence for review, not tracked artefacts: the default directory is
 * outside the worktree on purpose.
 */

import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PROFILE_STORAGE_KEY } from '../../src/lib/profile-storage.js';

const BASE = (process.env.E2E_URL || 'http://127.0.0.1:10015').replace(/\/$/, '');
const CHROME = process.env.CHROME_PATH;
const CHANNEL = process.env.CHROME_CHANNEL || 'chromium';
const SHOTS = process.env.MOBILE_SHOTS || '/tmp/mobile-acceptance-shots';
mkdirSync(SHOTS, { recursive: true });

/** Clearly fictional people; distinct birth data so no chart cache is shared. */
const people = [
  { id: 'mobile-a', name: 'Fictional A', birthDate: '1987-04-12', birthTime: '06:30', timeUnknown: false, location: { timezone: 0 } },
  { id: 'mobile-b', name: 'Fictional B', birthDate: '1993-09-25', birthTime: '14:20', timeUnknown: false, location: { timezone: 0 } }
];
const PARTNER = 'mobile-b';

const DEVICES = [
  { name: '360x800', viewport: { width: 360, height: 800 } },
  { name: '390x844', viewport: { width: 390, height: 844 } }
];

/** A control a finger must be able to hit; the phone guideline the project has no stake in. */
const MIN_CONTROL = 40;
/** The graph's hit circle is drawn in user units, so its pixel size shrinks with the canvas. */
const MIN_GATE_HIT = 12;
/**
 * The sleep page's own lists and type chips: the finger's real way in, so they are held
 * to the 44px touch minimum (`--dream-tap` in styles/dream.css). The graph's hit circles
 * are explicitly *not* in this group — they are drawn in user units and inflating them
 * to 44px would make neighbouring gates overlap.
 */
const MIN_TAP = 44;

let failures = 0;
const summary = [];
const ok = name => console.log(`✔ ${name}`);
const fail = (name, error) => {
  failures++;
  console.error(`✖ ${name}\n  ${error?.stack || error}`);
};
async function check(name, fn) {
  try {
    await fn();
    summary.push({ name, status: 'pass' });
    ok(name);
  } catch (error) {
    summary.push({ name, status: 'fail', error: String(error?.message || error) });
    fail(name, error);
  }
}
const record = (label, value) => console.log(`· ${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

const browser = await chromium.launch({
  ...(CHROME ? { executablePath: CHROME } : { channel: CHANNEL }),
  headless: true
});

/** One phone: its own context, its own storage, its own CDP session for real swipes. */
async function openPhone(device) {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: device.viewport,
    hasTouch: true,
    isMobile: true,
    locale: 'zh-CN',
    timezoneId: 'UTC'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.addInitScript(({ key, people }) => {
    localStorage.setItem('ohd-language', 'zh-CN');
    localStorage.setItem(key, JSON.stringify(people));
    localStorage.setItem('ohd-last-person-id', people[0].id);
  }, { key: PROFILE_STORAGE_KEY, people });
  const cdp = await context.newCDPSession(page);

  /** A real touch drag: touchStart → N touchMoves → touchEnd through the browser. */
  async function swipe(from, to, steps = 14) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: from.x + (to.x - from.x) * (i / steps), y: from.y + (to.y - from.y) * (i / steps) }]
      });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
  }

  /** A real press-and-hold, so the touch preview is shown while the finger is down. */
  async function pressAndHold(point, holdMs = 450) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
    await page.waitForTimeout(holdMs);
    const state = await page.evaluate(() => {
      const open = [...document.querySelectorAll('.bg-tooltip')].find(node => node.matches(':popover-open'));
      if (!open) return null;
      const rect = open.getBoundingClientRect();
      return {
        text: open.textContent.trim().slice(0, 80),
        inGraph: !!open.closest('.bg-root'),
        x: rect.left, y: rect.top, right: rect.right, bottom: rect.bottom,
        viewport: { width: innerWidth, height: innerHeight }
      };
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({
      overlays: [...document.querySelectorAll('.bg-tooltip')].filter(node => node.matches(':popover-open')).length,
      sheet: !!document.querySelector('#dream-detail:not(.hidden)')
    }));
    // Lifting the finger is a tap, and a tap opens the sheet: that is the shipped
    // interaction, so the check records it and the harness clears it.
    if (after.sheet) await closeSheet();
    return { during: state, openAfterRelease: after.overlays, sheetOnRelease: after.sheet };
  }

  const tapAt = async point => {
    await page.touchscreen.tap(point.x, point.y);
    await page.waitForTimeout(700);
  };

  const tapSelector = async (selector, { index = 0 } = {}) => {
    if (!selector.startsWith('#dream-detail')) await closeSheet();
    const target = await page.evaluate(({ selector, index }) => {
      const node = [...document.querySelectorAll(selector)][index];
      if (!node) return null;
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
      const rect = node.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, w: rect.width, h: rect.height };
    }, { selector, index });
    assert.ok(target, `no element matches ${selector}[${index}]`);
    await page.waitForTimeout(150);
    const again = await page.evaluate(({ selector, index }) => {
      const node = [...document.querySelectorAll(selector)][index];
      const rect = node.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, { selector, index });
    await page.touchscreen.tap(again.x, again.y);
    await page.waitForTimeout(700);
    return target;
  };

  /** Horizontal overflow of the page and of the sleep view's own box. */
  const overflow = () => page.evaluate(() => {
    const view = document.getElementById('dream-view');
    const box = view?.getBoundingClientRect();
    return {
      document: document.documentElement.scrollWidth - innerWidth,
      view: view ? Math.round(view.scrollWidth - view.clientWidth) : null,
      viewRight: box ? Math.round(box.right) : null,
      innerWidth
    };
  });

  /**
   * Text that is cut off instead of wrapped.
   *
   * The sleep page's type now follows the site's steps, and the two cases that can
   * break a step that is too large are a long English type name and a traditional
   * Chinese one. Those are clipped, not scrolled, so a document-overflow check alone
   * would not see them. Only the page's own text elements are sampled: the shared
   * chrome truncates on purpose and is not this page's to judge.
   */
  const CLIP_SAMPLE = [
    '.dream-type-label', '.dream-type-chip', '.dream-type-facts', '.dream-realm-title',
    '.dream-frame-list > li', '.dream-portal-reading-block', '.dream-row-theme',
    '.dream-row-source-label', '.dream-planet-chip', '.dream-channel-name',
    '.dream-channel-status', '.dream-channel-named', '.dream-column-head',
    '.dream-column-row', '.dream-column-date'
  ].join(', ');
  const clippedText = () => page.evaluate(selector => {
    const root = document.getElementById('dream-view');
    if (!root) return { scope: false, clipped: [], count: 0 };
    const clipped = [];
    for (const el of root.querySelectorAll(selector)) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const clips = /hidden|clip/.test(style.overflowX + style.overflowY) || style.textOverflow === 'ellipsis';
      if (!clips) continue;
      if (el.scrollWidth - el.clientWidth > 1 || el.scrollHeight - el.clientHeight > 1) {
        clipped.push(`${String(el.className || el.tagName)}: "${el.textContent.trim().slice(0, 20)}"`);
      }
    }
    return { scope: true, clipped: clipped.slice(0, 8), count: clipped.length };
  }, CLIP_SAMPLE);

  const sheetState = () => page.evaluate(() => {
    const sheet = document.querySelector('#dream-detail:not(.hidden)');
    if (!sheet) return { open: false };
    const card = sheet.querySelector('.dream-detail-card');
    const rect = card.getBoundingClientRect();
    const text = node => node?.textContent.trim().replace(/\s+/g, ' ') || '';
    return {
      open: true,
      card: {
        gate: card.getAttribute('data-gate'),
        center: card.getAttribute('data-center'),
        type: card.getAttribute('data-type'),
        owner: card.getAttribute('data-owner')
      },
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), right: Math.round(rect.right), bottom: Math.round(rect.bottom), w: Math.round(rect.width), h: Math.round(rect.height) },
      headings: [...sheet.querySelectorAll('.dream-detail-subhead, h3')].map(node => text(node).slice(0, 24)),
      labels: [...sheet.querySelectorAll('.detail-label')].map(text),
      names: [...sheet.querySelectorAll('.detail-name')].map(text),
      hasWakingShell: !!sheet.querySelector('.gate-lens-switch, .reference-links'),
      body: text(card).slice(0, 700)
    };
  });

  async function closeSheet() {
    const open = await page.evaluate(() => !!document.querySelector('#dream-detail:not(.hidden)'));
    if (!open) return;
    await tapSelector('#dream-detail .gate-detail-close');
    await page.waitForFunction(() => !document.querySelector('#dream-detail:not(.hidden)'), null, { timeout: 10000 });
    await page.waitForTimeout(250);
  }

  /** The phone's own navigation: open the menu, then tap the view. */
  async function openView(view) {
    const visible = await page.evaluate(v => {
      const link = document.querySelector(`.nav-link[data-view="${v}"]`);
      if (!link) return false;
      const rect = link.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(link).visibility !== 'hidden';
    }, view);
    if (!visible) await tapSelector('#mobile-menu-toggle');
    await tapSelector(`.nav-link[data-view="${view}"]`);
    await page.waitForTimeout(600);
  }

  return { context, page, errors, swipe, pressAndHold, tapAt, tapSelector, overflow, clippedText, sheetState, closeSheet, openView };
}

/**
 * Centre of a gate's disc, in viewport coordinates.
 *
 * The graph is scrolled into view first — a phone user does that with a finger, and a
 * tap on a coordinate that is off screen would otherwise test nothing.
 */
async function gateCentre(page, rootSelector, gate) {
  await page.evaluate(({ rootSelector, gate }) => {
    const host = document.querySelector(`${rootSelector} .bodygraph-svg`);
    host?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, { rootSelector, gate });
  await page.waitForTimeout(250);
  return page.evaluate(({ rootSelector, gate }) => {
    const disc = document.querySelector(`${rootSelector} .bg-gate[data-gate="${gate}"] .bg-gate-circle`);
    if (!disc) return null;
    const rect = disc.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, w: rect.width };
  }, { rootSelector, gate });
}

for (const device of DEVICES) {
  const phone = await openPhone(device);
  const { page, context, errors } = phone;
  const label = `${device.name}`;
  try {
    await page.goto(BASE);
    await page.locator('#chart-view:not(.hidden)').waitFor({ timeout: 180000 });
    await phone.openView('dream');
    await page.waitForSelector('#dream-content .dream-type-strip, #dream-content .dream-compare-head', { timeout: 180000 });
    await page.waitForTimeout(900);

    /* ---------------- single design ---------------- */

    await check(`${label}: the activation columns sit below the canvas, not over it`, async () => {
      // The columns used to be laid over the canvas (`graph-shell.css` places the side
      // bands there by design), which put the flank gates under the column rows: at
      // 360px a tap on gate 38 opened gate 8. The dream shell stacks them below the
      // canvas on a phone, and this check is what keeps that layout honest.
      const state = await page.evaluate(() => {
        const canvas = document.querySelector('#dream-bodygraph .bodygraph-svg').getBoundingClientRect();
        const columns = [...document.querySelectorAll('.dream-graph-shell .dream-column')]
          .map(node => node.getBoundingClientRect());
        const slots = [...document.querySelectorAll('.dream-graph-shell .ohd-graph-slot')]
          .map(node => node.getBoundingClientRect());
        return {
          canvasBottom: Math.round(canvas.bottom),
          columnTops: columns.map(rect => Math.round(rect.top)),
          slotTops: slots.map(rect => Math.round(rect.top)),
          overlap: columns.filter(rect => rect.top < canvas.bottom - 2).length,
          columns: columns.length
        };
      });
      record(`${label} stacked columns`, state);
      assert.equal(state.overlap, 0, `${state.overlap} column(s) still start above the canvas bottom (${state.canvasBottom})`);
      assert.ok(state.columnTops.every(top => top >= state.canvasBottom - 2),
        `column tops ${state.columnTops} are not below the canvas bottom ${state.canvasBottom}`);
      // Two columns side by side, not stacked one under the other.
      assert.equal(state.columns, 2, `${state.columns} activation columns in the single design`);
      const [left, right] = await page.evaluate(() => [...document.querySelectorAll('.dream-graph-shell .ohd-graph-slot')]
        .map(node => Math.round(node.getBoundingClientRect().left)));
      assert.ok(right > left, `the two slots are not side by side (left ${left}, right ${right})`);
    });

    await check(`${label}: the sleep page fits the viewport with no sideways scroll`, async () => {
      const state = await phone.overflow();
      record(`${label} overflow`, state);
      assert.ok(state.document <= 1, `the document scrolls ${state.document}px sideways`);
      assert.ok(state.view <= 1, `the sleep view scrolls ${state.view}px sideways`);
    });

    await check(`${label}: every gate is reachable with a finger`, async () => {
      const gates = await page.$$eval('#dream-bodygraph .bg-gate', nodes => nodes.map(node => node.dataset.gate));
      const hits = await page.$$eval('#dream-bodygraph .bg-gate-hit', nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width)));
      record(`${label} gate hit diameter`, { min: Math.min(...hits), max: Math.max(...hits) });
      assert.ok(hits.length === gates.length, `${hits.length} hit circles for ${gates.length} gates`);
      assert.ok(Math.min(...hits) >= MIN_GATE_HIT, `the smallest gate hit area is ${Math.min(...hits)}px`);
      // Recorded, not decreed: this run must not have inflated the drawn circles to the
      // list minimum, because neighbouring gates overlap at this width. It is a guard on
      // this change, not a permanent ban on ever drawing bigger gate targets.
      assert.ok(Math.max(...hits) < MIN_TAP, `a gate hit circle grew to ${Math.max(...hits)}px`);
      // Every gate must open itself, not a neighbour: the hit circles are small at this
      // width, so "most of them work" is not the claim being made.
      const sample = gates;
      for (const gate of sample) {
        const point = await gateCentre(page, '#dream-bodygraph', gate);
        await phone.tapAt(point);
        const sheet = await phone.sheetState();
        assert.ok(sheet.open, `tapping gate ${gate} opened no sheet`);
        assert.equal(sheet.card.gate, gate, `tapping gate ${gate} opened gate ${sheet.card.gate}`);
        await phone.closeSheet();
      }
    });

    await check(`${label}: the gate sheet puts planets before the six lines and carries no waking body`, async () => {
      // Gate 20 carries two activations, so both blocks exist and their order is testable.
      const point = await gateCentre(page, '#dream-bodygraph', '20');
      await phone.tapAt(point);
      const sheet = await phone.sheetState();
      assert.ok(sheet.open, 'the gate sheet did not open');
      const planetIndex = sheet.headings.findIndex(text => /行星|Planets/.test(text));
      const lineIndex = sheet.headings.findIndex(text => /六爻|six lines|Six lines/i.test(text));
      record(`${label} gate 20 headings`, sheet.headings);
      assert.ok(planetIndex >= 0, 'the gate sheet has no planet block');
      assert.ok(lineIndex >= 0, 'the gate sheet has no six-line block');
      assert.ok(planetIndex < lineIndex, `planets sit after the six lines (${planetIndex} > ${lineIndex})`);
      assert.equal(sheet.hasWakingShell, false, 'the sleep sheet rendered the waking reading shell');
      assert.match(sheet.body, /梦境闸门解读|dream gate|Dream gate/i, 'the sheet has no dream reading');
      const withinViewport = sheet.rect.x >= 0 && sheet.rect.right <= device.viewport.width + 1;
      assert.ok(withinViewport, `the sheet runs outside the ${device.viewport.width}px viewport (${JSON.stringify(sheet.rect)})`);
      await page.screenshot({ path: path.join(SHOTS, `${label}-gate-sheet.png`) });
      await phone.closeSheet();
    });

    await check(`${label}: a centre opens, closes and returns`, async () => {
      const centre = await page.evaluate(() => {
        const path = document.querySelector('#dream-bodygraph .bg-center');
        path.scrollIntoView({ block: 'center', behavior: 'instant' });
        const rect = path.getBoundingClientRect();
        return { key: path.dataset.center, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      });
      await phone.tapAt(centre);
      let sheet = await phone.sheetState();
      assert.ok(sheet.open, `tapping centre ${centre.key} opened no sheet`);
      assert.equal(sheet.card.center, centre.key, `tapping centre ${centre.key} opened ${sheet.card.center}`);
      assert.equal(sheet.hasWakingShell, false, 'the centre sheet rendered the waking reading shell');
      // Gate link inside the centre sheet, then Back to the centre.
      const link = await page.$('#dream-detail [data-shared-gate-select]');
      if (link) {
        await phone.tapSelector('#dream-detail [data-shared-gate-select]');
        const gateSheet = await phone.sheetState();
        assert.ok(gateSheet.open && gateSheet.card.gate, 'the gate link opened no gate sheet');
        await phone.tapSelector('#dream-detail .gate-detail-back');
        const back = await phone.sheetState();
        assert.equal(back.card.center, centre.key, `Back returned to ${JSON.stringify(back.card)} instead of the centre`);
      }
      await phone.closeSheet();
      sheet = await phone.sheetState();
      assert.equal(sheet.open, false, 'the sheet stayed open after close');
    });

    await check(`${label}: a night-field channel row opens its channel sheet`, async () => {
      const channel = await page.evaluate(() => {
        const node = document.querySelector('.dream-channel-open[data-channel]');
        if (!node) return null;
        node.scrollIntoView({ block: 'center', behavior: 'instant' });
        const rect = node.getBoundingClientRect();
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        return { id: node.dataset.channel, text: text.slice(0, 40), x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, w: rect.width, h: rect.height };
      });
      assert.ok(channel, 'the page lists no sleep channel');
      record(`${label} channel row`, channel.text);
      assert.ok(channel.h >= MIN_CONTROL, `the channel row is only ${Math.round(channel.h)}px tall`);
      await phone.tapAt(channel);
      const sheet = await phone.sheetState();
      assert.ok(sheet.open, 'the channel row opened no sheet');
      // The channel sheet names the channel and its two gates.
      assert.match(sheet.body, new RegExp(channel.id.replace('-', '[–-]')), `the channel sheet does not name ${channel.id}`);
      await phone.closeSheet();
    });

    await check(`${label}: the lists below the graph are usable with a finger`, async () => {
      // The gate discs are 15-16px at this width. The lists are the other way in, so their
      // row heights are measured and reported: the 40px control size is a guideline this
      // layout does not meet everywhere, and pretending otherwise would hide a real
      // limitation. What is asserted is that every row really opens its own object.
      const rows = await page.evaluate(() => {
        const sizes = {};
        for (const selector of ['.dream-row-open[data-gate]', '.dream-column-row[data-gate]', '.dream-channel-open[data-channel]', '.dream-type-chip']) {
          const heights = [...document.querySelectorAll(selector)]
            .map(node => node.getBoundingClientRect().height)
            .filter(value => value > 0);
          sizes[selector] = heights.length ? Math.round(Math.min(...heights) * 10) / 10 : null;
        }
        return sizes;
      });
      record(`${label} list row heights`, rows);
      for (const [selector, height] of Object.entries(rows)) {
        assert.ok(height != null, `${selector} rendered no rows`);
      }
      // The one list surface that does meet the control size is the channel list.
      assert.ok(rows['.dream-channel-open[data-channel]'] >= MIN_CONTROL,
        `channel rows are only ${rows['.dream-channel-open[data-channel]']}px tall`);
      // The entry buttons a finger actually aims at: a night-field gate row, an
      // activation column row and a type chip. They were 16.8 / 16.8 / 23.4px before
      // the touch rule; the columns only reach 44px because the dream shell stacks them
      // below the canvas on a phone (see the stacked-shell check above), which is what
      // freed them from covering the graph's flank gates.
      for (const selector of ['.dream-row-open[data-gate]', '.dream-column-row[data-gate]', '.dream-type-chip']) {
        assert.ok(rows[selector] >= MIN_TAP, `${selector} is only ${rows[selector]}px tall`);
      }
      // Three different night-field rows, each opening its own gate.
      const gates = await page.$$eval('.dream-row-open[data-gate]', nodes => nodes.slice(0, 3).map(node => node.dataset.gate));
      for (const gate of gates) {
        await phone.tapSelector(`.dream-row-open[data-gate="${gate}"]`);
        const sheet = await phone.sheetState();
        assert.ok(sheet.open, `the row for gate ${gate} opened no sheet`);
        assert.equal(sheet.card.gate, gate, `the row for gate ${gate} opened ${sheet.card.gate}`);
        await phone.closeSheet();
      }
      // And a type chip repeats.
      const chip = await phone.tapSelector('.dream-type-chip[data-dream-type-open="dream"]');
      assert.ok(chip.h >= 1, 'the type chip has no box');
      assert.ok((await phone.sheetState()).open, 'the type chip opened no sheet');
      await phone.closeSheet();
      await page.screenshot({ path: path.join(SHOTS, `${label}-list-rows.png`) });
    });

    await check(`${label}: both type chips open their own reading`, async () => {
      for (const side of ['waking', 'dream']) {
        await phone.tapSelector(`.dream-type-chip[data-dream-type-open="${side}"]`);
        const sheet = await phone.sheetState();
        assert.ok(sheet.open, `the ${side} type chip opened no sheet`);
        assert.equal(sheet.card.type, side, `the ${side} chip opened data-type=${sheet.card.type}`);
        assert.equal(sheet.hasWakingShell, false, `the ${side} type sheet rendered the waking reading shell`);
        await phone.closeSheet();
      }
    });

    await check(`${label}: pinning a gate lights its row and closing clears it`, async () => {
      const gate = await page.$eval('.dream-realm [data-gate]', node => node.dataset.gate);
      const point = await gateCentre(page, '#dream-bodygraph', gate);
      await phone.tapAt(point);
      const lit = await page.$$eval('#dream-content .row-lit', nodes => nodes.map(node => node.dataset.gate));
      assert.ok(lit.includes(gate), `gate ${gate} pinned but rows ${JSON.stringify(lit)} lit`);
      await phone.closeSheet();
      const after = await page.$$eval('#dream-content .row-lit', nodes => nodes.length);
      assert.equal(after, 0, `${after} row(s) stayed lit after the sheet closed`);
    });

    await check(`${label}: a drag over the graph scrolls the page without opening a sheet`, async () => {
      const graph = await page.evaluate(() => {
        const rect = document.querySelector('#dream-bodygraph .bodygraph-svg').getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, top: rect.y };
      });
      const before = await page.evaluate(() => Math.round(scrollY));
      // Start on a gate and drag upward: a pane that opened on touchstart would fire here.
      await phone.swipe({ x: graph.x, y: graph.y + 40 }, { x: graph.x, y: graph.y - 160 });
      const after = await page.evaluate(() => Math.round(scrollY));
      const sheet = await phone.sheetState();
      record(`${label} scroll`, { before, after });
      assert.equal(sheet.open, false, 'a swipe opened a sheet');
      assert.ok(after > before, `the page did not scroll (${before} → ${after})`);
      // Back to the top for the next checks.
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(300);
    });

    await check(`${label}: a long press previews the gate and releasing clears it`, async () => {
      const gate = await page.$eval('#dream-bodygraph .bg-gate', node => node.dataset.gate);
      const point = await gateCentre(page, '#dream-bodygraph', gate);
      const press = await phone.pressAndHold(point);
      assert.ok(press.during, 'a long press showed no preview');
      assert.ok(press.during.inGraph, 'the preview left its graph');
      assert.ok(press.during.bottom <= point.y + 1,
        `the preview sits below the finger (${Math.round(press.during.bottom)} for y=${Math.round(point.y)})`);
      assert.ok(press.during.x >= 0 && press.during.right <= device.viewport.width + 1,
        `the preview runs outside the viewport (${Math.round(press.during.x)}…${Math.round(press.during.right)})`);
      assert.equal(press.openAfterRelease, 0, 'the preview stayed after the finger lifted');
      record(`${label} preview release opens a sheet`, press.sheetOnRelease);
      await page.screenshot({ path: path.join(SHOTS, `${label}-long-press.png`) });
    });

    await check(`${label}: the preview speaks the sleep design's own gate name`, async () => {
      // Until the sleep page passes `naming` to the renderer, the preview prints the
      // waking catalogue name; this check is the one that has to flip.
      const names = await page.evaluate(async () => {
        const { dreamGateName } = await import('/src/lib/dream-vocabulary.js');
        const { gateName } = await import('/src/lib/vocabulary.js');
        const gate = document.querySelector('#dream-bodygraph .bg-gate').dataset.gate;
        return { gate, dream: dreamGateName(Number(gate)), waking: gateName(Number(gate)) };
      });
      const point = await gateCentre(page, '#dream-bodygraph', names.gate);
      const press = await phone.pressAndHold(point);
      assert.ok(press.during, 'a long press showed no preview');
      record(`${label} preview text`, press.during.text);
      assert.ok(press.during.text.includes(names.dream),
        `the preview says "${press.during.text}" but the sleep design calls gate ${names.gate} "${names.dream}"`);
      assert.ok(!press.during.text.includes(names.waking),
        `the preview still uses the waking name "${names.waking}"`);
      // The graph's own per-gate label is the same vocabulary, through the same hook.
      const aria = await page.evaluate(() => document.querySelector('#dream-bodygraph .bg-gate').getAttribute('aria-label'));
      record(`${label} graph aria`, aria);
      assert.ok(aria.includes(names.dream), `the gate aria reads "${aria}" instead of the sleep name "${names.dream}"`);
      assert.ok(!aria.includes(names.waking), `the gate aria still uses the waking name "${names.waking}"`);
    });

    await check(`${label}: the six sleep channels are listed under their sleep names`, async () => {
      const channels = await page.evaluate(async () => {
        const { DREAM_CHANNELS } = await import('/src/lib/human-design/dream-topology.js');
        const { dreamChannelName } = await import('/src/lib/dream-vocabulary.js');
        const rows = [...document.querySelectorAll('.dream-channel-open[data-channel]')].map(node => ({
          key: node.dataset.channel,
          name: node.querySelector('.dream-channel-name')?.textContent.trim() || null,
          cls: node.className.toString()
        }));
        return {
          ids: DREAM_CHANNELS.map(channel => channel.gates.join('-')),
          names: Object.fromEntries(DREAM_CHANNELS.map(channel => [channel.gates.join('-'), dreamChannelName(channel.gates)])),
          rows
        };
      });
      record(`${label} channel rows`, channels.rows.map(row => `${row.key}:${row.name}`));
      assert.equal(channels.rows.length, 6, `${channels.rows.length} channel rows instead of 6`);
      assert.deepEqual(channels.rows.map(row => row.key).sort(), [...channels.ids].sort(),
        `channel rows are ${channels.rows.map(row => row.key)} for the six dream channels`);
      for (const row of channels.rows) {
        assert.equal(row.name, channels.names[row.key],
          `channel ${row.key} is labelled "${row.name}" instead of "${channels.names[row.key]}"`);
      }
    });

    /* ---------------- two-person composite ---------------- */

    await check(`${label}: the comparison opens at phone width without overflow`, async () => {
      await phone.closeSheet();
      await phone.tapSelector('#dream-compare');
      await page.waitForSelector('.person-picker-choice[data-add-person]', { timeout: 30000 });
      await page.locator(`.person-picker-choice[data-add-person="${PARTNER}"]`).click();
      await page.waitForSelector('#dream-composite-shell .bg-gate', { timeout: 180000 });
      await page.waitForTimeout(900);
      const state = await phone.overflow();
      record(`${label} composite overflow`, state);
      assert.ok(state.document <= 1, `the composite document scrolls ${state.document}px sideways`);
      await page.screenshot({ path: path.join(SHOTS, `${label}-composite.png`) });
    });

    await check(`${label}: the composite's four columns stack below its canvas as a 2\u00d72 block`, async () => {
      const state = await page.evaluate(() => {
        const canvas = document.querySelector('#dream-composite-shell .bodygraph-svg').getBoundingClientRect();
        const columns = [...document.querySelectorAll('#dream-composite-shell .dream-column')]
          .map(node => node.getBoundingClientRect());
        const rows = [...document.querySelectorAll('#dream-composite-shell .dream-column-row[data-gate]')]
          .map(node => Math.round(node.getBoundingClientRect().height * 10) / 10);
        return {
          canvasBottom: Math.round(canvas.bottom),
          columns: columns.length,
          overlap: columns.filter(rect => rect.top < canvas.bottom - 2).length,
          lefts: [...new Set(columns.map(rect => Math.round(rect.left)))].length,
          slotColumns: [...document.querySelectorAll('#dream-composite-shell .ohd-graph-slot')]
            .map(slot => slot.querySelectorAll('.dream-column').length),
          rows: [...new Set(rows)],
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      });
      record(`${label} composite column layout`, state);
      assert.equal(state.columns, 4, `${state.columns} composite columns instead of four`);
      assert.equal(state.overlap, 0, `${state.overlap} composite column(s) still cover the canvas`);
      // Two columns side by side, each slot holding that person's design and personality
      // column stacked: a 2\u00d72 block rather than four narrow strips across the page (which
      // is what a 2-up `.dream-columns` produced) or two tall stacks. The two slots' rows
      // need not share a baseline \u2014 their columns have different heights.
      assert.equal(state.lefts, 2, `composite columns use ${state.lefts} horizontal positions`);
      assert.equal(state.slotColumns.join(','), '2,2', `slots hold ${state.slotColumns} columns`);
      for (const height of state.rows) {
        assert.ok(height >= MIN_TAP, `a composite column row is only ${height}px tall`);
      }
      assert.ok(state.overflow <= 1, `the composite scrolls ${state.overflow}px sideways`);
    });

    await check(`${label}: a composite gate reports who carries it`, async () => {
      const gate = await page.$eval('#dream-composite-shell .bg-gate', node => node.dataset.gate);
      const point = await gateCentre(page, '#dream-composite-shell', gate);
      await phone.tapAt(point);
      const sheet = await phone.sheetState();
      assert.ok(sheet.open, 'the composite gate sheet did not open');
      assert.equal(sheet.card.gate, gate, `the composite gate sheet shows gate ${sheet.card.gate}`);
      assert.match(sheet.body, /Fictional A|Fictional B/, 'the composite sheet names neither person');
      assert.equal(sheet.hasWakingShell, false, 'the composite gate sheet rendered the waking reading shell');
      await phone.closeSheet();
    });

    await check(`${label}: the composite lists all six sleep channels with the pair's own status`, async () => {
      const channels = await page.evaluate(async () => {
        const { DREAM_CHANNELS } = await import('/src/lib/human-design/dream-topology.js');
        const { dreamChannelName } = await import('/src/lib/dream-vocabulary.js');
        return {
          ids: DREAM_CHANNELS.map(channel => channel.gates.join('-')).sort(),
          names: Object.fromEntries(DREAM_CHANNELS.map(channel => [channel.gates.join('-'), dreamChannelName(channel.gates)])),
          rows: [...document.querySelectorAll('.dream-channel-open[data-channel]')].map(node => ({
            key: node.dataset.channel,
            name: node.querySelector('.dream-channel-name')?.textContent.trim() || null,
            status: node.querySelector('.dream-channel-status')?.textContent.trim() || null,
            cls: node.className.toString(),
            text: node.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)
          }))
        };
      });
      record(`${label} composite channels`, channels.rows.map(row => `${row.key}:${row.name}:${row.status}`));
      assert.equal(channels.rows.length, 6, `${channels.rows.length} composite channel rows instead of 6`);
      assert.deepEqual(channels.rows.map(row => row.key).sort(), channels.ids,
        `composite channel rows are ${channels.rows.map(row => row.key)}`);
      for (const row of channels.rows) {
        assert.equal(row.name, channels.names[row.key],
          `composite channel ${row.key} is labelled "${row.name}" instead of "${channels.names[row.key]}"`);
        assert.ok(row.status, `composite channel ${row.key} has no status`);
      }
      // Whoever completes a channel is named on its row (owner class + the person).
      const owned = channels.rows.filter(row => /dream-channel-owner-(a|b|both)/.test(row.cls));
      assert.ok(owned.length > 0, 'no composite channel row says who completes it');
      for (const row of owned) {
        assert.match(row.text, /Fictional A|Fictional B/, `channel ${row.key} says "${row.text}" without naming a person`);
      }
    });

    await check(`${label}: each person's waking and sleep type open under their own name`, async () => {
      // The integrated composite gives every person both halves: waking and sleep, one
      // chip each, all four carrying their owner.
      const chips = await page.$$eval('#dream-content [data-dream-type-open]', nodes => nodes.map(node => ({
        side: node.dataset.dreamTypeOpen,
        owner: node.dataset.owner || null
      })));
      record(`${label} composite type chips`, chips);
      assert.equal(chips.length, 4, `${chips.length} type chips instead of four`);
      // The composite's four chips are the same 44px touch target as the single
      // design's two: a person's waking and sleep type are both finger-sized.
      const chipHeights = await page.$$eval('#dream-content [data-dream-type-open]',
        nodes => nodes.map(node => Math.round(node.getBoundingClientRect().height * 10) / 10));
      record(`${label} composite chip heights`, chipHeights);
      for (const height of chipHeights) {
        assert.ok(height >= MIN_TAP, `a composite type chip is only ${height}px tall`);
      }
      for (const owner of ['a', 'b']) {
        for (const side of ['waking', 'dream']) {
          assert.ok(chips.some(chip => chip.owner === owner && chip.side === side),
            `no ${side} chip for person ${owner}`);
          await phone.tapSelector(`#dream-content [data-dream-type-open="${side}"][data-owner="${owner}"]`);
          const sheet = await phone.sheetState();
          assert.ok(sheet.open, `the ${side} chip of ${owner} opened no sheet`);
          assert.equal(sheet.card.type, side, `the ${side} chip of ${owner} opened data-type=${sheet.card.type}`);
          assert.equal(sheet.card.owner, owner, `the ${side} chip of ${owner} opened owner=${sheet.card.owner}`);
          assert.match(sheet.labels.join(' '), new RegExp(`Fictional ${owner.toUpperCase()}`),
            `the ${side} sheet of ${owner} is not labelled with that person: ${JSON.stringify(sheet.labels)}`);
          // The waking half must read as a waking reading, the sleep half as the sleep one.
          assert.equal(sheet.hasWakingShell, false, `the ${side} sheet rendered the shared waking reading shell`);
          await phone.closeSheet();
        }
      }
    });

    await check(`${label}: leaving and returning leaves no sheet, overlay or lit row behind`, async () => {
      const gate = await page.$eval('#dream-composite-shell .bg-gate', node => node.dataset.gate);
      await phone.tapAt(await gateCentre(page, '#dream-composite-shell', gate));
      assert.ok((await phone.sheetState()).open, 'no sheet open before leaving');
      await phone.closeSheet();
      await phone.openView('chart');
      await page.waitForTimeout(500);
      const residue = await page.evaluate(() => ({
        sheets: document.querySelectorAll('#dream-detail:not(.hidden)').length,
        overlays: [...document.querySelectorAll('.bg-tooltip')].filter(node => node.matches(':popover-open')).length,
        lit: document.querySelectorAll('#dream-content .row-lit').length
      }));
      assert.deepEqual(residue, { sheets: 0, overlays: 0, lit: 0 }, `leaving left ${JSON.stringify(residue)}`);
      await phone.openView('dream');
      await page.waitForTimeout(800);
      const back = await page.evaluate(() => ({
        sheets: document.querySelectorAll('#dream-detail:not(.hidden)').length,
        overlays: [...document.querySelectorAll('.bg-tooltip')].filter(node => node.matches(':popover-open')).length
      }));
      assert.deepEqual(back, { sheets: 0, overlays: 0 }, `returning restored ${JSON.stringify(back)}`);
    });

    /* ---------------- language and skin sampling ---------------- */

    await check(`${label}: the page fits and still reads in every language`, async () => {
      for (const code of ['en', 'zh-Hant']) {
        if (!(await page.$eval('#more-menu', node => node.open))) await phone.tapSelector('#more-toggle');
        if (!(await page.$eval('#language-menu', node => node.open))) await phone.tapSelector('#language-menu > summary');
        await phone.tapSelector(`.language-actions button[data-language="${code}"]`);
        await page.waitForTimeout(1200);
        const state = await phone.overflow();
        const clipped = await phone.clippedText();
        const title = await page.$eval('#dream-subtitle', node => node.textContent.trim()).catch(() => '');
        record(`${label} ${code}`, { overflow: state.document, view: state.view, clipped: clipped.count, title: title.slice(0, 30) });
        assert.ok(state.document <= 1, `${code} scrolls ${state.document}px sideways`);
        assert.ok(state.view <= 1, `${code} overflows the sleep view by ${state.view}px`);
        assert.equal(clipped.count, 0, `${code} clips ${clipped.clipped.join(' | ')}`);
        assert.ok(title.length > 0, `${code} left the sleep subtitle empty`);
        await page.screenshot({ path: path.join(SHOTS, `${label}-${code}.png`) });
      }
      // Back to Chinese for the skin sample.
      if (!(await page.$eval('#more-menu', node => node.open))) await phone.tapSelector('#more-toggle');
      if (!(await page.$eval('#language-menu', node => node.open))) await phone.tapSelector('#language-menu > summary');
      await phone.tapSelector('.language-actions button[data-language="zh-CN"]');
      await page.waitForTimeout(1000);
    });

    await check(`${label}: every skin keeps the page inside the viewport without clipping`, async () => {
      // The three skins the sleep page's type was measured against, plus the default
      // dark one that pairs with the default light. Each one is a different ink and
      // surface; none of them may change the layout or cut a line of text.
      for (const skin of ['default-light', 'default-dark', 'midnight-contrast', 'high-contrast']) {
        try {
          if (!(await page.$eval('#more-menu', node => node.open))) await phone.tapSelector('#more-toggle');
          await phone.tapSelector('#skin-settings-button');
          await page.waitForSelector('#skin-settings[open]', { timeout: 10000 });
          await phone.tapSelector(`#skin-picker [data-skin-id="${skin}"]`);
          await page.waitForTimeout(400);
          if (await page.$eval('#skin-settings', node => node.open)) await phone.tapSelector('#skin-settings-close');
          await page.waitForTimeout(600);
          const state = await phone.overflow();
          const clipped = await phone.clippedText();
          const readable = await page.evaluate(() => {
            const sheetTitle = document.querySelector('.dream-type-strip, .dream-compare-head');
            if (!sheetTitle) return null;
            const style = getComputedStyle(sheetTitle);
            return { color: style.color, background: getComputedStyle(document.body).backgroundColor };
          });
          record(`${label} ${skin}`, { overflow: state.document, view: state.view, clipped: clipped.count, readable });
          assert.ok(state.document <= 1, `${skin} scrolls ${state.document}px sideways`);
          assert.ok(state.view <= 1, `${skin} overflows the sleep view by ${state.view}px`);
          assert.equal(clipped.count, 0, `${skin} clips ${clipped.clipped.join(' | ')}`);
          await page.screenshot({ path: path.join(SHOTS, `${label}-${skin}.png`) });
        } catch (error) {
          throw new Error(`skin ${skin}: ${error.message}`);
        }
      }
    });

    await check(`${label}: no page or console errors on the phone`, async () => {
      assert.deepEqual(errors, [], errors.join(' | '));
    });
  } finally {
    await context.close();
  }
}

await browser.close();

console.log('\n' + JSON.stringify({ base: BASE, devices: DEVICES.map(d => d.name), shots: SHOTS, checks: summary.length, failures }, null, 2));
if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall mobile acceptance checks passed');
