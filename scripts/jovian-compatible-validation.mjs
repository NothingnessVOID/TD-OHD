/** Offline evidence regression. Never visits official services or production UI. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { BirthEnginePrototype } from './lib/birth-engine-prototype.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/jovian-compatible-engine');
const evidence = JSON.parse(readFileSync(path.join(out, 'official-evidence.json'), 'utf8'));
const researchRoot = process.env.JOVIAN_RESEARCH_ROOT || path.resolve(root,'../TD-OHD-jovian-discriminator-suite');
const runtime = process.env.JOVIAN_REFERENCE_RUNTIME || '/tmp/ra-era-research';
const python = process.env.PYTHON || 'python3';
const order = evidence.bodyOrder;
const sides = ['personality', 'design'];
const fields = ['profile', 'type', 'strategy', 'authority', 'definition', 'incarnationCross', 'channels', 'centers'];
const gateOrder = [17,21,51,42,3,27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60,41,19,13,49,30,55,37,63,22,36,25];
const longitudeToleranceDegrees = 1e-10;
const rootToleranceDays = 1e-10;
const shift = (utc, seconds) => new Date(Date.parse(utc) + seconds * 1000).toISOString().replace('.000Z', 'Z');
const signed = (a,b) => ((a-b+540)%360)-180;
const gl = a => `${a.gate}.${a.line}`;
const canonical = x => String(x).toLowerCase().replace(/[^a-z0-9/|()]/g, '').replace('thealpha','alpha').replace(/^toinform$/,'inform').replace('waitfortheinvitation','waitforinvitation');
function semantic(field,value){
  if(field==='type')return canonical(({'发电机':'Generator','显化发电机':'Manifesting Generator','显化生成器':'Manifesting Generator','投射者':'Projector','投影仪':'Projector','显示者':'Manifestor','显化者':'Manifestor','反映者':'Reflector'})[value]??value);
  if(field==='incarnationCross')return canonical(value.replace(/ \d+(?= \()/,'').replace('Endeavour','Endeavor').replace(/Cross of The /,'Cross of '));
  if(field==='authority')return canonical(value).replace(/^lunarcycle$/,'lunar');
  if(field==='strategy')return canonical(value).replace('waitforrecognitionandtheinvitation','waitforinvitation').replace('waittorespondtheninform','waittorespond');
  return canonical(value);
}
const mechanical = (result, field) => {
  const r = result.raw, c = result.chart;
  if (field === 'type') return c.type.name;
  if (field === 'strategy') return c.type.strategy;
  if (field === 'authority') return ({Emotional:'Solar Plexus',Sacral:'Sacral',Splenic:'Splenic',EgoManifested:'Ego Manifested',EgoProjected:'Ego Projected',SelfProjected:'Self Projected',Mental:'None',Lunar:'Lunar'})[r.authority] ?? r.authority;
  if (field === 'definition') return ({Empty:'None',SingleDefinition:'Single',SplitDefinition:'Split',TripleSplit:'Triple Split',QuadrupleSplit:'Quadruple Split'})[r.definition] ?? r.definition;
  if (field === 'incarnationCross') return c.incarnationCross.fullName;
  if (field === 'centers') return c.centers.definedNames.slice().sort();
  if (field === 'channels') return r.channels.slice().sort();
  return r[field];
};
function fine(lon) {
  const x = ((lon-3.875)%360+360)%360, gateIndex = Math.floor(x/5.625);
  const fraction = x/5.625-gateIndex;
  return {gate:gateOrder[gateIndex],line:Math.floor(fraction*6)+1,color:Math.floor(fraction*36)%6+1,tone:Math.floor(fraction*216)%6+1,base:Math.floor(fraction*1080)%5+1};
}
function oracle(model, instants) {
  const proc = spawnSync(python, [path.join(root,'scripts/jovian-reference-worker.py'),'--research-root',researchRoot,'--runtime',runtime,'--model',model], {input:JSON.stringify(instants),encoding:'utf8',maxBuffer:64*1024*1024});
  if (proc.status !== 0) throw new Error(`Immutable ${model} runner failed: ${proc.stderr}`);
  return JSON.parse(proc.stdout);
}
function parity(result, reference) {
  const mismatches = []; let maxLongitudeResidualDegrees = 0;
  for (const side of sides) for (const body of order) {
    const actual = result.raw[side][body], expected = reference[side][body];
    const residual = Math.abs(signed(actual.longitude,expected.longitude));
    maxLongitudeResidualDegrees = Math.max(maxLongitudeResidualDegrees,residual);
    if (residual > longitudeToleranceDegrees) mismatches.push({side,body,field:'longitude',actual:actual.longitude,expected:expected.longitude,residual});
    for (const [field,value] of Object.entries(fine(expected.longitude))) if (actual[field] !== value) mismatches.push({side,body,field,actual:actual[field],expected:value});
    if (gl(actual) !== expected.gateLine) mismatches.push({side,body,field:'gateLine',actual:gl(actual),expected:expected.gateLine});
  }
  const designTtJdResidualDays = Math.abs(result.astronomy.designTtJd-reference.designTtJd);
  if (designTtJdResidualDays > rootToleranceDays) mismatches.push({field:'designTtJd',actual:result.astronomy.designTtJd,expected:reference.designTtJd});
  if (result.raw.profile.replaceAll(' ','') !== reference.profile) mismatches.push({field:'profile'});
  const solarArcResidualDegrees = Math.abs(signed(result.raw.personality.sun.longitude,result.raw.design.sun.longitude+88));
  if (solarArcResidualDegrees > 1e-8) mismatches.push({field:'solarArc',solarArcResidualDegrees});
  const daysBeforeBirth=result.astronomy.ttJd-result.astronomy.designTtJd;
  if(!(daysBeforeBirth>70&&daysBeforeBirth<110))mismatches.push({field:'designRootBracket',daysBeforeBirth});
  return {passed:mismatches.length===0,maxLongitudeResidualDegrees,designTtJdResidualDays,solarArcResidualDegrees,daysBeforeBirth,mismatches};
}
const write = (name,value) => writeFileSync(path.join(out,`${name}.json`),`${JSON.stringify(value,null,2)}\n`);
mkdirSync(out,{recursive:true});
const instants = [...new Set([...evidence.cases.map(c=>c.birthUtc),...evidence.discriminatorCases.flatMap(c=>[-5,-1,0,1,5].map(s=>shift(c.birthUtc,s)))])].sort();
const reference = oracle('C2',instants);
const c1 = oracle('C1',evidence.discriminatorCases.map(c=>c.birthUtc));
const prototype = new BirthEnginePrototype();
const calculated = new Map();
const get = async utc => {
  if (!calculated.has(utc)) calculated.set(utc,await prototype.calculate({birthUtc:utc},{engine:'jovian-compatible'}));
  return calculated.get(utc);
};
try {
  const numeric = [];
  for (const utc of instants) numeric.push({birthUtc:utc,...parity(await get(utc),reference[utc])});
  write('c2-parity',{schemaVersion:1,reference:'Immutable original C2 Model.chart / Native.design 64-iteration bisection; separate native process',referenceBranch:evidence.sourceRepository,referenceScripts:['docs/jovian-design-discriminator-suite/scripts/research_models.py','docs/jovian-discriminator-suite/scripts/models.py'],tolerances:{longitudeToleranceDegrees,rootToleranceDays},utcCount:numeric.length,passed:numeric.every(r=>r.passed),maxLongitudeResidualDegrees:Math.max(...numeric.map(r=>r.maxLongitudeResidualDegrees)),maxDesignRootResidualDays:Math.max(...numeric.map(r=>r.designTtJdResidualDays)),designDaysBeforeBirthRange:[Math.min(...numeric.map(r=>r.daysBeforeBirth)),Math.max(...numeric.map(r=>r.daysBeforeBirth))],cases:numeric});
  const stats = Object.fromEntries(['personality','design','all26',...fields].map(k=>[k,{matched:0,total:0}]));
  const literalLabelStats=Object.fromEntries(fields.map(k=>[k,{matched:0,total:0}]));
  const officialRows=[];
  for (const c of evidence.cases) {
    const result=await get(c.birthUtc), observations=c.observations.filter(o=>o.platform==='Jovian'), checks=[], mismatches=[], labelDifferences=[];
    for (const side of sides) for (const body of order) {
      const values=[...new Set(observations.map(o=>o[side]?.[body]).filter(Boolean))];
      if (values.length>1) throw new Error(`Conflicting official observations: ${c.birthUtc}/${side}/${body}`);
      if (values.length) {const actual=gl(result.raw[side][body]),matched=actual===values[0];stats[side].total++;stats[side].matched+=+matched;checks.push(matched);if(!matched)mismatches.push({side,body,actual,expected:values[0]});}
    }
    if(checks.length===26){stats.all26.total++;stats.all26.matched+=+checks.every(Boolean);}
    for(const field of fields){
      const values=[...new Set(observations.map(o=>o[field]).filter(v=>v!=null).map(v=>JSON.stringify(v)))].map(v=>JSON.parse(v));
      if(!values.length)continue;
      const actual=mechanical(result,field),literalMatched=values.every(expected=>canonical(actual)===canonical(expected)),matched=values.every(expected=>semantic(field,actual)===semantic(field,expected));
      literalLabelStats[field].total++;literalLabelStats[field].matched+=+literalMatched;
      if(!literalMatched)labelDifferences.push({field,actual,expected:values});
      stats[field].total++;stats[field].matched+=+matched;if(!matched)mismatches.push({field,actual,expected:values});
    }
    officialRows.push({birthUtc:c.birthUtc,ids:c.ids,officialObservationCount:observations.length,activationFieldsCompared:checks.length,passed:mismatches.length===0,mismatches,labelDifferences});
  }
  const perPlatformRegression={};
  for(const platform of [...new Set(evidence.cases.flatMap(c=>c.observations.map(o=>o.platform)))].sort()){
    const platformStats=Object.fromEntries(['personality','design','all26',...fields].map(k=>[k,{matched:0,total:0}]));
    const platformLiteral=Object.fromEntries(fields.map(k=>[k,{matched:0,total:0}])),rows=[];
    for(const c of evidence.cases){
      const observations=c.observations.filter(o=>o.platform===platform);if(!observations.length)continue;
      const result=await get(c.birthUtc),checks=[],mismatches=[],labelDifferences=[];
      for(const side of sides)for(const body of order){
        const values=[...new Set(observations.map(o=>o[side]?.[body]).filter(Boolean))];
        if(values.length>1)throw new Error(`Conflicting ${platform} observations: ${c.birthUtc}/${side}/${body}`);
        if(!values.length)continue;
        const actual=gl(result.raw[side][body]),matched=actual===values[0];platformStats[side].total++;platformStats[side].matched+=+matched;checks.push(matched);
        if(!matched)mismatches.push({side,body,actual,expected:values[0]});
      }
      if(checks.length===26){platformStats.all26.total++;platformStats.all26.matched+=+checks.every(Boolean);}
      for(const field of fields){
        const values=[...new Set(observations.map(o=>o[field]).filter(v=>v!=null).map(v=>JSON.stringify(v)))].map(v=>JSON.parse(v));if(!values.length)continue;
        const actual=mechanical(result,field),matched=values.every(expected=>semantic(field,actual)===semantic(field,expected)),literalMatched=values.every(expected=>canonical(actual)===canonical(expected));
        platformStats[field].total++;platformStats[field].matched+=+matched;platformLiteral[field].total++;platformLiteral[field].matched+=+literalMatched;
        if(!matched)mismatches.push({field,actual,expected:values});if(!literalMatched)labelDifferences.push({field,actual,expected:values});
      }
      rows.push({birthUtc:c.birthUtc,ids:c.ids,officialObservationCount:observations.length,activationFieldsCompared:checks.length,passed:mismatches.length===0,mismatches,labelDifferences});
    }
    perPlatformRegression[platform]={uniqueUtcCount:rows.length,stats:platformStats,literalLabelStats:platformLiteral,literalLabelsAllMatched:rows.every(c=>!c.labelDifferences.length),unobservedFields:fields.filter(k=>platformStats[k].total===0),passed:rows.every(c=>c.passed),cases:rows};
  }
  write('official-regression',{schemaVersion:1,scope:'Headline: Jovian observations only, deduplicated by absolute UTC. perPlatformRegression independently compares every saved official platform; agreement does not establish independent backends',comparisonPolicy:{type:'Saved myBodyGraph Chinese display labels explicitly translated to canonical HD type, original observed and predicted labels retained',activations:'Exact Gate.Line; no official longitude or color/tone/base observations claimed',incarnationCross:'Angle + name + ordered four gates; Sharp variant suffix omitted because Jovian does not display it; Endeavour/Endeavor and optional article The normalized',authority:'Lunar and Lunar Cycle denote same authority',strategy:'Strategy family comparison. Projector Recognition and Invitation / Invitation mapped together. MG Wait to Respond / Wait to Respond then Inform mapped to response family. Additional Inform text remains a literal display difference and is not claimed to be exact Jovian wording',other:'Case/punctuation-insensitive labels'},uniqueUtcCount:officialRows.length,stats,literalLabelStats,literalLabelsAllMatched:officialRows.every(c=>!c.labelDifferences.length),unobservedFields:fields.filter(k=>stats[k].total===0),passed:officialRows.every(c=>c.passed)&&Object.values(perPlatformRegression).every(p=>p.passed),perPlatformRegression,cases:officialRows});
  const boundaries=[];
  for(const c of evidence.discriminatorCases){
    const samples=[];
    for(const offsetSeconds of [-5,-1,0,1,5]){const utc=shift(c.birthUtc,offsetSeconds),result=await get(utc);samples.push({offsetSeconds,birthUtc:utc,...parity(result,reference[utc]),astronomy:result.astronomy,personality:result.raw.personality,design:result.raw.design});}
    boundaries.push({id:c.id,birthUtc:c.birthUtc,sensitive:c.sensitive,passed:samples.every(s=>s.passed),samples});
  }
  write('boundary-regression',{schemaVersion:1,offsetSeconds:[-5,-1,0,1,5],caseCount:boundaries.length,sampleCount:boundaries.length*5,passed:boundaries.every(c=>c.passed),cases:boundaries});
  const controls=[];
  for(const c of evidence.discriminatorCases){
    const original=reference[c.birthUtc],older=c1[c.birthUtc],modern=await prototype.calculate({birthUtc:c.birthUtc},{engine:'modern'}),candidate=await get(c.birthUtc);
    const c1Differences=[],modernDifferences=[];
    for(const side of sides)for(const body of order){
      if(older[side][body].gateLine!==original[side][body].gateLine)c1Differences.push({side,body,c1:older[side][body].gateLine,c2:original[side][body].gateLine,candidate:gl(candidate.raw[side][body])});
      if(gl(modern.raw[side][body])!==original[side][body].gateLine)modernDifferences.push({side,body,modern:gl(modern.raw[side][body]),c2:original[side][body].gateLine,candidate:gl(candidate.raw[side][body])});
    }
    if(c1Differences.length||modernDifferences.length)controls.push({id:c.id,birthUtc:c.birthUtc,c1Differences,modernDifferences,passed:[...c1Differences,...modernDifferences].every(d=>d.candidate===d.c2),modernIdentity:modern.engineIdentity});
  }
  write('negative-controls',{schemaVersion:1,caseCount:controls.length,c1DiscriminatorCount:controls.filter(c=>c.c1Differences.length).length,modernDiscriminatorCount:controls.filter(c=>c.modernDifferences.length).length,detectsModernSubstitution:controls.some(c=>c.modernDifferences.length),passed:controls.length>0&&controls.every(c=>c.passed)&&controls.some(c=>c.modernDifferences.length),cases:controls});
  const mechanicsRows=[];
  for(const c of evidence.cases){
    const candidate=await get(c.birthUtc), rebuilt=await prototype.mechanics(reference[c.birthUtc],{utc:c.birthUtc});
    const keys=['type','authority','definition','profile','incarnationCross','channels','centers'];
    const mismatches=keys.filter(k=>JSON.stringify(candidate.raw[k])!==JSON.stringify(rebuilt[k])).map(field=>({field,actual:candidate.raw[field],expected:rebuilt[field]}));
    mechanicsRows.push({birthUtc:c.birthUtc,passed:mismatches.length===0,mismatches});
  }
  write('mechanics-regression',{schemaVersion:1,scope:'Same independent C2 longitudes pass through the shared SharpAstrology HumanDesignChart host; compares prototype and oracle activation pipelines',caseCount:mechanicsRows.length,passed:mechanicsRows.every(c=>c.passed),cases:mechanicsRows});
  const timeGroups=[
    {utc:'1994-07-12T04:56:37Z',inputs:[{birthUtc:'1994-07-12T04:56:37Z'},{date:'1994-07-12',time:'12:56:37',timezone:8},{date:'1994-07-11',time:'23:56:37',timezone:-5},{date:'1994-07-12',time:'12:56:37',timeZone:'Asia/Shanghai',location:'Shanghai'},{date:'1994-07-12',time:'12:56:37',timeZone:'Asia/Singapore',location:'Singapore'},{date:'1994-07-12',time:'05:56:37',timeZone:'Europe/London',location:'London'}]},
    {utc:'2024-11-03T05:30:00Z',inputs:[{utc:'2024-11-03T05:30:00Z'},{date:'2024-11-03',time:'01:30:00',timeZone:'America/New_York',fold:0},{date:'2024-11-03',time:'13:30:00',timezone:8}]},
    {utc:'2024-11-03T06:30:00Z',inputs:[{utc:'2024-11-03T06:30:00Z'},{date:'2024-11-03',time:'01:30:00',timeZone:'America/New_York',fold:1},{date:'2024-11-03',time:'01:30:00',timezone:-5}]},
    {utc:'2024-03-31T01:30:00Z',inputs:[{utc:'2024-03-31T01:30:00Z'},{date:'2024-03-31',time:'02:30:00',timeZone:'Europe/London'},{date:'2024-03-31',time:'09:30:00',timezone:8}]},
  ];
  const timeRows=[];
  for(const group of timeGroups){
    const baseline=await prototype.calculate({utc:group.utc},{engine:'jovian-compatible'}),samples=[];
    for(const input of group.inputs){const actual=await prototype.calculate(input,{engine:'jovian-compatible'});const same=JSON.stringify(actual.raw.personality)===JSON.stringify(baseline.raw.personality)&&JSON.stringify(actual.raw.design)===JSON.stringify(baseline.raw.design);samples.push({input,resolvedUtc:actual.input.utc,passed:same&&Date.parse(actual.input.utc)===Date.parse(group.utc)});}
    timeRows.push({utc:group.utc,passed:samples.every(s=>s.passed),samples});
  }
  let dstGapRejected=false;try{await prototype.calculate({date:'2024-03-31',time:'01:30',timeZone:'Europe/London'},{engine:'jovian-compatible'});}catch(error){dstGapRejected=error instanceof RangeError;}
  write('time-location-regression',{schemaVersion:1,scope:'Arbitrary UTC instants outside official fixtures; exact seconds, offsets, IANA zones, London DST spring transition, New York repeated hour folds; location does not modify celestial longitude',passed:timeRows.every(c=>c.passed)&&dstGapRejected,dstGapRejected,cases:timeRows});
  const hashes={};for(const source of evidence.sources){const actual=createHash('sha256').update(readFileSync(path.join(researchRoot,source.path))).digest('hex');if(actual!==source.sha256)throw new Error(`Source drift ${source.path}`);hashes[source.path]=actual;}
  write('reference-integrity',{schemaVersion:1,passed:true,sourceHashes:hashes,fixtureSha256:createHash('sha256').update(readFileSync(path.join(out,'official-evidence.json'))).digest('hex')});
  const reports=['official-regression','c2-parity','boundary-regression','negative-controls','mechanics-regression','time-location-regression'].map(n=>[n,JSON.parse(readFileSync(path.join(out,`${n}.json`),'utf8'))]);
  console.log(JSON.stringify(Object.fromEntries(reports.map(([n,r])=>[n,{passed:r.passed,stats:r.stats,caseCount:r.caseCount,utcCount:r.utcCount,maxLongitudeResidualDegrees:r.maxLongitudeResidualDegrees} ])),null,2));
  if(reports.some(([,r])=>!r.passed))process.exitCode=1;
} finally {await prototype.close();}
