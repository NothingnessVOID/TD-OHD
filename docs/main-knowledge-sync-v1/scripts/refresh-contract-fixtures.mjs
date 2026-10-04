// Existing Phase 2 fixtures predate Modern parity fixes; keep their UTC/coverage, refresh raw values.
import {readFileSync,writeFileSync} from 'node:fs';
import {nativeClient} from '../../../scripts/lib/sharp-native-client.mjs';
import {ENGINE_SIGNATURE} from '../../../src/lib/chart-engine/engine-identity.js';
const path='tests/fixtures/sharp-definition-components.json';
const fixture=JSON.parse(readFileSync(path));
try{for(const sample of fixture.samples){const fresh=await nativeClient().birth(sample.instant);if(fresh.definition!==sample.raw.definition)throw new Error('Definition coverage changed');sample.raw=fresh;}
fixture.engineSignature=ENGINE_SIGNATURE;fixture.refreshReason='Existing Phase 2 fixtures aligned to merged Modern Swiss parity fixes; UTC and definition coverage unchanged.';
writeFileSync(path,JSON.stringify(fixture,null,2)+'\n');}finally{await nativeClient().close();}
