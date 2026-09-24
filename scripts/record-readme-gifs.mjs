/** Record README demos from an isolated browser profile and a synthetic chart.
 * Start Vite first: npm run dev -- --host 127.0.0.1 --port 5207 --strictPort
 * Then: node scripts/record-readme-gifs.mjs
 * Requires Google Chrome and ffmpeg. Never attaches to an existing browser.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const run = promisify(execFile);
const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:5207';
assert.match(base, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/, 'Demos may only record a local server');
const output = fileURLToPath(new URL('../docs/assets/', import.meta.url));
const fixture = '?d=2000-01-01&t=12:00&tz=0&n=Demo%20Chart';
const fps = 8;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const temp = await mkdtemp(join(tmpdir(), 'td-ohd-readme-gifs-'));

async function newPage(view) {
  const context = await browser.newContext({
    viewport: { width: 1150, height: 760 }, deviceScaleFactor: 1,
    colorScheme: 'light', reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('ohd-language', 'zh-CN');
  });
  const page = await context.newPage();
  await page.goto(`${base}/${fixture}&view=${view}`);
  await page.waitForSelector(`#${view === 'timeline' ? 'timeline-view' : 'transits-view'}:not(.hidden)`);
  await page.evaluate(() => {
    const pointer = document.createElement('div');
    pointer.id = 'readme-demo-pointer';
    pointer.style.cssText = 'position:fixed;left:-40px;top:-40px;width:18px;height:18px;border:2px solid #fff;background:#b55f12;border-radius:50%;box-shadow:0 1px 5px #0009;z-index:99999;pointer-events:none;transform:translate(-50%,-50%)';
    document.body.append(pointer);
  });
  return { context, page };
}

async function pointer(page, x, y) {
  await page.mouse.move(x, y);
  await page.evaluate(([left, top]) => {
    const node = document.getElementById('readme-demo-pointer');
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
  }, [x, y]);
}

async function recorder(name, page) {
  const directory = join(temp, name);
  await mkdir(directory);
  let index = 0;
  return {
    shot: async (frames = 1) => {
      for (let i = 0; i < frames; i++) {
        await page.screenshot({ path: join(directory, `frame-${String(index++).padStart(3, '0')}.png`), animations: 'disabled' });
      }
    },
    finish: async () => {
      const input = join(directory, 'frame-%03d.png');
      const palette = join(directory, 'palette.png');
      const gif = join(output, `${name}.gif`);
      await run('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', input,
        '-vf', 'fps=8,scale=960:-1:flags=lanczos,palettegen=stats_mode=diff', palette]);
      await run('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', input, '-i', palette,
        '-filter_complex', '[0:v]fps=8,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5',
        '-loop', '0', gif]);
      console.log(`${gif} (${index} frames)`);
    },
  };
}

async function timeline() {
  const { context, page } = await newPage('timeline');
  const field = name => `#timeline-view [data-field="${name}"]`;
  const ready = () => page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false', null, { timeout: 120000 });
  await ready();
  await page.fill(field('date'), '2026-05-01');
  await page.locator(field('date')).dispatchEvent('change');
  await ready();
  await page.fill(field('time'), '12:00:00');
  await page.locator(field('time')).dispatchEvent('change');
  await ready();
  await page.selectOption(field('span'), '3');
  await ready();
  const rec = await recorder('timeline-demo', page);
  await rec.shot(7);

  const box = await page.locator('#timeline-view .tl-row .tl-track').first().boundingBox();
  assert.ok(box?.width > 100, 'timeline track is visible');
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width * 0.25;
  const x1 = box.x + box.width * 0.73;
  await pointer(page, x0, y);
  await page.mouse.down();
  for (let i = 0; i <= 18; i++) {
    await pointer(page, x0 + (x1 - x0) * i / 18, y);
    await page.waitForTimeout(45);
    await rec.shot();
  }
  await page.mouse.up();
  await rec.shot(5);

  await page.selectOption(field('span'), '1');
  await ready();
  await rec.shot(7);
  const bar = page.locator('#timeline-view .tl-bar:not([data-source="natal"])').first();
  await bar.scrollIntoViewIfNeeded();
  const barBox = await bar.boundingBox();
  assert.ok(barBox, 'a transit interval is visible');
  await pointer(page, barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
  await bar.click();
  await page.waitForSelector('#gate-detail:not(.hidden)');
  await rec.shot(11);
  await page.keyboard.press('Escape');
  await rec.shot(4);
  await rec.finish();
  await context.close();
}

async function transitModes() {
  const { context, page } = await newPage('transits');
  await page.waitForSelector('#transit-bodygraph .bodygraph-svg');
  await page.fill('#transit-date', '2026-05-01');
  await page.locator('#transit-date').dispatchEvent('change');
  await page.fill('#transit-time', '12:00');
  await page.locator('#transit-time').dispatchEvent('change');
  await page.waitForSelector('#transit-content .transit-completion');
  const rec = await recorder('transit-modes-demo', page);
  await rec.shot(9);
  for (const mode of ['transit-only', 'overlay']) {
    const label = page.locator(`.transit-mode-switch label:has(input[value="${mode}"])`);
    const box = await label.boundingBox();
    assert.ok(box, `${mode} button is visible`);
    await pointer(page, box.x + box.width / 2, box.y + box.height / 2);
    await rec.shot(2);
    await label.click();
    await rec.shot(11);
  }
  await rec.finish();
  await context.close();
}

try {
  await mkdir(output, { recursive: true });
  await timeline();
  await transitModes();
} finally {
  await browser.close();
  await rm(temp, { recursive: true, force: true });
}
