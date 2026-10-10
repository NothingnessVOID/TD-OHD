import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FONT_STORAGE_KEY,FONT_IDS,getFontPreference,setFontPreference,onFontPreferenceChange} from '../src/lib/font-preference.js';
test('font preference is independent, versioned and resilient to storage failure',()=>{
 const entries=new Map([['td-ohd-appearance-v3','unchanged']]);globalThis.document={documentElement:{dataset:{}}};globalThis.localStorage={setItem:(k,v)=>entries.set(k,v)};
 assert.equal(getFontPreference(),'lxgw');let changed;const off=onFontPreferenceChange(value=>changed=value);
 for(const font of FONT_IDS){setFontPreference(font);assert.equal(getFontPreference(),font);assert.equal(changed,font);assert.deepEqual(JSON.parse(entries.get(FONT_STORAGE_KEY)),{version:1,font});assert.equal(entries.get('td-ohd-appearance-v3'),'unchanged');}
 assert.throws(()=>setFontPreference('bad'),TypeError);globalThis.localStorage.setItem=()=>{throw Error('blocked');};setFontPreference('lxgw');assert.equal(getFontPreference(),'lxgw');off();delete globalThis.document;delete globalThis.localStorage;
});
test('font boot and stylesheet are independent of Skin and restore action',()=>{
 const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');const html=read('index.html');assert.ok(html.indexOf(FONT_STORAGE_KEY)<html.indexOf('/src/styles.css'));assert.ok(html.indexOf('font-picker-title')>html.indexOf('center-palette-picker'));assert.ok(html.indexOf('font-picker-title')<html.indexOf('skin-custom-title'));
 assert.doesNotMatch(read('src/lib/appearance.js'),/td-ohd-font|setFontPreference/);assert.doesNotMatch(read('src/lib/skin-registry.js'),/TD LXGW|TD IPA/);
 assert.doesNotMatch(read('src/styles/fonts.css').split('.font-picker')[0],/font-size|font-weight|letter-spacing|line-height/);
});
