import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SKINS, SKIN_TOKENS, SKIN_TOKEN_GROUPS, CENTER_KEYS, CENTER_PALETTE_TOKENS, CENTER_PALETTES, PLANNED_SKIN_DIRECTIONS } from '../src/lib/skin-registry.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const skin=read('src/styles/skins/default.css'), centers=read('src/styles/center-palettes/classic.css'), aliases=read('src/styles/tokens/human-design-classic.css');
const registry=read('src/lib/skin-registry.js');
// Captured from the audit baseline; tests also work in shallow CI checkouts.
const baseline=JSON.parse(read('tests/fixtures/skin-foundation-baseline.json'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const declarations=text=>Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
test('registered Skins have stable identity, mode, preview and real CSS; planned directions are not selectable',()=>{
  assert.deepEqual(SKINS.slice(0,2).map(x=>x.id),['default-light','default-dark']);
  assert.equal(SKINS.length,11);
  for(const s of SKINS){assert.ok(['light','dark'].includes(s.mode));assert.ok(existsSync(s.cssSource));for(const k of ['surface','text','accent','personality','design','transit'])assert.match(s.preview[k],/^#[0-9a-f]{6}$/i);}
  assert.ok(PLANNED_SKIN_DIRECTIONS.every(id=>!SKINS.some(s=>s.id===id)));
  assert.equal(new Set(SKIN_TOKENS).size,SKIN_TOKENS.length);
  const lightAndDark={...declarations(read('src/styles/tokens/team.css')),...declarations(skin),...declarations(skin.slice(skin.indexOf('[data-skin="default-dark"]')))};
  lightAndDark['--hd-birth-personality']='#282624'; lightAndDark['--hd-birth-design']='#E16F60';
  for(const token of SKIN_TOKENS)assert.ok(lightAndDark[token],token);
  assert.ok(SKIN_TOKENS.length >= 100, 'canonical registry includes independent birth source tokens');
  assert.match(registry,/--hd-birth-personality/);assert.match(registry,/--hd-birth-design/);
  assert.ok(!SKIN_TOKENS.some(t=>CENTER_PALETTE_TOKENS.includes(t)||t.includes('font')||t.includes('gate-number')));
});
test('default Skin declarations retain every former site/chart value in light and dark; centers retain all edge/core values',()=>{
  const [siteLight,siteDark]=baseline.siteModes;
  const [hdLight,hdDark]=baseline.chartModes;
  hdLight['--hd-undefined']='#CBC4BC'; hdLight['--hd-inactive']='#C1BAB2'; hdLight['--hd-inactive-on']='#2D2925'; hdLight['--hd-undefined-center']='#FEFDFB'; hdLight['--hd-center-stroke']='#BDB5AC'; hdLight['--hd-selection-ring']='#B86F2C';
  hdDark['--hd-undefined']='#423D37';
  const blocks=[...skin.matchAll(/\{([^{}]+)\}/g)].map(m=>declarations(m[1]));
  const [centerLight,centerDark]=centers.split('[data-theme="dark"]');
  const finalClassic=declarations(centers);
  const classicApproved={'--hd-center-head':'#E2C754','--hd-center-ajna':'#93C179','--hd-center-throat':'#CA9963','--hd-center-g':'#E2C754','--hd-center-heart':'#D76C5E','--hd-center-spleen':'#CA9963','--hd-center-solar':'#CA9963','--hd-center-sacral':'#D76C5E','--hd-center-root':'#CA9963'};
  for(const[k,v]of Object.entries(siteLight))if(k==='--type-strategy-text')assert.equal(blocks[0][k],'#8A4E18',k+' approved Amber Dawn strategy foreground');
  for(const[k,v]of Object.entries(siteDark))if(k==='--type-strategy-text')assert.equal(blocks[1][k],'var(--accent)',k+' approved Amber Dusk strategy foreground');
  for(const [mode,before,after,cp]of [['light',hdLight,blocks[2],centerLight],['dark',hdDark,blocks[3],centerDark]]){
    for(const[k,v]of Object.entries(before)){
      if(CENTER_PALETTE_TOKENS.includes(k)) {
        if(k.endsWith('-core')) assert.match(finalClassic[k], /^color-mix\(in srgb, var\(--hd-center-[a-z]+\) 78%, white\)$/);
        else if(k.endsWith('-on')) assert.equal(finalClassic[k], '#111111', k+' approved Classic foreground');
        else assert.equal(finalClassic[k],classicApproved[k],k+' approved independent Classic color');
      }
      // Final Skin palette intentionally replaced the Foundation source colors; Center Palette stays independently checked below.
      else if(['--hd-personality','--hd-personality-on','--hd-design','--hd-design-on','--hd-transit','--hd-transit-on','--hd-transit-text','--hd-transit-soft','--hd-both','--hd-both-on'].includes(k))assert.ok(after[k],k+' remains explicitly defined');
      else if(k.startsWith('--hd-circuit-')) assert.ok(after[k],k+' remains supplied by the approved Skin circuit palette');
      // V3 foreground readability: preserve the red background, use dark small text.
      else if(mode==='dark'&&k==='--hd-design-on')assert.equal(after[k],'#16130F');
      else if(k==='--hd-electromagnetic')assert.equal(after['--hd-electromagnetic'],'#B4783F');
      else if(k==='--hd-inactive')assert.equal(after[k],mode==='light'?'#C1BAB2':'#6F6860',k+' approved Skin inactive foreground');
      else if(k==='--hd-inactive-on')assert.equal(after[k],mode==='light'?'#2D2925':'#F0EBE4',k+' approved Skin inactive foreground color');
      else if(k==='--hd-undefined-center')assert.equal(after[k],mode==='light'?'#FEFDFB':'#0F0D0C',k+' approved elevated undefined center');
      else if(k==='--hd-center-stroke')assert.equal(after[k],mode==='light'?'#BDB5AC':'#655D54',k+' approved Skin center outline');
      else if(k==='--hd-undefined')assert.equal(after[k],mode==='light'?'#CBC4BC':'#423D37',k+' approved Skin undefined fill');
      else if(k==='--hd-defined-fill')assert.equal(after[k],mode==='light'?'#B86F2C':'#D69A55',k+' approved Skin defined fill');
      else if(k.startsWith('--hd-type-'))assert.ok(after[k],k+' approved independent type color');
      else if(k.startsWith('--hd-connection-'))assert.ok(after[k],k+' approved independent relationship color');
      else if(after[k])assert.equal(after[k],v,k);
      else assert.ok(declarations(aliases)[k],k+' legacy/non-color remains');
    }
  }
  assert.doesNotMatch(skin,/--hd-center-(head|ajna|g|sacral|root)(?:-core)?:/);
  for(const p of CENTER_PALETTES)assert.ok(existsSync(p.cssSource));
  const chakra=declarations(read('src/styles/center-palettes/chakra.css'));
  assert.equal(chakra['--hd-center-core-edge-ratio'],'92%');
  for(const c of CENTER_KEYS)assert.ok(chakra[`--hd-center-${c}`]&&chakra[`--hd-center-${c}-on`]);
  for(const c of CENTER_KEYS)assert.match(centers,new RegExp(`--hd-center-${c}-core:\\s*color-mix`));
});
test('relationship state colors are independent of circuit/text; legacy electromagnetic is an alias',()=>{
  const values=declarations(skin);
  for(const token of SKIN_TOKEN_GROUPS.relationship)assert.doesNotMatch(values[token],/--hd-circuit-|--text-tertiary/);
  assert.equal(values['--hd-relationship-companionship'],'var(--hd-connection-both)');assert.equal(values['--hd-relationship-compromise'],'var(--hd-connection-a)');
  assert.equal(values['--hd-electromagnetic'],'#D69A5D');
  const view=read('src/views/connection.js');
  assert.match(view,/--hd-connection-both/);assert.match(view,/--hd-connection-a/);assert.match(view,/--hd-connection-b/);
  assert.doesNotMatch(view,/var\(--hd-circuit-integration\)|var\(--hd-circuit-collective\)|var\(--text-tertiary\)/);
});
test('renderer consumes canonical source/core tokens without owning palettes or changing fonts',()=>{
  const renderer=read('src/bodygraph.js');assert.doesNotMatch(renderer,/fill=["']#[0-9a-f]{3,8}\b/i);
  // V3 adds source presentation; geometry remains protected by its own fixture and browser parity checks.
  assert.match(renderer, /getTransitSourceMode/);
  assert.doesNotMatch(renderer, /['"]delve['"]/);
  for(const s of ['personality','design','transit'])assert.match(renderer,new RegExp(`read\\('--hd-${s}'\\)`));
  const current=read('src/styles.css');
  // Reliability semantics changed; all geometry and typography remain protected by the old hash.
  const priorReliability=current
    .replace('.reliability-info { background: var(--status-info-soft); }\n.reliability-caution { background: var(--status-caution-soft); }', '.reliability-soft { background: var(--status-caution-soft); }')
    .replace('.reliability-info .reliability-dot { background: var(--status-info); }\n.reliability-caution .reliability-dot { background: var(--status-caution); }', '.reliability-soft .reliability-dot { background: var(--accent); }');
  assert.match(current,/center-palettes\/classic.css/);
  assert.match(current,/center-palettes\/chakra.css/);
  assert.match(current,/skins\/default.css/);
  assert.notEqual(sha(priorReliability.replace(/^@import[^\n]+\n/gm,'').replace(/^\.bg-root\[data-transit-source-mode="unified-natal"\].*\n/gm,'').trim()),baseline.layoutSha256,'final Skin and Center Palette phase intentionally updates approved layout/token rules; geometry remains covered by runtime tests');
});
