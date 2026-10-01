import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APPEARANCE_STORAGE_KEY, initAppearance, getAppearance, getCustomOverrides,
  setCustomOverride, setHumanDesignSkin, setTheme, restoreCurrentPreset, resetAppearance
} from '../src/lib/appearance.js';

test('appearance custom settings remain global across presets/themes, persist, restore and reset', () => {
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
    for (const [key,value] of Object.entries({accent:'#123abc', personality:'#654321',design:'#abcdef',transit:'#224466',graphBackground:'#eeeeff',gateNumberSize:18})) setCustomOverride(key,value);
    assert.equal(styles.get('--hd-gate-number-size'),'18px');
    assert.equal(styles.get('--hd-design'),'#abcdef');
    assert.equal(styles.get('--hd-graph-panel-bg'),'#eeeeff');
    const persisted = JSON.parse(storage.get(APPEARANCE_STORAGE_KEY));
    assert.equal(persisted.version,2);
    assert.equal(persisted.globalOverrides.gateNumberSize,18);
    assert.equal(persisted.globalOverrides.design,'#abcdef');
    const shared = getCustomOverrides();
    setHumanDesignSkin('chakra');
    assert.deepEqual(getCustomOverrides(),shared);
    setTheme('dark');
    assert.deepEqual(getCustomOverrides(),shared);
    setCustomOverride('design','#333444');
    setHumanDesignSkin('classic');
    setTheme('light');
    assert.equal(getCustomOverrides().design,'#333444','all skins and themes use the same custom colors');
    initAppearance();
    assert.equal(getCustomOverrides().design,'#333444','shared settings persist across reload');
    restoreCurrentPreset();
    assert.deepEqual(getCustomOverrides(),{gateNumberSize:18},'restore colors preserves global size');
    setHumanDesignSkin('chakra');
    assert.deepEqual(getCustomOverrides(),{gateNumberSize:18});
    resetAppearance();
    assert.deepEqual(getAppearance(),{theme:'light',siteSkin:'default',humanDesignSkin:'classic'});
    assert.deepEqual(getCustomOverrides(),{});
    assert.equal(storage.has(APPEARANCE_STORAGE_KEY),false);
    setHumanDesignSkin('chakra');
    setTheme('dark');
    assert.deepEqual(getCustomOverrides(),{});
    assert.throws(() => setCustomOverride('design','url(unsafe)'),TypeError);
    assert.throws(() => setCustomOverride('unknown','#112233'),TypeError);
    setCustomOverride('gateNumberSize',30);
    assert.equal(styles.get('--hd-gate-number-size'),'30px');
    assert.throws(() => setCustomOverride('gateNumberSize',31),TypeError);
    assert.throws(() => setCustomOverride('gateNumberSize',9),TypeError);
    assert.throws(() => setCustomOverride('accent',['#123456']),TypeError);
    setTheme('light');
    storage.set(APPEARANCE_STORAGE_KEY, JSON.stringify({version:1,preset:'chakra',overrides:{'chakra:light':{accent:['#123456'],design:'#abcdef',gateNumberSize:['12']}}}));
    initAppearance();
    assert.deepEqual(getCustomOverrides(),{design:'#abcdef'},'malformed stored values do not interrupt startup');
    storage.set(APPEARANCE_STORAGE_KEY, JSON.stringify({version:1,preset:'chakra',overrides:{'classic:light':{gateNumberSize:14,transit:'#112233'},'chakra:light':{gateNumberSize:22,transit:'#1af4ff'}}}));
    initAppearance();
    assert.equal(getCustomOverrides().gateNumberSize,22,'legacy skin-specific sizes migrate to global size');
    assert.equal(getCustomOverrides().transit,'#1af4ff','Chakra source color wins legacy migration');
    setHumanDesignSkin('classic');
    setTheme('dark');
    assert.equal(getCustomOverrides().gateNumberSize,22);
  } finally {
    for (const [key,descriptor] of Object.entries(savedGlobals)) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  }
});
