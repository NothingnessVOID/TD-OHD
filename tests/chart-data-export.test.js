import test from 'node:test';
import assert from 'node:assert/strict';
import { formatChartDataExport, exportGateLine, transitExportSnapshot } from '../src/lib/chart-data-export.js';
import { setLocale } from '../src/lib/i18n.js';
import { PLANET_ORDER } from '../src/lib/planet-reference.js';
import { planetName, centerName, variable, typeName, strategy, authorityName, definitionName, channelName } from '../src/lib/vocabulary.js';
import { crossName } from '../src/lib/content.js';

const activations = () => Object.fromEntries(PLANET_ORDER.map((id, i) => [id, { gate: i + 1, line: i % 6 + 1, longitude: 123.987654 }]));
function fixture() {
  return {
    type: { name: 'Generator' }, authority: { name: 'Sacral Authority' }, profile: { numbers: '2/4' }, definition: 'Split Definition',
    incarnationCross: { angle: 'right', angleName: 'Right Angle', name: 'Explanation 2', fullName: 'Right Angle Cross of Explanation 2 (23/43 | 49/4)', gates: [23,43,49,4] },
    centers: { definedNames: ['sacral','root'], undefinedNames: ['head'], openNames: ['heart'] }, channels: [{ gates: [24,61] }],
    gates: { personality: activations(), design: activations() },
    variable: { notation:'PLL DRL', motivation:{name:'Fear',color:1,tone:1,arrow:'left'}, perspective:{name:'Wanting',color:4,tone:2,arrow:'left'},
      determination:{name:'Taste',color:2,tone:4,arrow:'right'}, environment:{name:'Shores',color:6,tone:3,arrow:'left'} },
  };
}
const english = () => setLocale('en', { persist:false });

