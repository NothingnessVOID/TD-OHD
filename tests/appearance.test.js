import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HD_SKIN, DEFAULT_SITE_SKIN, getAppearance, initAppearance,
  onAppearanceChange, setHumanDesignSkin, setSiteSkin, setTheme
} from '../src/lib/appearance.js';

function withBrowser(testBody) {
  const previous = {
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    window: globalThis.window
  };
  const attributes = new Map();
  const values = new Map();
  globalThis.document = {
    documentElement: {
      getAttribute: name => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, value)
    }
  };
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  try { testBody({ attributes, values }); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

test('appearance keeps theme, site skin and HD skin independent', () => withBrowser(({ attributes, values }) => {
  initAppearance();
  assert.deepEqual(getAppearance(), {
    theme: 'light', siteSkin: DEFAULT_SITE_SKIN, humanDesignSkin: DEFAULT_HD_SKIN
  });

  setTheme('dark');
  setSiteSkin('warm');
  setHumanDesignSkin('chakra');
  assert.deepEqual(getAppearance(), {
    theme: 'dark', siteSkin: 'warm', humanDesignSkin: 'chakra'
  });
  assert.equal(values.get('bodygraph-theme'), 'dark');
  assert.equal(attributes.get('data-theme'), 'dark');
  assert.equal(attributes.get('data-skin'), 'warm');
  assert.equal(attributes.get('data-hd-skin'), 'chakra');
}));

test('any appearance axis change notifies graph render subscribers once', () => withBrowser(() => {
  initAppearance();
  const changes = [];
  const unsubscribe = onAppearanceChange(appearance => changes.push(appearance));
  try {
    setTheme('dark');
    setHumanDesignSkin('test-purple');
    setSiteSkin('warm');
    setHumanDesignSkin('test-purple');
    assert.equal(changes.length, 3);
    assert.deepEqual(changes.map(change => change.humanDesignSkin), ['classic', 'test-purple', 'test-purple']);
  } finally { unsubscribe(); }
}));

test('saved dark theme initializes without changing default skins', () => withBrowser(({ values }) => {
  values.set('bodygraph-theme', 'dark');
  initAppearance();
  assert.deepEqual(getAppearance(), {
    theme: 'dark', siteSkin: DEFAULT_SITE_SKIN, humanDesignSkin: DEFAULT_HD_SKIN
  });
}));
