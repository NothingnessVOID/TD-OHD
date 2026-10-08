import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const evidence=process.env.CONTRAST_EVIDENCE_DIR || '/Users/abyssldx/Desktop/OH-WorkSpace/TD-OHD-contrast-evidence';
mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.goto((process.env.E2E_URL || 'http://127.0.0.1:5244')+'/?d=2000-05-10&t=12:30&tz=8');
 await page.locator('#foundation-panel .reliability').waitFor({timeout:120000});
 const rows=[];
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  await page.setViewportSize(viewport);
  const result=await page.evaluate(async()=>{
   const {SKINS}=await import('/src/lib/skin-registry.js');
   const {CENTER_PALETTES}=await import('/src/lib/center-palette-registry.js');
   const appearance=await import('/src/lib/appearance.js');
   const {renderBodygraph}=await import('/src/bodygraph.js');
   const {buildTransitGraph}=await import('/src/lib/transit-graph.js');
   const {CHANNELS}=await import('/src/lib/human-design/catalog.js');
   const {contrastRatio,resolveRGB}=await import('/src/lib/source-contrast.js');
   const make=(p,d)=>{const all=[...new Set([...p,...d])];const channels=CHANNELS.filter(c=>c.gates.every(g=>all.includes(g)));return {gates:{all,personality:Object.fromEntries(p.map((gate,i)=>['p'+i,{gate,line:1}])),design:Object.fromEntries(d.map((gate,i)=>['d'+i,{gate,line:2}]))},channels,centers:{definedNames:[...new Set(channels.flatMap(c=>c.centers))]}};};
   const chart=make([34,20,59],[10,20,43]), partner=make([34,57,6],[10,23]);
   const sky={sun:{gate:57,line:1},earth:{gate:34,line:2}};
   const container=document.createElement('section');container.id='contrast-fixture';container.style.cssText='width:min(850px,100%);margin:auto;background:var(--bg-elevated)';document.body.append(container);
   const token=n=>getComputedStyle(document.documentElement).getPropertyValue('--hd-'+n).trim();
   const paint=(value)=>{if(!value.startsWith('url('))return [value];const id=value.slice(5,-1);return [...container.querySelector('#'+CSS.escape(id)).querySelectorAll('rect')].map(n=>n.getAttribute('fill'));};
   const out=[];
   for(const skin of SKINS)for(const palette of CENTER_PALETTES)for(const custom of ['default','light','dark','opposite']) {
    appearance.setSkin(skin.id);appearance.setCenterPalette(palette.id);appearance.restoreCurrentSkin();
    if(custom!=='default')for(const [key,value] of Object.entries(custom==='light'?{personality:'#F9EED2',design:'#E6F9FA',transit:'#FAF5E7'}:custom==='dark'?{personality:'#090E18',design:'#190A11',transit:'#08191A'}:{personality:'#000000',design:'#FFFFFF',transit:'#FAF5E7'}))appearance.setCustomOverride(key,value);
    const fills=[token('personality'),token('design'),token('transit')];
    const modes={birth:{},overlay:{transitModel:buildTransitGraph(chart,sky)},sky:{transitModel:buildTransitGraph(chart,sky,'transit-only')},composite:{composite:{chartA:chart,chartB:partner,labelA:'A',labelB:'B',colorA:token('connection-a'),colorB:token('connection-b'),colorBridged:token('connection-bridged')}},compact:{compact:true}};
    for(const [mode,opts] of Object.entries(modes)){
     renderBodygraph(container,chart,{...opts,animate:false,planetColumns:false});
     let min=21, stripes=0,backed=0;
     for(const gate of container.querySelectorAll('.bg-gate')) {
      const text=gate.querySelector('text'),circle=gate.querySelector('.bg-gate-circle'),backing=gate.querySelector('.bg-gate-number-backing');
      const surfaces=backing?[backing.getAttribute('fill')]:text.dataset.numberBackground.split('|');
      const ratio=Math.min(...surfaces.map(fill=>contrastRatio(resolveRGB(getComputedStyle(text).fill),resolveRGB(fill))));
      if(ratio<4.5)throw Error(`${skin.id}/${palette.id}/${custom}/${mode}/${gate.dataset.gate}: ${ratio}`);
      min=Math.min(min,ratio);
      if(text.dataset.numberStriped==='true'){stripes++;if(backing)backed++;}
      if(backing && Number(backing.getAttribute('rx'))>=Number(circle.getAttribute('r')))throw Error('backing hides source perimeter');
     }
     const small=[];
     const style=getComputedStyle(document.documentElement);
     for(const source of ['personality','design','transit','birthPersonality','birthDesign','natal'])for(const surface of ['--bg','--bg-elevated','--hd-tooltip-bg']){
      const foreground=style.getPropertyValue(`--source-${source}-${surface==='--hd-tooltip-bg'?'tooltip-':''}text`).trim();
      const ratio=contrastRatio(resolveRGB(foreground),resolveRGB(style.getPropertyValue(surface)));
      if(ratio<4.5)throw Error(`${skin.id} ${source} ${surface} small text ${ratio}`);small.push(ratio);
     }
     if(JSON.stringify(fills)!==JSON.stringify([token('personality'),token('design'),token('transit')]))throw Error('source fill changed');
     out.push({skin:skin.id,palette:palette.id,custom,mode,min,stripes,backed,smallMin:Math.min(...small)});
    }
   }
   appearance.setSkin('default-light');appearance.setCenterPalette('classic');appearance.restoreCurrentSkin();
   return out;
  });
  rows.push(...result.map(r=>({...r,width:viewport.width})));
  // Representative difficult mixed stripes, with no source fill changes.
  for(const skin of ['default-light','default-dark','absolutely']) {
   await page.evaluate(async(skin)=>{
    const a=await import('/src/lib/appearance.js');a.setSkin(skin);a.setCustomOverride('personality','#000000');a.setCustomOverride('design','#FFFFFF');
    const {renderBodygraph}=await import('/src/bodygraph.js');
    const c={gates:{all:[10,20,34],personality:{sun:{gate:34,line:1},earth:{gate:20,line:1}},design:{sun:{gate:10,line:2},earth:{gate:20,line:2}}},channels:[],centers:{definedNames:[]}};
    renderBodygraph(document.querySelector('#contrast-fixture'),c,{animate:false});
    document.querySelector('#contrast-fixture').scrollIntoView();
   },skin);
   await page.locator('#contrast-fixture').screenshot({path:`${evidence}/${skin}-${viewport.width}-mixed-stripes.png`});
  }
  await page.evaluate(()=>document.querySelector('#contrast-fixture')?.remove());
 }
 assert.equal(rows.length,11*9*4*5*2);
 writeFileSync(evidence+'/contrast-results.json',JSON.stringify(rows,null,2));
 console.log(`PASS ${rows.length} graph cases: 11 Skins × 9 palettes × 4 source settings × 5 modes × desktop/mobile. Number minimum ${Math.min(...rows.map(r=>r.min))}, small-text minimum ${Math.min(...rows.map(r=>r.smallMin))}.`);
} finally {await browser.close();}
