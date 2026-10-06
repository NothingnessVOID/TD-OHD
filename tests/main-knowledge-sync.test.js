import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {engineIdentity,transitCalculationSource} from '../scripts/lib/engine-identity.mjs';
import {ENGINE_SIGNATURE} from '../src/lib/chart-engine/engine-identity.js';

test('additive birth serialization retains annual mechanics identity and complete source provenance',()=>{
 const current=readFileSync('engine-core/TransitCore.cs','utf8');
 const baseline=execFileSync('git',['show','2bc308b7a9037a10bae92fff6c9ff536a276b8ae:engine-core/TransitCore.cs'],{encoding:'utf8'});
 assert.equal(transitCalculationSource(current),baseline);
 assert.match(current,/WriteStartObject\("connectedComponents"\)/);
 assert.notEqual(transitCalculationSource(current.replace('activation.Longitude);', 'activation.Longitude + 1);')),baseline);
 const identity=engineIdentity();assert.equal(identity.signature,'59b90e629033cc7faf95');assert.equal(ENGINE_SIGNATURE,identity.signature);
 assert.match(identity.serializationSourceSha256,/^[a-f0-9]{64}$/);
});
