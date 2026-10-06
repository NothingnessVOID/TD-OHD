import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptSharpChart } from '../src/lib/chart-engine/sharp-contract.js';
import { sharpProvider } from '../src/lib/chart-engine/sharp-provider.js';
import { nativeClient } from '../scripts/lib/sharp-native-client.mjs';
import { natalIslands } from '../src/features/transit-timeline/bridge.js';
import { CHANNELS, GENE_KEY_SPECTRUM, AUTHORITIES } from '../src/lib/human-design/catalog.js';
import { geneKeySpectrum } from '../src/lib/human-design/gene-key-spectrum.js';
import { GENE_KEY_DESCRIPTIONS } from '../src/lib/human-design/english-readings.js';
import { channelCircuit } from '../src/lib/circuit-topology.js';
import { analyzeTransitActivations } from '../src/lib/transit-analysis.js';
import { calculateGeneKeys } from '../src/lib/gene-keys.js';
import { geneKeyTerm } from '../src/lib/content.js';
import { setLocale } from '../src/lib/i18n.js';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/sharp-definition-components.json', import.meta.url)));
const oldVariable = JSON.parse(readFileSync(new URL('./fixtures/variable-presentation-v1.json', import.meta.url)));
const birth = { birthDate:'1960-01-01', birthTime:'00:00', timezone:0 };
const seed = () => structuredClone(fixture.samples[0].raw);
const adapt = raw => adaptSharpChart(raw, birth);

test('authority provenance distinguishes both Ego subtypes while retaining old display family', () => {
  for (const [rawId,id] of [['EgoManifested','egoManifested'],['EgoProjected','egoProjected']]) {
    const raw=seed(); raw.authority=rawId;const c=adapt(raw);
    assert.equal(c.authority.id,id);assert.equal(c.authority.rawId,rawId);
    assert.equal(c.authority.family,'ego');assert.equal(c.authority.name,AUTHORITIES.ego.name);
    assert.equal(c.authority.description,AUTHORITIES.ego.description);
    assert.deepEqual(c.calculation.authority,{id,rawId,family:'ego'});
  }
});

test('all center activation source states survive without changing defined/open rules', () => {
  for(const state of ['None','FirstComparator','SecondComparator','Mixed']) {
    const raw=seed();raw.centers.Sacral=state;const c=adapt(raw);
    assert.equal(c.raw.centers.Sacral,state);assert.equal(c.centerStates.sacral.rawActivation,state);
    assert.equal(c.centers.definedNames.includes('sacral'),state!=='None');
  }
});

test('real Sharp fixtures cover five definitions, preserve IDs, and agree with bridge islands', async () => {
  assert.deepEqual(fixture.samples.map(s=>s.raw.definition).sort(),['Empty','SingleDefinition','SplitDefinition','TripleSplit','QuadrupleSplit'].sort());
  for(const sample of fixture.samples) {
    const fresh=await nativeClient().birth(sample.instant);
    const expected=structuredClone(sample.raw), comparable=structuredClone(fresh);
    // Native ARM/x64 transcendental rounding affects only continuous longitude, not subdivisions.
    for(const side of ['personality','design'])for(const point of Object.keys(expected[side])) {
      const delta=Math.abs(comparable[side][point].longitude-expected[side][point].longitude);
      assert.ok(delta<1e-10,`${sample.instant}/${side}/${point}: longitude delta ${delta}`);
      comparable[side][point].longitude=expected[side][point].longitude;
    }
    assert.deepEqual(comparable,expected,'all discrete fields and timestamps must exactly match the pinned calculation');
    const c=adapt(fresh);assert.deepEqual(c.definitionComponents,natalIslands(c));
    assert.equal(c.calculation.definition.componentCount,c.definitionComponents.length);
    assert.deepEqual(c.raw.connectedComponents,fresh.connectedComponents);
    for(const key of ['type','authority','profile','definition','incarnationCross','channels','centers'])assert.deepEqual(c.raw[key],fresh[key]);
    assert.equal(c.incarnationCross.rawId,fresh.incarnationCross);
    assert.equal(c.contractVersion,'adapter-v2');
    const saved=JSON.parse(JSON.stringify(c));assert.deepEqual(saved.calculation,c.calculation);
  }
});

