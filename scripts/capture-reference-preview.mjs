import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const base = process.env.PREVIEW_URL || 'http://127.0.0.1:5186';
const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/capture-reference-preview.mjs OUTPUT_DIR');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1380, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await page.goto(base);
    await page.locator('#birth-entry:not(.hidden)').waitFor();
    await page.screenshot({ path: `${output}/${name}-entry.png`, fullPage: true });
    await page.goto(`${base}/?d=1990-06-15&t=14%3A30&tz=-6`);
    await page.locator('#chart-view:not(.hidden) .bodygraph-svg').waitFor();
    await page.screenshot({ path: `${output}/${name}-chart.png`, fullPage: true });
    await page.locator('.bg-gate[data-gate="34"]').click();
    await page.locator('#gate-detail:not(.hidden)').waitFor();
    await page.screenshot({ path: `${output}/${name}-detail.png` });
    await page.keyboard.press('Escape');
    await page.locator('.nav-link[data-view="transits"]').click();
    await page.locator('#transit-bodygraph .bodygraph-svg').waitFor();
    await page.screenshot({ path: `${output}/${name}-transits.png`, fullPage: true });
    await page.locator('.nav-link[data-view="timeline"]').click();
    await page.locator('#timeline-view:not(.hidden)').waitFor();
    await page.screenshot({ path: `${output}/${name}-timeline.png` });
    if (await page.locator('.nav-link[data-view="library"]').count()) {
      await page.goto(`${base}/#library`);
      await page.locator('#library-view:not(.hidden)').waitFor();
      await page.screenshot({ path: `${output}/${name}-library.png`, fullPage: true });
      await page.goto(`${base}/#library/gate/34`);
      await page.locator('#reference-detail .gate-detail-line').first().waitFor();
      await page.screenshot({ path: `${output}/${name}-library-gate.png`, fullPage: true });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
