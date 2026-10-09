import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='/Users/abyssldx/Desktop/OH-WorkSpace/TD-OHD-ink-v2-review';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{
 for(const [version,url] of [['before','http://127.0.0.1:5245'],['after','http://127.0.0.1:5244']])for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}});await page.goto(url+'/?d=2000-05-10&t=12:30&tz=8');await page.locator('#foundation-panel .reliability').waitFor({timeout:120000});
 const skins=await page.evaluate(async()=> (await import('/src/lib/skin-registry.js')).SKINS.map(s=>s.id));
 for(const skin of skins){
 const data=await page.evaluate(async({skin,version})=>{
  const a=await import('/src/lib/appearance.js');a.setSkin(skin);a.setCenterPalette('classic');a.restoreCurrentSkin();
  const {renderBodygraph}=await import('/src/bodygraph.js');const {CHANNELS}=await import('/src/lib/human-design/catalog.js');
  // Fixed structural fixture supplements the identical real birth data. It explicitly covers
  // P 34, D 10, P+D 20, and inactive 15 inside the defined G center.
  const chart={gates:{all:[10,20,34,59,43],personality:{sun:{gate:34,line:1},earth:{gate:20,line:2},moon:{gate:59,line:3}},design:{sun:{gate:10,line:1},earth:{gate:20,line:4},moon:{gate:43,line:2}}},channels:CHANNELS.filter(c=>c.gates.every(g=>[10,20,34,59,43].includes(g))),centers:{definedNames:['sacral','g','throat']}};
  let frame=document.querySelector('#ink-review');if(!frame){frame=document.createElement('section');frame.id='ink-review';document.body.append(frame);}frame.style.cssText='width:min(720px,100%);margin:auto;background:var(--bg-elevated);padding:8px';frame.innerHTML='<p style="font-size:13px;color:var(--text)">'+skin+' · '+version+' · Classic · P34 / D10 / Both20 / Inactive15</p><div id="ink-graph"></div>';
  renderBodygraph(frame.querySelector('#ink-graph'),chart,{animate:false,planetColumns:false});frame.scrollIntoView();
  const s=getComputedStyle(document.documentElement),active=s.getPropertyValue('--hd-gate-active-ink').trim(),inactive=s.getPropertyValue('--hd-gate-inactive-ink').trim();
  return {skin,active,inactive,gates:[...frame.querySelectorAll('.bg-gate')].map(n=>({gate:n.dataset.gate,active:chart.gates.all.includes(Number(n.dataset.gate)),fill:n.querySelector('text').getAttribute('fill'),backed:!!n.querySelector('.bg-gate-number-backing')}))};
 },{skin,version});records.push({...data,version,width});await page.locator('#ink-review').screenshot({path:`${out}/${skin}-${width}-${version}.png`});
 await page.locator('#bodygraph-container').screenshot({path:`${out}/${skin}-${width}-${version}-real-birth.png`});
 }
 await page.close();
 }
 writeFileSync(out+'/ink-results.json',JSON.stringify(records,null,2));console.log('PASS 11 Skins × before/after × desktop/mobile, fixed Classic palette, real birth and explicit source fixture');
}finally{await browser.close();}
