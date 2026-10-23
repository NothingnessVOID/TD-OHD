/**
 * Before / after comparison sheets for issue #34.
 *
 *   node make-gallery.mjs <beforeDir> <afterDir> <outDir>
 *
 * Pairs are matched by file name, so both directories must have been shot with
 * the same sizes, tabs, skins and synthetic profile. Each pair is laid out side
 * by side in a real HTML page and screenshotted, which keeps the two halves at
 * identical scale — resizing them independently would misrepresent the density
 * difference, which is the whole point of the comparison.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, readdirSync, createReadStream, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const [, , beforeArg, afterArg, outArg] = process.argv;
if (!beforeArg || !afterArg || !outArg) {
  console.error('usage: node make-gallery.mjs <beforeDir> <afterDir> <outDir>');
  process.exit(2);
}
const beforeDir = resolve(beforeArg);
const afterDir = resolve(afterArg);
const outDir = resolve(outArg);
mkdirSync(outDir, { recursive: true });

const SIZES = ['1440x900', '1024x800', '641x800', '390x844'];
const TABS = ['centers', 'channels', 'gates', 'planets', 'variable', 'cross'];
const TAB_ZH = {
  centers: '能量中心', channels: '通道', gates: '闸门',
  planets: '行星', variable: '四箭头', cross: '化身十字'
};
const SIZE_ZH = {
  '1440x900': '宽屏 1440（右栏 800px）',
  '1024x800': '中档 1024（右栏 561px）',
  '641x800': '窄栏 641（右栏 301px）',
  '390x844': '手机 390（右栏 370px）'
};
// One sheet per viewport, six tabs stacked: a single image the user can scroll
// instead of 24 separate files to open.
const SKIN = '';

const pairs = [];
for (const size of SIZES) {
  for (const tab of TABS) {
    const name = `${size}-${tab}${SKIN}.png`;
    const before = join(beforeDir, name);
    const after = join(afterDir, name);
    if (!existsSync(before) || !existsSync(after)) {
      console.log(`skip (missing): ${name}`);
      continue;
    }
    pairs.push({ size, tab, before, after, name });
  }
}
if (!pairs.length) { console.error('no pairs found'); process.exit(1); }

// Chromium blocks file:// subresources from a setContent page (opaque origin),
// so the sheets are served over a throwaway local http server instead.
const roots = new Map([[beforeDir, 'before'], [afterDir, 'after']]);
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname).replace(/^\//, '');
  const [which, ...rest] = url.split('/');
  const root = which === 'before' ? beforeDir : which === 'after' ? afterDir : null;
  if (!root) { res.writeHead(404).end('nope'); return; }
  const file = join(root, ...rest);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404).end('nope'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
const src = (kind, name) => `http://127.0.0.1:${port}/${kind}/${name}`;
for (const pair of pairs) {
  pair.beforeUrl = src('before', pair.name);
  pair.afterUrl = src('after', pair.name);
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 32px 40px; background: #f4f2ee; color: #23211d;
         font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .02em; }
  .sub { font-size: 13px; color: #6d675e; margin: 0 0 26px; }
  .group { margin-bottom: 40px; }
  .group > h2 { font-size: 17px; margin: 0 0 14px; padding-bottom: 8px;
                border-bottom: 1px solid #d8d3c9; }
  .row { margin-bottom: 30px; }
  .row > h3 { font-size: 14px; margin: 0 0 8px; color: #4a453d; font-weight: 600; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
  figure { margin: 0; background: #fff; border: 1px solid #ddd8ce; border-radius: 6px;
           padding: 8px; }
  figcaption { font-size: 12px; color: #6d675e; margin-bottom: 6px; font-weight: 600; }
  figcaption .tag { display: inline-block; padding: 1px 7px; border-radius: 3px;
                    margin-right: 6px; font-size: 11px; }
  .before .tag { background: #e6e1d8; color: #4a453d; }
  .after .tag { background: #cfe3d4; color: #2c5138; }
  img { display: block; width: 100%; height: auto; }
</style></head><body>
<h1>人类图右侧栏图形化重构 · 前后对比</h1>
<p class="sub">Issue #34 · 同一份合成出生资料（1979-11-04 06:05 London）· 同一套皮肤与视口 · 左为改造前（#33 基线），右为改造后 · 均为真实页面渲染截图，非 AI 生图</p>
${SIZES.map(size => {
  const rows = pairs.filter(p => p.size === size);
  if (!rows.length) return '';
  return `<div class="group"><h2>${SIZE_ZH[size] || size}</h2>${rows.map(p => `
  <div class="row"><h3>${TAB_ZH[p.tab] || p.tab}</h3><div class="pair">
    <figure class="before"><figcaption><span class="tag">改造前</span>#33 基线</figcaption>
      <img src="${p.beforeUrl}" alt="改造前 ${p.tab}"></figure>
    <figure class="after"><figcaption><span class="tag">改造后</span>#34 图形化</figcaption>
      <img src="${p.afterUrl}" alt="改造后 ${p.tab}"></figure>
  </div></div>`).join('')}</div>`;
}).join('')}
</body></html>`;

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  // Wait for every image to decode so no panel is blank in the sheet.
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; }))));
  const missing = await page.evaluate(() =>
    [...document.images].filter(img => !img.naturalWidth).map(img => img.getAttribute('src')));
  if (missing.length) { console.error('images failed to load:', missing); process.exit(1); }
  const out = join(outDir, 'before-after-all.png');
  await page.screenshot({ path: out, fullPage: true });
  console.log(`pairs: ${pairs.length} -> ${out}`);

  // Per-viewport sheets too, so the user can open just the one they care about.
  for (const size of SIZES) {
    const rows = pairs.filter(p => p.size === size);
    if (!rows.length) continue;
    const single = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px 28px 32px; background: #f4f2ee; color: #23211d;
             font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif; }
      h1 { font-size: 19px; margin: 0 0 20px; }
      .row { margin-bottom: 26px; }
      .row > h3 { font-size: 14px; margin: 0 0 8px; color: #4a453d; font-weight: 600; }
      .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
      figure { margin: 0; background: #fff; border: 1px solid #ddd8ce; border-radius: 6px; padding: 8px; }
      figcaption { font-size: 12px; color: #6d675e; margin-bottom: 6px; font-weight: 600; }
      figcaption .tag { display: inline-block; padding: 1px 7px; border-radius: 3px; margin-right: 6px; font-size: 11px; }
      .before .tag { background: #e6e1d8; color: #4a453d; }
      .after .tag { background: #cfe3d4; color: #2c5138; }
      img { display: block; width: 100%; height: auto; }
    </style></head><body><h1>${SIZE_ZH[size] || size} · 改造前（左）／改造后（右）</h1>
    ${rows.map(p => `<div class="row"><h3>${TAB_ZH[p.tab] || p.tab}</h3><div class="pair">
      <figure class="before"><figcaption><span class="tag">改造前</span>#33 基线</figcaption><img src="${p.beforeUrl}"></figure>
      <figure class="after"><figcaption><span class="tag">改造后</span>#34 图形化</figcaption><img src="${p.afterUrl}"></figure>
    </div></div>`).join('')}</body></html>`;
    const p2 = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1 });
    await p2.setContent(single, { waitUntil: 'load' });
    await p2.evaluate(() => Promise.all([...document.images].map(img =>
      img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; }))));
    const out2 = join(outDir, `before-after-${size}.png`);
    await p2.screenshot({ path: out2, fullPage: true });
    console.log(`  ${size}: ${rows.length} pairs -> ${out2}`);
    await p2.close();
  }
} finally {
  await browser.close();
  server.close();
}
