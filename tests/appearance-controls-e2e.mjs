/** UI-only regression, usable against both Vite and deployed static builds. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = (process.env.E2E_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const birth = '?d=1990-06-15&t=14%3A30&tz=-6';
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
const errors = [];

async function checkViewport(viewport) {
  const context = await browser.newContext({ viewport, locale: 'en-US', colorScheme: 'light' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const token = name => page.locator('html').evaluate((el, name) => getComputedStyle(el).getPropertyValue(name).trim(), name);
  const value = key => page.locator(`#appearance-${key}`).inputValue();
  const setValue = async (key, value) => {
    const input = page.locator(`#appearance-${key}`);
    await input.evaluate((node, value) => {
      node.value = value;
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  };
  const openMore = async () => {
    if (!(await page.locator('#more-menu').evaluate(node => node.open))) await page.locator('#more-toggle').click();
  };
  const openSettings = async () => {
    await openMore();
    await page.locator('#skin-settings-button').click({ position: { x: 4, y: 16 } });
    await page.locator('#skin-settings').waitFor({ state: 'visible' });
  };
  const switchTheme = async () => {
    await page.keyboard.press('Escape');
    await openMore();
    await page.locator('#theme-toggle').click({ position: { x: 4, y: 16 } });
    await openSettings();
  };
  try {
    await page.goto(`${base}/${birth}`, { timeout: 60000 });
    await page.locator('#bodygraph-container .bodygraph-svg').waitFor({ timeout: 60000 });
    const arrows = await page.locator('#bodygraph-container .bg-variable-arrow').evaluateAll(nodes => nodes.map(node => ({
      variable: node.dataset.variable, position: node.dataset.position, direction: node.dataset.direction,
      tone: Number(node.dataset.tone), symbol: node.querySelector('.bg-variable-symbol')?.textContent,
      x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y,
      width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height
    })));
    const positions = { determination: 'top-left', motivation: 'top-right', environment: 'bottom-left', perspective: 'bottom-right' };
    assert.equal(arrows.length, 4, 'Four Variable arrows rendered');
    for (const arrow of arrows) {
      assert.equal(arrow.position, positions[arrow.variable]);
      assert.ok(arrow.tone >= 1 && arrow.tone <= 6);
      assert.equal(arrow.direction, arrow.tone <= 3 ? 'left' : 'right', `${arrow.variable} follows Tone direction`);
      assert.equal(arrow.symbol, arrow.direction === 'left' ? '←' : '→');
      assert.ok(arrow.width > 0 && arrow.height > 0);
    }
    const arrowAt = position => arrows.find(arrow => arrow.position === position);
    assert.ok(arrowAt('top-left').x < arrowAt('top-right').x);
    assert.ok(arrowAt('bottom-left').x < arrowAt('bottom-right').x);
    const svg = await page.locator('#bodygraph-container .bodygraph-svg').boundingBox();
    for (const side of ['left', 'right']) {
      const upper = arrowAt(`top-${side}`);
      const lower = arrowAt(`bottom-${side}`);
      assert.ok(upper.y + upper.height <= lower.y + 1, `${side} pair preserves semantic order without overlap`);
      assert.ok(lower.y - upper.y <= Math.max(100, svg.height * 0.25), `${side} pair stays clustered near upper graph`);
      assert.ok(lower.y < svg.y + svg.height * 0.55, `${side} pair does not move to graph bottom`);
    }
    await openMore();
    for (const selector of ['#chart-share-menu', '#language-switcher', '#theme-toggle', '#skin-settings-button']) {
      assert.ok(await page.locator(selector).isVisible(), `${selector} is reachable at ${viewport.width}px`);
    }
    const menuGeometry = await page.locator('.more-panel').evaluate(node => ({
      background: getComputedStyle(node).backgroundColor,
      border: getComputedStyle(node).borderWidth,
      boxShadow: getComputedStyle(node).boxShadow,
      labels: node.querySelectorAll(':scope > span, .more-item > span').length,
      icons: [...node.querySelectorAll(':scope > .theme-toggle, :scope > .chart-share-menu > summary')].map(icon => {
        const rect = icon.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, radius: getComputedStyle(icon).borderRadius };
      })
    }));
    assert.equal(menuGeometry.background, 'rgba(0, 0, 0, 0)', 'More has no outer background box');
    assert.equal(menuGeometry.border, '0px');
    assert.equal(menuGeometry.boxShadow, 'none');
    assert.equal(menuGeometry.labels, 0, 'More exposes icons without visible labels');
    assert.equal(menuGeometry.icons.length, 4);
    for (const [index, icon] of menuGeometry.icons.entries()) {
      assert.equal(icon.width, icon.height, 'Menu icon is circular');
      assert.equal(icon.width, menuGeometry.icons[0].width, 'Menu icons share diameter');
      assert.equal(icon.x, menuGeometry.icons[0].x, 'Menu icons align vertically');
      if (index) assert.ok(icon.y >= menuGeometry.icons[index - 1].y + icon.height, 'Menu icons do not overlap');
    }
    await page.locator('#language-switcher').click({ position: { x: 4, y: 16 } });
    await page.keyboard.press('Escape');
    for (const language of ['zh-CN', 'zh-Hant', 'en']) {
      await openMore();
      await page.locator('#language-switcher').selectOption(language);
      assert.equal(await page.locator('html').getAttribute('lang'), language, 'Language control remains usable');
    }
    await openMore();
    await page.locator('#chart-share-menu > summary').click({ position: { x: 4, y: 16 } });
    const downloadEvent = page.waitForEvent('download', { timeout: 60000 });
    await page.locator('#save-image').click();
    const download = await downloadEvent;
    assert.match(download.suggestedFilename(), /\.png$/, 'Share still saves a PNG');
    assert.equal(await download.failure(), null, 'PNG download succeeds');
    await page.locator('#type-banner').click({ position: { x: 5, y: 5 } });
    assert.equal(await page.locator('#more-menu').evaluate(node => node.open), false, 'outside click closes More');
    await openSettings();
    const preset = name => page.locator(`[data-skin-preset="${name}"]`).click();
    await preset('classic');
    const defaults = Object.fromEntries(await Promise.all(['accent', 'personality', 'design', 'transit', 'graphBackground', 'gateNumberSize'].map(async key => [key, await value(key)])));
    const custom = { accent: '#7b2cff', personality: '#325ba7', design: '#a62b8c', transit: '#00bb77', graphBackground: '#e5eef7', gateNumberSize: '18' };
    for (const [key, next] of Object.entries(custom)) await setValue(key, next);
    assert.equal((await token('--accent')).toLowerCase(), custom.accent);
    assert.equal((await token('--hd-personality')).toLowerCase(), custom.personality);
    assert.equal((await token('--hd-design')).toLowerCase(), custom.design);
    assert.equal((await token('--hd-transit')).toLowerCase(), custom.transit);
    assert.equal((await token('--hd-graph-panel-bg')).toLowerCase(), custom.graphBackground);
    assert.equal(await token('--hd-gate-number-size'), '18px');
    assert.ok(await page.locator(`#bodygraph-container .bg-gate-path[fill="${custom.design}"]`).count() > 0, 'Design color repaints chart immediately');
    assert.ok(await page.locator(`#bodygraph-container .bg-gate-path[fill="${custom.personality}"]`).count() > 0, 'Personality color repaints chart immediately');
    assert.equal(await page.locator('#bodygraph-container .bg-gate text').first().getAttribute('font-size'), '18px', 'Gate number size repaints SVG immediately');
    assert.equal(await page.locator('#bodygraph-container .bg-svg-wrap').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(229, 238, 247)', 'BodyGraph background updates immediately');
    for (const [key, color] of Object.entries({ determination: 'rgb(166, 43, 140)', environment: 'rgb(166, 43, 140)', motivation: 'rgb(50, 91, 167)', perspective: 'rgb(50, 91, 167)' })) {
      const symbol = page.locator(`#bodygraph-container .bg-variable-arrow[data-variable="${key}"] .bg-variable-symbol`);
      assert.equal(await symbol.evaluate(node => getComputedStyle(node).color), color, `${key} arrow follows its Design/Personality color`);
    }
    const centerColor = () => page.locator('#bodygraph-container radialGradient[id$="-cg-g"] stop[offset="1"]').getAttribute('stop-color');
    const classicCenter = await centerColor();
    await preset('chakra');
    assert.equal(await page.locator('html').getAttribute('data-hd-skin'), 'chakra');
    assert.notEqual(await centerColor(), classicCenter, 'Chakra changes center color');
    assert.equal(await value('design'), custom.design, 'Source color is global across skins');
    assert.equal(await value('gateNumberSize'), custom.gateNumberSize, 'Gate size is global across presets');
    await setValue('design', '#b04717');
    await preset('classic');
    assert.equal(await value('design'), '#b04717', 'Source changes apply to both skins');
    assert.equal(await centerColor(), classicCenter, 'Switching back restores Classic center color');
    await switchTheme();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await value('design'), '#b04717', 'Source color is global across themes');
    assert.equal(await value('gateNumberSize'), custom.gateNumberSize, 'Gate size is global across themes');
    await setValue('design', '#a1b2c3');
    await switchTheme();
    custom.design = '#a1b2c3';
    assert.equal(await value('design'), custom.design, 'Source changes persist across themes');
    await page.keyboard.press('Escape');
    await page.reload({ timeout: 60000 });
    await page.locator('#bodygraph-container .bodygraph-svg').waitFor({ timeout: 60000 });
    await openSettings();
    for (const [key, next] of Object.entries(custom)) assert.equal(await value(key), next, `${key} persists across reload`);
    await page.locator('#appearance-restore').click();
    for (const [key, initial] of Object.entries(defaults)) assert.equal(await value(key), key === 'gateNumberSize' ? custom.gateNumberSize : initial, `${key} restores colors while keeping global size`);
    await preset('chakra');
    assert.equal(await value('design'), defaults.design, 'Restore default colors applies across skins');
    await page.locator('#appearance-reset').click();
    assert.equal(await page.locator('html').getAttribute('data-hd-skin'), 'classic');
    await preset('chakra');
    assert.notEqual(await value('design'), '#b04717', 'Reset removes overrides from other presets');
    await preset('classic');
    await switchTheme();
    assert.notEqual(await value('design'), '#a1b2c3', 'Reset removes overrides from other themes');
    await page.keyboard.press('Escape');
    console.log(`Appearance controls ${viewport.width}px: four arrows, menu, presets, live colors, theme isolation, persistence, restore and reset PASS`);
  } finally {
    await context.close();
  }
}

try {
  await checkViewport({ width: 1224, height: 900 });
  await checkViewport({ width: 390, height: 844 });
  assert.deepEqual(errors, [], 'No browser page errors');
} finally {
  await browser.close();
}
