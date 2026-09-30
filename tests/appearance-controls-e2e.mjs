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
    await page.locator('#skin-settings-button').click();
    await page.locator('#skin-settings').waitFor({ state: 'visible' });
  };
  const switchTheme = async () => {
    await page.keyboard.press('Escape');
    await openMore();
    await page.locator('#theme-toggle').click();
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
    for (const position of ['top-left', 'top-right']) assert.ok(arrowAt(position).y + arrowAt(position).height <= svg.y + 1, `${position} does not overlap SVG`);
    for (const position of ['bottom-left', 'bottom-right']) assert.ok(arrowAt(position).y >= svg.y + svg.height - 1, `${position} does not overlap SVG`);
    await openMore();
    for (const selector of ['#chart-share-menu', '#language-switcher', '#theme-toggle', '#skin-settings-button']) {
      assert.ok(await page.locator(selector).isVisible(), `${selector} is reachable at ${viewport.width}px`);
    }
    for (const language of ['zh-CN', 'zh-Hant', 'en']) {
      await openMore();
      await page.locator('#language-switcher').selectOption(language);
      assert.equal(await page.locator('html').getAttribute('lang'), language, 'Language control remains usable');
    }
    await openMore();
    await page.locator('#chart-share-menu > summary').click();
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
    const custom = { accent: '#7b2cff', personality: '#325ba7', design: '#a62b8c', transit: '#00bb77', graphBackground: '#e5eef7', gateNumberSize: '13' };
    for (const [key, next] of Object.entries(custom)) await setValue(key, next);
    assert.equal((await token('--accent')).toLowerCase(), custom.accent);
    assert.equal((await token('--hd-personality')).toLowerCase(), custom.personality);
    assert.equal((await token('--hd-design')).toLowerCase(), custom.design);
    assert.equal((await token('--hd-transit')).toLowerCase(), custom.transit);
    assert.equal((await token('--hd-graph-panel-bg')).toLowerCase(), custom.graphBackground);
    assert.equal(await token('--hd-gate-number-size'), '13px');
    assert.ok(await page.locator(`#bodygraph-container .bg-gate-path[fill="${custom.design}"]`).count() > 0, 'Design color repaints chart immediately');
    assert.ok(await page.locator(`#bodygraph-container .bg-gate-path[fill="${custom.personality}"]`).count() > 0, 'Personality color repaints chart immediately');
    assert.equal(await page.locator('#bodygraph-container .bg-gate text').first().getAttribute('font-size'), '13px', 'Gate number size repaints SVG immediately');
    assert.equal(await page.locator('#bodygraph-container .bg-svg-wrap').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(229, 238, 247)', 'BodyGraph background updates immediately');
    const centerColor = () => page.locator('#bodygraph-container radialGradient[id$="-cg-g"] stop[offset="1"]').getAttribute('stop-color');
    const classicCenter = await centerColor();
    await preset('chakra');
    assert.equal(await page.locator('html').getAttribute('data-hd-skin'), 'chakra');
    assert.notEqual(await centerColor(), classicCenter, 'Chakra changes center color');
    assert.notEqual(await value('design'), custom.design, 'Classic overrides do not leak into Chakra');
    await setValue('design', '#b04717');
    await preset('classic');
    assert.equal(await value('design'), custom.design, 'Classic overrides survive preset changes');
    assert.equal(await centerColor(), classicCenter, 'Switching back restores Classic center color');
    await switchTheme();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.notEqual(await value('design'), custom.design, 'Light overrides do not leak into Dark');
    await setValue('design', '#a1b2c3');
    await switchTheme();
    assert.equal(await value('design'), custom.design, 'Light overrides survive theme changes');
    await page.keyboard.press('Escape');
    await page.reload({ timeout: 60000 });
    await page.locator('#bodygraph-container .bodygraph-svg').waitFor({ timeout: 60000 });
    await openSettings();
    for (const [key, next] of Object.entries(custom)) assert.equal(await value(key), next, `${key} persists across reload`);
    await page.locator('#appearance-restore').click();
    for (const [key, initial] of Object.entries(defaults)) assert.equal(await value(key), initial, `${key} restored to active preset default`);
    await preset('chakra');
    assert.equal(await value('design'), '#b04717', 'Restore affects only current preset/theme');
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
