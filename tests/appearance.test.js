import test from 'node:test';
import assert from 'node:assert/strict';
import { initAppearance, getAppearance, setSkin, setTheme, setCenterPalette, setSiteSkin, setHumanDesignSkin, onAppearanceChange } from '../src/lib/appearance.js';

function withBrowser(body) {
  const old = Object.fromEntries(['document','window','localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis,key)]));
  const attributes = new Map(), storage = new Map();
  globalThis.document = { documentElement: { getAttribute: key => attributes.get(key), setAttribute: (key,value) => attributes.set(key,value) } };
  globalThis.window = { matchMedia: () => ({ matches:false }) };
  globalThis.localStorage = { getItem:key => storage.get(key), setItem:(key,value) => storage.set(key,value) };
  try { body({ attributes, storage }); }
  finally { for (const [key,descriptor] of Object.entries(old)) { if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; } }
}
test('Skin owns mode; Center Palette and fonts remain independent; compatibility APIs are mirrors', () => withBrowser(({attributes,storage}) => {
  initAppearance();
  assert.deepEqual(getAppearance(), {skin:'default-light',skinMode:'auto',centerPalette:'classic',centerPaletteMode:'skin-default',theme:'light',siteSkin:'default-light',humanDesignSkin:'classic'});
  attributes.set('data-font','reader-choice');
  setCenterPalette('chakra'); setSkin('default-dark');
  assert.equal(getAppearance().centerPalette,'chakra');
  assert.equal(attributes.get('data-theme'),'dark');
  assert.equal(storage.get('bodygraph-theme'),'dark');
  assert.equal(attributes.get('data-hd-skin'),'chakra');
  assert.equal(attributes.get('data-font'),'reader-choice');
  setTheme('light'); setHumanDesignSkin('classic'); setSiteSkin('default');
  assert.equal(getAppearance().skin,'default-light');
  assert.equal(attributes.get('data-font'),'reader-choice');
  assert.throws(()=>setSkin('warm-paper'),TypeError);
  assert.throws(()=>setSiteSkin('warm'),TypeError);
  assert.throws(()=>setCenterPalette('invalid'),TypeError);
  assert.throws(()=>setTheme('invalid'),TypeError);
}));
test('appearance changes notify graph subscribers once; no-op selection does not notify', () => withBrowser(() => {
  initAppearance(); const changes=[]; const unsubscribe=onAppearanceChange(value=>changes.push(value));
  try {
    setSkin('default-dark'); setCenterPalette('chakra'); setSkin('default-light'); setSkin('default-light');
    assert.deepEqual(changes.map(x=>[x.skin,x.centerPalette]),[['default-dark','mineral'],['default-dark','chakra'],['default-light','chakra']]);
  } finally { unsubscribe(); }
}));
test('legacy dark mode chooses default-dark at startup', () => withBrowser(({storage}) => {
  storage.set('bodygraph-theme','dark'); initAppearance(); assert.equal(getAppearance().skin,'default-dark');
}));
test('a fresh profile starts on Auto while stored theme choices stay explicit', () => {
  const old = Object.fromEntries(['document','window','localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis,key)]));
  const run = (storage, matches) => {
    const attributes = new Map(), store = new Map(Object.entries(storage)), listeners = new Set();
    const media = { matches, addEventListener:(type,listener) => type === 'change' && listeners.add(listener), removeEventListener:(type,listener) => listeners.delete(listener) };
    globalThis.document = { documentElement: { getAttribute:key => attributes.get(key), setAttribute:(key,value) => attributes.set(key,value), style:{ setProperty:() => {}, removeProperty:() => {} } } };
    globalThis.window = { matchMedia: () => media };
    globalThis.localStorage = { getItem:key => store.get(key), setItem:(key,value) => store.set(key,value) };
    initAppearance();
    return { attributes, store, flip: next => { media.matches = next; for (const listener of listeners) listener({ matches:next }); } };
  };
  try {
    const fresh = run({}, true);
    assert.deepEqual(getAppearance(), {skin:'default-dark',skinMode:'auto',centerPalette:'mineral',centerPaletteMode:'skin-default',theme:'dark',siteSkin:'default-dark',humanDesignSkin:'mineral'});
    assert.equal(JSON.parse(fresh.store.get('td-ohd-appearance-v3')).skinMode,'auto');
    fresh.flip(false);
    assert.equal(getAppearance().skin,'default-light'); assert.equal(getAppearance().skinMode,'auto');
    assert.equal(fresh.attributes.get('data-skin'),'default-light');
    fresh.flip(true);
    assert.equal(getAppearance().skin,'default-dark'); assert.equal(getAppearance().skinMode,'auto');
    const stored = run({ 'td-ohd-appearance-v3':JSON.stringify({version:3,skinMode:'manual',skinId:'high-contrast',centerPalette:'mineral',centerPaletteMode:'skin-default'}) }, true);
    assert.equal(getAppearance().skin,'high-contrast'); assert.equal(getAppearance().skinMode,'manual');
    const legacy = run({ 'bodygraph-theme':'dark' }, false);
    assert.equal(getAppearance().skin,'default-dark'); assert.equal(getAppearance().skinMode,'manual');
  } finally {
    for (const [key,descriptor] of Object.entries(old)) { if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; }
  }
});
