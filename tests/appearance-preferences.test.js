import test from 'node:test';
import assert from 'node:assert/strict';
import { APPEARANCE_STORAGE_KEY, LEGACY_APPEARANCE_STORAGE_KEY, initAppearance, getAppearance, getCustomOverrides, getSkinOverrides, getAppearancePreferences, setCustomOverride, setSkin, setCenterPalette, restoreCurrentSkin, resetAppearance } from '../src/lib/appearance.js';

function withBrowser(body) {
  const old = Object.fromEntries(['document','window','localStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const attributes=new Map(), styles=new Map(), storage=new Map();
  globalThis.document={documentElement:{getAttribute:key=>attributes.get(key),setAttribute:(key,value)=>attributes.set(key,value),style:{setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)}}};
  globalThis.window={matchMedia:()=>({matches:false})};
  globalThis.localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
  try {body({attributes,styles,storage});} finally {for(const[key,d]of Object.entries(old)){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
}
test('per-Skin overrides restore independently, size and palette survive switch/reload/restore', ()=>withBrowser(({styles,storage})=>{
  initAppearance(); setCustomOverride('gateNumberSize',18);
  const light={accent:'#123abc',personality:'#654321',design:'#abcdef',transit:'#224466',graphBackground:'#eeeeff'};
  for(const[key,value]of Object.entries(light))setCustomOverride(key,value);
  assert.equal(styles.get('--hd-graph-panel-bg'),'#eeeeff');
  setCenterPalette('chakra'); setSkin('default-dark');
  assert.deepEqual(getCustomOverrides(),{gateNumberSize:18});
  assert.equal(styles.has('--hd-design'),false); assert.equal(styles.has('--accent-soft'),false);
  assert.equal(styles.get('--hd-gate-number-size'),'18px');
  setCustomOverride('design','#333444'); setSkin('default-light');
  assert.deepEqual(getSkinOverrides(),light);
  assert.equal(styles.get('--hd-design'),'#abcdef');
  const stored=JSON.parse(storage.get(APPEARANCE_STORAGE_KEY));
  assert.equal(stored.version,3); assert.deepEqual(stored.preferences,{gateNumberSize:18});
  assert.equal(stored.overridesBySkin['default-dark'].design,'#333444');
  assert.equal(stored.overridesBySkin['default-light'].gateNumberSize,undefined);
  initAppearance(); assert.deepEqual(getSkinOverrides(),light); assert.equal(getAppearance().centerPalette,'chakra');
  restoreCurrentSkin(); assert.deepEqual(getCustomOverrides(),{gateNumberSize:18});
  assert.equal(getAppearance().skin,'default-light'); assert.equal(getAppearance().centerPalette,'chakra');
  setSkin('default-dark'); assert.equal(getCustomOverrides().design,'#333444');
  resetAppearance(); initAppearance();
  assert.equal(getAppearance().skin,'default-dark'); assert.equal(getAppearance().centerPalette,'classic'); assert.deepEqual(getCustomOverrides(),{});
}));
test('v2 global colors seed both defaults without modifying old storage; new state wins on reload', ()=>withBrowser(({storage})=>{
  const legacy=JSON.stringify({version:2,preset:'chakra',globalOverrides:{accent:'#123456',design:'#abcdef',gateNumberSize:20,unknown:'#112233'}});
  storage.set(LEGACY_APPEARANCE_STORAGE_KEY,legacy);storage.set('bodygraph-theme','dark'); initAppearance();
  assert.equal(getAppearance().skin,'default-dark'); assert.equal(getAppearance().centerPalette,'chakra');
  assert.deepEqual(getSkinOverrides(),{accent:'#123456',design:'#abcdef'});
  assert.deepEqual(getSkinOverrides('default-light'),getSkinOverrides());
  assert.deepEqual(getAppearancePreferences(),{gateNumberSize:20});assert.equal(storage.get(LEGACY_APPEARANCE_STORAGE_KEY),legacy);
  restoreCurrentSkin(); initAppearance();assert.deepEqual(getSkinOverrides(),{});
  setSkin('default-light');assert.equal(getSkinOverrides().design,'#abcdef');
  resetAppearance();initAppearance();assert.deepEqual(getCustomOverrides(),{},'legacy copy cannot resurrect after reset');
  assert.equal(storage.get(LEGACY_APPEARANCE_STORAGE_KEY),legacy);
}));
test('v1 effective precedence is preserved; malformed entries are filtered without dropping original', ()=>withBrowser(({storage})=>{
  const legacy=JSON.stringify({version:1,preset:'chakra',overrides:{'classic:light':{transit:'#112233',gateNumberSize:14},'chakra:dark':{design:'#123456'},'chakra:light':{gateNumberSize:22,transit:'#1af4ff',accent:['#123456'],personality:'url(unsafe)'}}});
  storage.set(LEGACY_APPEARANCE_STORAGE_KEY,legacy);initAppearance();
  assert.deepEqual(getCustomOverrides(),{design:'#123456',transit:'#1af4ff',gateNumberSize:22});
  assert.equal(storage.get(LEGACY_APPEARANCE_STORAGE_KEY),legacy);
  setSkin('default-dark');assert.equal(getCustomOverrides().transit,'#1af4ff');
}));
test('invalid persisted fields and unavailable storage do not break startup; dormant Skin overrides survive', ()=>withBrowser(({storage})=>{
  storage.set(APPEARANCE_STORAGE_KEY,JSON.stringify({version:3,skinId:'not-registered',centerPalette:'oops',overridesBySkin:{'future-paper':{accent:'#123456'},'default-light':{design:'red',transit:'#334455'}},preferences:{gateNumberSize:31}}));
  initAppearance();assert.equal(getAppearance().skin,'default-light');assert.equal(getAppearance().centerPalette,'classic');assert.deepEqual(getCustomOverrides(),{transit:'#334455'});
  assert.equal(JSON.parse(storage.get(APPEARANCE_STORAGE_KEY)).overridesBySkin['future-paper'].accent,'#123456');
  for(const[key,value]of [['accent',['#123456']],['design','url(unsafe)'],['unknown','#112233'],['gateNumberSize',9],['gateNumberSize',31]])assert.throws(()=>setCustomOverride(key,value),TypeError);
  globalThis.localStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  initAppearance();setSkin('default-dark');setCustomOverride('design','#123456');assert.equal(getCustomOverrides().design,'#123456');
}));

test('new Skin slots stay independent with all five overrides, reload and Restore; v3 format is unchanged', ()=>withBrowser(({storage,styles})=>{
  initAppearance(); setCenterPalette('chakra'); setCustomOverride('gateNumberSize',18);
  const custom={accent:'#123456',personality:'#345678',design:'#56789a',transit:'#6789ab',graphBackground:'#abcdef'};
  setSkin('high-contrast'); for(const[k,v]of Object.entries(custom))setCustomOverride(k,v);
  assert.equal(styles.get('--hd-transit-text'),'color-mix(in srgb, var(--hd-transit) 65%, var(--text))');
  setSkin('grass-aroma'); assert.deepEqual(getCustomOverrides(),{gateNumberSize:18});
  assert.equal(styles.has('--hd-transit-text'),false,'the next Skin uses its explicit default text');
  setCustomOverride('accent','#777aaa'); setSkin('high-contrast'); assert.deepEqual(getSkinOverrides(),custom);
  initAppearance(); assert.equal(getAppearance().skin,'high-contrast'); assert.deepEqual(getSkinOverrides(),custom);
  assert.equal(getAppearance().centerPalette,'chakra'); restoreCurrentSkin(); assert.deepEqual(getCustomOverrides(),{gateNumberSize:18});
  assert.equal(styles.has('--hd-transit-text'),false,'Restore removes the custom column-text treatment');
  setSkin('grass-aroma'); assert.equal(getCustomOverrides().accent,'#777aaa');
  setSkin('midnight-contrast'); assert.equal(getAppearance().theme,'dark'); assert.equal(getAppearance().centerPalette,'chakra');
  assert.deepEqual(Object.keys(JSON.parse(storage.get(APPEARANCE_STORAGE_KEY))),['version','skinId','centerPalette','overridesBySkin','preferences']);
}));
