import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPEARANCE_STORAGE_KEY, initAppearance, getAppearance, getCustomOverrides,
  setCustomOverride, setHumanDesignSkin, setTheme, restoreCurrentPreset, resetAppearance
} from '../src/lib/appearance.js';

test('appearance preferences isolate presets/themes, persist, restore and reset', () => {
  const savedGlobals = Object.fromEntries(['document','window','localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis,key)]));
  const attributes = new Map();
  const styles = new Map();
  const storage = new Map();
  const html = {
    getAttribute: key => attributes.get(key) ?? null,
    setAttribute: (key,value) => attributes.set(key,value),
    style: { setProperty: (key,value) => styles.set(key,value), removeProperty: key => styles.delete(key) }
  };
  globalThis.document = { documentElement: html };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) };
  try {
    initAppearance();
    assert.deepEqual(getAppearance(), { theme:'light', siteSkin:'default', humanDesignSkin:'classic' });
    for (const [key,value] of Object.entries({accent:'#123abc', personality:'#654321',design:'#abcdef',transit:'#224466',graphBackground:'#eeeeff',gateNumberSize:13})) setCustomOverride(key,value);
    assert.equal(styles.get('--hd-gate-number-size'),'13px');
    assert.equal(styles.get('--hd-design'),'#abcdef');
    assert.equal(styles.get('--hd-graph-panel-bg'),'#eeeeff');
    const persisted = JSON.parse(storage.get(APPEARANCE_STORAGE_KEY));
    assert.equal(persisted.version,1);
    assert.equal(persisted.overrides['classic:light'].design,'#abcdef');
    setHumanDesignSkin('chakra');
    assert.deepEqual(getCustomOverrides(),{});
    assert.equal(styles.has('--hd-design'),false);
    setCustomOverride('design','#111222');
    setTheme('dark');
    assert.deepEqual(getCustomOverrides(),{});
    setCustomOverride('design','#333444');
    setHumanDesignSkin('classic');
    assert.deepEqual(getCustomOverrides(),{});
    setTheme('light');
    assert.equal(getCustomOverrides().design,'#abcdef');
    initAppearance();
    assert.equal(getCustomOverrides().design,'#abcdef','saved overrides reload');
    restoreCurrentPreset();
    assert.deepEqual(getCustomOverrides(),{});
    setHumanDesignSkin('chakra');
    assert.equal(getCustomOverrides().design,'#111222','restore does not erase another preset');
    setTheme('dark');
    assert.equal(getCustomOverrides().design,'#333444','restore does not erase another theme');
    resetAppearance();
    assert.deepEqual(getAppearance(),{theme:'light',siteSkin:'default',humanDesignSkin:'classic'});
    assert.deepEqual(getCustomOverrides(),{});
    assert.equal(storage.has(APPEARANCE_STORAGE_KEY),false);
    setHumanDesignSkin('chakra');
    setTheme('dark');
    assert.deepEqual(getCustomOverrides(),{});
    assert.throws(() => setCustomOverride('design','url(unsafe)'),TypeError);
    assert.throws(() => setCustomOverride('unknown','#112233'),TypeError);
    assert.throws(() => setCustomOverride('gateNumberSize',99),TypeError);
    assert.throws(() => setCustomOverride('accent',['#123456']),TypeError);
    setTheme('light');
    storage.set(APPEARANCE_STORAGE_KEY, JSON.stringify({version:1,preset:'chakra',overrides:{'chakra:light':{accent:['#123456'],design:'#abcdef',gateNumberSize:['12']}}}));
    initAppearance();
    assert.deepEqual(getCustomOverrides(),{design:'#abcdef'},'malformed stored values do not interrupt startup');
  } finally {
    for (const [key,descriptor] of Object.entries(savedGlobals)) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  }
});
