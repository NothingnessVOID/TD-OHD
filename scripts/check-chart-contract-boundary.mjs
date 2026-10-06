/** Reproducible native Sharp/TD-OHD island comparison, without replacing timeline mechanics. */
import assert from 'node:assert/strict';
import { nativeClient } from './lib/sharp-native-client.mjs';
import { adaptSharpChart } from '../src/lib/chart-engine/sharp-contract.js';
import { natalIslands } from '../src/features/transit-timeline/bridge.js';
const counts={};
try {
  for(let index=0;index<320;index++) {
    const instant=new Date(Date.UTC(1960+index%60,(index*7)%12,1+(index*11)%27,index%24)).toISOString();
    const raw=await nativeClient().birth(instant);
    const chart=adaptSharpChart(raw,{birthDate:instant.slice(0,10),birthTime:instant.slice(11,16),timezone:0});
    assert.deepEqual(chart.definitionComponents,natalIslands(chart),instant);
    counts[raw.definition]=(counts[raw.definition]||0)+1;
  }
  assert.equal(Object.keys(counts).length,5,'The deterministic sample set covers all five definitions');
  console.log(JSON.stringify({samples:320,islandDifferences:0,definitions:counts},null,2));
} finally { await nativeClient().close(); }
