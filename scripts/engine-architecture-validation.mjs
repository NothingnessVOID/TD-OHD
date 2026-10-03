/** Compare current providers with an independent archive of the pinned V1 baseline. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { BirthEnginePrototype } from './lib/birth-engine-prototype.mjs';
const root=path.resolve(import.meta.dirname,'..');
const baseline=process.env.ENGINE_BASELINE_ROOT;
if(!baseline)throw new Error('Set ENGINE_BASELINE_ROOT to git archive of commit 1add60c36b469e0d5dc84bd7ca38b0984a446363');
const {BirthEnginePrototype:Baseline}=await import(pathToFileURL(path.join(baseline,'scripts/lib/birth-engine-prototype.mjs')));
const current=new BirthEnginePrototype(),previous=new Baseline({epheRoot:path.join(root,'public/engine/ephe')});
const evidence=JSON.parse(readFileSync(path.join(root,'docs/jovian-compatible-engine/official-evidence.json')));
const snapshots=[];
const comparableChart=chart=>{
  const value=structuredClone(chart);
  // Source organization changes the integration signature, not astronomy or displayed chart.
  if(value.meta?.engine==='jovian-compatible')delete value.meta.engineSignature;
  return value;
};
try{
  for(const c of evidence.cases){
    const row={birthUtc:c.birthUtc,engines:{}};
    for(const engine of ['modern','jovian-compatible']){
      const before=await previous.calculate(c.birthUtc,{engine}),after=await current.calculate(c.birthUtc,{engine});
      assert.deepEqual(after.raw,before.raw,`${engine} raw chart at ${c.birthUtc}`);
      assert.deepEqual(comparableChart(after.chart),comparableChart(before.chart),`${engine} presentation chart at ${c.birthUtc}`);
      if(engine==='modern')assert.equal(after.engineIdentity.engineSignature,before.engineIdentity.signature);
      else{
        assert.deepEqual(after.astronomy,before.astronomy);
        assert.equal(after.engineIdentity.astronomySignature,before.engineIdentity.astronomySignature);
      }
      row.engines[engine]={rawExactlyEqual:true,chartExactlyEqualExceptIntegrationSignature:true,astronomySignatureUnchanged:engine==='jovian-compatible'?true:null,engineSignature:after.engineIdentity.engineSignature};
    }
    snapshots.push(row);
  }
  const smoke=await current.calculate('2005-07-20T21:40:00Z',{engine:'both'});
  assert.equal(smoke.modern.engineId,'modern');assert.equal(smoke.jovianCompatible.engineId,'jovian-compatible');
  assert.equal(smoke.modern.raw.personality.sun.line,2);assert.equal(smoke.jovianCompatible.raw.personality.sun.line,3);
  const defaultResult=await current.calculate('2005-07-20T21:40:00Z');
  assert.deepEqual(defaultResult.raw,smoke.modern.raw);
  const report={schemaVersion:1,passed:true,baselineCommit:'1add60c36b469e0d5dc84bd7ca38b0984a446363',utcCount:snapshots.length,engineCalculationsCompared:snapshots.length*2,rawOutputChangeCount:0,presentationOutputChangeCountExcludingIntegrationSignature:0,defaultModern:true,bothIndependent:true,modernSignature:'59b90e629033cc7faf95',jovianAstronomyUnchanged:true,allowedEnvelopeChanges:['engineId','contractVersion','normalized precision/timeUnknown/location metadata','engineIdentity id/engineSignature normalization','integration source signature due to module extraction'],cases:snapshots};
  writeFileSync(path.join(root,'docs/engine-architecture-v1/output-regression.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:true,utcCount:report.utcCount,engineCalculationsCompared:report.engineCalculationsCompared,rawOutputChangeCount:0,chartChangeCountExceptSignature:0}));
}finally{await previous.close();await current.close();}
