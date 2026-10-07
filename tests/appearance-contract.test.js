import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SKINS, SKIN_TOKENS, SKIN_TOKEN_GROUPS, CENTER_KEYS, CENTER_PALETTE_TOKENS, CENTER_PALETTES, PLANNED_SKIN_DIRECTIONS } from '../src/lib/skin-registry.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const skin=read('src/styles/skins/default.css'), centers=read('src/styles/center-palettes/classic.css'), aliases=read('src/styles/tokens/human-design-classic.css');
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
  for(const token of SKIN_TOKENS)assert.ok(declarations(skin)[token],token);
  assert.ok(!SKIN_TOKENS.some(t=>CENTER_PALETTE_TOKENS.includes(t)||t.includes('font')||t.includes('gate-number')));
});
test('default Skin declarations retain every former site/chart value in light and dark; centers retain all edge/core values',()=>{
  const [siteLight,siteDark]=baseline.siteModes;
  const [hdLight,hdDark]=baseline.chartModes;
  const blocks=[...skin.matchAll(/\{([^{}]+)\}/g)].map(m=>declarations(m[1]));
  const [centerLight,centerDark]=centers.split('[data-theme="dark"]');
  for(const [before,after]of [[siteLight,blocks[0]],[siteDark,blocks[1]]])for(const[k,v]of Object.entries(before))assert.equal(after[k],v,k);
  for(const [before,after,cp]of [[hdLight,blocks[2],centerLight],[hdDark,blocks[3],centerDark]]){
    for(const[k,v]of Object.entries(before)){
      if(CENTER_PALETTE_TOKENS.includes(k))assert.equal(declarations(cp)[k],v,k);
      // V3 foreground readability: preserve the red background, use dark small text.
      else if(before===hdDark&&k==='--hd-design-on')assert.equal(after[k],'#16130F');
      else if(k==='--hd-electromagnetic')assert.equal(after['--hd-relationship-electromagnetic'],v);
      else if(after[k])assert.equal(after[k],v,k);
      else assert.ok(declarations(aliases)[k],k+' legacy/non-color remains');
    }
  }
  assert.doesNotMatch(skin,/--hd-center-(head|ajna|g|sacral|root)(?:-core)?:/);
  for(const p of CENTER_PALETTES)assert.ok(existsSync(p.cssSource));
  const chakra=declarations(read('src/styles/center-palettes/chakra.css'));
  assert.deepEqual(chakra,baseline.chakra);
  for(const c of CENTER_KEYS)assert.match(centers,new RegExp(`--hd-center-${c}-core:\\s*color-mix`));
});
test('relationship state colors are independent of circuit/text; legacy electromagnetic is an alias',()=>{
  const values=declarations(skin);
  for(const token of SKIN_TOKEN_GROUPS.relationship)assert.doesNotMatch(values[token],/--hd-circuit-|--text-tertiary/);
  assert.equal(values['--hd-relationship-companionship'],'#27ae60');assert.equal(values['--hd-relationship-compromise'],'#2980b9');
  assert.equal(values['--hd-electromagnetic'],'var(--hd-relationship-electromagnetic)');
  const view=read('src/views/connection.js');
  assert.match(view,/--hd-relationship-companionship/);assert.match(view,/--hd-relationship-compromise/);assert.match(view,/--hd-relationship-dominance/);
  assert.doesNotMatch(view,/var\(--hd-circuit-integration\)|var\(--hd-circuit-collective\)|var\(--text-tertiary\)/);
});
test('renderer consumes canonical source/core tokens without owning palettes or changing fonts',()=>{
  const renderer=read('src/bodygraph.js');assert.doesNotMatch(renderer,/#[0-9a-f]{3,8}\b/i);
  // V3 adds source presentation; geometry remains protected by its own fixture and browser parity checks.
  assert.match(renderer, /getTransitSourceMode/);
  assert.doesNotMatch(renderer, /['"]delve['"]/);
  for(const s of ['personality','design','transit'])assert.match(renderer,new RegExp(`read\\('--hd-${s}'\\)`));
  const current=read('src/styles.css');
  assert.match(current,/center-palettes\/classic.css/);
  assert.match(current,/center-palettes\/chakra.css/);
  assert.match(current,/skins\/default.css/);
  assert.equal(sha(current.replace(/^@import[^\n]+\n/gm,'').replace(/^\.bg-root\[data-transit-source-mode="unified-natal"\].*\n/gm,'').trim()),baseline.layoutSha256,'layout unchanged apart from source tooltip colors');
});
