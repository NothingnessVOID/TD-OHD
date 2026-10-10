/** One unified pass over all eleven Skins. No annual/Release sweep. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKINS, SKIN_TOKENS } from '../src/lib/skin-registry.js';
const base = (process.env.E2E_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const evidence = process.env.SKIN_EVIDENCE_DIR || '/tmp/td-ohd-skin-palette-v3';
mkdirSync(evidence, {recursive:true});
const birth = '/?d=2000-05-10&t=12%3A30&tz=8';
const browser = await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome',headless:true});
const context = await browser.newContext({viewport:{width:1224,height:900},colorScheme:'light',reducedMotion:'reduce'});
await context.addInitScript(() => {
  if (!localStorage.getItem('ohd-language')) localStorage.setItem('ohd-language','zh-CN');
  // Evidence captures final colors, not a frame of the existing hover/theme transitions.
  document.addEventListener('DOMContentLoaded', () => {
    const style=document.createElement('style');
    style.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.append(style);
  });
});
const page = await context.newPage(), errors = [], results = [];
// Every comparison uses the same instant and dense year; no annual generation.
await page.clock.setFixedTime(new Date('2026-03-15T04:00:00Z'));
let referenceTimeline;
page.on('pageerror', e => errors.push(e.message));
await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, r => r.abort());
const css = name => page.locator('html').evaluate((n,key)=>getComputedStyle(n).getPropertyValue(key).trim(),name);
const openSettings = async () => {
  if (!(await page.locator('#more-menu').evaluate(n=>n.open))) await page.locator('#more-toggle').click();
  await page.locator('#skin-settings-button').click();
  await page.locator('#skin-settings').waitFor({state:'visible'});
};
const selectSkin = async id => {
  await openSettings(); await page.locator(`#skin-picker [data-skin-id="${id}"]`).click();
  assert.equal(await page.locator('html').getAttribute('data-skin'),id);
  assert.equal(await page.locator(`#skin-picker [data-skin-id="${id}"]`).getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');
};
const navigate = async view => {
  if (!(await page.locator(`.nav-link[data-view="${view}"]`).isVisible())) await page.locator('.mobile-menu-toggle').click();
  await page.locator(`.nav-link[data-view="${view}"]`).click();
};
const shot = async name => { await page.mouse.move(0,0);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${evidence}/${name}.png`}); };
const readable = async (locator,token,property='color') => {
  const pair = await locator.first().evaluate((n,{token,property})=>{
    const probe=document.createElement('span');probe.style.setProperty(property,`var(${token})`);document.body.append(probe);
    const colors=[getComputedStyle(n).getPropertyValue(property),getComputedStyle(probe).getPropertyValue(property)];probe.remove();return colors;
  },{token,property});assert.equal(pair[0],pair[1],token+' applies to rendered '+property);
};
try {
  await page.goto(base+birth);await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
  await page.evaluate(async()=>{const {savePerson}=await import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/people.js')?.name || '/src/lib/people.js');savePerson({name:'Skin Fixture B',birthDate:'1985-03-20',birthTime:'08:00',timezone:0,location:{name:'Fixture UTC',lat:51.5,lon:0}});});
  const font = await css('--font'), serif = await css('--font-serif');
  const sameModeCenters = {};
  for (const skin of SKINS) {
    await selectSkin(skin.id);
    const actual=await page.locator('html').evaluate((root,tokens)=>Object.fromEntries(tokens.map(t=>[t,getComputedStyle(root).getPropertyValue(t).trim()])),SKIN_TOKENS);
    const invalid=await page.evaluate(values=>Object.entries(values).filter(([token,value])=>{
      const property=['--hd-connection-both','--hd-relationship-companionship'].includes(token) ? 'background-image'
        : ['--shadow-sm','--shadow','--shadow-lg','--lens-active-shadow'].includes(token) ? 'box-shadow' : 'color';
      return !value || !CSS.supports(property,value);
    }),actual);
    assert.deepEqual(invalid,[],skin.id+' all registered computed values have valid CSS syntax');
    assert.equal(await page.locator('html').getAttribute('data-theme'),skin.mode);
    assert.equal(await css('--font'),font);assert.equal(await css('--font-serif'),serif);
    const colors = await page.locator('#bodygraph-container .bg-centers .bg-center').evaluateAll(ns=>ns.map(n=>n.getAttribute('fill')));
    assert.equal(colors.length,9,'all nine centers remain rendered');
    const edges = await page.locator('#bodygraph-container radialGradient stop[offset="1"]').evaluateAll(ns=>ns.map(n=>n.getAttribute('stop-color')));
    assert.equal(await page.locator('html').getAttribute('data-center-palette'), skin.defaultCenterPalette, 'Follow Skin resolves the approved paired center palette');
    if (sameModeCenters[skin.defaultCenterPalette]) assert.deepEqual(edges,sameModeCenters[skin.defaultCenterPalette],'the same paired Center Palette has the same painted centers');
    else sameModeCenters[skin.defaultCenterPalette]=edges;
    assert.ok(await page.locator(`#bodygraph-container .bg-gate-path[fill="${actual['--hd-birth-design'] || actual['--hd-design']}"]`).count(),'actual Design paths use the birth-specific Skin source');
    await readable(page.locator('#bodygraph-container .bg-planets-personality .bg-planet-act'),'--source-birthPersonality-text');
    await shot(skin.id+'-home');
    await page.locator('#bodygraph-container').screenshot({path:`${evidence}/${skin.id}-birth-graph.png`});
    // A detail surface and a real popover, then the birth form.
    await page.locator('#bodygraph-container .bg-planets-design .bg-planet-row').first().click();
    await page.locator('#gate-detail .planet-detail-card').waitFor();await readable(page.locator('#gate-detail .gate-detail-card'),'--hd-detail-bg','background-color');
    await shot(skin.id+'-detail');await page.keyboard.press('Escape');
    await page.locator('#more-toggle').click();await page.locator('#chart-share-menu > summary').click();
    await readable(page.locator('#chart-share-menu .chart-share-actions'),'--bg-elevated','background-color');
    await shot(skin.id+'-popover');await page.keyboard.press('Escape');
    await page.locator('#people-switcher').selectOption('__new');
    await page.locator('#birth-entry').waitFor({state:'visible'});
    await readable(page.locator('#birth-date'),'--bg-elevated','background-color');await shot(skin.id+'-entry');
    await page.goto(base+birth);await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
    assert.equal(await page.locator('html').getAttribute('data-skin'),skin.id,'Skin persists on reload');
    await navigate('library');await page.locator('.reference-sidebar').waitFor();
    await readable(page.locator('.reference-sidebar'),'--bg-elevated','background-color');await shot(skin.id+'-library');
    await navigate('transits');await page.locator('#transit-stage .bodygraph-svg').waitFor({timeout:60000});
    await readable(page.locator('#transit-stage .tl-transit-column .bg-planet-act'),'--source-transit-text');
    await readable(page.locator('#transit-stage .tl-birth-value[data-side="design"] .bg-planet-act'),skin.transitSourceMode === 'unified-natal' ? '--source-natal-text' : '--source-design-text');
    await readable(page.locator('#transit-stage .tl-birth-value[data-side="personality"] .bg-planet-act'),skin.transitSourceMode === 'unified-natal' ? '--source-natal-text' : '--source-personality-text');
    assert.equal(await page.locator('#transit-stage .tl-graph').getAttribute('data-transit-source-mode'),skin.transitSourceMode);
    await shot(skin.id+'-transit');
    await page.locator('#transit-stage .tl-graph-panel').screenshot({path:`${evidence}/${skin.id}-transit-graph.png`});
    await navigate('timeline');await page.locator('#timeline-view .bodygraph-svg').waitFor({timeout:60000});
    await readable(page.locator('#timeline-view .tl-transit-column .bg-planet-act'),'--source-transit-text');
    await page.locator('#timeline-view [data-field="span"]').selectOption('past-year');
    await page.waitForFunction(() => {
      const table = document.querySelector('#timeline-view .tl-table');
      return table?.getAttribute('aria-busy') === 'false' && Number(table.dataset.end) - Number(table.dataset.start) > 360 * 86400000 && document.querySelectorAll('#timeline-view .tl-bar').length > 100;
    }, null, {timeout:180000});
    const timeline = await page.locator('#timeline-view .tl-table').evaluate(n => ({
      start:n.dataset.start,end:n.dataset.end,selected:n.dataset.selected,
      bars:[...n.querySelectorAll('.tl-bar')].map(b=>[b.dataset.source,b.style.left,b.style.width,b.textContent])
    }));
    if (referenceTimeline) assert.deepEqual(timeline, referenceTimeline, 'identical events and selected instant across all Skins');
    else referenceTimeline = timeline;
    await readable(page.locator('#timeline-view .tl-bar[data-source="transit"]'),'--hd-timeline-transit','background-color');
    await readable(page.locator('#timeline-view .tl-bar[data-source="transit"]'),'--hd-transit-on');
    await readable(page.locator('#timeline-view .tl-birth-value[data-side="design"] .bg-planet-act'),skin.transitSourceMode === 'unified-natal' ? '--source-natal-text' : '--source-design-text');
    await readable(page.locator('#timeline-view .tl-birth-value[data-side="personality"] .bg-planet-act'),skin.transitSourceMode === 'unified-natal' ? '--source-natal-text' : '--source-personality-text');
    await shot(skin.id+'-timeline');
    await page.locator('#timeline-view .tl-graph-panel').screenshot({path:`${evidence}/${skin.id}-timeline-graph.png`});
    await page.locator('#timeline-view .tl-workspace').screenshot({path:`${evidence}/${skin.id}-timeline-workspace.png`});
    await navigate('connection');await page.locator('#conn-person').selectOption({label:'Skin Fixture B'});await page.locator('#conn-calculate').click();
    await page.locator('#connection-content .composite-graph .bodygraph-svg').waitFor({timeout:60000});
    for (const [i,key] of ['electromagnetic','companionship','compromise','dominance'].entries()) {
      const rows=page.locator('#connection-content .conn-section').nth(i).locator('.connection-type');
      assert.ok(await rows.count(),skin.id+' renders '+key+' fixtures');
      for (const row of await rows.all()) {
        const marker = row.locator('.conn-mechanic-marker');
        const expected = await row.evaluate(n => {
          const probe=document.createElement('i'); probe.style.background=getComputedStyle(n).getPropertyValue('--connection-marker'); n.append(probe);
          const value=getComputedStyle(probe).backgroundImage !== 'none' ? getComputedStyle(probe).backgroundImage : getComputedStyle(probe).backgroundColor; probe.remove(); return value;
        });
        const painted = await marker.evaluate(n => getComputedStyle(n).backgroundImage !== 'none' ? getComputedStyle(n).backgroundImage : getComputedStyle(n).backgroundColor);
        assert.equal(painted, expected, skin.id+' '+key+' ownership marker paints the actual source');
      }
    }
    const paint=await page.locator('#connection-content .composite-graph svg').evaluate(n=>({
      stripe:[...n.querySelectorAll('pattern[id$="-stripe-ab"] rect')].map(n=>n.getAttribute('fill')),
      both:[...n.querySelectorAll('linearGradient[id$="-cc-both"] stop')].map(n=>n.getAttribute('stop-color')),
      bridged:[...n.querySelectorAll('.bg-center')].map(n=>n.getAttribute('fill')),
      fills:[...n.querySelectorAll('.bg-gate-path')].map(n=>n.getAttribute('fill'))
    }));
    assert.deepEqual(paint.stripe,[actual['--hd-connection-a'],actual['--hd-connection-b']]);
    assert.deepEqual(paint.both,[paint.stripe[0],paint.stripe[0],paint.stripe[1],paint.stripe[1]], 'Both retains the approved hard 50% boundary');
    const createdPaint = await page.evaluate(async () => {
      const load=path=>import(performance.getEntriesByType('resource').find(r=>new URL(r.name).pathname===path)?.name || path);
      const {renderBodygraph}=await load('/src/bodygraph.js');
      const chart=gates=>({gates:{all:gates,personality:{},design:{}},channels:[],centers:{definedNames:[]}});
      const node=document.createElement('div');document.body.append(node);
      const style=getComputedStyle(document.documentElement), color=name=>style.getPropertyValue(name).trim();
      renderBodygraph(node,chart([59]),{composite:{chartA:chart([59]),chartB:chart([6]),colorA:color('--hd-connection-a'),colorB:color('--hd-connection-b'),colorBridged:color('--hd-connection-bridged')},animate:false});
      const fills=['sacral','solar'].map(key=>node.querySelector(`.bg-center[data-center="${key}"]`).getAttribute('fill'));node.remove();return fills;
    });
    assert.deepEqual(createdPaint,[actual['--hd-connection-bridged'],actual['--hd-connection-bridged']],skin.id+' preserves Created center paint');
    assert.ok(paint.fills.includes(actual['--hd-connection-a'])&&paint.fills.includes(actual['--hd-connection-b']));
    await shot(skin.id+'-relationship');
    await page.locator('#connection-content .composite-graph').screenshot({path:`${evidence}/${skin.id}-relationship-graph.png`});
    if(['new-warm-paper','midnight-contrast','delve'].includes(skin.id)) {
      for(const [i,key] of ['electromagnetic','companionship','compromise','dominance'].entries())
        await page.locator('#connection-content .conn-section').nth(i).screenshot({path:`${evidence}/${skin.id}-relationship-${key}.png`});
    }
    results.push({id:skin.id,mode:skin.mode,transitSourceMode:skin.transitSourceMode,validComputedTokens:SKIN_TOKENS.length,surfaces:['home','entry','detail','popover','library','transit','timeline','relationship'],relationshipPaint:true,timeline:{start:timeline.start,end:timeline.end,selected:timeline.selected,barCount:timeline.bars.length,signal:actual['--hd-timeline-transit']}});
    await navigate('chart');
  }
  // Real controls: independent overrides, restore, Palette, size, language and keyboard.
  await selectSkin('high-contrast');await openSettings();
  const setField = async(key,value)=>page.locator(`#appearance-${key}`).evaluate((n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await setField('accent','#123456');await setField('transit','#234567');await setField('gateNumberSize','18');
  await page.locator('button[data-center-palette="chakra"]').click();
  await page.locator('[data-skin-id="grass-aroma"]').click();assert.equal(await css('--accent'),'#5BA88C');
  assert.equal(await page.locator('html').getAttribute('data-center-palette'),'chakra');assert.equal(await css('--hd-gate-number-size'),'18px');
  await page.locator('[data-skin-id="high-contrast"]').click();assert.equal(await css('--accent'),'#123456');assert.equal(await css('--hd-transit'),'#234567');
  await page.locator('#appearance-restore').click();
  assert.equal(await page.locator('html').getAttribute('data-skin'),'default-light');
  assert.equal(await css('--accent'),'#B86F2C');assert.equal(await css('--hd-transit'),'#2D929F');
  assert.equal(await css('--hd-gate-number-size'),'22px');assert.equal(await page.locator('html').getAttribute('data-center-palette'),'classic');
  await page.locator('button[data-center-palette="chakra"]').click();
  await setField('gateNumberSize','18');
  await page.locator('[data-skin-id="midnight-contrast"]').click();
  await page.keyboard.press('Escape');await page.goto(base+birth);await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
  assert.equal(await page.locator('html').getAttribute('data-skin'),'midnight-contrast');assert.equal(await page.locator('html').getAttribute('data-center-palette'),'chakra');
  await openSettings();assert.equal(await css('--hd-gate-number-size'),'18px');
  const messages={
    en:['Appearance','Skin','Center Palette','Font','Customize','Reset Appearance'],
    'zh-CN':['外观','皮肤','中心配色','字体','自定义','恢复默认外观'],
    'zh-Hant':['外觀','皮膚','中心配色','字體','自訂','恢復預設外觀']
  };
  for(const locale of ['en','zh-CN','zh-Hant']){
    await page.evaluate(async locale=>{const path=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/i18n.js')?.name || '/src/lib/i18n.js';(await import(path)).setLocale(locale);},locale);
    const labels=await page.locator('#skin-settings-title,.appearance-section h3,#appearance-restore').allTextContents();assert.deepEqual(labels,messages[locale]);
    assert.equal(await page.locator('#skin-picker button').count(),12);
    for(const skin of SKINS){const name=await page.locator(`[data-skin-id="${skin.id}"] .skin-card-name`).innerText();assert.ok(name);assert.notEqual(name,skin.id);}
    await shot('picker-'+locale);
  }
  for(const width of [1224,390]) {
    await page.setViewportSize({width,height:900});
    const geometry=await page.locator('#skin-picker').evaluate(n=>({columns:getComputedStyle(n).gridTemplateColumns.split(' ').length,width:n.clientWidth,scroll:n.scrollWidth}));
    assert.equal(geometry.columns,width===1224?3:2);assert.ok(geometry.scroll<=geometry.width,'Picker fits without horizontal overflow');
    await page.locator('[data-skin-id="new-warm-paper"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('html').getAttribute('data-skin'),'new-warm-paper');
    const geom=await page.locator('#skin-settings').evaluate(n=>({radius:getComputedStyle(n).borderRadius,border:getComputedStyle(n).borderTopWidth,overflow:document.documentElement.scrollWidth>window.innerWidth}));
    assert.equal(geom.radius,'6px');assert.equal(geom.overflow,false);await shot('warm-paper-picker-'+width);
    // Mobile scroll reaches the last card, center controls and Restore.
    await page.locator('[data-skin-id="coral"]').click();await page.locator('button[data-center-palette="classic"]').click();await page.locator('#appearance-restore').click();
    await page.keyboard.press('Escape');await shot('coral-home-'+width);await openSettings();
    await page.locator('[data-skin-id="midnight-contrast"]').click();await page.keyboard.press('Escape');await shot('midnight-home-'+width);await openSettings();
  }
  await page.keyboard.press('Escape');await page.locator('#more-toggle').click();await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-skin'),'default-light','Dark shortcut selects default-light');
  await selectSkin('grass-aroma');await page.locator('#more-toggle').click();await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-skin'),'default-dark','Light shortcut selects default-dark');
  assert.deepEqual(errors,[],'No browser page errors');
  writeFileSync(`${evidence}/results.json`,JSON.stringify({results,errors,controls:'per-Skin/restore/reload/palette/font/size/i18n/keyboard/mobile/shortcut PASS'},null,2));
  console.log(`Skin presets: all ${results.length} palettes and eight surfaces, Relationship paint, controls, three languages and mobile PASS. Evidence: ${evidence}`);
} finally {await context.close();await browser.close();}
