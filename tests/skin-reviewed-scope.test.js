import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertSkinScopeBoundary,originMainSource} from './helpers/skin-projection.js';
import {readFileSync} from 'node:fs';

test('reviewed skin scope hashes every authorized file and preserves calculation, catalog, relationship and astronomy sources',()=>{
 assert.deepEqual(assertSkinScopeBoundary(),{srcFiles:38,exactHashes:40});
 const connectionScope=JSON.parse(readFileSync(new URL('../docs/connection-structure-phase1-scope.json',import.meta.url)));
 assert.equal(createHash('sha256').update(readFileSync(new URL('../src/lib/human-design/connection.js',import.meta.url))).digest('hex'),connectionScope.files['src/lib/human-design/connection.js']);
 for(const file of ['src/lib/chart-engine/sharp-contract.js','src/lib/human-design/variable-data.js','src/features/transit-timeline/core.js','src/lib/bodygraph-integration.js','src/lib/human-design/bodygraph-geometry.js','src/lib/variable-arrows.js','engine-core/TransitCore.cs'])
  assert.deepEqual(readFileSync(new URL('../'+file,import.meta.url)),originMainSource(file),file);
});
