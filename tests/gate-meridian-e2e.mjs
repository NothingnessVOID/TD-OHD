import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_URL || 'http://127.0.0.1:5186';
const birth = '?d=2000-05-10&t=12%3A30&tz=8';
const explanation = '第24闸门对应《易经》地雷复。其上卦为坤 ☷，属阴土，对应足太阴脾经；下卦为震 ☳，五行属木。足太阴脾经属于阴经，阴经之木对应井穴，因此定位至隐白穴。';

async function assertGate24(reading) {
  await reading.waitFor();
  assert.equal(await reading.getAttribute('aria-label'), '经络穴位');
  assert.deepEqual(await reading.locator('.meridian-core-item').evaluateAll(items => items.map(item => ({
    label: item.querySelector('.meridian-label')?.textContent.trim(),
    value: item.querySelector('.meridian-value')?.textContent.trim() ?? item.querySelector('p')?.textContent.trim(),
  }))), [
    { label: '对应经络', value: '足太阴脾经' },
    { label: '对应穴位', value: '隐白穴' },
    { label: '穴位位置', value: '大趾末节内侧，趾甲根角侧后方约0.1寸。' },
  ]);
  assert.deepEqual(await reading.locator('.meridian-relation').evaluateAll(items => items.map(item => ({
    label: item.querySelector('.meridian-label')?.textContent.trim(),
    main: item.querySelector('.meridian-relation-main')?.textContent.trim(),
    sub: item.querySelector('.meridian-relation-sub')?.textContent.trim() ?? null,
  }))), [
    { label: '上卦', main: '坤 ☷', sub: '阴土 · 足太阴脾经' },
    { label: '下卦', main: '震 ☳', sub: '木' },
    { label: '五输穴', main: '井穴', sub: null },
    { label: '最终定位', main: '隐白穴', sub: null },
  ]);
  assert.equal(await reading.locator('.meridian-explanation p').innerText(), explanation);
}

async function assertSwitcherLayout(switcher, width) {
  assert.deepEqual(await switcher.locator('button').allInnerTexts(),
    ['详细信息', '六爻解读', '基因天赋', '经络穴位']);
  const layout = await switcher.evaluate(node => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
    rows: [...node.querySelectorAll('button')].map(button => Math.round(button.getBoundingClientRect().top)),
  }));
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, `lens switcher overflows at ${width}px`);
  if (width <= 400) {
    assert.equal(layout.rows[0], layout.rows[1], 'mobile first lens row');
    assert.equal(layout.rows[2], layout.rows[3], 'mobile second lens row');
    assert.ok(layout.rows[0] < layout.rows[2], 'mobile lenses use two rows');
  } else {
    assert.equal(new Set(layout.rows).size, 1, 'desktop lenses remain on one row');
  }
}

async function checkLenses({ switcher, reading, attribute }) {
  const button = lens => switcher.locator(`[${attribute}="${lens}"]`);
  await button('meridian').click();
  await assertGate24(reading.locator('.meridian-reading'));
  assert.equal(await button('meridian').getAttribute('class'), 'active');

  await button('hd').click();
  assert.equal(await reading.locator('.gate-detail-line').count(), 6);
  await button('iching').click();
  assert.equal(await reading.locator('.gate-detail-line').count(), 6);
  await button('gk').click();
  await reading.locator('.gk-spectrum').waitFor();
  assert.equal(await reading.locator('.meridian-reading').count(), 0);

  await button('meridian').click();
  await assertGate24(reading.locator('.meridian-reading'));
}

const browser = await chromium.launch(process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH, headless: true }
  : { channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });

try {
  for (const width of [1380, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${base}/#library/gate/24`);
    await page.locator('#reference-detail h2').waitFor();
    // Exercise locale redraw while the mobile reference detail overlay stays open.
    if (!(await page.locator('#more-menu').evaluate(node => node.open))) await page.locator('#more-toggle').evaluate(node => node.click());
    await page.locator('#language-switcher').selectOption('zh-CN');
    const librarySwitch = page.locator('#reference-detail .gate-lens-switch');
    const libraryReading = page.locator('#reference-detail .reference-reading');
    await assertSwitcherLayout(librarySwitch, width);
    await checkLenses({ switcher: librarySwitch, reading: libraryReading, attribute: 'data-reference-lens' });
    if (width === 1380) {
      for (const [language, label] of [['zh-Hant', '經絡穴位'], ['en', 'Meridians & acupoints']]) {
        // Exercise locale redraw while the mobile reference detail overlay stays open.
    if (!(await page.locator('#more-menu').evaluate(node => node.open))) await page.locator('#more-toggle').evaluate(node => node.click());
        await page.locator('#language-switcher').selectOption(language);
        assert.equal(await librarySwitch.locator('[data-reference-lens="meridian"]').innerText(), label);
        await librarySwitch.locator('[data-reference-lens="meridian"]').click();
        assert.equal(await libraryReading.locator('.meridian-core-item--point .meridian-value').innerText(), '隐白穴');
      }
      // Exercise locale redraw while the mobile reference detail overlay stays open.
    if (!(await page.locator('#more-menu').evaluate(node => node.open))) await page.locator('#more-toggle').evaluate(node => node.click());
      await page.locator('#language-switcher').selectOption('zh-CN');
    }

    if (width < 600) {
      const lightPointBackground = await libraryReading.locator('.meridian-core-item--point')
        .evaluate(node => getComputedStyle(node).backgroundColor);
      await page.goto(`${base}/#library`);
      await page.locator('#more-toggle').click();
      await page.locator('#theme-toggle').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.goto(`${base}/#library/gate/24`);
      await assertGate24(libraryReading.locator('.meridian-reading'));
      const darkPointBackground = await libraryReading.locator('.meridian-core-item--point')
        .evaluate(node => getComputedStyle(node).backgroundColor);
      assert.notEqual(darkPointBackground, lightPointBackground, 'dark theme changes the reading surface');
      await assertSwitcherLayout(librarySwitch, width);
    }

    await page.goto(`${base}/${birth}`);
    await page.locator('#chart-view:not(.hidden) #bodygraph-container .bg-gate[data-gate="24"]').click();
    const chartSwitch = page.locator('#gate-detail:not(.hidden) .gate-lens-switch');
    const chartReading = page.locator('#gate-detail #lens-content');
    await assertSwitcherLayout(chartSwitch, width);
    await checkLenses({ switcher: chartSwitch, reading: chartReading, attribute: 'data-lens' });
    if (width < 600) assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.deepEqual(errors, [], `${width}px page errors`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1224, height: 703 } });
  for (const view of ['transits', 'timeline']) {
    await page.goto(`${base}/${birth}&view=${view}`);
    await page.locator(`#${view}-view .bg-gate[data-gate="24"]`).click();
    const switcher = page.locator('#gate-detail:not(.hidden) .gate-lens-switch');
    await assertSwitcherLayout(switcher, 1224);
    await switcher.locator('[data-lens="meridian"]').click();
    await assertGate24(page.locator('#gate-detail #lens-content .meridian-reading'));
  }
  await page.close();
  console.log('Gate 24 meridian lens passed in library, chart, transits and timeline, including mobile and dark mode.');
} finally {
  await browser.close();
}
