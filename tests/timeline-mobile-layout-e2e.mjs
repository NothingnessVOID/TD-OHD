/** Phone-only workspace regression; run against a local Vite server. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';

const base = process.env.E2E_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true,
    hasTouch: true, locale: 'zh-CN' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-01T06:07:53Z'));
  await page.goto(`${base}/?d=1990-06-15&t=14:30&tz=8&n=Mobile%20Demo&view=timeline`);
  const root = page.locator('#timeline-view');
  const table = root.locator('.tl-table');
  await page.waitForFunction(() => {
    const node = document.querySelector('#timeline-view .tl-table');
    return node?.getAttribute('aria-busy') === 'false' && !!node.querySelector('.tl-bar');
  }, null, { timeout: 120000 });

  const dateCell = root.locator('.tl-ticks .tl-date-cell').nth(3);
  const dateRect = await dateCell.boundingBox();
  const dateY = dateRect.y + dateRect.height / 2;
  const beforeMouseDrag = Number(await table.getAttribute('data-selected'));
  await page.mouse.move(dateRect.x + dateRect.width * .3, dateY);
  await page.mouse.down();
  await page.mouse.move(dateRect.x + dateRect.width * .8, dateY, { steps: 6 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => getSelection()?.toString() || ''), '',
    'dragging across date labels does not select timeline text');
  assert.notEqual(Number(await table.getAttribute('data-selected')), beforeMouseDrag,
    'mouse dragging the date ruler still selects a time');

  const trigger = root.locator('[data-action="mobile-controls"]');
  const panel = root.locator('.tl-mobile-controls-panel');
  const geometry = [];
  const paneGeometry = () => page.evaluate(() => {
    const box = selector => {
      const r = document.querySelector(`#timeline-view ${selector}`).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return { stage: box('.tl-stage'), graph: box('.tl-graph-panel'),
      svg: box('.bodygraph-svg'), tracks: box('.tl-tracks-panel') };
  });
  for (const [width, height, scale] of [[390, 844, .94], [375, 667, .90], [360, 640, .86], [320, 568, .78]]) {
    await page.setViewportSize({ width, height });
    const panes = await paneGeometry();
    assert.ok(Math.abs(panes.stage.height / height - .6) < .002 &&
      Math.abs(panes.tracks.height / height - .4) < .002, `60/40 split at ${width}px`);
    assert.ok(Math.abs(panes.graph.height - (panes.stage.height - 2)) < .1,
      'graph fills the entire original pane, with only the two border pixels excluded');
    assert.equal(panes.svg.width, width - 8, 'original SVG layout width');
    assert.ok(Math.abs(panes.svg.height - (panes.stage.height - 12)) < .1,
      'original SVG layout height: no toolbar reservation');
    assert.equal(await page.locator('.header').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await root.locator('.tl-mobile-control-bar').count(), 0);
    const guards = await page.evaluate(() => {
      const q = s => document.querySelector(`#timeline-view ${s}`);
      const box = el => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
      };
      const overlaps = (a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const controls = ['.tl-mobile-controls-trigger', '.tl-mobile-range',
        '.tl-mobile-event-nav button:first-child', '.tl-mobile-event-nav button:last-child'].map(s => box(q(s)));
      const columns = ['.tl-transit-column', '.tl-birth-column'].map(s => box(q(s)));
      // The actual nine SVG center polygons are protected. The full SVG viewport
      // includes empty margins where floating controls are deliberately allowed.
      const centers = [...q('.bodygraph-svg').querySelectorAll('.bg-centers .bg-center')].map(box);
      return { controls, columns, centers,
        controlColumnCollisions: controls.flatMap((c,i) => columns.filter(p => overlaps(c,p)).map(() => i)),
        controlCollisions: controls.flatMap((c,i) => controls.slice(i+1).filter(p => overlaps(c,p)).map(() => i)),
        centerCollisions: columns.flatMap((c,i) => centers.filter(p => overlaps(c,p)).map(() => i)),
        controlCenterCollisions: controls.flatMap((c,i) => centers.filter(p => overlaps(c,p)).map(() => i)),
        positions: ['.tl-mobile-controls-trigger','.tl-mobile-range','.tl-mobile-event-nav','.tl-mobile-controls-panel'].map(s => getComputedStyle(q(s)).position),
        scale: Number(getComputedStyle(q('.tl-transit-column')).transform.match(/matrix\(([^,]+)/)[1]),
        birthScale: Number(getComputedStyle(q('.tl-birth-column')).transform.match(/matrix\(([^,]+)/)[1]),
        scrollWidth: document.documentElement.scrollWidth };
    });
    assert.deepEqual(guards.controlColumnCollisions, [], `controls clear the planet columns at ${width}px`);
    assert.deepEqual(guards.controlCollisions, [], `floating controls do not collide at ${width}px`);
    assert.deepEqual(guards.centerCollisions, [], `planet columns clear all nine centers at ${width}px`);
    assert.deepEqual(guards.controlCenterCollisions, [], `floating controls clear all nine centers at ${width}px`);
    assert.equal(guards.scale, scale);
    assert.equal(guards.birthScale, scale);
    assert.ok(guards.scrollWidth <= width);
    assert.ok(guards.positions.slice(0,3).every(p => p === 'absolute'), 'all collapsed controls are overlays');
    const [control, range, previous, next] = guards.controls;
    assert.ok(range.bottom < previous.top, 'range floats above event navigation');
    assert.ok(Math.abs(range.right-next.right) < .1, 'range and event navigation share the right edge');
    assert.ok(previous.top-range.bottom >= 2 && previous.top-range.bottom <= 8, 'range and arrows retain a compact gap');
    assert.ok(previous.right < next.left && next.right >= width-12, 'event arrows stay at lower right');
    assert.ok(Math.abs(previous.bottom - next.bottom) < .1);
    assert.ok(guards.controls.every(c => c.top > panes.stage.height*.8 && c.bottom < panes.stage.height),
      'all collapsed controls float inside the bottom of the graph pane');
    if (process.env.MOBILE_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.MOBILE_SCREENSHOT_DIR}/timeline-${width}.png` });
    const navBefore = await root.locator('.tl-mobile-range, .tl-mobile-event-nav').evaluateAll(nodes => nodes.map(el => {
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
    }));
    await trigger.click();
    assert.deepEqual(await root.locator('.tl-mobile-range, .tl-mobile-event-nav').evaluateAll(nodes => nodes.map(el => {
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
    })), navBefore, 'opening the unchanged panel never shifts range or arrows');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(await paneGeometry(), panes, 'opening controls never changes either pane or SVG layout size');
    const panelBox = await panel.boundingBox();
    assert.ok(panelBox.x >= 0 && panelBox.x+panelBox.width <= width && panelBox.y >= 0 &&
      panelBox.y+panelBox.height < control.top, 'panel opens upward inside the graph pane');
    assert.equal(await panel.evaluate(el => getComputedStyle(el).position), 'absolute');
    const inputs = await panel.locator('.tl-toolbar > label > input').evaluateAll(nodes => nodes.map(el => {
      const r = el.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom };
    }));
    assert.ok(inputs[0].right <= inputs[1].left, 'date and time inputs do not overlap in the compact floating panel');
    if (process.env.MOBILE_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.MOBILE_SCREENSHOT_DIR}/panel-${width}.png` });
    await panel.locator('.tl-advanced summary').click();
    assert.deepEqual(await paneGeometry(), panes, 'expanding advanced details never changes either pane or SVG');
    await panel.locator('.tl-advanced summary').click();
    await trigger.click();
    assert.deepEqual(await paneGeometry(), panes, 'closing controls never changes either pane or SVG');
    assert.deepEqual(await root.locator('.tl-mobile-range, .tl-mobile-event-nav').evaluateAll(nodes => nodes.map(el => {
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
    })), navBefore, 'closing the unchanged panel never shifts range or arrows');
    geometry.push({ width,height,scale,panes,controls:guards.controls,columns:guards.columns,centers:guards.centers,panel:panelBox });
  }
  if (process.env.MOBILE_SCREENSHOT_DIR) writeFileSync(`${process.env.MOBILE_SCREENSHOT_DIR}/validation-geometry.json`, JSON.stringify(geometry,null,2)+'\n');
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.MOBILE_SCREENSHOT) await page.screenshot({ path: process.env.MOBILE_SCREENSHOT });
  await trigger.click();
  if (process.env.MOBILE_PANEL_SCREENSHOT) await page.screenshot({ path: process.env.MOBILE_PANEL_SCREENSHOT });
  for (const field of ['date', 'time', 'zone', 'kind', 'search', 'changes'])
    assert.ok(await panel.locator(`[data-field="${field}"]`).count(), `${field} stays available in the floating controls`);
  assert.ok(await panel.locator('[data-action="toggle-mode"]').count(), 'transit-only button stays available in the floating controls');
  assert.ok(await root.locator('.tl-mobile-range [data-field="span"]').count(), 'range is outside the floating controls');
  await trigger.click();
  await root.locator('.tl-mobile-range [data-field="span"]').selectOption('1');
  await page.waitForFunction(() => {
    const node = document.querySelector('#timeline-view .tl-table');
    return node?.getAttribute('aria-busy') === 'false' &&
      Number(node.dataset.calculatedEnd) - Number(node.dataset.calculatedStart) === 86400000;
  }, null, { timeout: 120000 });
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  if (process.env.MOBILE_HOURLY_SCREENSHOT) await page.screenshot({ path: process.env.MOBILE_HOURLY_SCREENSHOT });
  const hourCells = await root.locator('.tl-ticks .tl-date-cell[data-granularity="hour"]').evaluateAll(nodes =>
    nodes.map(node => ({ label: node.textContent.trim(), width: node.getBoundingClientRect().width })));
  assert.deepEqual(hourCells.map(cell => cell.label),
    Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')),
    'every hour from 00 to 23 has its own visible cell');
  assert.ok(hourCells.every(cell => cell.width > 0), 'all hourly cells occupy timeline width');

  await table.focus();
  await page.keyboard.press('Equal');
  await page.waitForFunction(() => {
    const node = document.querySelector('#timeline-view .tl-table');
    return Number(node.dataset.end) - Number(node.dataset.start) < 86400000;
  });

  const bar = root.locator('.tl-bar').first();
  await bar.scrollIntoViewIfNeeded();
  const rect = await bar.boundingBox();
  assert.ok(rect, 'a bar is available for touch');
  const client = await context.newCDPSession(page);
  const gate = root.locator('.tl-graph .bg-gate[data-gate]').first();
  const gateRect = await gate.boundingBox();
  assert.ok(gateRect, 'an interactive bodygraph gate is available');
  const gx = gateRect.x + gateRect.width / 2, gy = gateRect.y + gateRect.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gx, y: gy, id: 2 }] });
  assert.equal(await root.locator('.tl-graph .bg-tooltip').evaluate(node => getComputedStyle(node).display), 'block',
    'touching a bodygraph gate reveals its tooltip');
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: gx + 12, y: gy, id: 2 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await root.locator('.tl-graph .bg-tooltip').evaluate(node => getComputedStyle(node).display), 'none',
    'releasing the bodygraph hides the touch tooltip');
  const x = rect.x + Math.min(rect.width / 2, 12), y = rect.y + rect.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 24, y, id: 1 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(100);
  assert.equal(await root.locator('.bodygraph-svg.bg-dimmed').count(), 0,
    'touching or swiping a bar does not dim the bodygraph as a hover preview');

  const track = root.locator('.tl-row .tl-track').first();
  const trackRect = await track.boundingBox();
  const tx = trackRect.x + trackRect.width * .55, ty = trackRect.y + trackRect.height / 2;
  const beforeHorizontal = await table.evaluate(node => ({ selected: Number(node.dataset.selected), scrollTop: node.scrollTop }));
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 3 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx - 24, y: ty + 3, id: 3 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx - 75, y: ty + 48, id: 3 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const afterHorizontal = await table.evaluate(node => ({ selected: Number(node.dataset.selected), scrollTop: node.scrollTop }));
  assert.notEqual(afterHorizontal.selected, beforeHorizontal.selected,
    'diagonal touch keeps panning time after a horizontal start');
  assert.ok(Math.abs(afterHorizontal.scrollTop - beforeHorizontal.scrollTop) < 2,
    'the same horizontal gesture does not turn into vertical scrolling');

  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 4 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + 2, y: ty - 28, id: 4 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + 42, y: ty - 75, id: 4 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const afterVertical = await table.evaluate(node => ({ selected: Number(node.dataset.selected), scrollTop: node.scrollTop }));
  assert.ok(afterVertical.scrollTop > afterHorizontal.scrollTop,
    'a gesture starting vertically still scrolls timeline rows');
  assert.equal(afterVertical.selected, afterHorizontal.selected,
    'the vertical gesture does not switch to time panning');

  await root.locator('[data-action="mobile-exit"]').click();
  assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('.header').evaluate(node => getComputedStyle(node).display), 'block');
  await page.locator('.nav-link[data-view="chart"]').click();
  assert.equal(await page.locator('#chart-view').isVisible(), true);
  await context.close();
  // Existing long range labels must still fit the compact overlay in other locales.
  for (const locale of ['en', 'zh-Hant']) {
    const other = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true,hasTouch:true });
    const localPage = await other.newPage();
    await localPage.addInitScript(locale => localStorage.setItem('ohd-language',locale),locale);
    await localPage.clock.setFixedTime(new Date('2026-10-01T06:07:53Z'));
    await localPage.goto(`${base}/?d=1990-06-15&t=14:30&tz=8&n=Mobile%20Demo&view=timeline`);
    await localPage.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null,{timeout:120000});
    await localPage.locator('#timeline-view .tl-mobile-range select').selectOption('past-year');
    await localPage.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null,{timeout:120000});
    for (const [width,height] of [[390,844],[375,667],[360,640],[320,568]]) {
      await localPage.setViewportSize({width,height});
      const clear = await localPage.evaluate(() => {
        const root=document.querySelector('#timeline-view');
        const box=s=>root.querySelector(s).getBoundingClientRect();
        const overlaps=(a,b)=>a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
        const trigger=box('.tl-mobile-controls-trigger'), range=box('.tl-mobile-range'),nav=box('.tl-mobile-event-nav');
        const columns=['.tl-transit-column','.tl-birth-column'].map(box);
        const centers=[...root.querySelectorAll('.bg-centers .bg-center')].map(el=>el.getBoundingClientRect());
        return range.bottom+2<=nav.top && Math.abs(range.right-nav.right)<.1 &&
          [trigger,range,nav].every(c=>columns.every(p=>!overlaps(c,p)) && centers.every(p=>!overlaps(c,p))) &&
          document.documentElement.scrollWidth<=innerWidth;
      });
      assert.ok(clear, `${locale} long range and floating controls remain clear at ${width}px`);
      if (process.env.MOBILE_SCREENSHOT_DIR) await localPage.screenshot({path:`${process.env.MOBILE_SCREENSHOT_DIR}/range-${locale}-${width}.png`});
    }
    await other.close();
  }
  console.log('Mobile 60/40 layout, scaled columns, floating controls, stable advanced panel, three locales, hour ruler and touch passed.');
} finally {
  await browser.close();
}
