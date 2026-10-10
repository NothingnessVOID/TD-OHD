import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.E2E_URL||'http://127.0.0.1:19964';
const out=path.resolve(process.env.SCREENSHOT_DIR||'artifacts/visual-review/penta-restoration');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-CN',reducedMotion:'reduce'});
try{
 await page.goto(base+'/dev/test-people.html');await page.locator('#import:not([disabled])').click();await page.goto(base);
 const context=await page.evaluate(async()=>{
  const {listPeople,birthFromPerson}=await import('/src/lib/people.js');const {computeChart}=await import('/src/lib/chartdata.js');const {analyzePentaStructure}=await import('/src/lib/human-design/penta-structure.js');
  const selected=listPeople().filter(p=>/^td-ohd-fictional-0[1-5]$/.test(p.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const people=selected.map((p,i)=>({memberId:'visual-member-'+(i+1),personId:p.id,displayName:p.name,timeUnknown:p.timeUnknown}));
  const charts=await Promise.all(selected.map(async(p,i)=>({memberId:people[i].memberId,chart:(await computeChart(birthFromPerson(p))).chart})));
  return {people,result:analyzePentaStructure(charts),groupLabel:'Penta A'};
 });
 await writeFile(path.join(out,'same-activation-context.json'),JSON.stringify(context,null,2));
 const revisions=process.env.HISTORY_ONLY==='false'?['working']:['fe4e5fd','aa345313','8d9d141','working'];
 for(const rev of revisions){
  const p=await browser.newPage({viewport:{width:640,height:820},locale:'zh-CN',reducedMotion:'reduce'});await p.goto(base);
  if(rev!=='working'){
   const code=execFileSync('git',['show',`${rev}:src/views/penta-matrix.js`],{encoding:'utf8'}).replace("import '../styles/penta-matrix.css';",'');
   await p.route('**/src/views/__history-penta.js',route=>route.fulfill({contentType:'text/javascript',body:code}));
  }
  await p.evaluate(async({context,rev})=>{
   document.querySelector('#team-view').remove();document.querySelectorAll('body > *').forEach(n=>n.style.display='none');
   const host=document.createElement('section');host.id='team-view';host.innerHTML='<div id="history-graph"></div><div id="history-analysis" hidden></div>';document.body.append(host);
   const {createPentaMatrix}=await import(rev==='working'?'/src/views/penta-matrix.js':'/src/views/__history-penta.js');
   createPentaMatrix(document.querySelector('#history-graph'),{...context,analysisContainer:document.querySelector('#history-analysis')});
  },{context,rev});
  if(rev!=='working')await p.addStyleTag({content:execFileSync('git',['show',`${rev}:src/styles/penta-matrix.css`],{encoding:'utf8'})});
  if(rev==='8d9d141')await p.addStyleTag({content:execFileSync('git',['show',`${rev}:src/styles/tokens/team.css`],{encoding:'utf8'})});
  await p.addStyleTag({content:'#team-view{width:100%;padding:20px;max-width:none} #history-graph .penta-canvas{width:440px!important;height:563.75px!important;max-width:none!important;margin:0 auto!important} #history-graph .penta-figure-space{display:block;container-type:normal}'});
  await p.locator('.penta-canvas').screenshot({path:path.join(out,`graph-${rev}.png`),animations:'disabled'});
  await p.close();
 }
 console.log('Same five fictional people and identical calculated context captured for '+revisions.join(', '));
}finally{await browser.close();}
