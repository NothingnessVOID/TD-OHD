import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const repo=path.resolve(import.meta.dirname, '../../..');
const mode=process.argv[2]||'after';
if (!['before','original','after'].includes(mode)) throw new Error('Choose before, original or after');
mkdirSync(`${repo}/docs/frontend-runtime-ux-v1/mobile-floating/${mode}`, {recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chromium'});
const context=await browser.newContext({isMobile:true,hasTouch:true,locale:'zh-CN',viewport:{width:390,height:844}});
const page=await context.newPage();
await page.clock.setFixedTime(new Date('2026-10-01T06:07:53Z'));
await page.goto(`${process.env.E2E_URL || 'http://127.0.0.1:5230'}/?d=1990-06-15&t=14:30&tz=8&n=Mobile%20Demo&view=timeline`);
await page.waitForFunction(()=>document.querySelector('#timeline-view .tl-table')?.getAttribute('aria-busy')==='false' && document.querySelector('#timeline-view .bg-center'),null,{timeout:120000});
// Review fixtures only: reconstruct each reviewed CSS/markup snapshot in an isolated page.
// No production source or installation is changed. The calculation/input stays identical.
if(mode!=='after') {
 let css=execFileSync('git',['show',`${mode==='before' ? '9ebdbbaaa1fe7bac78cccfa3850ee0c25a34ae2e' : '2bc308b7a9037a10bae92fff6c9ff536a276b8ae'}:src/features/transit-timeline/timeline.css`],{cwd:repo,encoding:'utf8'}).replaceAll('(--phone)','(max-width: 640px)').replaceAll('(--above-phone)','(min-width: 641px)');
 await page.evaluate(({css,mode})=>{
 const style=[...document.querySelectorAll('style[data-vite-dev-id]')].find(n=>n.dataset.viteDevId.endsWith('/transit-timeline/timeline.css'));
 style.textContent=css;
 const root=document.querySelector('#timeline-view');
 const bar=root.querySelector('.tl-mobile-control-bar'); if(bar)bar.replaceWith(...bar.childNodes);
 if(mode==='before') {
 const wrapper=document.createElement('div'); wrapper.className='tl-mobile-control-bar';
 const trigger=root.querySelector('.tl-mobile-controls-trigger'); trigger.before(wrapper);
 wrapper.append(trigger,root.querySelector('.tl-mobile-range'),root.querySelector('.tl-mobile-event-nav'));
 }
 },{css,mode});
}
const metrics=[];
for (const [width,height] of [[390,844],[375,667],[360,640],[320,568]]) {
 await page.setViewportSize({width,height});
 await page.screenshot({path:`${repo}/docs/frontend-runtime-ux-v1/mobile-floating/${mode}/timeline-${width}.png`});
 metrics.push(await page.evaluate(()=>{const box=s=>{const r=document.querySelector(s.startsWith('#') ? s : `#timeline-view ${s}`).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {width:innerWidth,height:innerHeight,stage:box('.tl-stage'),graph:box('.tl-graph-panel'),svg:box('#timeline-view .bodygraph-svg'),tracks:box('.tl-tracks-panel'),transit:box('.tl-transit-column'),birth:box('.tl-birth-column')}}));
}
writeFileSync(`${repo}/docs/frontend-runtime-ux-v1/mobile-floating/${mode}/geometry.json`,JSON.stringify(metrics,null,2)+'\n');
await browser.close();
if (mode === 'after') {
 const dir=`${repo}/docs/frontend-runtime-ux-v1/mobile-floating`;
 const original=JSON.parse(readFileSync(`${dir}/original/geometry.json`));
 const before=JSON.parse(readFileSync(`${dir}/before/geometry.json`));
 const comparison=metrics.map((after,i)=>{
   for(const field of ['stage','graph','svg','tracks'])
     if(JSON.stringify(after[field])!==JSON.stringify(original[i][field])) throw new Error(`Original geometry changed at ${after.width}px: ${field}`);
   return {viewport:[after.width,after.height],originalPane:original[i].stage,originalSvg:original[i].svg,
     previousWrongSvg:before[i].svg,restoredSvg:after.svg,exactOriginalGeometry:true};
 });
 writeFileSync(`${dir}/comparison.json`,JSON.stringify(comparison,null,2)+'\n');
 console.log('Restored pane and SVG geometry exactly matches all four original snapshots.');
}
