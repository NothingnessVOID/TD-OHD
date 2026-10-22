// Identity-band overflow check + screenshots for the two authorities whose track
// has no anchor. Measures scrollWidth vs clientWidth, because "looks fine in the
// screenshot" is what let the note run past the band's edge in the first place.
//
//   node tests/panel-graphics-band-overflow.mjs <outDir> [url]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PROFILE_STORAGE_KEY } from '../src/lib/profile-storage.js';

const outDir = resolve(process.argv[2] || 'band-overflow');
const url = process.argv[3] || 'http://127.0.0.1:5216/';
const PROFILES = {
  mental: { id: 'band-mental', name: 'M', birthDate: '1985-03-07', birthTime: '09:00',
    location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 } },
  reflector: { id: 'band-reflector', name: 'R', birthDate: '1988-03-18', birthTime: '15:00',
    location: { name: 'London', iana: 'Europe/London', lat: 51.5072, lon: -0.1276, timezone: 0 } }
};
const SIZES = [{ w: 1440, h: 900 }, { w: 641, h: 800 }, { w: 390, h: 844 }];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
for (const [name, profile] of Object.entries(PROFILES)) {
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.addInitScript(({ stored, key }) => {
      localStorage.setItem(key, JSON.stringify([stored]));
      localStorage.setItem('ohd-last-person-id', stored.id);
      localStorage.setItem('ohd-language', 'zh-CN');
    }, { stored: profile, key: PROFILE_STORAGE_KEY });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.bg-svg-wrap svg', { timeout: 120000 });
    await page.waitForTimeout(400);
    const measured = await page.evaluate(() => {
      const band = document.querySelector('#foundation-panel .panel-foundation-band');
      const panel = document.getElementById('foundation-panel');
      const stats = document.querySelector('#foundation-panel .pg-band-stats');
      const explain = document.querySelector('#foundation-panel .pg-band-explain');
      const box = node => node ? { scroll: node.scrollWidth, client: node.clientWidth } : null;
      return {
        band: box(band), panel: box(panel), stats: box(stats),
        explainText: explain?.textContent?.trim() ?? null,
        explainBox: explain ? (() => {
          const range = document.createRange();
          range.selectNodeContents(explain);
          const rect = range.getBoundingClientRect();
          const bandRect = band.getBoundingClientRect();
          return { right: Math.round(rect.right), bandRight: Math.round(bandRect.right) };
        })() : null
      };
    });
    const overflow = (measured.band && measured.band.scroll > measured.band.client + 1)
      || (measured.panel && measured.panel.scroll > measured.panel.client + 1)
      || (measured.explainBox && measured.explainBox.right > measured.explainBox.bandRight + 1);
    await page.screenshot({ path: join(outDir, `${size.w}-${name}.png`), fullPage: true });
    report.push({ profile: name, viewport: `${size.w}x${size.h}`, overflow, ...measured });
    await context.close();
  }
}
await browser.close();
writeFileSync(join(outDir, 'band-overflow.json'), JSON.stringify(report, null, 1));
for (const row of report) {
  const band = row.band ?? {};
  console.log(`${row.viewport.padEnd(9)} ${row.profile.padEnd(10)} band ${band.scroll}/${band.client}  panel ${row.panel?.scroll}/${row.panel?.client}  textRight<=${row.explainBox ? row.explainBox.bandRight : '-'}  ${row.overflow ? 'OVERFLOW' : 'ok'}`);
}
process.exit(report.some(row => row.overflow) ? 1 : 0);
