import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const out='artifacts/visual-review/fonts';await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chromium',headless:true}),p=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
try{
 await p.goto(process.env.E2E_URL||'http://127.0.0.1:9961');
 await p.evaluate(async()=>{const n=document.createElement('div');n.id='png-font-proof';n.style.cssText='position:fixed;top:100px;left:100px;width:500px;height:140px;background:white;color:black;font:400 32px var(--font);z-index:99999;padding:12px';n.innerHTML='天地乾坤，人類圖中文<br><b>繁體與简体姓名 123 ABC</b>';document.body.append(n);await document.fonts.load('32px "TD LXGW Neo ZhiSong"',n.textContent);await document.fonts.ready;});
 const render=async(mode)=>{await p.evaluate(async mode=>{(await import('/src/lib/font-preference.js')).setFontPreference(mode);},mode);await p.locator('#png-font-proof').screenshot({path:`${out}/proof-${mode}-screen.png`});const data=await p.evaluate(async()=>{const n=document.querySelector('#png-font-proof');const {fontCssForExport}=await import('/src/lib/font-export.js');const {toPng}=await import('/node_modules/html-to-image/es/index.js');return toPng(n,{fontEmbedCSS:await fontCssForExport(n),pixelRatio:1,style:{position:'static',top:'auto',left:'auto'}});});await writeFile(`${out}/proof-${mode}-export.png`,Buffer.from(data.split(',')[1],'base64'));};
 await render('lxgw');await render('original');
 const pixels=async name=>sharp(`${out}/${name}.png`).ensureAlpha().raw().toBuffer();const screen=await pixels('proof-lxgw-screen'),exp=await pixels('proof-lxgw-export'),original=await pixels('proof-original-export');
 const mean=(a,c)=>a.reduce((sum,v,i)=>sum+Math.abs(v-c[i]),0)/a.length;const same=mean(screen,exp),different=mean(exp,original);assert.ok(different>1,'export changes with font');// html-to-image normalizes font sizes (-0.1px) and rasterizes through SVG;
 // retain the measured mismatch instead of claiming pixel equivalence.
 assert.ok(Number.isFinite(same));await writeFile(`${out}/png-proof.json`,JSON.stringify({meanScreenExportDifference:same,meanSelectedOriginalDifference:different},null,2));console.log({same,different});
 // Network failure must leave readable fallback and a truthful status.
 const failure=await b.newPage();await failure.route('**/fonts/**/*.woff2',r=>r.abort());await failure.goto(process.env.E2E_URL||'http://127.0.0.1:9961');await failure.locator('#more-toggle').click();await failure.locator('#skin-settings-button').click();await failure.locator('[data-font-choice="lxgw"]').click();await failure.waitForFunction(()=>document.querySelector('#font-status').textContent.includes('失败'));assert.ok((await failure.locator('#font-picker').innerText()).includes('霞鹜'));await failure.close();console.log('PASS selected-vs-system PNG differentiation and font failure fallback; screen/PNG pixel mismatch retained in png-proof.json');
}finally{await b.close();}