test('Variable retains all 24 original explanations, six tones, and five bases with stable IDs', () => {
  for(const kind of ['determination','environment','motivation','perspective'])for(let color=1;color<=6;color++)for(let tone=1;tone<=6;tone++)for(let base=1;base<=5;base++) {
    const raw=seed(),side=['determination','environment'].includes(kind)?'design':'personality',point=['determination','motivation'].includes(kind)?'sun':'northNode';
    Object.assign(raw[side][point],{color,tone,base});const c=adapt(raw),item=c.variable[kind];
    assert.equal(item.name,oldVariable[kind][color-1].name);assert.equal(item.description,oldVariable[kind][color-1].description);
    assert.equal(item.direction,tone<=3?'left':'right');assert.equal(item.arrow,item.direction);
    assert.equal(item.base,base);assert.equal(item.color,color);assert.equal(item.tone,tone);
    if(kind==='determination') assert.equal(item.cognition.name,['Smell','Taste','Outer Vision','Inner Vision','Feeling','Touch'][tone-1]);
    assert.ok(item.valueId);assert.equal(c.derived.variable[kind].valueId,item.valueId);
    assert.equal(c.derived.variable[kind].description,undefined);
  }
  assert.doesNotMatch(readFileSync(new URL('../src/lib/chart-engine/sharp-contract.js',import.meta.url),'utf8'),/Eat simple|Motivated by patience|const variableDescriptions/);
});

test('effective circuit taxonomy is shared by statistics, reference and transit for corrected channels', () => {
  for(const [gates,expected] of [[[10,34],'centering'],[[20,57],'knowing']]) {
    const channel=CHANNELS.find(c=>c.gates.join('-')===gates.join('-'));
    assert.deepEqual(channelCircuit(channel),{group:'individual',circuit:expected});
    const raw=seed();raw.channels=[`Key${gates[0]}Key${gates[1]}`];const c=adapt(raw);
    assert.equal(c.circuitAnalysis.individual.channels,1);
    assert.equal(c.derived.circuits[gates.join('-')].circuit,expected);
    const natal=adapt(seed());natal.gates.all=[gates[0]];natal.centers.definedNames=[];
    const analysis=analyzeTransitActivations(natal, {activeGates:[gates[1]],gates:{sun:{gate:gates[1]},moon:{gate:gates[1]}}});
    assert.equal(analysis.channelCompletions.find(x=>x.gates.join('-')===gates.join('-')).circuit,'individual');
    // Legacy fields used by the protected relationship/team heuristics stay untouched.
    assert.deepEqual(c.channels[0],channel);
  }
});

test('all 64 canonical Gene Keys spectra preserve sphere and English UI values', () => {
  setLocale('en',{persist:false});
  for(let gate=1;gate<=64;gate++) {
    const spectrum=geneKeySpectrum(gate);assert.deepEqual(spectrum,GENE_KEY_SPECTRUM[gate]);
    assert.deepEqual(spectrum,['shadow','gift','siddhi'].map(field=>GENE_KEY_DESCRIPTIONS[gate][field]));
    assert.deepEqual(spectrum,['shadow','gift','siddhi'].map(field=>geneKeyTerm(gate,field)));
    const c=adapt(seed());c.gates.personality.sun.gate=gate;
    assert.deepEqual(calculateGeneKeys(c).lifeWork.spectrum,spectrum);
  }
});

test('birth cache is versioned separately from annual transit data',()=>{
  assert.match(sharpProvider.cacheKey(birth),/adapter-v2/);
  assert.doesNotMatch(sharpProvider.cacheKey(birth),/adapter-v1/);
});