test('all 13 natal planets reuse the canonical order and display both sides', () => {
  english(); const chart=fixture(); const output=formatChartDataExport({chart});
  let previous=-1;
  for (const id of PLANET_ORDER) {
    const value=exportGateLine(chart.gates.personality[id]);
    const row=`${planetName(id)}: Personality ${value} ｜ Design ${value}`;
    assert.ok(output.includes(row),row);
    const next=output.indexOf(row);assert.ok(next>previous);previous=next;
  }
});
test('Gate.Line validation rejects line 7, zero, fractions and invalid gates without failing export', () => {
  english();const chart=fixture();chart.gates.design.moon={gate:58,line:7};
  assert.ok(formatChartDataExport({chart}).includes('Moon: Personality 5.5 ｜ Design —'));
  for(const value of [{gate:58,line:7},{gate:0,line:1},{gate:65,line:1},{gate:1,line:0},{gate:1.5,line:1},{gate:1,line:2.5},null]) assert.equal(exportGateLine(value),'—');
  assert.equal(exportGateLine({gate:64,line:6}),'64.6');
});
test('export never reads raw identity, birth or design position metadata', () => {
  english();const chart=fixture();
  for(const key of ['name','id','birth','birthDate','birthTime','location','timezone','positions','shareUrl'])
    Object.defineProperty(chart,key,{get(){throw Error(`Private field accessed: ${key}`);}});
  const output=formatChartDataExport({chart, birth:{name:'PRIVATE_NAME',birthDate:'1901-01-01',birthTime:'03:17',location:'PRIVATE_PLACE'}});
  assert.doesNotMatch(output,/PRIVATE|1901-01-01|03:17|longitude|123\.987654|birthDate|birthTime|timezone|https?:\/\//);
});
test('foundation uses existing display vocabulary and cross contract', () => {
  english();const chart=fixture();const output=formatChartDataExport({chart});
  for(const expected of [typeName(chart.type.name),strategy(chart.type.name),authorityName(chart.authority.name),definitionName(chart.definition),crossName(chart.incarnationCross),'Profile: 2/4','Gate combination: 23/43 | 49/4','Signature: Satisfaction','Not-Self Theme: Frustration']) assert.ok(output.includes(expected),expected);
});
test('defined, undefined and completely open centers stay separate', () => {
  english();const output=formatChartDataExport({chart:fixture()});
  assert.ok(output.includes(`Defined: ${centerName('sacral')} · ${centerName('root')}`));
  assert.ok(output.includes(`Undefined: ${centerName('head')}`));
  assert.ok(output.includes(`Completely open: ${centerName('heart')}`));
  const chart=fixture();chart.centers.openNames=[];
  assert.ok(formatChartDataExport({chart}).includes('Completely open: —'));
});
test('channels reuse vocabulary; an empty channel list displays a dash', () => {
  english();const chart=fixture();assert.ok(formatChartDataExport({chart}).includes(`24-61 · ${channelName([24,61])}`));
  chart.channels=[];assert.ok(formatChartDataExport({chart}).includes('【Channels】\n—'));
});
test('Variable groups P before D, and directions come from slots rather than notation', () => {
  english();const chart=fixture();chart.variable.notation='PRR DLL';
  const output=formatChartDataExport({chart});
  assert.ok(output.includes('Standard notation: PRR DLL'));
  const keys=['motivation','perspective','determination','environment'];
  let previous=-1;
  for(const [i,key] of keys.entries()) {
    const slot=chart.variable[key];const line=`${key[0].toUpperCase()+key.slice(1)}: ${i===2?'R':'L'} · ${variable(slot)[0]} · Color ${slot.color} / Tone ${slot.tone}`;
    assert.ok(output.includes(line),line);assert.ok(output.indexOf(line)>previous);previous=output.indexOf(line);
  }
  assert.doesNotMatch(output,/Base/);
});
test('Chart output has no Transit section and missing Variable is omitted', () => {
  english();const chart=fixture();chart.variable=null;const output=formatChartDataExport({chart});
  assert.doesNotMatch(output,/【Transit】|【Variable】|Selected moment/);
});
test('Transit includes all 13 current activations and their exact timestamp', () => {
  english();const transit=activations();const output=formatChartDataExport({chart:fixture(),transit,transitMoment:{date:'2026-01-02',time:'12:34:56',offset:5.5}});
  const section=output.split('【Transit】')[1];assert.ok(section.includes('2026-01-02 12:34:56 GMT+5:30'));
  for(const id of PLANET_ORDER) assert.ok(section.includes(`${planetName(id)}: ${exportGateLine(transit[id])}`));
  assert.throws(()=>formatChartDataExport({chart:fixture(),transit}),/timestamp/);
});
test('snapshot getter helper detaches and freezes only export fields', () => {
  const data=activations();const snapshot=transitExportSnapshot(data,{date:'2026-01-02',time:'12:34:56',offset:8});
  assert.deepEqual(Object.keys(snapshot.activations.sun),['gate','line']);
  data.sun.gate=64;assert.equal(snapshot.activations.sun.gate,1);
  assert.throws(()=>{snapshot.activations.sun.gate=2;},TypeError);
  assert.throws(()=>{snapshot.date='PRIVATE_DATE';},TypeError);
});
test('English, Simplified and Traditional output reuse translated vocabulary', () => {
  for(const [locale,title] of [['en','Basic structure'],['zh-CN','基础结构'],['zh-Hant','基礎結構']]) {
    setLocale(locale,{persist:false});const chart=fixture();const output=formatChartDataExport({chart});
    assert.ok(output.includes(`【${title}】`));
    for(const expected of [typeName(chart.type.name),authorityName(chart.authority.name),centerName('sacral'),planetName('neptune'),variable(chart.variable.motivation)[0],crossName(chart.incarnationCross)]) assert.ok(output.includes(expected),expected);
    if(locale!=='en') assert.doesNotMatch(output,/Split Definition|Sacral Authority|North Node|Explanation/);
  }
  english();
});
