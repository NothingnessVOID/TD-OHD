/** Synthetic fixed-time screenshots; run against the task branch's preview. */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({ channel:process.env.CHROME_CHANNEL || 'chromium' });
const context = await browser.newContext({ viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN' });
try {
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-01T06:07:53Z'));
  await page.goto(`${process.env.E2E_URL || 'http://127.0.0.1:5230'}/?d=1990-06-15&t=14:30&tz=8&n=Mobile%20Demo&view=timeline`);
  await page.waitForFunction(() => document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy') === 'false' && document.querySelector('#timeline-view .bg-center'),null,{timeout:120000});
  const dir = import.meta.dirname;
  mkdirSync(dir,{recursive:true});
  for (const [width,height] of [[390,844],[375,667],[360,640],[320,568]]) {
    await page.setViewportSize({width,height});
    await page.mouse.move(1,1);
    await page.screenshot({path:`${dir}/timeline-${width}.png`});
  }
} finally { await browser.close(); }
