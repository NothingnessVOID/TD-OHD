/** Targeted V3 presentation contract. Fixed mechanical fixtures exercise every source and Integration. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const evidence = process.env.SKIN_EVIDENCE_DIR || '/tmp/td-ohd-skin-palette-v3';
mkdirSync(evidence,{recursive:true});
const browser = await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome', headless:true});
try {
  const page = await browser.newPage({viewport:{width:1224,height:900}});
  await page.goto((process.env.E2E_URL || 'http://127.0.0.1:5212')+'/?d=2000-05-10&t=12%3A30&tz=8');
  await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
  const results = await page.evaluate(async () => {
    const load = path => import(performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname===path)?.name || path);
    const { SKINS } = await load('/src/lib/skin-registry.js');
    const { setSkin } = await load('/src/lib/appearance.js');
    const { renderBodygraph } = await load('/src/bodygraph.js');
    const { buildTransitGraph } = await load('/src/lib/transit-graph.js');
    const { CHANNELS } = await load('/src/lib/human-design/catalog.js');
    const { graphPanelMarkup, renderGraphColumns } = await load('/src/features/transit-timeline/graph-window.js');
    const chart = {
      gates:{all:[10,20,34],personality:{sun:{gate:34,line:1},earth:{gate:20,line:2}},design:{sun:{gate:10,line:3},earth:{gate:20,line:4}}},
      channels:CHANNELS.filter(c=>c.gates.every(g=>[10,20,34].includes(g))),
      centers:{definedNames:['sacral','g','throat']}
    };
    const sky = {moon:{gate:57,line:2},mars:{gate:34,line:3}};
    const reinforced = {sun:{gate:10,line:1},earth:{gate:20,line:2},moon:{gate:34,line:3},mars:{gate:57,line:4}};
    const serialize = m=>JSON.stringify({mode:m.mode,natal:[...m.natalGates],transit:[...m.transitGates],active:[...m.activeGates],channels:m.channels,centers:[...m.definedCenters],sources:[10,20,34,57,64].map(g=>m.gateSource(g))});
    const model = buildTransitGraph(chart,sky), modelBefore=serialize(model);
    const root=document.createElement('section');root.className='tl';
    const labels=Object.fromEntries(['selected','legend','natal','transit','completed','both','design','personality'].map(k=>[k,k]));
    root.innerHTML=graphPanelMarkup({labels});document.body.append(root);
    const container = root.querySelector('.tl-graph');
    const token = name=>getComputedStyle(document.documentElement).getPropertyValue('--hd-'+name).trim();
    const color = name=>{const el=document.createElement('span');el.style.color='var(--hd-'+name+')';document.body.append(el);const c=getComputedStyle(el).color;el.remove();return c;};
    const getPaint = fill => {
      if(!fill.startsWith('url('))return fill;
      const id=fill.slice(5,-1), p=container.querySelector('#'+CSS.escape(id));
      return [...p.querySelectorAll('rect')].map(r=>getPaint(r.getAttribute('fill')));
    };
    const snap = () => ({
      strategy:container.dataset.transitSourceMode,
      stripe:!!container.querySelector('pattern[id$="-stripe-both"]'),
      gates:Object.fromEntries([10,20,34,57,64].map(g=>{
        const el=container.querySelector('.bg-gate[data-gate="'+g+'"]');
        return [g,{circle:getPaint(el.querySelector('.bg-gate-circle').getAttribute('fill')),
          path:getPaint(container.querySelector('.bg-gate-path[data-gate="'+g+'"]').getAttribute('fill')),
          on:el.querySelector('text').getAttribute('fill'),ring:el.querySelector('.bg-transit-ring')?.getAttribute('stroke')}];
      })),
      spans:[...container.querySelectorAll('.bg-integration-span')].map(p=>getPaint(p.getAttribute('fill'))),
      geometry:[...container.querySelectorAll('path')].map(p=>p.getAttribute('d'))
    });
    const draw=m=>{renderBodygraph(container,chart,{planetColumns:false,interactive:false,transitModel:m});return snap();};
    const planets=[{id:'sun',name:'Sun',glyph:'☉'},{id:'earth',name:'Earth',glyph:'⊕'}];
    const columns=m=>{
      renderGraphColumns({root,chart,activations:sky,mode:m,planets,translate:k=>k,fixings:{transit:{},birth:{
        design:{sun:{natalState:'exalted',transitAdjustedState:'exalted',temporaryChange:false},earth:{natalState:'exalted',transitAdjustedState:'detriment',temporaryChange:true}},
        personality:{sun:{natalState:'exalted',transitAdjustedState:'exalted',temporaryChange:false},earth:{natalState:'exalted',transitAdjustedState:'detriment',temporaryChange:true}}
      }}});
      return {rows:[...root.querySelectorAll('.tl-birth-value')].map(n=>({side:n.dataset.side,value:n.querySelector('.bg-planet-act').textContent,
        color:getComputedStyle(n.querySelector('.bg-planet-act')).color,mark:getComputedStyle(n.querySelector('.tl-fixing-mark')).color,
        temporary:n.querySelector('.tl-fixing-mark').dataset.temporary,title:n.title})),
        headings:[...root.querySelectorAll('.tl-birth-head .bg-planets-head')].map(n=>n.textContent),
        birthHidden:root.querySelector('.tl-birth-column').hidden,
        legend:[...root.querySelectorAll('.tl-legend [data-source]')].filter(n=>!n.hidden).map(n=>({source:n.dataset.source,background:getComputedStyle(n.querySelector('i')).backgroundColor})),
        birth:color('overlay-natal'),transit:color('transit'),timelineTransit:color('timeline-transit'),transitText:color('transit-text')};
    };
    const luminance = hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
    const out=[];
    for(const skin of SKINS){
      setSkin(skin.id);
      const tokens=Object.fromEntries(['personality','personality-on','design','design-on','transit','transit-on','overlay-natal','overlay-natal-on','inactive','inactive-on'].map(n=>[n,token(n)]));
      const tokenColors=Object.fromEntries(['personality','design','overlay-natal','transit-text'].map(n=>[n,color(n)]));
      out.push({id:skin.id,mode:skin.transitSourceMode,tokens,tokenColors,birth:draw(null),overlay:draw(model),columns:columns('overlay'),
        reinforced:draw(buildTransitGraph(chart,reinforced)),sky:draw(buildTransitGraph(chart,sky,'transit-only')),
        allSky:draw(buildTransitGraph(chart,reinforced,'transit-only')),skyColumns:columns('transit-only'),
        contrast:Object.fromEntries(['personality','design','transit','overlay-natal'].map(n=>[n,contrast(token(n),token(n+'-on'))]))});
    }
    // Override the new semantic token directly: birth sources stay independent of the overlay token.
    setSkin('delve');document.documentElement.style.setProperty('--hd-overlay-natal','#765432');
    const semantic={birth:draw(null),overlay:draw(model),columns:columns('overlay')};
    document.documentElement.style.removeProperty('--hd-overlay-natal');
    root.remove();
    return {out,semantic,modelBefore,modelAfter:serialize(model)};
  });
  let referenceGeometry;
  for(const r of results.out){
    const t=r.tokens, unified=r.mode==='unified-natal';
    assert.equal(r.birth.strategy,'split',r.id+' ordinary birth ignores strategy');
    const natalPaint={10:t.design,20:[t.personality,t.design],34:t.personality};
    for(const gate of [10,20,34]){
      assert.deepEqual(r.birth.gates[gate].circle,natalPaint[gate]);
      for(const surface of ['circle','path'])assert.deepEqual(r.overlay.gates[gate][surface],unified?t['overlay-natal']:natalPaint[gate],r.id+' overlay '+surface+' '+gate);
      if(unified)assert.equal(r.overlay.gates[gate].on,t['overlay-natal-on']);
    }
    assert.equal(r.overlay.stripe,!unified);
    assert.equal(r.overlay.gates[57].circle,t.transit);assert.equal(r.overlay.gates[57].on,t['transit-on']);
    assert.equal(r.overlay.gates[34].ring,t.transit);assert.equal(r.overlay.gates[64].circle,t.inactive);
    if(unified){assert.equal(r.overlay.spans[0],t['overlay-natal']);assert.deepEqual(r.overlay.spans[1],[t['overlay-natal'],t.transit]);
      for(const span of r.reinforced.spans)assert.deepEqual(span,[t['overlay-natal'],t.transit]);}
    for(const gate of [10,20])assert.equal(r.sky.gates[gate].circle,t.inactive);
    for(const gate of [34,57]){assert.equal(r.sky.gates[gate].circle,t.transit);assert.equal(r.sky.gates[gate].on,t['transit-on']);}
    assert.equal(r.sky.stripe,false);for(const span of r.allSky.spans)assert.equal(span,t.transit);
    assert.deepEqual(r.columns.headings,['design','personality']);
    assert.deepEqual(r.columns.rows.map(n=>n.value),['10.3','34.1','20.4','20.2']);
    for(const row of r.columns.rows){
      assert.equal(row.color,r.tokenColors[unified?'overlay-natal':row.side],r.id+' shared birth column');
      assert.equal(row.mark,row.temporary==='true'?r.columns.transitText:row.color,'temporary fixing keeps Transit text color');
      if(row.temporary==='true')assert.match(row.title,/temporaryFixing · natalFixing/);
    }
    assert.deepEqual(r.columns.legend.map(n=>n.source),['natal','transit','completed','both']);
    assert.equal(r.columns.legend[0].background,r.columns.birth);assert.equal(r.columns.legend[1].background,r.columns.timelineTransit);
    assert.equal(r.skyColumns.birthHidden,true);assert.deepEqual(r.skyColumns.legend.map(n=>n.source),['transit']);
    for(const [source,ratio]of Object.entries(r.contrast))assert.ok(ratio>=4.5,r.id+' '+source+' foreground '+ratio);
    const geom=[r.birth.geometry,r.overlay.geometry,r.sky.geometry];
    if(referenceGeometry)assert.deepEqual(geom,referenceGeometry,'strategy/color never alters geometry');else referenceGeometry=geom;
  }
  assert.equal(results.modelBefore,results.modelAfter,'renderer never mutates calculation sources');
  assert.equal(results.semantic.overlay.gates[10].circle,'#765432');
  assert.equal(results.semantic.birth.gates[10].circle,'#6F6F6F');
  assert.equal(results.semantic.columns.rows[0].color,'rgb(118, 84, 50)');
  writeFileSync(evidence+'/source-strategy-results.json',JSON.stringify(results,null,2));
  console.log('PASS: 11 Skins × birth/overlay/reinforced/transit-only; Integration, gate numbers, live tokens, shared columns, fixing marks, legend, geometry, contrasts and unchanged calculation model.');
} finally {await browser.close();}
