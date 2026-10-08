import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSkinScopeBoundary,originMainSource} from './helpers/skin-projection.js';
import {readFileSync} from 'node:fs';

test('reviewed skin scope hashes every authorized file and preserves calculation, catalog, relationship and astronomy sources',()=>{
 assert.deepEqual(assertSkinScopeBoundary(),{srcFiles:38,exactHashes:40});
 assert.deepEqual(readFileSync(new URL('../src/lib/human-design/connection.js',import.meta.url)),originMainSource('src/lib/human-design/connection.js'));
});
